var fs = require('fs'),
    Job = require('./job').Job,
    multi = require('./multi_node'),
    v = require('validator'),
    status = require('./utils').status,
    crc32 = require('./utils').crc32;

var id, 
    isMaster,
    isSlave,
    isWorker = true,
    fork,
    distribute;
    
//Keep track of child processes and slaves
var workers = [],
    worker_count = 0;

//Keep track of the master process
var master;

var ready_to_request_input = true;

var oncomplete_callback;

//Start the processor and run the specified job
exports.start = function(job, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }
    
	var p = new Processor(options);
    
    if (typeof callback === 'function') {
        oncomplete_callback = function(err) {
            callback(err);
        }
    } else {
        oncomplete_callback = function(err) {
            if (err) status.error(err);
            process.exit(1);
        }
    }
    
    //Load the job
	var job_obj;
    if (typeof job === 'string') {
        if (!~job.indexOf('/')) job = process.cwd() + '/' + job;
        job_obj = p.loadJob(job)
    } else {
        job_obj = job;
        job = crc32(JSON.stringify(job));
    }
    
    //Initialise the processor and start the job
    fork = job_obj.options.fork;
	p.init(function() {
	    p.startJob(job, job_obj);
	});
}

//Start the processor as a slave. It will sit and wait til it receives input
exports.startSlave = function(options) {
	var p = new Processor(options);
    isSlave = true;
	p.init(function() {
        //TODO: Implement distributed processing
        //Setup a server that accepts connections on options.port
    });
}

var Processor = exports.Processor = function(options) {
    this.options = options || {};
    this.jobs = {};
}

Processor.prototype.init = function(next, spawn_children) {
    var self = this;
    
    isMaster = !isSlave && !process.env._CHILD_ID_;
    
    if (process.platform == 'cygwin' || !fork) {
                
        //Note: node doesn't support FD passing in Windows
        if (next) next();
    
    } else {
        
        //When using child processes, the master just delegates input
        if (isMaster) isWorker = false;    
        
        var num = this.options.workers;
        
        if (isMaster && (!num || num === true)) {
            //Try and run one worker per core if the number of workers is unspecified
            try {
                var cpuinfo = fs.readFileSync('/proc/cpuinfo', 'utf8');
                num = cpuinfo.match(/^cpu cores/g).length;
            } catch (e) {
                num = 2;
            }
        }
        
        var nodes = multi.spawnWorkers(num);
        
        //Keep a reference to each child process in the master
        nodes.addListener('child', function(stream) {
            
            //Add message handlers
            stream = multi.frameStream(stream, true);
            stream.addListener('message', function(data) {
                self.handleMessage(data);
            });
            
            //Keep track of all child processes
            workers.push(stream);
            worker_count++;
            
            if (worker_count == num) {            
                if (next) next();
            }
        });
        
        //Keep a reference to the master in each child process
        nodes.addListener('master', function(stream) {
            
            //Add message handlers
            stream = multi.frameStream(stream, true);
            stream.addListener('message', function(data) {
                self.handleMessage(data);
            });
            
            master = stream;
        });
            
    }
}

Processor.prototype.handleMessage = function(data) {
    switch(data.type) {
        case 'load':
            id = data.id; //Sync id's with the master
            this.loadJob(data.job, data.options, true);
            break;
    
        case 'input':
            this.input(data.job, data.input);
            break;
            
        case 'output':
            this.output(data.job, data.output);
            break;
            
        case 'pull':            
            this.jobs[data.job].pull_requests++;
            this.pullInput(data.job, data.id);
            break;
            
        case 'err':            
            oncomplete_callback(data.err);
            break;
            
        case 'complete':
            if (data.output) {
                this.output(data.job, data.output);
            }
            this.jobs[data.job].worker_complete[data.id] = true;
            break;
            
        case 'add':
            this.addInput(data.job, data.add, data.dont_flatten);
            break;
            
        case 'exit': process.exit();
    }
}

