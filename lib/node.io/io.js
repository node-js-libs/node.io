/*!
 * node.io
 * Copyright(c) 2010 Chris O'Hara <cohara87@gmail.com>
 * MIT Licensed
 */

var fs = require('fs'),
    util = require('util'),
    Job = require('./job').JobProto;
    
//Used to ensure reads/writes are returned/performed in the same order as they are requested
var write_request_id = read_request_id = last_write_id = last_read_id =  1;

//Default input behaviour is to read from STDIN
Job.prototype.input = function(start, num, callback) {
    var self = this;
    
    this.inputFromStdin();
    
    //Is there a better way to check for a lack of stdin data?
    setTimeout(function() {
        if (!self.input_stream.data) {
            self.input_stream.stream.destroy();
            self.error_hook('This module expects input. Override the job\'s input method or call `node.io -i [INPUT] module`');
        }
    }, 100);
    
    this.input.apply(this, arguments);
}

//Default output behaviour is to write to STDOUT
Job.prototype.output = function(data) {
    this.outputStream(process.stdout, 'stdout');
    this.output.apply(this, arguments);
}

Job.prototype.inputStream = function(stream) {
    this.initInputStream(stream);
    this.input = this.takeInputStreamLines;
}

Job.prototype.outputStream = function(stream, name) {
    name = name || Math.floor(Math.random() * 1000000);
    this.output_streams[name] = stream;
    this.output = function(data) {
        this.write(name, data);
    }
}

Job.prototype.inputFromFile = function(path) {        
    var stream = fs.createReadStream(path, {bufferSize:this.options.read_buffer});
    this.inputStream(stream);
}

Job.prototype.inputFromStdin = function(path) {
    var stream = process.openStdin();
    this.inputStream(stream);
}

Job.prototype.inputFromDirectory = function(path) {
    var self = this, files = fs.readdirSync(path);
        
    //Trim trailing slash
    var trim_slash = function(path) {
        if (path[path.length-1] === '/') {
            path = path.substr(0, path.length-1);
        }
        return path;
    }
    path = trim_slash(path);
    
    //Store full paths 
    for (var i = 0, l = files.length; i < l; i++) {
        files[i] = path + '/' + files[i];
    }
    
    this.input = function(start, num) {
        if (files.length > start) {
            return files.slice(start, start+num);
        } else {
            return false;
        }
    }
        
    //Recurse subdirectories if the `recurse` op is set
    if (this.options.recurse) {
        
        var run_method = this.run;
        
        this.run = function(path) {
            var run_args = arguments;
            
            self = this;
            
            fs.stat(path, function(err, stat) {
            
                if (err) self.exit(err);
                                
                if (!stat.isDirectory()) {
                                        
                    //If it's not a directory, continue as normal
                    run_method.apply(self, [path]);
                    
                } else {
                                        
                    fs.readdir(path, function(err, files) {
                        if (err) self.exit(err);
                        
                        var dir_files = [];
                    
                        path = trim_slash(path);
                                                
                        files.forEach(function(file) {
                            dir_files.push(path + '/' + file);
                        });
                        
                        //Use the addInput() hook rather than files.push(file) so that recursing
                        //plays nice with multiple processes (i.e. is shared evenly)
                        self.add(dir_files);
                        self.skip();
                    });
                }
            });
        }
    }
}

Job.prototype.initInputStream = function(stream) {
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
        data: false,
        end: false,
        paused: false
    }
    
    var end = function() {
        self.input_stream.end = true;
        if (self.input_stream.last_line.length) {
            self.input_stream.lines.push(self.input_stream.last_line);
            self.input_stream.last_line = '';
        }
    }
    
    var data = function(data) {        
        if (self.input_stream.end) return;
        self.input_stream.data = true;
        self.handleInputStream(data);
        if (data.length < stream.bufferSize) {
            end();
        }
    }
    
    this.input_stream.stream.on('data', data);
    this.input_stream.stream.on('end', end);
    
    if (this.error_hook) {
        this.input_stream.stream.on('error', this.error_hook);
    }
}

Job.prototype.handleInputStream = function(data) {    
    var self = this;
        
    data = this.input_stream.last_line + data;
                    
    data.split('\n').forEach(function(line) {
        if (line[line.length-1] === '\r') {
            line = line.substr(0, line.length-1);
            self.bytes_read++;
        }
        self.bytes_read += line.length + 1;
        self.input_stream.lines.push(line);
    });
    
    self.bytes_read--;
    
    //Last line is incomplete
    this.input_stream.last_line = this.input_stream.lines.pop();
    
    if (this.input_stream.lines.length > 5000) {
        this.input_stream.stream.pause();
        this.input_stream.paused = true;
    }
}

