var nodeio = require('../'),
    processor = new nodeio.Processor();
    
function createJob(options, methods) {
    if (typeof methods === 'undefined') {
        methods = options;
        options = {};
    }
    return new nodeio.Job(options, methods);
}

function startJob(job, callback, capture_output) {
    nodeio.start(job, {silent:true}, callback, capture_output);
}

module.exports = {
    
    'test running an empty job': function(assert) {
        //Prevent the job from looking for STDIN input
        var job = createJob({once:true},{input:false});
        
        startJob(job, function(err) {
            assert.isUndefined(err);
        });
    },
    
    'test running a basic job': function(assert) {
        var out = [];
        
        var job = createJob({
            input: [0,1,2],
            output: function(output) {
                output.forEach(function(num) {
                    out.push(num);
                });
            }
        });
               
        startJob(job, function(err) {
            assert.equal('[0,1,2]', JSON.stringify(out));
        });
    },
     
    'test capturing output': function(assert) {
        var job = createJob({
            input: [0,1,2]
        });
        
        startJob(job, function(err, out) {
            assert.equal('[0,1,2]', JSON.stringify(out));
        }, true);
    },
    
    'test emit() async': function(assert) {
        var out = [];
        
        var job = createJob({
            input: [0,1,2],
            run: function() {
                process.nextTick(function() {
                    job.emit(1);
                });
            },
            output: function(output) {
                output.forEach(function(num) {
                    out.push(num);
                });
            }
        });
        
        startJob(job, function(err) {
            assert.equal('[1,1,1]', JSON.stringify(out));
        });
    },
    
    'test emitting via return': function(assert) {
        var out = [];
        
        var job = createJob({
            input: [0,1,2],
            run: function() {
                return 1;
            },
            output: function(output) {
                output.forEach(function(num) {
                    out.push(num);
                });
            }
        });
        
        startJob(job, function(err) {
            assert.equal('[1,1,1]', JSON.stringify(out));
        });
    },
    
    'test skipping on run': function(assert) {
        var out = [];
        
        var job = createJob({
            input: [0,1,2],
            run: function() {
                this.skip();
            },
            output: function(output) {
                output.forEach(function(num) {
                    out.push(num);
                });
            }
        });
        
        startJob(job, function(err) {
            assert.equal('[]', JSON.stringify(out));
        });
    },
    
    'test reduce()': function(assert) {
        var total = 0;
        
        var job = createJob({
            input: [0,1,2],
            reduce: function(num) {
                total += num[0];
            }
        });
        
        startJob(job, function(err) {
            assert.equal(3, total);
        });
    },
    
    'test reduce() emitting': function(assert) {
        var out = [];
        
        var job = createJob({
            input: [0,1,2],
            reduce: function(num) {
                this.emit(num[0]*2);
            },
            output: function(num) {
                out.push(num);
            }
        });
        
        startJob(job, function(err) {
            assert.equal('[0,2,4]', JSON.stringify(out));
        });
    },
    
    'test reduce() emitting via return': function(assert) {
        var out = [];
        
        var job = createJob({
            input: [0,1,2],
            reduce: function(num) {
                return num[0]*2;
            },
            output: function(num) {
                out.push(num);
            }
        });
        
        startJob(job, function(err) {
            assert.equal('[0,2,4]', JSON.stringify(out));
        });
    },
    
    'test job fail()': function(assert) {
        var out = [];
        
        var job = createJob({
            input: [0,1,2],
            run: function() {
                this.fail(0);
            },
            fail: function(num) {
                this.emit(num);
            },
            output: function(output) {
                output.forEach(function(num) {
                    out.push(num);
                });
            }
        });
        
        startJob(job, function(err) {
            assert.equal('[0,0,0]', JSON.stringify(out));
        });
    },
    
    'test job fail() emitting via return': function(assert) {
        var out = [];
        
        var job = createJob({
            input: [0,1,2],
            run: function() {
                this.fail(0);
            },
            fail: function(num) {
                return num;
            },
            output: function(output) {
                output.forEach(function(num) {
                    out.push(num);
                });
            }
        });
        
        startJob(job, function(err) {
            assert.equal('[0,0,0]', JSON.stringify(out));
        });
    },
    
    'test fail() being called on validation error': function(assert) {
        var out = [];
        
        var job = createJob({
            input: [0,1,2],
            run: function() {
                this.assert('abc').isInt();
            },
            fail: function() {
                return 0;
            },
            output: function(output) {
                output.forEach(function(num) {
                    out.push(num);
                });
            }
        });
        
        startJob(job, function(err) {
            assert.equal('[0,0,0]', JSON.stringify(out));
        });
    },
    
    'test fail() being called on dom select error': function(assert) {
        var out = [];
        
        var job = createJob({
            input: [0,1,2],
            run: function() {
                this.parseHtml('<p class="a"></p>', function(err, $) {
                    assert.equal('a', $('p').attribs['class']);
                    assert.isUndefined($('#doesntexist'));
                });
            },
            fail: function() {
                return 0;
            },
            output: function(output) {
                output.forEach(function(num) {
                    out.push(num);
                });
            }
        });
        
        startJob(job, function(err) {
            assert.equal('[0,0,0]', JSON.stringify(out));
        });
    },
    
    'test timeout during run()': function(assert) {
        var out = [];
        
        var job = createJob({timeout: 0.1},{
            input: [0,1,2],
            run: function() {
                setTimeout(function() {
                    job.emit(1);
                }, 200);
            },
            fail: function(num, status) {
                assert.equal('timeout', status);
                return 0;
            },
            output: function(output) {
                output.forEach(function(num) {
                    out.push(num);
                });
            }
        });
        
        startJob(job, function(err) {
            assert.equal('[0,0,0]', JSON.stringify(out));
        });
    },
    
    'test take op': function(assert) {
        var job = createJob({take:3},{
            input: [0,1,2],
            run: function(data) {
                assert.equal('[0,1,2]', JSON.stringify(data));
                this.skip();
            }
        });
        
        startJob(job, function(){});
    },
    
    'test max op': function(assert) {
        var out = [];
        
        var i = 0;
        
        var job = createJob({max:3},{
            input: [0,1,2],
            run: function(num) {
                var self = this;
                i++;
                process.nextTick(function() {
                    assert.equal(3, i);
                    self.skip();
                });
            },
            output: function(output) {
                output.forEach(function(num) {
                    out.push(num);
                });
            }
        });
        
        startJob(job, function(){});
    },
    
    'test max op': function(assert) {
        var out = [];
        
        var i = 0;
        
        var job = createJob({retries:3},{
            input: [0],
            run: function(num) {
                i++;
                this.retry(num);
            },
            fail: function(num, status) {
                assert.equal('retry',status);
                this.emit('0 failed');
            },
            output: function(output) {
                assert.equal('0 failed', output);
                assert.equal(4, i); //First time + 3 retries = 4
            }
        });
        
        startJob(job, function(){});
    },
    
    'test output with flattening': function(assert) {
        var out = [];
                
        var job = createJob({
            input: [0,1,2],
            run: function(num) {
                return [0,1];
            },
            output: function(output) {
                output.forEach(function(num) {
                    out.push(num);
                });
            }
        });
        
        startJob(job, function(){
            assert.equal('[0,1,0,1,0,1]', JSON.stringify(out));
        });
    },
    
    'test output without flattening': function(assert) {
        var out = [];
                
        var job = createJob({flatten:false}, {
            input: [0,1,2],
            run: function(num) {
                return [0,1];
            },
            output: function(output) {
                output.forEach(function(num) {
                    out.push(num);
                });
            }
        });
        
        startJob(job, function(){
            assert.equal('[[0,1],[0,1],[0,1]]', JSON.stringify(out));
        });
    },
    
    'test input op': function(assert) {
        var i = 0;
        
        var job = createJob({input:10},{
            input: true,
            run: function() {
                i++;
                this.skip();
            }
        });
        
        startJob(job, function(){
            assert.equal(10, i);
        });
    },
    
    'test adding input outside of job.input()': function(assert) {
        var i = 0, out = [];
        
        var job = createJob({input:10},{
            input: [0,1,2],
            run: function(num) {
                if (++i <= 3) {
                    this.add(3);
                };
                this.emit(num);
            },
            output: function(output) {
                output.forEach(function(num) {
                    out.push(num);
                });
            }
        });
        
        startJob(job, function(){
            assert.equal('[0,3,3,3,1,2]', JSON.stringify(out));
        });
    },
        
    'test global timeout': function(assert) {
        var out = [];
                
        var job = createJob({global_timeout:0.2}, {
            input: [0,1,2],
            run: function(num) {
                setTimeout(function() {
                    job.emit(num);
                }, 500);
            }
        });
        
        startJob(job, function(err) {
            assert.ok(err);
        });
    },
    
    'test the recurse op': function(assert) {
        //Test specialised case where input is a path to a dir
        var job = createJob({recurse:true}, {input:__dirname+'/resources/test_dir_input'});
        
        startJob(job, function(err, files) {
            assert.equal(4, files.length);
            assert.ok(files.indexOf(__dirname+'/resources/test_dir_input/file.a') >= 0);
            assert.ok(files.indexOf(__dirname+'/resources/test_dir_input/file.b') >= 0);
            assert.ok(files.indexOf(__dirname+'/resources/test_dir_input/file.c') >= 0);
            assert.ok(files.indexOf(__dirname+'/resources/test_dir_input/dir/file.d') >= 0);
        }, true);
    },
    
}