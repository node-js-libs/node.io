/*!
 * node.io
 * Copyright(c) 2010 Chris O'Hara <cohara87@gmail.com>
 * MIT Licensed
 */

var fs = require('fs'),
    utils = require('./utils'),
    Job = require('./job').JobProto;

//Used to ensure reads/writes are returned/performed in the same order as they are requested
var write_request_id = 1, read_request_id = 1, 
    last_write_id = 1,  last_read_id = 1;

/**
 * The default job input method - read from STDIN.
 *
 * @param {Number} start
 * @param {Number} num
 * @param {Function} callback
 * @api public
 */
Job.prototype.input = function (start, num, callback) {
    this.debug('Reading from STDIN');
    var stream = process.openStdin();
    this.inputStream(stream);
    this.input.apply(this, arguments);
};

/**
 * The default job output method - write to STDOUT.
 *
 * @param {String} data
 * @api public
 */
Job.prototype.output = function (data) {
    this.debug('Writing to STDOUT');
    this.outputStream(process.stdout, 'stdout');
    this.output.apply(this, arguments);
};

/**
 * Reads input from the specified stream. Replaces subsequent
 * calls to job.input().
 *
 * @param {Object} stream
 * @api public
 */
Job.prototype.inputStream = function (stream) {
    this.initInputStream(stream);
    this.input = this.takeInputStreamLines;
};

/**
 * Writes output to the specified stream. Replaces subsequent 
 * calls to job.output().
 *
 * @param {Object} stream
 * @param {String} name (optional)
 * @api public
 */
Job.prototype.outputStream = function (stream, name) {
    name = name || Math.floor(Math.random() * 1000000);
    this.output_streams[name] = stream;
    this.output = function (data) {
        this.write(name, data);
    };
};

/**
 * Reads input from the specified file.
 *
 * @param {String} path
 * @api public
 */
Job.prototype.inputFromFile = function (path) {
    this.debug('Reading from ' + path);
    this.in_file = path;
    var stream = fs.createReadStream(path, {bufferSize: this.options.read_buffer});
    this.inputStream(stream);
};

/**
 * Finds all files in the specified directory and returns each file 
 * path as input. To recurse subdirectories, set the `recurse` op.
 *
 * @param {String} path
 * @api public
 */
Job.prototype.inputFromDirectory = function (path) {
    var self = this, files = fs.readdirSync(path);

    this.debug('Reading files in ' + path);

    //Trim trailing slash
    var trim_slash = function (path) {
        if (path[path.length - 1] === '/') {
            path = path.substr(0, path.length - 1);
        }
        return path;
    };
    path = trim_slash(path);

    //Store full paths 
    for (var i = 0, l = files.length; i < l; i++) {
        files[i] = path + '/' + files[i];
    }

    this.input = function (start, num) {
        if (files.length > start) {
            return files.slice(start, start + num);
        } else {
            return false;
        }
    };

    //Recurse subdirectories if the `recurse` op is set
    if (this.options.recurse) {

        var run_method = this.run;

        this.run = function (path) {
            self = this;
            fs.stat(path, function (err, stat) {

                if (err) {

                    self.exit(err);
                }

                if (!stat.isDirectory()) {

                    //If it's not a directory, continue as normal
                    run_method.apply(self, [path]);

                } else {

                    fs.readdir(path, function (err, files) {
                        if (err) {
                            self.exit(err);
                        }

                        var dir_files = [];

                        path = trim_slash(path);

                        for (var i = 0, l = files.length; i < l; i++) {
                            dir_files.push(path + '/' + files[i]);
                        }

                        //Use the addInput() hook rather than files.push(file) so that recursing
                        //plays nice with multiple processes (i.e. is shared evenly)
                        self.add(dir_files);
                        self.skip();
                    });
                }
            });
        };
    }
};

/**
 * Initialises the specified input stream and adds event handlers.
 *
 * @param {Object} stream
 * @api public
 */
Job.prototype.initInputStream = function (stream) {
    var self = this;

    //Clear any previous input stream
    if (this.input_stream && this.input_stream.stream) {
        this.input_stream.stream.destroy();
    }

    stream.setEncoding('utf8');

    this.input_stream = {
        stream: stream,
        lines: [],
        last_line: '',
        end: false,
        paused: false
    };

    this.input_stream.stream.on('data', function (data) {        
        if (self.input_stream.end) return;
        self.handleInputStream(data);
        self.bytes_read += data.length;
    });

    this.input_stream.stream.on('end', function () {
        self.input_stream.end = true;
        if (self.input_stream.last_line.length) {
            self.input_stream.lines.push(self.input_stream.last_line);
            self.input_stream.last_line = '';
        }
    });

    this.input_stream.stream.on('error', this.exit);
};

/**
 * Handles chunks of data from the input stream. 
 *
 * @param {String} data
 * @api public
 */
