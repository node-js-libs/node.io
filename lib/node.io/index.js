/*!
 * node.io
 * Copyright(c) 2010 Chris O'Hara <cohara87@gmail.com>
 * MIT Licensed
 */

var processor = require('./processor'),
    request = require('./request'),
    job = require('./job');

exports = module.exports = {
    version: '0.1.0a',
    Processor: processor.Processor,
    Job: job.Job,           //Instantiates a new JobClass
    JobClass: job.JobClass, //Each job gets its own prototype so that Job.prototype stays clean
    JobProto: job.JobProto, //A reference to the underlying Job.prototype
    Proxy: request.Proxy,
    HttpProxy: request.HttpProxy,
    start: processor.start,
    startSlave: processor.startSlave,
    cli: require('./cli').cli
}