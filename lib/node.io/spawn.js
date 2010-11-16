var child = require('child_process'),
    Job = require('./job').Job;

Job.prototype.spawn = function(args, stdin, callback) {
    if (typeof stdin === 'function') {
        callback = stdin;
        stdin = undefined;
    }
    
    args = args.split(' ');
    
    var cmd = args.shift(), 
        stdout = '', stderr = '',
        called = false,
        proc = child.spawn(cmd, args, {cwd: process.cwd()});
        
    proc.stdout.on('data', function(data) {
        stdout += data;
    });
    
    proc.stderr.on('data', function(data) {
        if (/^execvp\(\)/.test(data.asciiSlice(0,data.length))) {
            callback('Failed to start child process.');
            called = true;
            //proc.kill();
        } else {
            stderr += data;
        }
    });
    
    proc.on('exit', function() {
        if (!called) callback(null, stdout, stderr);
    });
    
    if (stdin) {
        proc.stdin.write(stdin);
    }   
}

Job.prototype.exec = function(cmd, callback) {
    var ops = {cwd:process.cwd()};
    if (this.options.timeout) {
        ops.timeout = this.options.timeout;
    }
    child.exec(cmd, ops, callback);
}