Processor.prototype.status = function(msg, type) {
    type = type || 'info';
    if (!this.options.silent) {
        status[type](msg);
    }
}

Processor.prototype.loadJob = function(job, options, start) {
    if (options) this.options = options;
    
    if (isSlave) {
    
        //TODO: Implement distributed processing
        //Check that the job exists and is the latest version, if not request it from the master
        
    }
    
    if (start) {
        this.startJob(job, require(job).job);
    } else {
        return require(job).job;
    }
}

Processor.prototype.workersComplete = function(job) {
    var j = this.jobs[job];
    for (var i = 0; i < worker_count; i++) {
        if (!j.worker_complete[i]) return false;
    }
    return true;
}

Processor.prototype.startJob = function(job, job_obj) {
    var self = this, j = this.jobs[job] = {};
    
    j.obj = job_obj;
    j.options = j.obj.options;
    j.instances = 0;
    j.retries = {};
    j.offset = 0;
    j.input = [];               
    j.output = [];
    j.output_buffer = [];
    j.worker_complete = [];
    j.isComplete = false;
    
    //Allow processor options to override ops set in the job
    j.options.global_timeout = this.options.timeout || j.options.global_timeout;
    j.options.benchmark = this.options.benchmark || j.options.benchmark;
    j.options.inverse = this.options.inverse || false;
    
    //Are we using child processes?
    fork = fork && j.options.fork !== false;
    
    //Let Windows users know that they can't use child processes
    if (process.platform == 'cygwin' && j.options.fork !== false) {
        this.status('Fork is currently unsupported on Cygwin (Node does not support FD passing in Windows)');
    }
        
    if (isMaster) {
                
        //Call the oncomplete function on error
        j.obj.error_hook = function(err) {
            oncomplete_callback(err);
        }
        
        //TODO: Bind an addInput function
        
        if (distribute) {
            
            //TODO: Implement distributed processing
            //Prepare slaves
            
        } else if (fork) {
            
            this.status('Running '+worker_count+' workers..');            
            
            //Each worker is initially idle (complete) and is requesting input
            j.pull_requests = worker_count;
            
            for (var i = 0; i < worker_count; i++) {
                //Initialise the job in each worker and sync id's
                workers[i].send({type:'load', job:job, options:this.options, id:i});
            }
            
        } else {
        
            this.status('Running 1 worker..');
        
        }
        
        //Keep track of the start time when the `benchmark` op is set
        if (j.options.benchmark) {
            j.start_time = new Date();
        }
        
        //Set a timeout for the whole operation if the `global_timeout` op is set
        if (j.options.global_timeout) {
            setTimeout(function() {
                oncomplete_callback('Operation timed out (>'+j.options.global_timeout+'s)');
            }, j.options.global_timeout * 1000);
        }
        
        //Pull the initial input
        this.pullInput(job);
        
    } else {
        
        //Let the master handle errors
        j.obj.error_hook = function(err) {
            master.send({type:'err',err:err});
            oncomplete_callback(err);
        }
        
    }
}

Processor.prototype.pullInput = function (job, forWorker) {
    var self = this, j = this.jobs[job];
    
    if (j.isComplete) return;
    
    //Only have one pending pull request at a time
    ready_to_request_input = false;
            
    if (isMaster) {
        
        var pull = j.options.max * j.options.take;
        
        //Pull extra input if we have workers
        if (fork || distribute) {
            pull = pull * j.options.worker_input_buffer;
            if (typeof forWorker === 'undefined') pull = pull * worker_count;
        }
        
        //Handle input limits when the `input` op is set
        if (j.options.input && (j.offset+pull) > j.options.input) {
            pull = Math.max(j.options.input - j.offset, 0);
        }
        
        var handleInput = function(input) { 
            
            //No input? we're done.
            if (typeof input === 'undefined' || input === null || input === false) {         
            
                //Wait for workers and instances that are in process
                var isComplete = function() {
                    return (fork || distribute) ? j.pull_requests >= worker_count && self.workersComplete(job) : j.instances <= 0;
                }
                
                //If we're still waiting, check periodically for completion
                if (isComplete()) {
                    self.jobComplete(job);
                } else {
                    var completeCheck = setInterval(function() {
                        if (j.input.length) {
                            
                            clearInterval(completeCheck);
                            self.instanceSpawn(job);
                            
                        } else if (isComplete()) {
                            
                            clearInterval(completeCheck);
                            self.jobComplete(job);
                            
                        }
                    }, 100);
                }
                
            } else {
                self.input(job, input, forWorker);
            }
        }
                                
        if (pull === 0) {
            
            handleInput(false);
            
        } else {
                    
            var offset = j.offset;
            
            j.offset += pull;  
            
            var input = j.obj.input(offset, pull, handleInput);
            if (typeof input !== 'undefined') handleInput(input);
        }
        
    } else if (isSlave) {
        
        //TODO: Implement distributed processing
        //Issue a pull request to the master server
        
        //Complete, at least until we receive more input
        this.jobComplete(job);
    
    } else {
        
        master.send({type:'pull',job:job,id:id});
        
    }
}

