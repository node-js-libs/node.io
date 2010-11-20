/*!
 * node.io
 * Copyright(c) 2010 Chris O'Hara <cohara87@gmail.com>
 * MIT Licensed
 */

var fs = require('fs'),
    cwd = process.cwd(),
    processor = require('./processor'),
    path = require('path');

var addPath = function (file) {
    if (file.indexOf('/') === -1) {
        file = cwd + '/' + file;
    }
    return file;
};

var exit = function (msg) {
    console.error(msg);
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
  + '  -b, --benchmark        Benchmark the operation\n'
  + '  -v, --version          Display the current version\n'
  + '  -h, --help             Display help information\n'
  ;

exports.cli = function (args) {
    
    var job_path, job_modified = false,
        arg, input, output, fork,
        job_args = [], options = {},
        temp_filename, temp_job;

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
    
    if (job_modified) {
    
        if (path.extname(job_path) === '.coffee') {
        
            //TODO: Compile the .coffee script here if we're the master process
            exit('Coffeescript jobs can only be run without options/args. Please compile the file first to get around this limitation');
            
        }
        
        temp_filename = 'temp_' + path.basename(job_path, '.js') + '.js';
        
        //Compile a temporary job if we're the master process
        if (!process.env._CHILD_ID_) {
        
            temp_job = 'var job = require("' + (job_path.indexOf('/') >= 0 ? job_path : './' + job_path) + '").job;\n\n' + 
                           'exports.job = job.extend({';
                         
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
            
            if (output) {
                temp_job += '\toutput: "' + (output.indexOf('/') >= 0 ? output : cwd + '/' + output) + '",\n'; 
            }
            
            temp_job += '});';
                        
            fs.writeFileSync(cwd + '/' + temp_filename, temp_job);
            
            process.on('exit', function () {
                try {
                    fs.unlinkSync(cwd + '/' + temp_filename);
                } catch (e) {}
            });
        }
        job_path = cwd + '/' + temp_filename;
    }
    
    processor.start(job_path, options);
};