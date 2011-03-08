/*!
 * node.io
 * Copyright(c) 2010 Chris O'Hara <cohara87@gmail.com>
 * MIT Licensed
 */

var processor = require('./processor'),
    request = require('./request'),
    job = require('./job');

exports = module.exports = {
    Processor: processor.Processor,
    JobProto: job.JobProto, //A reference to the underlying Job.prototype
    JobClass: job.JobClass, //A reference to a new prototype identical to Job.prototype (so Job.prototype isn't modified)
    Job: job.Job,           //Used to instantiate a JobClass
    Proxy: request.Proxy,
    HttpProxy: request.HttpProxy,
    start: processor.start,
    startSlave: processor.startSlave,
    cli: require('./interfaces/cli').cli,
    web: require('./interfaces/web').web,
    utils: require('./utils')
};

//Shortcut for creating scraping jobs
exports.create = function (obj) {
    if (typeof obj === 'function') {
        obj = {run: obj};
    }
    var options = obj.options || {};
    options = utils.put({
        timeout: 10,
        auto_retry: true,
        spoof: true
    }, options);
    return new job.Job(options, obj);
};

//High level method for noobs
exports.scrape = function (input, run, output) {
    if (typeof input === 'function') {
        output = run;
        run = input;
        input = false;
    }
    var methods = {input:input, run:run},
        options = {timeout:10, auto_retry:true};
    if (typeof output !== 'undefined') {
        methods.output = output;
    }
    processor.start(new exports.Job(options, methods));
};

