/*!
 * node.io
 * Copyright(c) 2010 Chris O'Hara <cohara87@gmail.com>
 * MIT Licensed
 */

var child = require('child_process'),
    Job = require('./job').JobProto;

/**
 * Spawns a child process. `callback` takes (err, stdout, stderr).
 *
 * @param {String|Array} args
 * @param {String} stdin (optional)
 * @param {Function} callback
 * @api public
 */
Job.prototype.spawn = function (args, stdin, callback) {
    if (typeof stdin === 'function') {
        callback = stdin;
        stdin = undefined;
    }

    this.debug('Spawning "' + args + '"');

    if (!(args instanceof Array)) {
        args = args.split(' ');
    }

    var cmd = args.shift(),
        stdout = '', stderr = '',
        called = false,
        proc = child.spawn(cmd, args, {cwd: process.cwd()});

    proc.stdout.on('data', function (data) {
        stdout += data;
    });

    proc.stderr.on('data', function (data) {
        if (/^execvp\(\)/.test(data.asciiSlice(0, data.length))) {
            callback('Failed to start child process.');
            called = true;
        } else {
            stderr += data;
        }
    });

    proc.on('exit', function () {
        if (!called) {
            callback(null, stdout, stderr);
        }
    });

    if (stdin) {
        proc.stdin.write(stdin);
    }
};

/**
 * Executes a command. `callback` takes (err, stdout, stderr).
 *
 * @param {String|Array} cmd
 * @param {Function} callback
 * @api public
 */
Job.prototype.exec = function (cmd, callback) {
    this.debug('Spawning "' + cmd + '"');
    var ops = {cwd: process.cwd()};
    if (this.options.timeout) {
        ops.timeout = this.options.timeout * 1000;
    }
    child.exec(cmd, ops, callback);
};
