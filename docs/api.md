A job takes the form of
    
    var Job = require('node.io').Job;
    var options = {}, methods = {};
    exports.job = new Job(option, methods);
    
Or in CoffeeScript

    nodeio = require('node.io');
    class Job extends nodeio.JobClass
        //methods
    @job = new Job(options);

# Methods

**Global job methods**

    this.emit(result)               //Emits a result to the next stage of processing
    this.skip()  OR  this.finish()  //Cancels the thread and discards the input
    this.exit(msg)                  //Exits the job with an optional error message
    this.retry()                    //Retries the thread
    this.add(input)                 //Dynamically add input to the queue

**input()**  

_Default: read lines from STDIN - auto-detects newline_ 

Examples

    input: [0,1,2]                  //Array input 
    input: '/path/file.txt'         //Reads lines from a file - auto-detects newline
    input: '/path/to/dir/'          //Reads all files in a directory
    input: false                    //Runs the job once
    input: true                     //Runs the job indefinitely
    
To input from a stream

    input: function() {
        this.inputStream(stream);
    }
    
To write your own input function (e.g. to read rows from a database)

    input: function(start, num, callback) {
        //callback takes (err, input)
    }

**output()**  

_Default: write lines to STDOUT_
    
Note: `output` is called periodically rather than at the completion of a job so that very large or continuous IO can be handled
    
    output: '/path/file.txt'    //Outputs lines to a file
    output: false               //Ignores output

To output to a stream

    output: function() {
        this.outputStream(stream);
        this.output.apply(this, arguments);
    }

To write your own output function

    output: function(output) {
        //Note: this method always receives an array
        output.forEach(function(line) {
            console.log(line);
        });
    }

**run()**  

_Default: passes through input_

Takes some input to use or transform.

    run: function(line) {
        this.emit(line.length);
    }

**reduce()**

Called before job.output()

    reduce: function(lines) {
        //Note: this method always receives an array
        
        var emit = [];
        lines.forEach(function(line) {
            if (line.indexOf('foo') > 0) emit.push(line);    
        });
        this.emit(emit);
    }

**fail()**

Called if a thread fails. A thread can fail if it times out, exceeds the maximum number of retries, makes a bad request, spawns a bad command, etc.

    fail: function(input, status) {
        console.log(input+' failed with status: '+status);
        this.emit('failed');
    }

**complete()**

Called once the job is complete

    complete: function() {
        console.log('Job complete.');
    }

## Options
    
**max** _(default: 1)_

The maximum number of `run` methods allowed to run concurrently, per process

**take** _(default: 1)_

How many lines / elements of input to send to each `run` method

Example when take = 2

    input: [0,1,2,3,4],
    run: function(input) {
        console.log(input);  //Outputs [0,1] \n [2,3] \n [4] \n
    } 

**retries** _(default: 2)_

The maximum number of times some input can be retried before `fail` is called

**timeout** _(default: false)_

The maximum amount of time (in seconds) each thread has before `fail` is called 

**global_timeout** _(default: false)_

The maximum amount of time (in seconds) the entire job has to complete before exiting with an error

**flatten** _(default: true)_

If `run` emits an array, this option determines whether each emitted array is flattened before being output

Example (when max = 3)

    run: function() {
        this.emit([1,2,3]);
    }
    output: function(output) {
        console.log(output);
        //With flattening, outputs [1,2,3,1,2,3,1,2,3] 
        //Without, outputs [[1,2,3],[1,2,3],[1,2,3]]
    }
    
**benchmark** _(default: false)_

If this is true, node.io outputs benchmark information on a job's completion: 1) completion time, 2) bytes read + speed, 3) bytes written + speed

**fork** _(default: false)_

Whether to use child processes to distribute processing. Set this to the number of desired workers

**input** _(default: false)_

This option is used to set a limit on how many lines/rows/elements are input before forcing job complete

Example when input = 2

    input: [0,1,2]
    run: function(num) {
        console.log(num); //Outputs 0 \n 1 \n
    }
    
**recurse** _(default: false)_

If `input` is a directory, this option is used to recurse through each subdirectory

**read_buffer** _(default: 8096)_

The read buffer to use when reading files

**newline** _(default: \n)_

The char to use as newline when outputting data. Input newlines are automatically detected

**encoding** _(default: 'utf8')_

The encoding to use when reading / writing files

## Working with IO

To read or write to a file inside a job, use the following methods. Both methods are synchronous if no callback is provided

    this.read(file, [callback]);
    this.write(file, data, [callback]); 
   
## Making requests

..

## Making proxied requests

..

## DOM selection / traversal

..
 
## Executing commands

To execute a command, use the following methods. Callback takes the format of (err, stdout, stderr)

    this.exec(cmd, callback);
    this.spawn(cmd, stdin, callback);       //Same as exec, but can write to the commands STDIN
    