var nodeio = require('node.io'),
    processor = new nodeio.Processor(),
    assert = require('assert');

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

    'test running an empty job': function() {
        //Prevent the job from looking for STDIN input
        var job = createJob({once:true},{input:false});

        startJob(job, function(err) {
            assert.isUndefined(err);
        });
    },

    'test running a basic job': function() {
        var out = [];

        var job = createJob({
            input: [0,1,2],
            output: function(output) {
                output.forEach(function (num) {
                    out.push(num);
                });
            }
        });

        startJob(job, function(err) {
            assert.equal('[0,1,2]', JSON.stringify(out));
        });
    },

    'test capturing output': function() {
        var job = createJob({
            input: [0,1,2]
        });

        startJob(job, function(err, out) {
            assert.equal('[0,1,2]', JSON.stringify(out));
        }, true);
    },

    'test emit() async': function() {
        var out = [];

        var job = createJob({
            input: [0,1,2],
            run: function() {
                var self = this;
                process.nextTick(function() {
                    self.emit(1);
                });
            },
            output: function(output) {
                output.forEach(function (num) {
                    out.push(num);
                });
            }
        });

        startJob(job, function(err) {
            assert.equal('[1,1,1]', JSON.stringify(out));
        });
    },

    'test emitting via return': function() {
        var out = [];

        var job = createJob({
            input: [0,1,2],
            run: function() {
                return 1;
            },
            output: function(output) {
                output.forEach(function (num) {
                    out.push(num);
                });
            }
        });

        startJob(job, function(err) {
            assert.equal('[1,1,1]', JSON.stringify(out));
        });
    },

    'test skipping on run': function() {
        var out = [];

        var job = createJob({
            input: [0,1,2],
            run: function() {
                this.skip();
            },
            output: function(output) {
                output.forEach(function (num) {
                    out.push(num);
                });
            }
        });

        startJob(job, function(err) {
            assert.equal('[]', JSON.stringify(out));
        });
    },

    'test reduce()': function() {
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

    'test reduce() emitting': function() {
        var out = [];

        var job = createJob({
            input: [0,1,2],
            reduce: function(num) {
                this.emit(num[0] * 2);
            },
            output: function(num) {
                out.push(num);
            }
        });

        startJob(job, function(err) {
            assert.equal('[0,2,4]', JSON.stringify(out));
        });
    },

    'test reduce() emitting via return': function() {
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

    'test job fail()': function() {
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

    'test job fail() emitting via return': function() {
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

    'test fail() being called on validation error': function() {
        var out = [];

        var job = createJob({
            input: [0,1,2],
            run: function() {
                try {
                    this.assert('abc').isInt();
                    return 1;
                } catch (e) {
                    return 0;
                }
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

    'test fail() being called on dom select error': function() {
        var out = [];

        var job = createJob({
            input: [0,1,2],
            run: function() {
                var self = this;
                this.parseHtml('<p class="a"></p>', function(err, $) {
                    if (err) return self.fail();
                    assert.equal('a', $('p').attribs['class']);
                    assert.throws(function () {
                        $('#doesntexist')
                    });
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

    'test timeout during run()': function() {
        var out = [];

        var job = createJob({timeout: 0.1},{
            input: [0,1,2],
            run: function() {
                var self = this;
                setTimeout(function() {
                    self.emit(1);
                }, 2000);
            },
            fail: function(num, status) {
                assert.equal('timeout', status);
                this.emit(0);
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

    'test take op': function() {
        var job = createJob({take:3},{
            input: [0,1,2],
            run: function(data) {
                assert.equal('[0,1,2]', JSON.stringify(data));
                this.skip();
            }
        });

        startJob(job, function(){});
    },

    'test max op': function() {
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

    'test max op': function() {
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

    'test output with flattening': function() {
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

    'test output without flattening': function() {
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

    'test input op': function() {
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

    'test adding input outside of job.input()': function() {
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

    'test global timeout': function() {
        var out = [];

        var job = createJob({global_timeout:0.2}, {
            input: [0,1,2],
            run: function(num) {
                setTimeout(function() {
                    job.emit(num);
                }, 1000);
            },
            output: false
        });

        startJob(job, function(err) {
            assert.ok(err);
        });
    },

    'test the recurse op': function() {
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
