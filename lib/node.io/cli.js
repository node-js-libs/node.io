var fs = require('fs'),
    processor = require('./processor'),
    cwd = process.cwd();

var usage = ''
  + '\x1b[1mUsage\x1b[0m: node.io [options] [JOB] [JOB_ARGS]\n'
  + '\n'
  + '\x1b[1mExample\x1b[0m: node.io -i domains.txt -s resolve notfound\n'
  + '\n'
  + '\x1b[1mOptions\x1b[0m:\n'
  + '  -i, --input [FILE]     Use FILE as job input\n'
  + '  -o, --output [FILE]    Append job output to FILE\n'
  + '  -s, --silent           Hide console status messages\n'
  + '  -t, --timeout [TIME]   Set a timeout for the operation (in seconds)\n'
  + '  -f, --fork [NUM]       Fork NUM child processes. If NUM isn\'t specified, a\n'
  + '                         process is spawned for each CPU core\n'
  + '  -b, --benchmark        Benchmark the operation\n'
  + '  -v, --version          Output information\n'
  + '  -h, --help             Display help information\n'
  ;

exports.cli = function(args) {
    
    var job_name, job_modified = false;
    var input, output, fork, job_args = [], options = {};

    if (!args.length) {
        exit(usage);
    }

    while (args.length) {
        var arg = args.shift();
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
                job_modified = fork = true;
                break;
            case '-h':
            case '--help':
                exit(usage);
            case '-v':
            case '--version':
                exit('v0.1.0a');
            default:
                job_path = arg.replace(/\.js$/,'');
                if (args.length) {
                    job_args = args;
                    args = [];
                    job_modified = true;
                }
                break;
        }
    }
    
    if (job_modified) {
        if (!process.env._CHILD_ID_) {
        
            var temp_job = 'var job = require("'+(job_path.indexOf('/') >= 0 ? job_path : './'+job_path)+'").job;\n\n'
                         + 'exports.job = job.extend({';
                         
            if (fork) {
                temp_job += 'fork:true,'; 
            }            
            
            if (job_args.length) {
                temp_job += 'args:"'+job_args.join(' ').replace('"','\"')+'",'; 
            }
            
            temp_job += '}, {\n';
            
            if (input) {
                temp_job += '\tinput: "'+(input.indexOf('/') >= 0 ? input : cwd + '/' + input)+'",\n'; 
            }
            
            if (output) {
                temp_job += '\toutput: "'+(output.indexOf('/') >= 0 ? output : cwd + '/' + output)+'",\n'; 
            }
            
            temp_job += '});';
                        
            fs.writeFileSync(cwd + '/temp_job.js', temp_job);
            
            process.on('exit', function () {
                try {
                    fs.unlinkSync('temp_job.js');
                } catch (e) {}
            });
        }
        job_path = 'temp_job';
    }

    processor.start(job_path, options);

}

function addPath(file) {
    if (!~file.indexOf('/')) file = cwd + '/' + file;
    return file;
}

function exit(msg) {
    console.error(msg);
    process.exit(1);
}
