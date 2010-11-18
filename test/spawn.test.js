var nodeio = require('../'),
    processor = new nodeio.Processor();
    
function createJob(options, methods) {
    if (typeof methods === 'undefined') {
        methods = options;
        options = {};
    }
    return new nodeio.Job(options, methods);
}
    
module.exports = {
    'test job.spawn()': function(assert) {
        var job = createJob();
        job.spawn('pwd', function(err, stdout, stderr) {
            assert.isNull(err);
            assert.equal(process.cwd()+'\n', stdout);
        });
        
        job.spawn('echo hello', function(err, stdout, stderr) {
            assert.isNull(err);
            assert.equal('hello\n', stdout);
        });
        
        //TODO: Test job.spawn(cmd, stdin)
        
        job.spawn('badcommandxyz', function(err, stdout, stderr) {
            assert.equal('Failed to start child process.', err);
        });
    },
    
    'test job.exec()': function(assert) {
        var job = createJob();
        job.exec('pwd', function(err, stdout, stderr) {
            assert.isNull(err);
            assert.equal(process.cwd()+'\n', stdout);
        });
        
        job.exec('echo hello', function(err, stdout, stderr) {
            assert.isNull(err);
            assert.equal('hello\n', stdout);
        });
                
        job.exec('badcommandxyz', function(err, stdout, stderr) {
            assert.ok(err);
        });
        
        /* TODO: test job.exec() timeout
        job.options.timeout = 1;
        job.exec('sleep 2', function(err, stdout, stderr) {
            assert.ok(err);
        });
        */
    },
}