Job.prototype.takeInputStreamLines = function(start, num, callback, read_id) {
    var self = this;
                
    if (this.input_stream.paused && this.input_stream.lines.length <= 2000) {
        this.input_stream.paused = false;
        this.input_stream.stream.resume();
    }
    
    //Ensure lines are returned in the same order they are requested
    var read_id = read_id || read_request_id++;
    
    if (this.input_stream.end || this.input_stream.lines.length >= num) {
    
        var return_lines = function() {
            if (read_id !== last_read_id) {
                //Wait for a previous request to return lines
                process.nextTick(return_lines);
            } else {
                last_read_id++;
                callback(self.input_stream.lines.length ? self.input_stream.lines.splice(0, num) : false);
            }
        }
        return_lines();
        
    } else {
        process.nextTick(function() {
            self.takeInputStreamLines(start, num, callback, read_id)
        });
    }
}

Job.prototype.handleSpecialIO = function() {
    var self = this;
        
    //If output is a string, assume it's a file and write to it when ouput is called
    if (typeof this.output === 'string') {
        var path = this.output;
        //Write output to the file
        this.output = function(data) {
            self.write(path, data);
        }
    }
    
    //If input is true, return as much input as the processor is asking for (i.e. job will run forever)
    if (this.input === true) {
        this.input = function(start, num) {
            var arr = [];
            while (num--) arr.push(null);
            return arr;
        }
    }
    
    //If input is false, run the job once
    if (this.input === false) {
        this.options.fork = false;
        this.options.max = 1;
        this.options.take = 1;
        var run_once = false;
        this.input = function(start, num) {
            if (!run_once) {
                run_once = true;
                return [null];
            } else {
                return false;
            }
        }
    }
    
    //If output is false, discard output
    if (this.output === false) {
        this.output = function() {}
    }
    
    //If input is an array, slice it for input
    if (this.input instanceof Array) {
        var arr = this.input;
        this.input = function(start, num) {
            if (start >= arr.length) return false;
            return arr.slice(start, start+num);
        }
    }
    
    //If input is a string, assume it's a file or directory
    if (typeof this.input === 'string') {
        var path = this.input;
        var stat = fs.statSync(path);
        if (stat.isFile()) {
        
            //Read lines from the file
            this.inputFromFile(path);
            
        } else if (stat.isDirectory()) {
        
            //Return all files in the directory
            this.inputFromDirectory(path);
            
        } else {
            this.error_hook('Unknown input: '+path);
        }
    }
}

Job.prototype.read = function(file, callback) {
    if (callback) {
        fs.readFile(file, this.options.encoding, callback);
    } else {
        return fs.readFileSync(file, this.options.encoding);
    }
}

//Write data to file. If data is an array, output each value on a new line
//Data is written in the same order as write() is called
Job.prototype.write = function(file, data, callback) {
    var self = this;
    
    if (typeof this.output_streams[file] === 'undefined') {
        this.output_streams[file] = fs.createWriteStream(file,{encoding:this.options.encoding});
        
        this.output_streams[file].on('error', function(err) {
            self.error_hook(err);
        });
    }
    
    //Ensure data is written in the same order as write() is called
    var write_id = write_request_id++;
    
    var write_lines = function() {
        if (write_id !== last_write_id) {
                    
            //Wait for a previous requests
            process.nextTick(write_lines);
            
        } else {
            last_write_id++;
    
            var str = dataToString(data, self.options.newline);
            var written = self.output_streams[file].write(str);
            
            self.bytes_written += str.length;
            
            if (callback) {
                written ? callback() : self.output_streams[file].on('drain', callback);
            }
        }
    }
    write_lines();
}

function dataToString(data, newline, stringify_array) {
    var str = '';
    if (!stringify_array && data instanceof Array) {
        data.forEach(function(line) {
            str += dataToString(line, newline, true);
        });
    } else if (typeof data === 'object') {
        str = JSON.stringify(data) + newline;
    } else {
        str = data + newline;
    }
    return str;
}

Job.prototype.getBytesRead = function() {
    return this.bytes_read;
}

Job.prototype.getBytesWritten = function() {
    return this.bytes_written;
}
