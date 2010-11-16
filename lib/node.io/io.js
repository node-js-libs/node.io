var fs = require('fs'),
    util = require('util'),
    Job = require('./job').Job;
    
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
            self.error_hook('This module expects input. Override the input method or call `node.io -i [FILE] module` or `cat [FILE] | node.io module` to input a file');
        }
    }, 100);
    
    this.input.apply(this, arguments);
}

//Default output behaviour is to write to STDOUT
Job.prototype.output = function(data) {
    this.output_streams.stdout = process.stdout;
    this.output = function(data) {
        this.write('stdout', data);
    }
    this.output.apply(this, arguments);
}

Job.prototype.inputFromFile = function(path) {        
    var stream = fs.createReadStream(path, {bufferSize:this.options.read_buffer});
    this.initInputStream(stream);
    this.input = this.takeInputStreamLines;
}

Job.prototype.inputFromStdin = function(path) {
    var stream = process.openStdin();
    this.initInputStream(stream);
    this.input = this.takeInputStreamLines;
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
        return files.slice(start, start+num);
    }
    
    //Provide a method to aid in recursing subdirectories
    this.recurseIfDirectory = function(path) {
        try {
            var stat = fs.statSync(path);
            if (!stat.isDirectory()) {
                return false;
            }
        } catch (e) {
            return false;
        }
        
        var dir_contents = fs.readdirSync(path),
            dir_files = [];
        
        path = trim_slash(path);
        
        dir_contents.forEach(function(file) {
            dir_files.push(path + '/' + file);
        });
        
        //Use the addInput() hook rather than files.push(file) so that recursing
        //plays nice with multiple processes (i.e. is shared evenly)
        self.addInput(dir_files);
        
        self.skip();
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
        end: false
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
    
    //Last line is incomplete
    this.input_stream.last_line = this.input_stream.lines.pop();
    self.bytes_read--;
    
    if (this.input_stream.lines.length > 5000) {
        this.input_stream.stream.pause();
    }
}

Job.prototype.takeInputStreamLines = function(start, num, callback, read_id) {
    var self = this;
        
    if (this.input_stream.stream.paused && this.input_stream.lines.length <= 1000) {
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
        var stat = fs.statSync(path);
        if (stat.isFile()) {
        
            //Write output to the file
            this.output = function(data) {
                self.write(path, data);
            }
            
        } else {
            this.error_hook('Unknown output: '+path);
        }
        
    }
    
    //If input is false, return as much input as the processor is asking for (i.e. job will run forever)
    if (this.input === false) {
        this.input = function(start, num) {
            var arr = [];
            while (num--) arr.push(null);
            return arr;
        }
    }
    
    //If output is false, discard
    if (this.output === false) {
        this.output = function() {}
    }
    
    //If input is an array, splice it for input
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
    
    //If the job is to be run once, force input() to return false on the second call
    if (this.options.once) {
        this.options.fork = false;
        this.options.distribute = false;
        this.options.max = 1;
        var input = this.input;
        var run_once = false;
        this.input = function(start, num) {
            if (!run_once) {
                run_once = true;
                return input(start, num);
            } else {
                return false;
            }
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

//Append data to file. If data is an array, output each value on a new line
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
