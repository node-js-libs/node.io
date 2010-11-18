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
    inverse: false,
    recurse: false,
    read_buffer: 8096,
    newline: '\n',
    encoding: 'utf8'
};

var Job = exports.JobProto = function(options) {
    var self = this;
        
    this.input_stream = {};
    this.output_streams = {};
	this.stage = 0;
    this.instance_input = [];
	this.after_timeout = false;
    this.js_timeout = null;    
    
    this.bytes_read = this.bytes_written = 0;
    
    //Set default options
    if (typeof this.options === 'undefined') {
        this.options = {};
        for (i in default_options) {
            this.options[i] = default_options[i];
        }
    }
    
    //Extend/set options with the user specified ops
    if (typeof options === 'object') {
        for (i in options) {
            this.options[i] = options[i];
        }
    }
                
    //Handle special input / output cases (see io.js)
    this.handleSpecialIO();
        
    //Add data validation methods that link to the instance's fail method
    var validator = new v.Validator();
    validator.error = function(msg) {
        self.fail(self.instance_input, msg);
    }
    this.assert = validator.check.bind(validator);
}

//Each job creates a new class so that the original Job.prototype isn't modified
exports.__defineGetter__('JobClass', function() {
    var JobClass = function(options, methods) {
        if (typeof methods === 'object') {
            for (var i in methods) {
                JobClass.prototype[i] = methods[i];
            }
        }
        
        Job.apply(this, [options]);
    }
    
    for (var i in Job.prototype) {
        JobClass.prototype[i] = Job.prototype[i];
    }
    
    JobClass.prototype.extend = function(options, methods) {
        var Child = function() {
            Job.apply(this, arguments);
        }
        for (i in JobClass.prototype) {
            Child.prototype.__proto__[i] = JobClass.prototype[i];
        }
        Child.prototype.__super__ = JobClass.prototype;
        if (typeof methods === 'object') {
            for (var i in methods) {
                Child.prototype[i] = methods[i];
            }
        }
        return new Child(options);
    };
    
    return JobClass;
});

//Calling nodeio.Job(options, methods) will instantiate a new JobClass
exports.Job = function(options, methods) {
    var JobClass = exports.JobClass;
    return new JobClass(options, methods);
}

Job.prototype.cancelPreviousTimeouts = function() {
    if (this.js_timeout) {
        clearTimeout(this.js_timeout);
    }
}

Job.prototype.emit = function() {
    var self = this;
    
    if (this.after_timeout) {
        return;
    }
    
    var process_order = ['take','run','output_hook'];
    
    this.cancelPreviousTimeouts();
    
    //No methods left? we're done
    if (this.stage >= process_order.length) return;
    
    //Get the next method in the chain
	var next = process_order[this.stage++];
        
    //If the method doesn't exist, skip it
    if (typeof this[next] !== 'function') {
    
        this.emit.apply(this, arguments);
        
    } else {
        
        //Set a timeout for each method if the `timeout` op is set
        if (this.options.timeout) {
            this.js_timeout = setTimeout(function() {
                self.fail(self.instance_input, 'timeout');
                self.after_timeout = true;
            }, this.options.timeout * 1000);
        }
        
        //Call the next method - handle async and sync cases
        var ret = this[next].apply(this, arguments);
        if (typeof ret !== 'undefined') this.emit(ret);
    }
}

Job.prototype.reduce_hook = function(data, callback) {
    if (typeof this.reduce !== 'function') {
        if (callback) callback.apply(this, [data]);
        return;
    }
    this.emit = function(output) {
        if (callback) callback.apply(this, [output]);
    }
    this.skip = this.finish = function() {}
    
    this.retry = this.timeout = function() {
        this.error_hook('You cannot call retry or timeout from reduce()');
    }
    
    //Call the reduce method - handle async and sync cases
    var ret = this.reduce(data);
    if (typeof ret !== 'undefined' && callback) callback.apply(this, [ret]);
}

Job.prototype.run = function() {
    this.emit.apply(this, arguments);
}

//Take a slice of input to handle
Job.prototype.take = function(input) {
	var num = this.options.take;
	var take = [];
	while (input && num-- && input.length > 0) {
		take.push(input.shift());
	}
    this.instance_input = take;
	if (this.options.take === 1 && take.length === 1) {
		return take[0];
	}
	return take;
}

Job.prototype.exit = function(err) {
    if (this.error_hook) this.error_hook(err);
}

Job.prototype.retry = function() {
    this.cancelPreviousTimeouts();
    
    if (!this.after_timeout) {
        this.retry_hook(this.instance_input);
    }
}

Job.prototype.finish = Job.prototype.skip = Job.prototype.fail = function() {
    this.cancelPreviousTimeouts();
    
    if (!this.after_timeout) {
        this.output_hook();
    }
}

//Add filter / sanitisation methods to the prototype
var filter = new v.Filter();
Job.prototype.filter = Job.prototype.sanitize = filter.sanitize.bind(filter);

//Add some other helpful methods
require('./io');
require('./request');
require('./dom');
require('./spawn');