Job.prototype.handleInputStream = function (data) {    
    var self = this;

    data = this.input_stream.last_line + data;

    var lines = data.split('\n'), line, line_length;

    for (var i = 0, l = lines.length; i < l; i++) {
        line = lines[i];
        line_length = line.length;
        if (line[line_length - 1] === '\r') {
            line = line.substr(0, line_length - 1);
        }
        self.input_stream.lines.push(line);
    }

    //Last line is incomplete
    this.input_stream.last_line = this.input_stream.lines.pop();

    if (this.input_stream.lines.length > 10000) {
        this.input_stream.stream.pause();
        this.input_stream.paused = true;
    }
};

/**
 * Returns lines (\n or \r\n terminated) from the input stream. Lines are returned
 * in the same order as they are requested.
 *
 * @param {Number} start
 * @param {Number} num
 * @param {Function} callback
 * @api public
 */
Job.prototype.takeInputStreamLines = function (start, num, callback, read_id) {
    var self = this;

    if (this.input_stream.paused && this.input_stream.lines.length <= 5000) {
        this.input_stream.paused = false;
        this.input_stream.stream.resume();
    }

    read_id = read_id || read_request_id++;

    if (this.input_stream.end || this.input_stream.lines.length >= num) {

        var return_lines = function () {
            if (read_id !== last_read_id && !self.input_stream.end) {
                //Wait for a previous request to return lines
                utils.tick(return_lines);
            } else {
                last_read_id++;
                callback(self.input_stream.lines.length ? self.input_stream.lines.splice(0, num) : false);
            }
        };
        return_lines();

    } else {
        utils.tick(function () {
            self.takeInputStreamLines(start, num, callback, read_id);
        });
    }
};

/**
 * Handles special job method definitions.
 *
 * @api public
 */
Job.prototype.handleSpecialIO = function () {
    var self = this;

    //If output is a string, assume it's a file and write to it when ouput is called
    if (typeof this.output === 'string') {
        this.out_file = this.output;

        this.debug('Writing to ' + this.out_file);

        //Write output to the file
        this.output = function (data) {
            self.write(this.out_file, data);
        };
    }

    //If input is true, return as much input as the processor is asking for (i.e. job will run forever)
    if (this.input === true) {
        this.input = function (start, num) {
            var arr = [];
            while (num--) {
                arr.push(null);
            }
            return arr;
        };
    }

    //If input is false, run the job once
    if (this.input === false) {
        this.options.fork = false;
        this.options.max = 1;
        this.options.take = 1;
        var run_once = false;
        this.input = function (start, num) {
            if (!run_once) {
                run_once = true;
                return [null];
            } else {
                return false;
            }
        };
    }

    //If output is false, discard output
    if (this.output === false) {
        this.output = function () {};
    }

    //If input is an array, slice it for input
    if (this.input instanceof Array) {
        var arr = this.input;
        this.input = function (start, num) {
            return start >= arr.length ? false : arr.slice(start, start + num);
        };
    }

    //If input is a string, assume it's a file or directory
    if (typeof this.input === 'string') {

        var path = this.input, stat = fs.statSync(path);

        this.debug('Reading from ' + path);

        if (stat.isFile()) {

            //Read lines from the file
            this.inputFromFile(path);

        } else if (stat.isDirectory()) {

            //Return all files in the directory
            this.inputFromDirectory(path);

        } else {
            this.exit('Unknown input: ' + path);
        }
    }
};

/**
 * Reads all data from the specified file. If `callback` isn't specified
 * the operation is synchronous.
 *
 * @param {String} file
 * @param {Function} callback
 * @api public
 */
Job.prototype.read = function (file, callback) {
    if (callback) {
        fs.readFile(file, this.options.encoding, callback);
    } else {
        return fs.readFileSync(file, this.options.encoding);
    }
};

/**
 * Writes data to the specified file. Writes are performed in the same order as 
 * write() is called.
 *
 * @param {String} file
 * @param {String} data
 * @param {Function} callback (optional)
 * @api public
 */
Job.prototype.write = function (file, data, callback) {
    var self = this;

    //Cache FD's
    if (typeof this.output_streams[file] === 'undefined') {
        var write_mode = {flags: 'w', mode: 0644, encoding: this.options.encoding};
        this.output_streams[file] = fs.createWriteStream(file, write_mode);
        this.output_streams[file].on('error', self.exit);
    }

    //Ensure data is written in the same order as write() is called
    var write_id = write_request_id++;

    var write_lines = function () {
        if (write_id !== last_write_id) {

            //Wait for a previous requests
            utils.tick(write_lines);

        } else {
            last_write_id++;

            var str = utils.dataToString(data, self.options.newline);
            var written = self.output_streams[file].write(str);

            if (file !== 'stdout') {
                self.bytes_written += str.length;
            }

            if (callback) {
                if (written) {
                    callback();
                } else {
                    self.output_streams[file].on('drain', callback);
                }
            }
        }
    };
    write_lines();
};

/**
 * Appends data to the specified file. Writes are performed in the same order as 
 * append() is called.
 *
 * @param {String} file
 * @param {String} data
 * @param {Function} callback (optional)
 * @api public
 */
