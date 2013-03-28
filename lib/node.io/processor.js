/*!
 * node.io
 * Copyright(c) 2010 Chris O'Hara <cohara87@gmail.com>
 * MIT Licensed
 */

var fs = require('fs'),
    path = require('path'),
    events = require('events');
    utils = require('./utils'),
    sigmund = require('sigmund'),
    Job = require('./job').JobProto;

//Keep track of processes
var isMaster, isSlave, fork, distribute,
    master, workers = [], worker_count = 0;

/**
 * Create a new Processor with the specified options.
 *
 * @param {Object} options (optional)
 * @param {Bool} start_as_slave (optional)
 * @api public
 */
var Processor = function (options, start_as_slave) {
    isSlave = start_as_slave && !process.env._CHILD_ID_;
    isMaster = !start_as_slave && !process.env._CHILD_ID_;

    this.options = options || {};
    this.jobs = {};
};
exports.Processor = Processor;

/**
 * Load events and message handlers.
 */
require('./process_master');
require('./process_worker');
require('./process_slave');

/**
 * exports.start
 *
 * Starts a job with the specified options and callback. `job` can be a
 * string (path) or an instance of nodeio.Job. `callback` takes (err) or
 * (err, output) if `capture_output` is true.
 *
 * @param {Object|String} job
 * @param {Object} options (optional)
 * @param {Function} callback (optional)
 * @param {Bool} capture_output (optional)
 * @api public
 */
exports.start = function (job, options, callback, capture_output) {
    if (typeof options === 'function') {
        capture_output = callback;
        callback = options;
        options = {};
    }
    options = options || {};

    var processor = new Processor(options);

    //Default behaviour is to exit once the job is complete
    callback = callback || function (err) {
        if (err) {
            utils.status.error(err);
        }
        process.exit();
    };

    //Callback for once we've loaded the job
    var onload = function (job_name, job_obj) {

        //If we're capturing output, we need to explicitly override job.output()
        if (isMaster && capture_output) {
            var output = [];
            job_obj.output = function (out) {
                if (out instanceof Array && job_obj.options.flatten) {
                    for (var i = 0, l = out.length; i < l; i++) {
                        output.push(out[i]);
                    }
                } else {
                    output.push(out);
                }
            };
            var old_callback = callback;
            callback = function (err) {
                old_callback(err, output);
            };
        }

        //Are we distributing work?
        fork = job_obj.options.fork;

        //Initialise the processor
        processor.init(function () {

            //Start the job
            if (isMaster) {
                processor.startJob(job_name, job_obj, callback);
            }

        });
    };

    //Load the job
    processor.loadJob(job, options, function (err, job_name, job_obj) {
        if (err) {
            callback(err);
        } else {
            onload(job_name, job_obj);
        }
    });
};

/**
 * exports.startSlave
 *
 * Starts the process as a slave. The process will wait for instructions
 * from the master.
 *
 * @param {Object} options (optional)
 * @api public
 */
exports.startSlave = function (options) {
    var processor = new Processor(options, true);
    processor.init(function () {
        processor.slaveInit();
    });
};

/**
 * Initialises child processes if using the `-f` switch or `fork` op.
 *
 * @param {Function} callback
 * @api public
 */
Processor.prototype.init = function (callback) {
    var self = this;

    if (isMaster) {

        if (fork) {

            //It's too hard supporting two stables with different API's. It's easy
            //to use the new childprocess.fork once 0.6 is standard.
            this.status('Fork will be unsupported until v0.4 is deprecated', 'error');
            fork = false;

        }

        //If we're only running in the one process, we're ready to start
        return callback();

    } else {

        //If the number of workers is unspecified, spawn one worker per core
        if ((isMaster || isSlave) && fork === true) {
            fork = require('os').cpus().length;
        }

        //Use existing workers if already spawned
        fork -= worker_count;
        if (fork <= 0) {
            return callback();
        }

        var nodes = multi.spawnWorkers(fork);

        //The master receives this event when a child is spawned
        nodes.addListener('child', function (stream) {

            //Add message handlers
            stream = multi.frameStream(stream, true);
            stream.addListener('message', function (data) {
                self.handleWorkerMessage(data);
            });

            workers.push(stream);
            worker_count++;

            //If we've spawned enough children, continue
            if (worker_count == fork) {
                fork = !!fork;
                callback();
            }
        });

        //Each child receives this event after they're spawned
        nodes.addListener('master', function (stream) {

            //Add message handlers
            stream = multi.frameStream(stream, true);
            stream.addListener('message', function (data) {
                self.handleMasterMessage(data);
            });

            //Keep a reference to the master process
            master = stream;
        });
    }
};

