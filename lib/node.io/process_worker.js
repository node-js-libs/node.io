/*!
 * node.io
 * Copyright(c) 2010 Chris O'Hara <cohara87@gmail.com>
 * MIT Licensed
 */

var Processor = require('./processor').Processor,
    crc32 = require('./utils').crc32,
    JobClass = require('./job').JobClass;

/**
 * Routes messages received from the master process.
 *
 * Messages takes the form [message, job, ...]
 *
 * @param {Object} data
 * @api public
 */
Processor.prototype.handleMasterMessage = function (data) {
    var job = this.jobs[data[1]], self = this;

    switch (data[0]) {
    case 'load': //['load', job, options, worker_id]
        this.id = data[3];
        this.options = data[2];
        var load = !isSlave ? this.loadJob : this.slaveLoadJob;
        load.call(this, data[1], this.options, function (err, job_name, job_obj) {
            if (err) {
                self.exit(err);
            } else {
                self.startJob.call(self, job_name, job_obj);
            }
        });
        break;

    case 'input': //['input', job, input]
        if (!job) {
            //The job might not have compiled yet..
            setTimeout(function () {
                self.handleMasterMessage(data);
            }, 100);
            return;
        }

        job.worker.emit('input', data[2]);
        break;

    case 'exit': //['exit']
        process.exit(1);
        break;
    }
};

/**
 * Sets up job events to be handled by the slave or child process.
 *
 * @param {Object} job
 * @param {Object} master (optional)
 * @api public
 */
Processor.prototype.setupWorkerEvents = function (job, master) {
    var self = this,
        worker = job.worker,
        isMaster = typeof master === 'undefined';

    worker.on('input', function (input) {
        job.ready_to_request_input = true;
        job.is_complete = false;

        //Add the input that was received
        for (var i = 0, l = input.length; i < l; i++) {
            job.input.push(input[i]);
        }

        //Spawn instances to handle the input
        if (job.input.length > 0) {
            worker.emit('process');
        }
    });

    worker.on('pullInput', function () {
        master.send(['pull', job.id, self.id]);
    });

    worker.on('process', function () {
        utils.tick(function () {
            if (job.is_complete) return;

            if (job.ready_to_request_input && job.input.length < (job.options.max * job.options.take * job.options.worker_input_mult)) {

                //We already have input, but pull some more for continuity
                job.ready_to_request_input = false;
                if (isMaster) {
                    job.master.emit('pullInput');
                } else {
                    worker.emit('pullInput');
                }

            } else if (!isMaster && job.input.length === 0) {

                //We might be done, although hanging instances might add some more input
                //using add(), so add another check on the next tick
                utils.tick(function () {
                    if (job.input.length === 0 && !job.is_complete) {
                        worker.emit('complete');
                    }
                });
            }

            //Make sure we don't spawn more instances than specified in the `max` op
            var num = job.options.max - job.instances;
            while (job.input.length && num--) {
                worker.emit('spawn');
            }
        });
    });

    //Create a new job instance
    var createInstance = function () {

        var instance = new JobClass(job.options, {});

        //We only need a subset of the methods
        instance.run = job.obj.run;
        instance.fail = job.obj.fail;
        instance.debug = job.obj.debug;
        instance.status = job.obj.status;
        instance.exit = job.obj.exit;
        instance.add = job.obj.add;

        //Called when a job wants to dynamically add input outside of job.input() using job.add()
        instance.add = function (input, dont_flatten) {
            if (!isMaster) {
                //Send the added input back to the master so that it is evenly distributed among workers
                master.send(['add', job.id, input, dont_flatten]);
            } else {
                job.master.emit('addInput', input, dont_flatten);
            }
        }

        //Handle job output and continue processing
        instance.emit = function (result) {
            worker.emit('output', result);
            instance.cancel_timeout();
            instance.isComplete = true;

            var emit = function () {
                job.instances--;

                //Reuse the instance later on
                job.instance_pool.push(instance);

                worker.emit('process');
            };

            if (job.options.wait) {
                setTimeout(emit, job.options.wait * 1000);
            } else {
                emit();
            }
        };

        //exit() is handled by the master
        if (!isMaster) {
            instance.exit = function (err) {
                master.send(['err', job.id, err]);
            };
        }

        //skip() is an alias for emitting an undefined result
        instance.skip = instance.emit;

        //If no custom fail() method is provided, fail() === skip()
        if (typeof instance.fail !== 'function') {
            instance.fail = instance.emit;
        }

        //Handle retries
        instance.retry = function () {
            instance.finish(function () {

                //Handle the case where only a certain amount of retries is permitted
                if (job.options.retries !== false) {
                    var input_hash = utils.crc32(JSON.stringify(instance.assigned_input));
                    if (typeof job.retry_hashes[input_hash] === 'undefined') {
                        job.retry_hashes[input_hash] = 1;
                    } else {
                        job.retry_hashes[input_hash]++;
                    }
                }

                if (job.options.retries !== false && job.retry_hashes[input_hash] > job.options.retries) {

                    var ret = instance.fail(instance.assigned_input, 'retry');
                    if (typeof ret !== 'undefined' && ret !== null) {
                        instance.emit(ret);
                    };

                } else {

                    job.instances--;

                    //Re-add the assigned input
                    if (instance.assigned_input instanceof Array) {
                        for (var i = 0, l = instance.assigned_input.length; i < l; i++) {
                            job.input.push(instance.assigned_input[i]);
                        }
                    } else {
                        job.input.push(instance.assigned_input);
                    }

                    //Reuse the instance later on, only if there's more retry (see bug #148)
                    job.instance_pool.push(instance);
                }

                //Continue processing
                worker.emit('process');
            });
        };

        return instance;
    };

    worker.on('spawn', function () {

        //Try and reuse instances where possible
        var instance;
        if (job.instance_pool.length > 0) {
            instance = job.instance_pool.shift();
            instance.reset();
        } else {
            instance = createInstance();
        }

        //Assign some input to the instance
        var num = job.options.take;
        while (job.input.length > 0 && num--) {
            instance.assigned_input.push(job.input.shift());
        }
        if (job.options.take === 1 && instance.assigned_input.length === 1) {
            instance.assigned_input = instance.assigned_input[0];
        }

        //Set a timeout for run() if the `timeout` op is set
        if (job.options.timeout) {
            instance.timeout = setTimeout(function () {
                instance.fail_with('timeout');
            }, job.options.timeout * 1000);
        }

        try {
            //Start the instance
            var ret = instance.run(instance.assigned_input);
            if (typeof ret !== 'undefined' && ret !== null) {
                instance.emit(ret);
            }
        } catch (err) {
            instance.fail_with(err);
        }

        job.instances++;
    });

    worker.on('output', function (result) {

        if (typeof result !== 'undefined' && result !== null) {
            if (job.options.flatten && result instanceof Array) {
                for (var i = 0, l = result.length; i < l; i++) {
                    job.output.push(result[i]);
                }
            } else {
                job.output.push(result);
            }

            job.output_count++;
        }

        if (job.output.length === 0) {
            return;
        }

        //If we're not the master, try and minimise communication frequency by
        //outputting only when output >= max
        if (isMaster || job.output_count >= job.options.max) {
            if (!isMaster) {
                //Send the output to the master for handling
                master.send(['output', job.id, self.id, job.output]);
            } else {
                job.master.emit('output', job.output);
            }

            job.output = [];
            job.output_count = 0;
        }
    });

    worker.on('complete', function () {
        job.is_complete = true;

        //Attach any final output to the message
        master.send(['complete', job.id, self.id, job.output]);

        job.output = [];
        job.output_count = 0;
    });
}
