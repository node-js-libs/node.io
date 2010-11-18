A job takes the form of
    
    var Job = require('node.io').Job;
    var options = {}, methods = {};
    exports.job = new Job(option, methods);
    
Or in CoffeeScript

    nodeio = require('node.io');
    class Job extends nodeio.JobClass
        //methods
    @job = new Job(options);

# Job methods

Note: none of these methods are compulsory.

**input** _(default: read lines from STDIN - auto-detects newline)_ 

Examples

    input: [0,1,2]              //Array input 
    input: '/path/file.txt'     //Reads lines from a file - auto-detects newline
    input: '/path/to/dir/'      //Reads all files in a directory
    input: false                //Runs the job once
    input: true                 //Runs the job indefinitely
    
To write your own input function (e.g. to read rows from a database)

    input: function(start, num, callback) {
        //callback takes (err, input)
    }

**output** _(default: write lines to STDOUT)_
    
    output: '/path/file.txt'    //Outputs lines to a file
    output: false               //Ignores output

To write your own output function

    output: function(output) {
        //Note: this method always receives an array
        output.forEach(function(line) {
            console.log(line);
        });
    }

**run** _(default: passes through input)_

Takes one line / row of input to use or transform. To emit a result, call this.emit(result)

    run: function(line) {
        this.emit(line.length);
    }

**reduce**

Called before job.output()

    reduce: function(lines) {
        //Note: this method always receives an array
        
        var emit = [];
        lines.forEach(function(line) {
            if (line.indexOf('foo') > 0) emit.push(line);    
        });
        this.emit(emit);
    }

**complete**

Called once the job is complete

    complete: function() {
        console.log('Job complete.');
    }

## Job options
    
**max** _(default: 1)_


