/*!
 * node.io
 * Copyright(c) 2010 Chris O'Hara <cohara87@gmail.com>
 * MIT Licensed
 */

var processor = require('../processor'),
    fs = require('fs'),
    path = require('path'),
    http = require('http'),
    utils = require('../utils'),
    querystring = require('querystring');

var usage = ''
  + '\x1b[1mUsage\x1b[0m: node.io-web [OPTIONS] <JOB_DIR>\n'
  + '\n'
  + 'Note: <JOB_DIR> defaults to ~/.node_modules\n'
  + '\n'
  + '\x1b[1mOptions\x1b[0m:\n'
  + '  -p, --port [PORT]      Port to listen on. Default is 8080\n'
  + '  -d, --daemon           Daemonize the process\n'
  + '  -v, --version          Display the current version\n'
  + '  -h, --help             Display help information\n\n'
  + '\x1b[1mUsage 1\x1b[0m:\n    1. Visit http://localhost:<PORT>/ for a web interface\n\n'
  + '\x1b[1mUsage 2\x1b[0m: \n    1. `/jobs` has a JSON representation of available jobs\n'
  + '    2. `/run?job=<JOB>&input=<INPUT>` where input is \\r\\n separated'
  ;

/**
 * exports.web
 *
 * Run node.io through a web interface.
 *
 * @param {Array} args
 * @api public
 */
