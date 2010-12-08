/*!
 * node.io
 * Copyright(c) 2010 Chris O'Hara <cohara87@gmail.com>
 * MIT Licensed
 */

var fs = require('fs'),
    path = require('path'),
    events = require('events');
    multi = require('./multi_node'),
    utils = require('./utils'),
    Job = require('./job').JobProto;

//Keep track of processes
var isMaster, fork, distribute,
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
 * Load process events and message handlers.
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
        
        //Allow processor options to override ops defined in the job
        utils.put(job_obj.options, options);
        
        //If we're capturing output, we need to explicitly override job.output()
        if (isMaster && capture_output) {
            output = [];
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
        distribute = job_obj.options.distribute;
        fork = job_obj.options.fork;
        
        //Initialise the processor
        processor.init(function () {
                        
            //Start the job
            processor.startJob(job_name, job_obj, callback);
            
        });
    };
    
    require.paths.unshift(process.cwd());
    
    //Load the job
    processor.loadJob(job, function (err, job_name, job_obj) {
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
 * Initialises child processes if specified using the `-f` switch or `fork` op.
 *
 * @param {Function} callback
 * @api public
 */
Processor.prototype.init = function (callback) {
    var self = this;
    
    if (isMaster && !fork) {
        
        //If we're only running in the one process, we're ready to start
        return callback();
        
    } else if (process.platform === 'cygwin') {
        
        //Cygwin users are unable to use child processes (yet..)
        this.status('Fork is currently unsupported on Cygwin (Node does not support FD passing in Windows)');
        return callback();
    
    } else {
        
        //If the number of workers is unspecified, try and spawn one worker per core
        if ((isMaster || isSlave) && fork === true) {
            try {
                var cpuinfo = fs.readFileSync('/proc/cpuinfo', 'utf8');
                fork = cpuinfo.match(/^cpu cores/g).length;
            } catch (e) {
                fork = 2;
            }
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
Processor.prototype.loadJob = function (job, callback) {
    
    if (typeof job === 'object') {
        
        //The job is already loaded. Since we don't have a unique job
        //name, give the job a unique ID before starting
        var job_id = utils.crc32(JSON.stringify(job));
        callback(null, job_id, job);
        
    } else if (typeof job === 'string') {
        
        if (path.extname(job) !== '.coffee') {
            
            //Let node determine the extension and load
            try {
                callback(null, job, require(job).job);
            } catch (e) {
                console.log(e);
                callback('Failed to load job "' + job + '"');
            }
            
        } else {
            
            //Make it a full path
            if (job.indexOf('/') === -1) {
                job = process.cwd() + '/' + job;
            }
            
            //Compile the job if it's CoffeeScript
            var basename = path.basename(job, '.coffee');
            var compiled_js = '/tmp/' + basename + '_compiled.js';
            
            if (isMaster) {
                
                //If we're the master, compile and load the .coffee file
                this.status('Compiling ' + job);
                
                utils.compileCoffee(job, compiled_js, function(err) {
                    if (err) {
                        callback(err);
                    } else {
                        //Load the compiled JS file
                        callback(null, compiled_js, require(compiled_js).job);
                    }
                });
                
            } else {
                
                //If we're a child, the file has already been compiled by the master
                callback(null, compiled_js, require(compiled_js).job);
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
        
    //Each processor may be running more than one type of job in the same process
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
    
    //Start the job
    if (isMaster) {
        job.master.emit('start');
    }
}

/**
 * Outputs a styled message to the console (wraps utils.status). Status 
 * messages are omitted when using the `-s` switch or `silent` op.
 *
 * @param {String} msg
 * @param {String} type (optional)
 * @api public
 */
Processor.prototype.status = function (msg, type) {
    if (!this.options.silent) {
        utils.status[type || 'info'](msg);
    }
};
