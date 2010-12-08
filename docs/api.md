# Methods

**input()**  

_Default: read lines from STDIN (auto-detects newline)_ 

Examples

    input: [0,1,2]                  //Array input 
    input: '/path/file.txt'         //Reads lines from a file (auto-detects newline)
    input: '/path/to/dir/'          //Reads all files in a directory
    input: false                    //Runs the job once
    input: true                     //Runs the job indefinitely
    
To input from a stream

    input: function() {
        this.inputStream(stream);
    }
    
To write your own input function, use

    input: function(start, num, callback) {
        //
    }

- `start` = the offset. Starts at zero
- `num` = the number of rows / lines to return
- `callback` = in the format `callback(err, input)`
- When there's no input left, call `callback(null, false)`

**output()**  

_Default: write lines to STDOUT_
    
Note: `output` is called periodically rather than at the completion of a job so that very large or continuous IO can be handled
    
    output: '/path/file.txt'    //Outputs lines to a file
    output: false               //Ignores output

To output to a stream

    output: function(out) {
        this.outputStream(stream);
        this.output(out);
    }

To write your own output function

    output: function(output) {
        //Note: this method always receives an array of output
        output.forEach(function(line) {
            console.log(line);
        });
    }

**run()**  

_Default: passes through input to the next stage of processing_

Takes some input to use or transform

    run: function(line) {
        this.emit(line.length);
    }

The following methods are available in `run` to control flow

    this.emit(result)               //Emits a result to the next stage of processing
    this.skip()  OR  this.finish()  //Cancels the thread and discards the input
    this.exit(msg)                  //Exits the job with an optional error message
    this.retry()                    //Retries the thread
    this.add(input)                 //Dynamically add input to the queue

**reduce()**

_Default: passes through input to the next stage of processing_

Called before `output`. Use `emit` as normal

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

**proxy** _(default: false)_

All requests will be made through this proxy. Alternatively, you can specify a function that returns a proxy (e.g. to cycle proxies).

**redirects** _(default: 3)_

The maximum number of redirects to follow before calling `fail`



**args** _(default: [])_

Any extra arguments when calling node.io from the command line are stored here.

Example

    $ node.io myjob arg1 arg2
        => options.args = ['arg1','arg2']

## Working with IO

To read or write to a file inside a job, use the following methods. Both methods are synchronous if no callback is provided

    this.read(file, [callback]);
    this.write(file, data, [callback]); 
   
## Making requests

To make a request, use the following methods.

**this.get(url, _[headers]_, callback, _[parse]_)**  _headers and parse are optional_

Makes a GET request to the URL and returns the result - callback takes `err, data, headers`

`parse` is an optional callback used to decode / pre-parse the returned data

Example

    this.get('http://www.google.com/', function(err, data, headers) {
        console.log(data);
    });     

**this.getHtml(url, _[headers]_, callback, _[parse]_)**

The same as above, except callback takes `err, $, data, headers` where `$` is the DOM selector object (see DOM selection / traversal below)
    
Example

    this.getHtml('http://www.google.com/', function(err, $, data, headers) {
        $('a').each('href', function (href) {
            //Print all links on the page
            console.log(href);
        });
    });   

There are also helper methods for setting or adding headers. Call these methods before using get, getHtml, etc.

    this.setHeader(key, value);
    this.setUserAgent('Firefox ...');
    this.setCookie('foo', 'bar);
    this.addCookie('second', cookie');
    
There are also methods to make post requests. If `body` is an object, it is encoded using the built-in querystring module
    
    this.post(url, body, [headers], callback, [parse])
    this.postHtml(url, body, [headers], callback, [parse])

To make a custom request, use the lower level doRequest() method

    this.doRequest(method, url, body, [headers], callback, [parse])

_Note: nested requests have the cookie and referer headers automatically set._
    
## Making proxied requests

_Documentation coming soon. For now, see [./lib/node.io/request.js](https://github.com/chriso/node.io/blob/master/lib/node.io/request.js)_

## DOM selection / traversal

`getHtml` and `postHtml` return a special object `$` that wraps [node-soupselect](https://github.com/harryf/node-soupselect) and provides methods to aid in traversing the returned DOM.

`$(selector)` returns an element or collection of elements.

Some example selectors (see [node-soupselect](https://github.com/harryf/node-soupselect) for more)

     $('a')                         //Select all A tags
     $('a.foo')                     //Select all A tags of the class 'foo'
     $('a.foo.bar')                 //Select all A tags of the class 'foo' and the class 'bar'
     $('#container')                //Select the element with id = 'container'
     $('p a')                       //Select all A tags that have a parent P tag
     $('input[type=text]')          //Select all text inputs
    
Working with a collection of elements

    $('a').first()                  //Returns the first A tag
    $('a').last()                   //Returns the last A tag
    $('a').each(callback)           //Calls `callback` with each A tag
    $('a').each(attrib, callback)   //Calls `callback` with an attribute of each A tag, e.g. $('a).each('href', function(href){});
    $('a').has(selector)            //Removes elements that do not have a descendent that matches the selector
    $('a').odd(callback)            //Calls `callback` with the 1st, 3rd, 5th, ... element
    $('a').even(callback)           //Calls `callback` with the 2nd, 4th, 6th, ... element
    
Working with an element

    <a href="hello.htm">Hello <b>World!</b></a>

    $('a').text                     //Outputs the text DIRECTLY inside the tag
        // => outputs 'Hello'
        
    $('a').fulltext                 //Outputs the text inside the tag including the text inside of each nested tag
        // => outputs 'Hello World!'

    $('a').innerHTML                
        // => outputs 'Hello <b>World!</b>'
        
    $('a').attrib.href
        // => outputs 'hello.htm'
        
Note: `text` and `fulltext` trim the result, replace `<br>` and `<br />` with `\n`, and automatically decode HTML entities. If you wish to access the raw text, use the following getters:

    $('a').rawtext
    $('a').rawfulltext
 
## Executing commands

To execute a command, use the following methods. Callback takes the format of (err, stdout, stderr)

    this.exec(cmd, callback);
    this.spawn(cmd, stdin, callback);       //Same as exec, but can write to STDIN
    
## Data validation and sanitization

node.io uses [node-validator](https://github.com/chriso/node-validator) to provide data validation and sanitization methods. Validation methods are available through `this.assert` while sanitization / filtering methods are available through `this.filter`.

    this.assert('abc').isInt();                         //Fails - job.fail() is called
    this.assert('foo@bar.com').len(3,64).isEmail();     //Ok
    this.assert('abcdef').is(/^[a-z]+$/);               //Ok
    var num = this.filter('00000001').ltrim(0).toInt(); //num = 1
    var str = this.filter('&lt;a&gt;').entityDecode();  //str = '<a>'
    
The full list of validation / sanitization methods is [available here](https://github.com/chriso/node-validator).