exports.web = function (args, exit) {

    exit = exit || function (msg, is_error) {
        utils.status[is_error ? 'error' : 'info'](msg);
        process.exit(1);
    };

    var port = 8080, daemonize = false, daemon_arg;

    var module_dir;
    for (var i = 0, l = require.paths.length; i < l; i++) {
        if (require.paths[i].indexOf('.node_modules') >= 0) {
            module_dir = require.paths[i];
            break;
        }
    }

    while (args.length) {
        arg = args.shift();
        switch (arg) {
        case '-p':
        case '--port':
            port = args.shift();
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
        default:
            module_dir = arg;
            break;
        }
    }

    //Check that module_dir exists and has some jobs in it
    try {
        var files = fs.readdirSync(module_dir);
        if (files.length === 0) throw new Error();
    } catch (e) {
        exit('No jobs found in ' + module_dir, true);
    }

    var start_job = function (params, res) {
        if (typeof params.job === 'undefined') {
            res.writeHead(400);
            res.end();
            return;
        }

        if (params.job.indexOf('../') >= 0) {
            res.writeHead(403);
            res.end();
            return;
        }

        var methods = {
            output: function (lines) {
                lines.forEach(function (line) {
                    res.write(line + '<br />');
                });
            }
        };

        if (params.input && params.input != '') {
            methods.input = params.input.split(params.sep || '\r\n');
        }

        var proc_options = {
            extend: {
                methods: methods
            },
            debug: !!params.debug,
            silent: !params.debug,
            global_timeout: params.timeout,
            args: params.args ? params.args.split(' ') : null
        };

        processor.Processor.prototype.status = function (msg, type) {
            switch (type) {
            case 'debug':
                msg = '<font color="blue">DEBUG</font>: ' + msg;
                break;

            case 'error':
            case 'fatal':
                msg = '<font color="red">ERROR</font>: ' + msg;
                break;

            case 'ok':
                msg = '<font color="green">OK</font>: ' + msg;
                break;

            case 'bold':
                msg = '<strong>' + msg + '</strong>';
                break;
            default:
                msg = '<font color="orange">INFO</font>: ' + msg;
                break;
            }
            res.write(msg + '<br />');
        };

        console.log('Running job "' + params.job + '"');

        processor.start(module_dir + '/' + params.job, proc_options, function (err) {
            res.end();
        });
    };

    var interface_a = ''
    + '<!DOCTYPE html><head><title>node.io</title></head><body>'
    + '<script type="text/javascript" src="http://www.google.com/jsapi"></script><script type="text/javascript">google.load("jquery", "1.4.4");</script><style type="text/css">'
    + '.radio, .checkbox{vertical-align:middle;margin:0px;padding:0px;}.radio-item,.checkbox-item{margin-top:5px;float:left;}.radio-item label,.checkbox-item label{margin-left:5px;}.radio-item br,.checkbox-item br{clear:left;}'
    + '.submit-button,.submit-reset,.submit-print{margin:0px;overflow:visible;padding:1px 6px;width:auto;}.submit-button::-moz-focus-inner,.submit-reset::-moz-focus-inner{border:0px;padding:1px 6px;}.header{margin:0px;}'
    + '.header-group{background:#f5f5f5;border-bottom:1px solid #ccc;padding:12px;clear:both;}.header-group-b{background:#f5f5f5;border-bottom:1px solid #ccc;padding:7px 12px;clear:both;}.label{width: 150px;margin-bottom:6px;'
    + 'display:inline-block;width:137px !important;}.label-left{float:left;display:inline-block;text-align:left;padding:3px;width:137px !important;}.label-right{float:left;display:inline-block;text-align:right;margin-right:6px;'
    + 'margin-bottom:6px;width:137px !important;padding:3px;}.section,.section-closed{list-style:none;list-style-position:outside;margin:0px;padding:0px;position:relative;zoom:1;}.input{display:inline-block;}.line{clear:both;'
    + 'padding:10px;margin:0px;display:inline-block;width:97%;width:-moz-available;position:relative;}.single-column .clearfix{display:inline-block;}.single-column .clearfix{display:block;}.all{list-style:none;'
    + 'list-style-position:outside;margin:0px;width:650px;color:#000000 !important;font-family:Arial;font-size:12px;}.advanced{display: none;}'
    + '</style><form action="/run" method="post"><div class="all"><ul class="section"><li class="input-wide"><div class="header-group"><h2 class="header">Node.io</h2></div></li>'
    + '<li class="line"><label class="label-left">Job</label><div class="input">'
    ;

    var interface_b = ''
    + '<span class="clearfix"></span></div></li>'
    + '<li class="line"><label class="label-left">Arguments:</label><div class="input"><input type="text" class="textbox" name="args" size="64" /></div></li>'
    + '<li class="line"><label class="label-left">Input</label><div class="input"><textarea class="textarea" name="input" cols="50" rows="8"></textarea></div></li>'
    + '<li class="line"><label class="label-left">Advanced Options</label><div class="input"><input type="checkbox" onclick="$(\'.advanced\').toggle()" /></div></li>'
    + '<li class="line advanced"><label class="label-left">Timeout: (s)</label><div class="input"><input type="text" class="textbox" name="timeout" size="20" /></div></li>'
    + '<li class="line advanced"><label class="label-left">Debug</label><div class="input"><div class="single-column"><span class="checkbox-item" style="clear:left;"><input type="checkbox" class="checkbox" name="debug" value="1" /></div></div></li>'
    + '<li class="line"><div class="input-wide"><div style="margin-left:143px" class="buttons-wrapper"><button type="submit" class="submit-button">Run</button></div></div></li></ul></div></form>'
    ;

    var handle = function (req, res) {
        if (req.url === '/') {
            res.writeHead(200, {'Content-Type': 'text/html'});
            utils.getFiles(module_dir, function(files) {
                res.write(interface_a);
                files.sort();
                var file_name;
                files.forEach(function (file) {
                    //Make the filename pretty... my_job.js => My job
                    if (file.indexOf('.js') >= 0) {
                        file_name = path.basename(file, '.js')
                    } else if (file.indexOf('.coffee') >= 0) {
                        file_name = path.basename(file, '.coffee')
                    } else {
                        file_name = file;
                    }
                    file_name = file_name.replace('_', ' ');
                    file_name = file_name.substr(0, 1).toUpperCase() + file_name.substr(1);

                    //Output the job radio button
                    res.write('<span class="radio-item" style="clear:left;margin-left:4px;"><input type="radio" class="radio" name="job" value="' + file + '" /><label>' + file_name + '</label></span>');
                })
                res.end(interface_b);
            });
        } else if (req.url === '/jobs') {
            res.writeHead(200, {'Content-Type': 'text/html'});
            utils.getFiles(module_dir, function(files) {
                res.end(JSON.stringify(files));
            });
        } else if (req.url.indexOf('/run') === 0) {
            res.writeHead(200, {'Content-Type': 'text/html'});
            var params;
            if (req.method.toUpperCase() === 'GET') {
                params = querystring.parse(req.url.substr(5));
                start_job(params, res);
            } else {
                var data = '';
                req.setEncoding('utf8');
                req.addListener('data', function(chunk) { data += chunk; });
                req.addListener('end', function() {
                    params = querystring.parse(data);
                    start_job(params, res);
                });
            }
        } else {
            res.writeHead(404);
            res.end();
        }
    };

    var start_server = function () {
        http.createServer(handle).listen(port);
        console.log('\x1B[33mINFO\x1B[0m: Listening on port ' + port + '\n');
    };

    if (daemonize) {
        utils.daemonize(daemon_arg, function () {
            start_server();
        });
    } else {
        start_server();
    }
}
