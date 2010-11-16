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
    'test job extend': function(assert) {
    
        var job = createJob({foo:'bar'}, {testmethod:function(){return 'a';}});
        assert.equal('bar', job.options.foo);
        assert.equal('function', typeof job.testmethod);
        assert.equal('a', job.testmethod());
        
        //Create a new job that extends the old one
        var new_job = job.extend({foo:'foo'}, {testmethod:false,testmethodb:function(){return 'b';}});
        assert.equal('foo', new_job.options.foo);
        assert.equal(false, new_job.testmethod);
        assert.equal('function', typeof new_job.testmethodb);
        assert.equal('b', new_job.testmethodb());
        
        //Ensure extend doesn't modify the original job
        assert.equal('bar', job.options.foo);
        assert.equal('function', typeof job.testmethod);
        job = job.extend({foo:'foo'}, {testmethod:false});
        assert.equal('foo', job.options.foo);
        assert.equal(false, new_job.testmethod);
    },
    
    'test job running once': function(assert) {
        var job = createJob({once:true},{input:function(){return true;}});
        
        //input() should return false on the second call
        assert.ok(job.input());
        assert.ok(job.input() === false);
    },
    
    'test job emit() as return': function(assert) {
        var job = createJob();
        
        job.run = function() {
            return 1;
        }
        
        job.output_hook = function(data) {
            assert.equal(1, data);
        }
        
        job.run();
    },
    
    'test job emit() async': function(assert) {
        var job = createJob();
        
        job.run = function() {
            process.nextTick(function() {
                job.emit(1);
            });
        }
        
        job.output_hook = function(data) {
            assert.equal(1, data);
        }
        
        job.run();
    },
    
    'test job skip()': function(assert) {
        var job = createJob();
        
        assert.deepEqual(job.skip, job.finish);
        
        job.output_hook = function(last) {
            assert.ok(true);
        }
        
        job.run = function() {
            this.skip();
            //Same as this.finish()
        }
        
        job.run();
    },
    
    'test job validation': function(assert) {
        //Just test bindings, full test suite for validation methods can be found at:
        //https://github.com/chriso/node-validator/blob/master/test/validator.test.js
        
        var job = createJob();
        
        job.assert(123).isInt();
        job.assert('abc').is(/^[a-z]+$/);
        
        job.fail = function() {
            assert.ok(true);
        }
        
        job.assert('abc').isInt();
    },
    
    'test job filtering / sanitization': function(assert) {
        //Just test bindings, full test suite for filter methods can be found at:
        //https://github.com/chriso/node-validator/blob/master/test/filter.test.js
        
        var job = createJob();        
        assert.equal(1, job.filter('00000001').ltrim(0));
    },
    
}