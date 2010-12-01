/*!
 * node.io
 * Copyright(c) 2010 Chris O'Hara <cohara87@gmail.com>
 * MIT Licensed
 */

var fs = require('fs'),
    cwd = process.cwd(),
    processor = require('./processor'),
    path = require('path'),
    utils = require('./utils');

var exit = function (msg, is_error) {
    utils.status[is_error ? 'error' : 'info'](msg);
    process.exit(1);
};

var usage = ''
  + '\x1b[1mUsage\x1b[0m: node.io [options] [JOB] [JOB_ARGS]\n'
  + '\n'
  + '\x1b[1mExample\x1b[0m: node.io -i domains.txt -s resolve notfound\n'
  + '\n'
  + '\x1b[1mOptions\x1b[0m:\n'
  + '  -i, --input [FILE]     Read input from FILE\n'
  + '  -o, --output [FILE]    Write output to FILE\n'
  + '  -s, --silent           Hide console status messages\n'
  + '  -t, --timeout [TIME]   Set a timeout for the operation (in seconds)\n'
  + '  -f, --fork [NUM]       Fork NUM workers. If NUM isn\'t specified, a\n'
  + '                         process is spawned for each CPU core\n'
  + '  -e, --eval [EXP]       Evaluate an expression on each line of input\n'
  + '                         e.g. "input.replace(\'\\t\', \',\')"\n'
  + '  -b, --benchmark        Benchmark the operation\n'
  + '  -g, --debug            Debug the operation\n'
  + '  -v, --version          Display the current version\n'
  + '  -h, --help             Display help information\n'
  ;
  
/**
 * exports.cli
 *
 * Start node.io with the specified arguments.
 *
 * @param {Array} args
 * @api public
 */
