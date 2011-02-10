//This is a slightly modified of kriszyp's multi-node (https://github.com/kriszyp/multi-node)
//Multi-node is released under the AFL / BSD License

var net = require('net'),
    childProcess = require('child_process'),
    netBinding = process.binding('net');

/**
 * Spawns child processes and sets up communication channels.
 *
 * @param {Number} num
 * @param {String} options (optional)
 * @return EventEmitter
 * @api public
 */
exports.spawnWorkers = function (num, options) {
    var emitter = new process.EventEmitter();

    options = options || {};

    if (process.env._CHILD_ID_) {
        var stdin = new net.Stream(0, 'unix');
        var descriptorType;
        stdin.addListener('data', function (message) {
            descriptorType = message;
        });
        stdin.addListener('fd', function (fd) {
            if (descriptorType == 'master') {
                var stream = new net.Stream(fd, 'unix');
                emitter.emit('master', stream);
                stream.resume();
            } else {
                throw new Error('Unknown file descriptor ' + descriptorType);
            }
        });

        stdin.resume();

    } else {
        var children = [],
            numChildren = num || 1,
            priorArgs = process.argv;

        if (process.platform === 'cygwin' && priorArgs) {
            priorArgs = ['/usr/bin/bash', '--login', '-c', 'cd ' + process.cwd() + ' && ' + priorArgs.join(' ')];
        }

        var env = {};
        for (var i in process.env) {
            env[i] = process.env[i];
        }

        var createChild = function (i) {

            var childConnection = netBinding.socketpair();
            env._CHILD_ID_ = i;

            //Spawn the child process
            var child = children[i] = childProcess.spawn(
                priorArgs[0],
                priorArgs.slice(1),
                env,
                [childConnection[1], 1, 2]
            );
            child.master = new net.Stream(childConnection[0], 'unix');

            (function (child) {
                var masterChildConnection = netBinding.socketpair();
                process.nextTick(function () {
                    var stream = new net.Stream(masterChildConnection[0], 'unix');
                    emitter.emit('child', stream);
                    stream.resume();
                    child.master.write('master', 'ascii', masterChildConnection[1]);
                });
            }(child));

        };
        for (i = 0; i < numChildren; i++) {
            createChild(i);
        }
        ['SIGINT', 'SIGTERM', 'SIGKILL', 'SIGQUIT', 'SIGHUP', 'exit'].forEach(function (signal) {
            process.addListener(signal, function () {
                children.forEach(function (child) {
                    try {
                        child.kill();
                    } catch (e) {}
                });
                //We use SIGHUP to restart the children
                if (signal !== 'exit' && signal !== 'SIGHUP') {
                    process.exit();
                }
            });
        });
    }

    return emitter;
};

/**
 * Pass in a raw unframed binary stream, and returns a framed stream for sending and
 * receiving strings or other JSON data.
 *
 * `trusted` indicates to use eval-based parsing (much faster).
 *
 * @param {Object} stream
 * @param {Boolean} trusted (optional)
 * @api public
 */

exports.frameStream = function (stream, trusted) {
    var parse = trusted ? function (json) {
        return eval('(' + json + ')');
    } : JSON.parse;
    var emitter = new process.EventEmitter(),
        buffered = [], start;

    var condense_buffered = function () {
        var totalSize = 0;
        buffered.forEach(function (part) {
            totalSize += part.length;
        });
        var buffer = new Buffer(totalSize);
        var index = 0;
        buffered.forEach(function (part) {
            part.copy(buffer, index, 0, part.length);
            index += part.length;
        });
        buffered = [];
        return buffer;
    };

    stream.addListener('data', function (data) {
        start = 0;
        for (var i = 0, l = data.length; i < l; i++) {
            var b = data[i];
            if (b === 0) {
                start = i + 1;
            } else if (b === 255) {
                if (start === i) {

                    //Handle the special case where the end frame is the first char received
                    emitter.emit('message', parse(condense_buffered().toString('utf8')));

                } else {

                    var buffer = data.slice(start, i);
                    if (buffered.length) {
                        buffered.push(buffer);
                        buffer = condense_buffered();
                    }

                    emitter.emit('message', parse(buffer.toString('utf8', 0, buffer.length)));
                }
                start = i + 1;
            }
        }
        if (start < l) {
            buffered.push(data.slice(start, data.length));
        }
    });
    emitter.send = function (message) {
        var buffer = new Buffer(JSON.stringify(message), 'utf8');
        var framedBuffer = new Buffer(buffer.length + 2);
        framedBuffer[0] = 0;
        buffer.copy(framedBuffer, 1, 0, buffer.length);
        framedBuffer[framedBuffer.length - 1] = 255;
        stream.write(framedBuffer); 
    };
    emitter.on = emitter.addListener;
    return emitter;
};
exports.frameStreamLengthEncoded = function (stream) {
    var emitter = new process.EventEmitter();
    var buffer, bufferIndex;
    stream.addListener('data', function (data) {
        while (data.length) {
            if (buffer && (buffer.length - bufferIndex > data.length)) {
                data.copy(buffer, bufferIndex, 0, data.length);
                bufferIndex += data.length;
            } else {
                if (buffer) {
                    data.copy(buffer, bufferIndex, 0, buffer.length - bufferIndex);
                    emitter.emit('message', buffer.toString('utf8', 0, buffer.length));
                    data = data.slice(buffer.length - bufferIndex, data.length);
                }
                if (data.length) {
                    buffer = new Buffer((data[index] << 24) + (data[index + 1] << 16)  + (data[index + 2] << 8) + (data[index + 3]));
                    bufferIndex = 0;
                    data = data.slice(4, data.length);
                } else {
                    buffer = null;
                }
            }
        }
    });
    emitter.send = function (message) {
        var buffer = new Buffer(message, 'utf8');
        stream.write(new Buffer([buffer.length >> 24, buffer.length >> 16 & 255, buffer.length >> 8 & 255, buffer.length & 255])); 
    };
    return emitter;
};