Processor.prototype.jobComplete = function(job) {        
    var self = this, j = this.jobs[job];
    
    if (j.isComplete) return;
    
    j.isComplete = true;
    
    if (isMaster) {
                
        //Call `job.complete()` if it exists
        if (typeof j.obj.complete === 'function') {
            j.obj.complete.call(j.obj);
        }
        
        //Output the benchmarks if the `benchmark` op is set
        var time;
        if (j.options.benchmark) {
            time = ((new Date()) - j.start_time)/1000;
            var mb_read = Math.round(j.obj.getBytesRead() / (1024*1024) * 1000) / 1000;
            var mb_written = Math.round(j.obj.getBytesWritten() / (1024*1024) * 1000)/1000;
            var mb_read_speed = Math.round(mb_read/time*1000)/1000;
            var mb_write_speed = Math.round(mb_written/time*1000)/1000;
            if (mb_read) {
                this.status('Read '+mb_read+'MB ('+mb_read_speed+'MB/s)', 'ok');
            }
            if (mb_written) {
                this.status('Wrote '+mb_written+'MB ('+mb_write_speed+'MB/s)', 'ok');
            }
        }
        
        this.status('Job complete' + (time ? 'd in '+time+'s' : ''), 'ok');
        
        //Close any output streams in use
        if (j.obj.output_streams && j.obj.output_streams.length) {
            j.obj.output_streams.forEach(function(stream) {
                stream.end();
            });
        }
        
        //Kill workers
        workers.forEach(function(worker) {
            worker.send({type:'exit'});
            worker.destroy();
        });
        
        //Done!
        oncomplete_callback();
    }
}

//Called when this process receives some input for the job
Processor.prototype.input = function(job, input, forWorker) {
    var self = this, j = this.jobs[job];
        
    ready_to_request_input = true;
    
    j.isComplete = false;
                
    if (distribute && isMaster) {
    
        //TODO: Implement distributed processing
        //Partition the input among slaves
       
    } else if (!isWorker && fork) {
                                 
        if (typeof forWorker !== 'undefined') {
             
            //Send input to the worker that issued a pull request
            workers[forWorker].send({type:'input',job:job,input:input});
            j.worker_complete[forWorker] = false;
            j.pull_requests--;
            
        } else {
            
            //All workers need input, partition the input evenly among workers
            var partition = Math.ceil(input.length / worker_count);

            for (var i = 0; i < worker_count; i++) {
                var worker_input = [];
                for (var k = 0; k < partition; k++) {
                    if (input.length === 0) break;
                    worker_input.push(input.shift())
                }
                if (worker_input.length) {
                    workers[i].send({type:'input',job:job,input:worker_input});
                    j.pull_requests--;
                } else {
                    j.worker_complete[i] = true;
                }
            }
        }
        
    } else {
        
        //Add the input that was received from the master
        input.forEach(function(line) {
            j.input.push(line);
        });
                
        //Spawn instances to handle the input
        if (j.input.length) {
            self.instanceSpawn(job);
        }
        
    }
}