exports.cli = function (args) {
    
    var job_path, job_modified = false,
        arg, input, output, fork, eval,
        job_args = [], options = {};

    if (!args.length) {
        exit(usage);
    }
    
    while (args.length) {
        arg = args.shift();
        switch (arg) {
        case '-i':
        case '--input':
            job_modified = true;
            input = args.shift();
            break;
        case '-o':
        case '--output':
            job_modified = true;
            output = args.shift();
            break;
        case '-s':
        case '--silent':
            options.silent = true;
            break;
        case '-b':
        case '--benchmark':
            options.benchmark = true;
            break;
        case '-g':
        case '--debug':
            options.debug = true;
            break;
        case '-t':
        case '--timeout':
            options.global_timeout = args.shift();
            break;
        case '-f':
        case '--fork':
            if (args.length && args[0].match(/^[0-9]+$/)) {
                options.fork = args.shift();
            } else {
                options.fork = true;
            }
            fork = true;
            job_modified = true;
            break;
        case '-e':
        case '--eval':
            eval = args.shift();
            job_modified = true;
            break;
        case '-h':
        case '--help':
            exit(usage);
            break;
        case '-v':
        case '--version':
            exit('v' + require('./').version);
            break;
        default:
            job_path = arg;
            if (args.length) {
                job_args = args;
                args = [];
                job_modified = true;
            }
            break;
        }
    }
    
    var isMaster = !process.env._CHILD_ID_;
    
    var start_processor = function (job_path) {
        processor.start(job_path, options);
    };
   
    if (!job_modified) {
    
        start_processor(job_path); 
        
    } else {
                
         //We apply the command line switches by creating a temporary job that extends the specified job
                
        var is_coffee = false;
        
        var create_temp_job = function (job_path, callback) {
            
            if (job_path) {
            
                var temp_filename = cwd + '/temp_' + path.basename(job_path, '.js') + '.js',
                    this_job = (job_path.indexOf('/') >= 0 ? job_path : './' + job_path)
                
                //If we're not the master, the file has already been created
                if (!isMaster) {
                    start_processor(temp_filename);
                    return;
                }
                
                var temp_job;
            
                if (!is_coffee) {
                    
                    temp_job = 'var job = require("' + this_job + '").job;\n\n' + 
                               'exports.job = job.extend({';
                
                } else {
                    
                    //Compatability with CoffeeScript inheritance
                    temp_job  = 'var JobClass = require("' + this_job + '")[\'class\'];\n\n';
                    temp_job += 'if (typeof JobClass === "undefined") { console.log("Please export @class when using CoffeeScript. See the documentation for more information");process.exit(1);}';
                    temp_job += 'var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {\n';
                    temp_job += 'for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }\n';
                    temp_job += 'function ctor() { this.constructor = child; }\n';
                    temp_job += 'ctor.prototype = parent.prototype; child.prototype = new ctor;\n';
                    temp_job += 'child.__super__ = parent.prototype; return child; }\n';
                    temp_job += 'function Job() { Job.__super__.constructor.apply(this, arguments); }\n';
                    temp_job += '__extends(Job, JobClass);\n';
                    temp_job += 'exports.job = new Job({';
                }
                
            } else if (eval) {
                
                //We don't necessarily need a job if the eval switch is used
                var temp_filename = cwd + '/temp_job.js',
                    temp_job = 'var Job = require("node.io").Job;\n\n' + 
                               'exports.job = new Job({';
            
            } else {
                
                exit('No job specified');
                
            }
            
            if (fork) {
                temp_job += 'fork:true,'; 
            }            
            
            if (job_args.length) {
                temp_job += 'args: ' + JSON.stringify(job_args) + ',';
                temp_job += 'arg1: ' + JSON.stringify(job_args[0]) + ',';
            }
            
            temp_job += '}, {\n';
            
            if (input) {
                temp_job += '\tinput: "' + (input.indexOf('/') >= 0 ? input : cwd + '/' + input) + '",\n'; 
            }
            
            //Evaluate an expression on each line of input (return eval(expression))
            //E.g. "input"                              => passes through input
            //     "null"  OR  "undefined"              => skips input
            //     "input.length > 3 ? input : null"    => skips lines where length <= 3
            //     "input.replace('\t', ',')"           => converts TSV (tab separated values) to CSV
            
            if (eval) {
                temp_job += '\trun: function (input) {\n\t\t';
                temp_job += 'var result = (function(input,expression){return eval(expression);}(input,"'+eval.replace('"', '\"')+'"));\n\t\t';
                temp_job += 'return typeof result !== "undefined" && result !== null ? this.'+(job_path ? '__super__.run' : 'emit')+'(result) : this.skip();\n\t';
                temp_job += '}\n';
            }
            
            if (output) {
                temp_job += '\toutput: "' + (output.indexOf('/') >= 0 ? output : cwd + '/' + output) + '",\n'; 
            }
            
            temp_job += '});';
            
            //Remove the temp file when the process exits
            utils.removeOnExit(temp_filename);
            
            fs.writeFile(temp_filename, temp_job, function(err) {
                if (err) {
                    exit(err, true);
                } else {
                    callback(temp_filename);
                }
            });
        }
        
        if (!job_path && eval) {
            create_temp_job(null, start_processor);
            return;
        }
        
        //Normally we would compile .coffee files in Processor.loadJob(), but 
        //since we're modifying the job using one or more switches, we need to 
        //compile it here first
        if (path.extname(job_path) === '.coffee') {
        
            is_coffee = true;
            
            var basename = path.basename(job_path, '.coffee');
            var job_compiled = cwd + '/' + basename + '_compiled.js';
            
            //If we're not the master, the file is already compiled
            if (!isMaster) {
                start_processor(job_compiled);
                return;
            }
            
            if (!options.silent) {
                utils.status.info('Compiling ' + job_path);
            }
            
            utils.compileCoffee(job_path, job_compiled, function(err) {
                if (err) {
                    exit(err, true);
                } else {
                    //Now we can extend the compiled file
                    create_temp_job(job_compiled, start_processor);
                }
            });
            
            return;
            
        } else {
            create_temp_job(job_path, start_processor);
            return;
        }
    }
};
