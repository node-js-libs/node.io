/*!
 * node.io
 * Copyright(c) 2010 Chris O'Hara <cohara87@gmail.com>
 * MIT Licensed
 */

var processor = require('./processor'),
    request = require('./request'),
    job = require('./job');

exports = module.exports = {
    version: '0.2.1-4',
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

exports.scrape = function(input, run, output) {
    if (typeof input === 'function') {
        output = run;
        run = input;
        input = false;
    }
    output = output || false;
    var nodeiojob = job.Job;
    var scrape_job = new nodeiojob({
        timeout: 10
    },{
        input: input,
        run: run,
        output: output
    });
    processor.start(scrape_job);
};