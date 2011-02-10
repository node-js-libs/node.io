/*!
 * node.io
 * Copyright(c) 2010 Chris O'Hara <cohara87@gmail.com>
 * MIT Licensed
 */

var Processor = require('./processor').Processor,
    crc32 = require('./utils').crc32;

/**
 * Initialises the slave.
 *
 * @api public
 */
Processor.prototype.slaveInit = function () {
    //TODO
};

/**
 * Used by the slave to load a job.
 *
 * @param {String} job
 * @param {Function} callback
 * @api public
 */
Processor.prototype.slaveLoadJob = function (job, callback) {
    //TODO
};
