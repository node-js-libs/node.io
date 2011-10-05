/*!
 * node.io
 * Copyright(c) 2010 Chris O'Hara <cohara87@gmail.com>
 * MIT Licensed
 */

var validator = require('../../vendor/validator'),
    utils = require('./utils');

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
    args: [],
    jsdom: false,
    auto_retry: false,
    ignore_code: false,
    external_resources: false,
    expand_single_selected: true
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
    this.options = utils.put_default(options, default_options);

    //Bind node-validator
    var val = new validator.Validator();
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

    //Store info about the last and next request
    this.last = {};
    this.next = {};
}

var __extends = function (child, parent) {
    for (var key in parent) {
        if (parent.hasOwnProperty(key)) child[key] = parent[key]
    }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
};

//Each call creates a new class/prototype so that the underlying Job.prototype is untouched
exports.__defineGetter__('JobClass', function () {
    var JobClass = function (options , methods) {
        //Job.apply(this, [options]);
        JobClass.__super__.constructor.apply(this, arguments);

        //Handle special input / output cases (see io.js)
        this.handleSpecialIO();
    };
    __extends(JobClass, Job);
    return JobClass;
});

//Instantiate a new JobClass
exports.Job = function (options, methods) {
    if (typeof methods === 'undefined') {
        methods = utils.put({}, options);
        options = {};
    }
    var JobClass = exports.JobClass;
    utils.put(JobClass.prototype, methods);

    //Allow JobClass to be extended
    JobClass.prototype.extend = function (options, methods) {
        if (typeof methods === 'undefined') {
            methods = utils.put({}, options);
            options = {};
        }
        function Child () {
            Child.__super__.constructor.apply(this, arguments);
        };
        __extends(Child, JobClass);
        utils.put(Child.prototype, methods);
        utils.put_default(options, this.options);
        var child_instance = new Child(options);
        child_instance.__super__ = child_instance.constructor.__super__; //?
        return child_instance;
    };

    return new JobClass(options);
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
        var ret = self.fail(this.assigned_input, err);
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
//Job.prototype.fail = function () {};
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