Processor.prototype.processJob = function (job_name, job_obj, options, callback) {
    //Unpack the job if a password was specified with the -u switch
    if (options.unpack && typeof job_obj.unpack === 'function') {
        this.status('Unpacking the job', 'debug');
        try {
            job_obj = job_obj.unpack(options.unpack);
        } catch (e) {
            callback('Failed to unpack job');
            return;
        }
    }

    if (typeof job_obj.job === 'object') {
        job_obj = job_obj.job;
    }

    //Check if the file contains multiple jobs, e.g. exports.job = {job1:nodeio.Job, job2:nodeio.Job2}
    if (typeof job_obj === 'object' && typeof job_obj.run !== 'function') {
        var which_job;
        if (options.args && options.args.length > 0) {
            which_job = options.args.shift();
            if (typeof job_obj[which_job] === 'undefined') {
                callback('Module does not contain job "' + which_job + '"');
                return;
            }
        } else {
            //If no argument was specified, use the first job defined in the file
            for (var i in job_obj) {
                which_job = i;
                break;
            }
        }
        job_obj = job_obj[which_job];
    }

    //this.status('Running job "' + (which_job || job_name) + '"', 'debug');

    //Some options/switches require the job to be extended (e.g. custom input)
    if (options.extend && (options.extend.options || options.extend.methods)) {
        job_obj = job_obj.extend(options.extend.options || {}, options.extend.methods || {});
    }

    //Allow processor options to override ops defined in the job
    utils.put(job_obj.options, options);

    return callback(null, job_name, job_obj);
}

/**
 * Loads a job asynchronously. Job can be a string (absolute path, or
 * file in the current working directory), or an instance of nodeio.Job.
 *
 * Note: CoffeeScript jobs are automatically compiled.
 *
 * @param {Object|String} job
 * @param {Function} callback
 * @api public
 */
Processor.prototype.loadJob = function (job, options, callback) {
    var self = this;

    if (typeof job === 'object') {

        //The job is already loaded. Since we don't have a unique job
        //name, give the job a unique ID before starting
        var job_id = sigmund(job);
        this.processJob(job_id, job, options, callback);

    } else if (typeof job === 'string') {

        //Check if the job is a builtin
        var builtins = ['digest','eval','pagerank','query','resolve','statuscode','validate','word_count'];
        if (builtins.indexOf(job) !== -1) {
            this.processJob(job, require(__dirname + '/../../builtin/' + job + '.js'), options, callback);
            return;
        }

        var ext = path.extname(job), is_coffee = false;

        if (ext) {

            is_coffee = ext === '.coffee' ? true : false

        } else {

            //No extension provided. Check to see if it's a .coffee file, otherwise let NodeJS determine the ext
            try {
                fs.lstatSync(job + '.coffee');
                job += '.coffee';
                is_coffee = true;
            } catch (e) {}
        }

        if (!is_coffee) {

            //Now that require.paths has gone away we have to jump through hoops.

            var tryPaths = [process.cwd() + '/', ''];

            for (var jobPath, i = 0; i < tryPaths.length; i++) {
                jobPath = tryPaths[i] + job;
                try {
                    this.status('Attempting to load require(\'' + jobPath + '\')', 'debug');
                    this.processJob(job, require(jobPath), options, callback);
                    return;
                } catch (e) {
                    if (new RegExp("Cannot find module '"+jobPath+"'").test(e.message)) {
                        this.status('Failed to load require(\'' + jobPath + '\') - not found', 'debug');
                    } else {
                        this.status('Error: Failed to load job "' + job + '". Please check that the job exists and compiles correctly.', 'error');
                        throw e;
                        return callback('load error');
                    }
                }
            }

            callback('The job could not be found.');

        } else {

            //Make it a full path
            if (job.indexOf('/') === -1) {
                job = process.cwd() + '/' + job;
            }

            //Compile the job if it's CoffeeScript
            var basename = path.basename(job, '.coffee');
            var compiled_js = process.cwd() + '/' + basename + '_compiled.js';

            if (isMaster) {

                //If we're the master, compile and load the .coffee file
                this.status('Compiling ' + job + ' => ' + compiled_js, 'debug');

                utils.compile(options.compiler || 'coffee', job, compiled_js, function(err) {
                    if (err) {
                        callback(err);
                    } else {
                        //Load the compiled JS file
                        self.processJob(compiled_js, require(compiled_js), options, callback);
                    }
                });

            } else {

                //If we're a child, the file has already been compiled by the master
                this.processJob(compiled_js, require(compiled_js), options, callback);
            }
        }

    } else if (typeof job === 'undefined') {
        callback('No job specified! See `node.io --help` for more information.');
    } else {
        callback('Unknown job type: ' + typeof job);
    }
};

