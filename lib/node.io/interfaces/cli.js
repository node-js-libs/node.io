/*!
 * node.io
 * Copyright(c) 2010 Chris O'Hara <cohara87@gmail.com>
 * MIT Licensed
 */

var fs = require('fs'),
    cwd = process.cwd(),
    processor = require('../processor'),
    path = require('path'),
    utils = require('../utils');

var usage = ''
  + '\x1b[1mUsage\x1b[0m: node.io [OPTIONS] <JOB_FILE> [JOB_ARGS]\n'
  + '\n'
  + '\x1b[1mExample\x1b[0m: node.io -s resolve < domains.txt\n'
  + '\n'
  + '\x1b[1mOptions\x1b[0m:\n'
  + '  -s, --silent           Hide console status messages\n'
  + '  -i, --input <FILE>     Read input from FILE\n'
  + '  -o, --output <FILE>    Write output to FILE\n'
  + '  -t, --timeout <TIME>   Set a timeout for the operation (in seconds)\n'
//  + '  -f, --fork [NUM]       Fork NUM workers. If NUM isn\'t specified, a\n'
//  + '                         process is spawned for each CPU core\n'
  + '  -u, --unpack <PASS>    Unpack a job using the specified password\n'
  + '  -d, --daemon           Daemonize the process (requires daemon.node)\n'
  + '      --spoof            Spoof request headers\n'
  + '  -m, --max              Set the maximum concurrent requests\n'
  + '  -b, --benchmark        Benchmark the operation\n'
  + '  -g, --debug            Debug the operation\n'
  + '  -v, --version          Display the current version\n'
  + '  -h, --help             Display help information\n'
  + '  -c, --compiler         Set an alternate compiler to use\n'
  ;

/**
 * exports.cli
 *
 * Start node.io with the specified arguments.
 *
 * @param {Array} args
 * @api public
 */
exports.cli = function (args, exit) {
    exit = exit || function (msg, is_error) {
        utils.status[is_error ? 'error' : 'info'](msg);
        process.exit(1);
    };

    var job_path, job_modified = false,
        input, output, filter,
        daemonize, daemon_arg,
        options = {extend:{}};

    if (!args.length) {
        exit(usage);
    }

    while (args.length) {
        arg = args.shift();
        switch (arg) {
        case '-i':
        case '--input':
            input = args.shift();
            job_modified = true;
            break;
        case '-o':
        case '--output':
            output = args.shift();
            job_modified = true;
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
        case '--spoof':
            options.spoof = true;
            break;
        case '-m':
        case '--max':
            options.max = args.shift();
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
            break;
        case '-h':
        case '--help':
            exit(usage);
            break;
        case '-v':
        case '--version':
            var packagejson = JSON.parse(fs.readFileSync(__dirname + '/../../../package.json', 'utf8'));
            exit('v' + packagejson.version);
            break;
        case '-d':
        case '--daemon':
            if (args.length && args[0][0] !== '-') {
                daemon_arg = args.shift();
            }
            daemonize = true;
            break;
        case '-u':
        case '--unpack':
            options.unpack = args.shift();
            break;
        case '-c':
        case '--compiler':
            options.compiler = args.shift();
            break;
        default:
            job_path = arg;
            if (args.length) {
                options.args = args;
                options.arg1 = args[0];
                args = [];
            }
            break;
        }
    }

    if (job_modified) {
        options.extend = {
            methods: {}
        };
        if (output) options.extend.methods.output = output;
        if (input) options.extend.methods.input = input;
        if (filter) options.extend.methods.filter = filter;
    }

    if (daemonize) {
        utils.daemonize(daemon_arg, function () {
            processor.start(job_path, options);
        });
    } else {
        processor.start(job_path, options);
    }
};