//Called when a job instance wants to add input outside of job.input()
Processor.prototype.addInput = function(job, add, dont_flatten) {
    var j = this.jobs[job];
    
    if (isWorker && !isMaster) {
    
        //Send the added input back to the master so that it is evenly distributed among workers
        master.send({type:'add',job:job,add:add,dont_flatten:dont_flatten});
        
    } else {
        if (!dont_flatten && add instanceof Array) {
            add.forEach(function(line) {
                j.input.push(line);
            });
        } else {
            j.input.push(add);
        }
    }
}

Processor.prototype.output = function(job, output) {   
    var j = this.jobs[job];
        
    if (isWorker && !isMaster) {
    
        //Send the output to the master for handling
        master.send({type:'output',job:job,output:output});
        
    } else if (isSlave) {
        
        //TODO: Implement distributed processing
        //Send the output to the master server
        
    } else {    
    
        //Reduce the output if a job.reduce() is specified, then call job.output()
        j.obj.reduce_hook(output, j.obj.output);
        
    }
}

Processor.prototype.instanceSpawn = function(job) {
    var self = this, j = this.jobs[job];
          
    //Spawn up to `options.max` instances
    var num = j.options.max - j.instances;
    while(j.input.length && num--) {
        self.instanceStart(job);
    }
    
    if (ready_to_request_input) {
        
        self.pullInput(job);
        
    } else if (j.input.length === 0 && !isMaster) {
        process.nextTick(function() {
            if (j.input.length === 0) {
                var output;
                if (j.output.length) {
                    output = j.output;
                    j.output = [];
                    j.output_buffer = 0;
                }
                
                master.send({type:'complete',job:job,id:id,output:output});
                //console.log('Sending complete '+(x++));
                self.jobComplete(job);
            }
        });
    }
}

var x = y = z = 0;

Processor.prototype.instanceStart = function(job, input) {    
    var self = this, j = this.jobs[job];
    
    //Create an instance with a subset of the job methods
    var instance = new Job(j.obj.options);
    instance.run = j.obj.run;
    instance.fail = j.obj.fail;
    
    instance.error_hook = oncomplete_callback;
    
    //Allow job methods to add input
    instance.add = function(add, dont_flatten) {
        self.addInput.apply(self, [job, add, dont_flatten]);
    }
    
    instance.retry_hook = function(input) {
        if (j.options.retries !== false) {
            var input_hash = crc32(JSON.stringify(input));
            if (typeof j.retries[input_hash] === 'undefined') {
                j.retries[input_hash] = 1;
            } else {
                j.retries[input_hash]++;
            }
            
            if (j.retries[input_hash] > j.options.retries) {
                instance.cancelPreviousTimeouts();
                instance.fail(instance.instance_input, 'retry');
                return;
            }
        }
        
        self.instanceRetry.apply(self, [job, input]);
        delete instance;
    };
    
    instance.output_hook = function(result) {
        self.instanceComplete.apply(self, [job, result]);
        delete instance;
    };
    
    //Start the instance
    instance.emit(j.input);
    
    j.instances++;
}

Processor.prototype.instanceRetry = function(job, input) {
    var self = this, j = this.jobs[job];
    
    j.instances--;
    
    //Re-add the input to retry
    input.forEach(function(line) {
        j.input.push(line);
    });
    
    this.instanceSpawn(job);
}

Processor.prototype.instanceComplete = function(job, result) {
    var self = this, j = this.jobs[job];
    
    j.instances--;
    
    if (typeof result !== 'undefined' && result !== null) {
        if (j.options.flatten && result instanceof Array) {
            result.forEach(function(line) {
                j.output.push(line);
            });
        } else {
            j.output.push(result);
        }
        
        j.output_buffer++;
    }
    
    if (isMaster || j.output_buffer >= j.options.max) {
        this.output(job, j.output);
        j.output = [];
        j.output_buffer = 0;
    }
        
    this.instanceSpawn(job);
}