/**
 * Starts the specified job.
 *
 * @param {String} job_name
 * @param {nodeio.Job} job_obj
 * @param {Function} oncomplete
 * @api public
 */
Processor.prototype.startJob = function (job_name, job_obj, oncomplete) {
    var self = this, oncomplete = oncomplete || function () {};

    //Give each job a unique ID - the process may be running more than one
    //job at the same time
    var id = utils.crc32(job_name);

    //Init job state
    var job = this.jobs[id] = {
        id: id,
        job_name: job_name,
        obj: job_obj,
        oncomplete: oncomplete,
        options: job_obj.options,
        instances: 0,
        instance_pool: [],
        retry_hashes: {},
        input: [],
        output: [],
        input_offset: 0,
        output_count: 0,
        worker_complete: [],
        ready_to_request_input: true,
        is_complete: false,
        start_time: new Date()
    };

    //Setup job events
    if (isMaster) {
        job.master = new events.EventEmitter();
        this.setupMasterEvents(job, workers);
    }
    if (!isMaster || !fork) {
        //The master process is also a worker process when !fork
        job.worker = new events.EventEmitter();
        this.setupWorkerEvents(job, master);
    }

    //Bind the oncomplete function to job.exit()
    job.obj.exit = oncomplete;

    //Provide a way for the job to use utils.status() wihle abiding by the -s switch
    job.obj.status = function (msg, type) {
        self.status(msg, type);
    };
    job.obj.debug = function (msg) {
        if (self.options.debug) {
            self.status(msg, 'debug');
        }
    };

    //Set a timeout for the whole operation if the `global_timeout` op is set
    if (job.options.global_timeout) {
        job.global_timeout = setTimeout(function () {
            oncomplete('Operation timed out (> ' + job.options.global_timeout + 's)');
        }, job.options.global_timeout * 1000);
    }

    //Run job.init() if it's defined
    if (typeof job.obj.init === 'function') {
        job.obj.init.call(job.obj);
        job.obj.handleSpecialIO.call(job.obj);
    }

    //Start the job
    if (isMaster) {
        job.master.emit('start');
    }
}

/**
 * Ends the specified job. Untested!
 *
 * @param {String|Object} job
 * @api public
 */
Processor.prototype.endJob = function (job) {
    if (typeof job === 'object') {
        job = utils.crc32(JSON.stringify(job));
    }
    for (var i = 0, l = this.jobs.length; i < l; i++) {
        if (this.jobs[i].job_name == job) {
            delete this.jobs[i];
        }
    }
};

/**
 * Outputs a styled message to the console (wraps utils.status). Status
 * messages are omitted when using the `-s` switch or `silent` op.
 *
 * @param {String} msg
 * @param {String} type (optional)
 * @api public
 */
Processor.prototype.status = function (msg, type) {
    if (type === 'debug' && !this.options.debug) {
        return;
    } else if (!this.options.silent) {
        utils.status[type || 'info'](msg);
    }
};
