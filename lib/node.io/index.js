/*!
 * node.io
 * Copyright(c) 2010 Chris O'Hara <cohara87@gmail.com>
 * MIT Licensed
 */

var processor = require('./processor'),
    request = require('./request');

exports = module.exports = {
    Processor: processor.Processor,
    Job: require('./job').Job,
    Proxy: request.Proxy,
    HttpProxy: request.HttpProxy,
    start: processor.start,
    startSlave: processor.startSlave,
    cli: require('./cli').cli
}