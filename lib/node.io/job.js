/*!
 * node.io
 * Copyright(c) 2010 Chris O'Hara <cohara87@gmail.com>
 * MIT Licensed
 */

var validator = require('validator'),
    put = require('./utils').put,
    put_default = require('./utils').put_default;

/**
 * Default job options
 */
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
    worker_input_mult: 1,
    recurse: false,
    read_buffer: 8096,
    newline: '\n',
    encoding: 'utf8',
    proxy: false,
    redirects: 3,
    retry_request: false,
    args: []
};

/**
 * Creates a new Job with the specified options
 *
 * @param {Number} options (optional)
 * @api public
 */
var Job = exports.JobProto = function (options) {
    this.reset();
    
    //Set job options
    this.options = put_default(options, default_options);
    
    //Add data validation methods
    var val = new validator.Validator(), self = this;
    val.error = function (msg) {
        self.fail(self.instance_input, msg);
    };
    this.assert = val.check.bind(val);
};

Job.prototype.reset = function () {
    this.input_stream = {};
    this.output_streams = {};
    
    this.assigned_input = [];
    this.timeout = null;
    this.isComplete = false;
    
    this.bytes_read = 0;
    this.bytes_written = 0;
    this.bytes_received = 0;
}

//Each job creates a new class/prototype so that the underlying Job.prototype is untouched
exports.__defineGetter__('JobClass', function () {
    var JobClass = function (options, methods) {
        put(JobClass.prototype, methods);
        
        Job.apply(this, [options]);
        
        //Handle special input / output cases (see io.js)
        this.handleSpecialIO();
    };
    
    //Extend job methods
    put(JobClass.prototype, Job.prototype);
    JobClass.prototype.__super__ = Job.prototype;
    
    //Compatability with CoffeeScript <= 0.9.4 inheritance
    var JobPrototype = JobClass.prototype;
    JobClass.extended = function (Child) {
        JobPrototype = Child.prototype;
    };
    
    //Allow JobClass to be extended
    JobClass.prototype.extend = function (options, methods) {
        var Child = function () {
            JobClass.apply(this, arguments);
        };
        
        //Extend parent methods
        put(Child.prototype, JobPrototype, methods);
        Child.prototype.__super__ = JobPrototype;
        
        //Extend parent options
        put_default(options, this.options);
        
        return new Child(options);
    };
    
    return JobClass;
});

//Instantiate a new JobClass
exports.Job = function (options, methods) {
    var JobClass = exports.JobClass;
    return new JobClass(options, methods);
};

Job.prototype.finish = function (callback) {
    if (!this.isComplete) {
        this.cancel_timeout();
        this.isComplete = true;
        if (callback) {
            callback();
        };
    }
}

Job.prototype.cancel_timeout = function () {
    if (this.timeout) {
        clearTimeout(this.timeout);
    }
};

Job.prototype.fail_with = function (err) {
    var self = this;
    this.finish(function () {
        var ret = self.fail(this.instance_input, err);
        if (typeof ret !== 'undefined' && ret !== null) {
            self.emit(ret);
        }
    });
}

//By default, run() passes through input
Job.prototype.run = function () {
    this.emit.apply(this, arguments);
};

//processor.js overrides these methods to add some magic
//-----------------------------------------------------------------------------
Job.prototype.emit = function() {
    if (this.is_complete) return;
    this.output.apply(this, arguments); 
}
Job.prototype.info = function () {};
Job.prototype.debug = function () {};
Job.prototype.skip = function () {
    this.is_complete = true;
};
Job.prototype.fail = function () {
    this.is_complete = true;
};
Job.prototype.exit = function () {
    this.is_complete = true;
};
Job.prototype.add = function () {};
//-----------------------------------------------------------------------------

//Add filter / sanitisation methods to the prototype
var filter = new validator.Filter();
Job.prototype.sanitize = Job.prototype.filter = filter.sanitize.bind(filter);

//Add some other helpful methods
require('./io');
require('./request');
require('./dom');
require('./spawn');
