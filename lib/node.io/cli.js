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

var addPath = function (file) {
    if (file.indexOf('/') === -1) {
        file = cwd + '/' + file;
    }
    return file;
};

var exit = function (msg) {
    utils.status.error(msg);
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
  + '                         e.g. "input.replace("\t", ",")"\n'
  + '  -b, --benchmark        Benchmark the operation\n'
  + '  -v, --version          Display the current version\n'
  + '  -h, --help             Display help information\n'
  ;

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
            input = addPath(args.shift());
            break;
        case '-o':
        case '--output':
            job_modified = true;
            output = addPath(args.shift());
            break;
        case '-s':
        case '--silent':
            options.silent = true;
            break;
        case '-b':
        case '--benchmark':
            options.benchmark = true;
            break;
        case '-t':
        case '--timeout':
            options.timeout = args.shift();
            break;
        case '-f':
        case '--fork':
            if (args.length && args[0].match(/^[0-9]+$/)) {
                options.workers = args.shift();
            } else {
                options.workers = true;
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
    
    var start_processor = function (job_path) {
        processor.start(job_path, options);
    };
    
    //We apply the command line switches by creating a temporary job that extends the specified job
    if (job_modified) {
    
        //Only continue if we're the master process
        if (!process.env._CHILD_ID_) {
            
            var create_temp_job = function (job_path, callback) {
                
                if (job_path) {
                
                    var temp_filename = cwd + '/temp_' + path.basename(job_path, '.js') + '.js',
                        this_job = (job_path.indexOf('/') >= 0 ? job_path : './' + job_path),
                        temp_job = 'var job = require("' + this_job + '").job;\n\n' + 
                                   'exports.job = job.extend({';
                
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
                
                var temp_filename
                
                //Remove the temp file on exit
                process.on('exit', function () {
                    try {
                        fs.unlinkSync(temp_filename);
                    } catch (e) {}
                });
                
                fs.writeFile(temp_filename, temp_job, function(err) {
                    if (err) {
                        exit(err);
                    } else {
                        callback(temp_filename);
                    }
                });
            }
            
            if (!job_path && eval) {
                create_temp_job(null, start_processor);
                return;
            }
            
            //Normally we would compile .coffee files in ./processor.js, but since we're modifying the job using one or more
            //switches, we need to compile it here first
            if (path.extname(job_path) === '.coffee') {
            
                var basename = path.basename(job_path, '.coffee');
                var job_compiled = cwd + '/' + basename + '_compiled.js';
                
                if (!options.silent) {
                    utils.status.info('Compiling ' + job_path);
                }
                
                utils.compileCoffee(job_path, job_compiled, function(err) {
                    if (err) {
                        exit(err);
                    } else {
                    
                        //Remove the compiled .coffee file on exit
                        process.on('exit', function () {
                            try {
                                fs.unlinkSync(compiled_js);
                            } catch (e) {}
                        });
                        
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
    }
    
    start_processor(job_path);
};