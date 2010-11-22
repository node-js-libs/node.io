/*!
 * node.io
 * Copyright(c) 2010 Chris O'Hara <cohara87@gmail.com>
 * MIT Licensed
 */

var fs = require('fs'),
    v = require('validator'),
    status = require('./utils').status;
    
var default_options = {
    max: 1,
    take: 1,
    retries: 2,
    timeout: false,
    flatten: true,
    benchmark: false,
    fork: false,
    global_timeout: false,
    input: false,
    worker_input_buffer: 1,
    recurse: false,
    read_buffer: 8096,
    newline: '\n',
    encoding: 'utf8',
    args: []
};

var Job = function (options) {
    var i, self = this;
        
    this.input_stream = {};
    this.output_streams = {};
	this.stage = 0;
    this.instance_input = [];
	this.after_timeout = false;
    this.js_timeout = null;    
    
    this.bytes_read = 0;
    this.bytes_written = 0;
    
    //Set default options
    if (typeof this.options === 'undefined') {
        this.options = {};
        for (i in default_options) {
            if (default_options.hasOwnProperty(i)) {
                this.options[i] = default_options[i];
            }
        }
    }
    
    //Extend/set options with the user specified ops
    if (typeof options === 'object') {
        for (i in options) {
            if (options.hasOwnProperty(i)) {
                this.options[i] = options[i];
            }
        }
    }
                
    //Handle special input / output cases (see io.js)
    this.handleSpecialIO();
        
    //Add data validation methods that link to the instance's fail method
    var validator = new v.Validator();
    validator.error = function (msg) {
        self.fail(self.instance_input, msg);
    };
    this.assert = validator.check.bind(validator);
};

exports.JobProto = Job;

//Each job creates a new class so that the original Job.prototype isn't modified
exports.__defineGetter__('JobClass', function () {
    var JobClass = function (options, methods) {
        if (typeof methods === 'object') {
            for (var i in methods) {
                if (methods.hasOwnProperty(i)) {
                    JobClass.prototype[i] = methods[i];
                }
            }
        }
        Job.apply(this, arguments);
    };
    
    for (var i in Job.prototype) {
        if (Job.prototype.hasOwnProperty(i)) {
            JobClass.prototype[i] = Job.prototype[i];
        }
    }
    JobClass.prototype.__super__ = Job.prototype;
    
    var proto = JobClass.prototype;
    
    //Compatability with CoffeeScript inheritance
    JobClass.extended = function(Child) {
        proto = Child.prototype;
    }
    
    //Allow this class to be extended
    JobClass.prototype.extend = function (options, methods) {
                
        var parent_options = this.options;
        var Child = function (options) {
            JobClass.apply(this, arguments);
        };
        
        for (var i in proto) {
            Child.prototype[i] = proto[i];
        }
        Child.prototype.__super__ = proto;
        
        if (typeof methods === 'object') {
            for (i in methods) {
                if (methods.hasOwnProperty(i)) {
                    Child.prototype[i] = methods[i];
                }
            }
        }
        for (i in parent_options) {
            if (typeof options[i] === 'undefined') {
                if (parent_options.hasOwnProperty(i)) {
                    options[i] = parent_options[i];
                }
            }
        }
        
        return new Child(options);
    };
    
    return JobClass;
});

//Calling nodeio.Job(options, methods) will instantiate a new JobClass
exports.Job = function (options, methods) {
    var JobClass = exports.JobClass;
    return new JobClass(options, methods);
};

Job.prototype.cancelPreviousTimeouts = function () {
    if (this.js_timeout) {
        clearTimeout(this.js_timeout);
    }
};

Job.prototype.emit = function () {
    var self = this;
    
    if (this.after_timeout) {
        return;
    }
    
    var process_order = ['take', 'run', 'output_hook'];
    
    this.cancelPreviousTimeouts();
    
    //No methods left? we're done
    if (this.stage >= process_order.length) {
        return;
    }
    
    //Get the next method in the chain
	var next = process_order[this.stage++];
        
    //If the method doesn't exist, skip it
    if (typeof this[next] !== 'function') {
    
        this.emit.apply(this, arguments);
        
    } else {
        
        //Set a timeout for each method if the `timeout` op is set
        if (this.options.timeout) {
            this.js_timeout = setTimeout(function () {
                self.fail(self.instance_input, 'timeout');
                self.after_timeout = true;
            }, this.options.timeout * 1000);
        }
        
        //Call the next method - handle async and sync cases
        var ret = this[next].apply(this, arguments);
        if (typeof ret !== 'undefined') {
            this.emit(ret);
        }
    }
};

Job.prototype.reduce_hook = function (data, callback) {
    if (typeof this.reduce !== 'function') {
        if (callback) {
            callback.apply(this, [data]);
        }
        return;
    }
    this.emit = function (output) {
        if (callback) {
            callback.apply(this, [output]);
        }
    };
    
    this.skip = function () {};
    this.finish = function () {};
    this.retry = function () {};
    this.timeout = function () {};
        
    //Call the reduce method - handle async and sync cases
    var ret = this.reduce(data);
    if (typeof ret !== 'undefined' && callback) {
        callback.apply(this, [ret]);
    }
};

Job.prototype.run = function () {
    this.emit.apply(this, arguments);
};

//Take a slice of input to handle
Job.prototype.take = function (input) {
	var num = this.options.take, take = [];
	while (input && num-- && input.length > 0) {
		take.push(input.shift());
	}
    this.instance_input = take;
	if (this.options.take === 1 && take.length === 1) {
		return take[0];
	}
	return take;
};

Job.prototype.exit = function (err) {
    if (this.error_hook) {
        this.error_hook(err);
    }
};

Job.prototype.retry = function () {
    this.cancelPreviousTimeouts();
    
    if (!this.after_timeout) {
        this.retry_hook(this.instance_input);
    }
};

Job.prototype.skip = function () {
    this.cancelPreviousTimeouts();
    
    if (!this.after_timeout) {
        this.output_hook();
    }
};

Job.prototype.finish = Job.prototype.skip;
Job.prototype.fail = Job.prototype.skip;

//Add filter / sanitisation methods to the prototype
var filter = new v.Filter();
Job.prototype.filter = filter.sanitize.bind(filter);
Job.prototype.sanitize = Job.prototype.filter;

//Add some other helpful methods
require('./io');
require('./request');
require('./dom');
require('./spawn');
