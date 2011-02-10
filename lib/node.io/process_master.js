/*!
 * node.io
 * Copyright(c) 2010 Chris O'Hara <cohara87@gmail.com>
 * MIT Licensed
 */

var Processor = require('./processor').Processor;

/**
 * Routes messages received from slaves or child processes.
 *
 * Messages takes the form [message, job, worker_id, ...]
 *
 * @param {Object} data
 * @api public
 */
Processor.prototype.handleWorkerMessage = function (data) {
    var job = this.jobs[data[1]],
        master = job.master;

    switch (data[0]) {
    case 'output': //['output', job, worker_id, output]
        master.emit('output', data[3]);
        break;

    case 'pull': //['pull', job, worker_id]
        job.pull_requests++;
        if (!job.is_complete) {
            master.emit('pullInput', data[2]);
        }
        break;

    case 'err': //['err', job, err]
        job.oncomplete(data[3]);
        break;

    case 'complete': //['complete', job, worker_id, output]
        if (data[3]) {
            master.emit('output', data[3]);
        }
        job.worker_complete[data[2]] = true;
        break;

    case 'add': //['add', job, worker_id, input, dont_flatten]
        master.emit('addInput', data[3], data[4]);
        break;
    }
}

/**
 * Sets up job events to be handled by the master process.
 *
 * @param {Object} job
 * @param {Array} workers (optional)
 * @api public
 */
Processor.prototype.setupMasterEvents = function (job, workers) {
    var self = this,
        master = job.master,
        worker_count = workers.length,
        completeCheckInterval;

    //Provide a method to check if workers are complete
    var areWorkersComplete = function () {
        if (job.pull_requests < worker_count) {
            return false;
        }
        for (var i = 0; i < worker_count; i++) {
            if (!job.worker_complete[i]) {
                return false;
            }
        }
        return true;
    };

    master.on('start', function () {
        if (worker_count > 0) {

            self.status('Running ' + worker_count + ' workers..', 'debug');

            //Each worker is initially idle (complete) and requesting input
            job.pull_requests = worker_count;

            //Tell each worker to load the job - send `i` so that the worker
            //can identify itself later
            for (var i = 0; i < worker_count; i++) {
                workers[i].send(['load', job.job_name, self.options, i]);
            }

        } else {
            self.status('Running 1 worker..', 'debug');
        }

        //Pull the initial input
        master.emit('pullInput');
    });

    master.on('pullInput', function (for_worker) {

        //Determine how much input we need to pull
        var pull = job.options.max * job.options.take;
        if (worker_count > 0) {
            //Pull more if we need have workers
            pull = pull * job.options.worker_input_mult;
            if (typeof for_worker === 'undefined') {
                pull = pull * worker_count;
            }
        }

        //Handle input limits when the `input` op is set
        if (job.options.input && (job.input_offset + pull) > job.options.input) {
            pull = Math.max(job.options.input - job.input_offset, 0);
        }

        //Callback for when input is received from job.input()
        var handle_input = function (input) {
            if (typeof input !== 'undefined' && input !== null && input !== false) {
                master.emit('input', input, for_worker);
            } else {

                //No input? We might be done..

                var isComplete = function () {
                    //Check if any input was added dynamically
                    if (job.input.length > 0) {
                        job.is_complete = false;
                        return false;
                    }

                    //Wait for workers or instances that are still working
                    return worker_count > 0 ? areWorkersComplete() : job.instances <= 0;
                };

                //If we're not complete, check periodically
                if (isComplete()) {
                    master.emit('complete');
                } else {
                    completeCheckInterval = setInterval(function () {
                        if (isComplete()) {
                            clearInterval(completeCheckInterval);
                            master.emit('complete');
                        }
                    }, 300);
                }
            }
        };

        if (pull > 0) {

            //Incr the input offset
            var offset = job.input_offset;
            job.input_offset += pull;

            //Allow job.input() to be sync and async
            var input = job.obj.input(offset, pull, handle_input);
            if (typeof input !== 'undefined') {
                handle_input(input);
            }

        } else {
            handle_input();
        }
    });

    //Called when the master receives input from job.input();
    master.on('input', function (input, for_worker) {
        job.ready_to_request_input = true;
        job.is_complete = false;

        if (worker_count > 0) {

            if (typeof for_worker !== 'undefined') {

                //Send input to the worker that issued a pull request
                workers[for_worker].send(['input', job.id, input]);
                job.worker_complete[for_worker] = false;
                job.pull_requests--;

            } else {

                //All workers need input, partition the input evenly
                var partition = Math.ceil(input.length / worker_count);
                for (var i = 0; i < worker_count; i++) {
                    var worker_input = [];
                    for (var k = 0; k < partition; k++) {
                        if (input.length === 0) {
                            break;
                        }
                        worker_input.push(input.shift());
                    }
                    if (worker_input.length) {
                        workers[i].send(['input', job.id, worker_input]);
                        job.pull_requests--;
                    } else {
                        job.worker_complete[i] = true;
                    }
                }
            }

        } else {

            job.worker.emit('input', input);
        }
    });

    //Allow jobs to dynamically add input outside of job.input() using job.add()
    master.on('addInput', function (input, dont_flatten) {
        if (!dont_flatten && input instanceof Array) {
            for (var i = 0, l = input.length; i < l; i++) {
                job.input.push(input[i]);
            }
        } else {
            job.input.push(input);
        }
    });

    master.on('output', function (output) {
        //Call job.reduce() if it's defined, otherwise just call job.output()
        if (typeof job.obj.reduce === 'function') {
            var ret = job.obj.reduce.apply(job.obj, [output]);
            if (typeof ret !== 'undefined' && ret !== null) {
                job.obj.output.apply(job.obj, [ret]);
            }
        } else {
            job.obj.output.apply(job.obj, [output]);
        }
    });

    master.on('complete', function () {
        //if (job.is_complete) return;
        job.is_complete = true;

        //Remove the job timeout if it was set
        if (job.global_timeout) {
            clearTimeout(job.global_timeout);
        }

        var oncomplete = function () {

            //Output information about job running time, benchmarks, etc. if
            //the `benchmark` op is set
            var time;
            if (job.options.benchmark) {
                var mb_read, mb_written, MB = 1024 * 1024, now = new Date();

                var round = function (val) {
                    return Math.round(val * 1000) / 1000;
                };

                time = (now - job.start_time) / 1000;
                mb_read = round(job.obj.getBytesRead() / MB);
                mb_written = round(job.obj.getBytesWritten() / MB);

                if (mb_read) {
                    self.status(
                        'Read ' + mb_read + 'MB (' + round(mb_read / time) + 'MB/s)'
                    , 'ok');
                }

                if (mb_written) {
                    self.status(
                        'Wrote ' + mb_written + 'MB (' + round(mb_written / time) + 'MB/s)'
                    , 'ok');
                }
            }

            //Wait for output streams to drain, then we're done
            job.obj.waitForOutputStreamDrains.apply(job.obj, [function () {
                self.status('Job complete' + (time ? 'd in ' + time + 's' : ''), 'ok');
                var oncomplete = job.oncomplete;
                self.jobs[job.id] = null;
                oncomplete();
            }]);
        };

        //Call job.complete() if it's defined
        if (typeof job.obj.complete === 'function') {
            if (job.obj.complete.apply(job.obj, [oncomplete])) {
                oncomplete();
            }
        } else {
            oncomplete();
        }

    });
}