Job.prototype.append = function (file, data, callback) {
    var self = this;
    if (typeof this.output_streams[file] === 'undefined') {
        var write_mode = {flags: 'a', mode: 666, encoding: this.options.encoding};
        this.output_streams[file] = fs.createWriteStream(file, write_mode);
        this.output_streams[file].on('error', self.exit);
    }
    this.write.apply(this, arguments);
};

/**
 * Waits for all output streams to drain before calling `callback`.
 *
 * @param {Function} callback
 * @api public
 */
Job.prototype.waitForOutputStreamDrains = function (callback) {
    var self = this;
    if (this.out_file) {
        this.status('Waiting on output stream(s) to drain..');
    }
    var wait_for_drain = function () {
        var keep_waiting = false;
        for (var i in self.output_streams) {
            var stream = self.output_streams[i];
            if (stream._queue) {
                if (stream._queue.length === 0) {
                    stream.end();
                } else {
                    keep_waiting = true;
                }
            } else if (stream._writeQueue) {
                if (stream._writeQueue.length === 0) {
                    stream.end();
                } else {
                    keep_waiting = true;
                }
            } else {
                continue;
            }
        }
        if (keep_waiting) {
            setTimeout(wait_for_drain, 100);
        } else {
            //Done!
            callback();
        }
    };
    wait_for_drain();
}

/**
 * Parses a line into values using the specified delimiter, quote and
 * quote escape char. The second parameter can also be 'csv' or 'tsv'
 * which parses the line using the default Comma/Tab Separated Values
 * configuration.
 *
 * @param {String} line
 * @param {String} delim
 * @param {String} quote (optional)
 * @param {String} quote_escape (optional)
 * @api public
 */
var cache = {};
Job.prototype.parseValues = function(line, delim, quote, quote_escape) {
    if (typeof delim === 'undefined' || delim === 'csv') {
        delim = ',';
    } else if (delim === 'tsv') {
        delim = '\t';
    }
    quote = quote || '"';
    quote_escape = quote_escape || '"';

    //Check for cached regex patterns
    var match, clean, q;
    if (typeof cache[''+delim+quote+quote_escape] !== 'undefined') {

        var patterns = cache[''+delim+quote+quote_escape];
        match = patterns[0];
        clean = patterns[1];
        q = patterns[2];

    } else {

        //Escape special regex chars
        var d, escape = function (str) {
            return str.replace(new RegExp('[.*+?|()\\[\\]{}]', 'g'), '\\$&');
        }

        d = escape(delim);
        e = escape(quote_escape);
        q = escape(quote);

        match = new RegExp(
            '(' + d + '|^)' +
            '(?:' + q + '([^' + q + ']*(?:' + e + q + '[^' + q + ']*)*)' + q + '|' +
            '([^' + q + d + ']*))'
        , 'g');

        clean = new RegExp(e + q, 'g');

        //Cache the patterns for subsequent calls
        cache[delim+quote+quote_escape] = [match, clean, q];
    }

    var matches = null, value, csv = [];

    while (matches = match.exec(line)) {
        if (!matches[1] && csv.length) {
            break;
        } else if (matches[2]) {
            value = matches[2].replace(clean, q);
        } else {
            value = matches[3] || '';
        }
        csv.push(value);
    }

    return csv;
}

/**
 * The opposite of parseValues. Writes values to a line using the specified
 * separation characters or configuration (csv / tsv).
 *
 * @param {String} values
 * @param {String} delim
 * @param {String} quote (optional)
 * @param {String} quote_escape (optional)
 * @api public
 */
Job.prototype.writeValues = function(values, delim, quote, quote_escape) {
    if (typeof delim === 'undefined' || delim === 'csv') {
        delim = ',';
    } else if (delim === 'tsv') {
        delim = '\t';
    }
    quote = quote || '"';
    quote_escape = quote_escape || '"';

    if (values instanceof Array) {
        var quoted_values = [], value,
            quote_reg = new RegExp('[' + quote + ']', 'g'),
            requires_quotes = new RegExp('[' + delim + '\r\n]');

        for (var i = 0, l = values.length; i < l; i++) {
            value = values[i] == null ? '' : '' + values[i];
            if (value && value.indexOf(quote) > -1) {
                value = quote + value.replace(quote_reg, quote_escape + quote) + quote;
            } else if (value == '' || requires_quotes.test(value)) {
                value = quote + value + quote;
            }
            quoted_values.push(value);
        }
        values = quoted_values.join(delim);
    }
    return values;
}

/**
 * Returns the total bytes read by any read() calls or input streams.
 *
 * @return {Number} bytes_read
 * @api public
 */
Job.prototype.getBytesRead = function () {
    return this.bytes_read;
};

/**
 * Returns the total bytes written by any write() or append() calls.
 *
 * @return {Number} bytes_written
 * @api public
 */
Job.prototype.getBytesWritten = function () {
    return this.bytes_written;
};
