A node.io job takes the following format

    var Job = require('node.io').Job;
    var options = {}, methods = {};
    exports.job = new Job(options, methods);

To run this job (e.g. saved as myjob.js) from the command line, run the following command in the same directory

    $ node.io myjob

A full list of available job methods and options is [available here](#), however jobs typically contain an input, run, and output method. If omitted, input and output default to STDIN and STDOUT.

## Getting started

The following examples highlight how to create and run a simple job.

times2.js
    
    var options = {};
    var methods = {
        input: [0,1,2],
        run: function(num) {
            this.emit(num*2);
        }
    };
    
    exports.job = new Job(options, methods);
    
To run times2.js, run the following command in the same directory:

    $ node.io times2
        => 0\n2\n4\n
    
times2.js can also be run inside another script:

    var times2 = require('./times2'), nodeio = require('node.io');
    nodeio.start(times2, function(err) {
        //STDOUT => 0\n2\n4\n
    });
    
To capture the output, set the third parameter to true:

    nodeio.start(times2, function(err, result) {
        //result = [0,2,4]
    }, true);
    
## Extending a job

A job's options and methods can be inherited and overridden.

times4.js

    var times2 = require('./times2');
    
    exports.job = times2.extend({}, {
        run: function(num) {
            this.emit(num*4);
        }
    }
        
    // $ node.io times4   =>  0\n4\n8\n
    
## An example

The following job takes a domain or list of domains and resolves them.

resolve.js

    var Job = require('node.io').Job, dns = require('dns');
    
    var options = {
        max: 100,      //Run a maximum of 100 DNS requests concurrently
        timeout: 5,    //Timeout each request after 5s
        retries: 3     //Maximum of 3 retries before failing
    }
    
    var methods = {
        run: function(domain) {
            var self = this;
            
            dns.lookup(domain, 4, function(err, ip) {
                if (err) {
                    //The domain didn't resolve, retry
                    self.retry();
                } else {
                    //The domain resolved successfully
                    self.emit(domain + ',' + ip);
                }
            });
        },
        
        fail: function(status, domain) {
            //The domain either timed out or exceeded the max number of retries
            this.emit(domain + ',failed');
        }   
    }
    
    exports.job = new Job(options, methods);
    
Try it out:
    
    $ echo "google.com" | node.io resolve
        => google.com,66.102.11.104
    
..or with a list of domains:

    $ cat domains.txt | node.io resolve
        
## Linking jobs together

Since node.io uses STDIN and STDOUT by default, jobs can be linked together. Be sure to add the -s option to intermediate node.io calls to prevent status/warning messages from being added to the output.

The following example uses resolve.js from above and uses another job to filter out invalid domains before resolving

domains.txt

    google.com
    youtube.com
    this*is^invalid.com

valid_url.js

    var Job = require('node.io').Job;
        
    var methods = {
        run: function(url) {
            this.assert(url).isUrl(); //If this fails, the url is not emitted
            this.emit(url);
        }
    }
    
    exports.job = new Job({}, methods);
    
To link the jobs:

    $ cat domains.txt | node.io -s valid_url | node.io resolve 

## Distributing work

Node.io can currently partition the work among child processes to speed up execution, and will soon support distributing the work across multiple servers to create a work cluster.

To enable this feature, either set the fork option to the number of workers you want to spawn, or use the -f command line option.

Enabling it in a job
    
    var options = {fork:4};
    
At the command line

    $ node.io -f 4 job
    
## Input / Output

Node.io can handle a variety of input / output situations.

To input an array
    
    input: [0,1,2,3,4]

To input a file line by line (auto-detects \n or \r\n)

    input: '/tmp/file.txt'

To read all files in a directory 

    input: '/tmp',
    
    run: function(path) {
        console.log(path); //Outputs the full path of each file/dir in /tmp
    }
    
    //To recurse subdirectories, set the 'recurse' option to true

    
To add your own input (e.g. from a database), use the following format

    input: function(start, num, callback) {
        //callback takes (err, input)
    }
    
To run the job indefinitely

    input: false
   
To output to a file

    output: '/tmp/output.txt'  //Defaults to \n for newline. Change by setting the 'newline' option
    
To add your own output, use the following format

    output: function(out) {
        //Note: out will be an array
    } 

Input / output can be optionally overridden at the command line

    $ node.io -i /tmp/input.txt -o /tmp/output.txt job
    
Node.io uses STDIN and STDOUT by default, so this is the same as calling

    $ cat /tmp/input.txt | node.io -s job > /tmp/output.txt
    
Note: the -s option at the command line omits any status messages or warnings being output

## Passing arguments to jobs

Any arguments after the job name on the command line are available in the job as a string

    $ node.io job arg1 arg2 arg3
    
    run: function() {
        console.log(this.options.args); //arg1 arg2 arg3
    }
    
## More examples

See ./examples. Included examples are:

- duplicates.js - remove all duplicates in a list, or only output duplicate lines
- validate.js - filters a list with a variety of validation methods
- resolve.js - similiar to the example above, but can also output domains that do not resolve (as a quick availability check), or only domains that resolve
- word_count.js - uses map reduce to count the occurrences of each word in a file
- reddit.js - web scraping example - pulls the front page stories and scores from [reddit](http://reddit.com/]
- google_rank.js - returns a domain's rank for a given keyword
- google_pagerank.js - find the pagerank of a URL
- google_spell.js - outputs the result of google suggest

See each file for full usage details.