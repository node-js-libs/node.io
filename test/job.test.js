var nodeio = require('node.io'),
    processor = new nodeio.Processor(),
    assert = require('assert');

function createJob(options, methods) {
    if (typeof methods === 'undefined') {
        methods = options;
        options = {};
    }
    return nodeio.Job(options, methods);
}

module.exports = {

    'test job creation with no options': function() {

        var job = createJob({testmethod:function(){return 'a';}});

        assert.equal('function', typeof job.testmethod);
        assert.equal('a', job.testmethod());
    },

    'test job extend': function() {

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

        //Create a new job that extends the old one (just methods)
        var new_job_b = job.extend({testmethodb:function(){return 'd';}});
        assert.equal('d', new_job_b.testmethodb());

        //Test calling a parent method
        assert.equal('function', typeof new_job.__super__.testmethod);
        assert.equal('a', new_job.__super__.testmethod());

        //Ensure extend doesn't modify the original job
        assert.equal('bar', job.options.foo);
        assert.equal('function', typeof job.testmethod);
        job = job.extend({foo:'foo'}, {testmethod:false});
        assert.equal('foo', job.options.foo);
        assert.equal(false, new_job.testmethod);
    },

    'test job running once': function() {
        var job = createJob({input:false});

        //input() should return false on the second call
        assert.ok(job.input().length);
        assert.ok(job.input() === false);
    },

    'test job emit() as return': function() {
        var job = createJob();

        job.run = function() {
            return 1;
        }

        job.output = function(data) {
            assert.equal(1, data);
        }

        job.run();
    },

    'test job emit() async': function() {
        var job = createJob();

        job.run = function() {
            process.nextTick(function() {
                job.emit(1);
            });
        }

        job.output = function(data) {
            assert.equal(1, data);
        }

        job.run();
    },

    'test job skip()': function() {
        var job = createJob();

        job.run = function() {
            this.skip();
            this.emit(1);
        }

        job.output = function(num) {
            assert.isUndefined(num);
        }

        job.run();

        assert.ok(job.is_complete);
    },

    'test job validation': function() {
        //Just test bindings, full test suite for validation methods can be found at:
        //https://github.com/chriso/node-validator/blob/master/test/validator.test.js

        var job = createJob();

        job.assert(123).isInt();
        job.assert('abc').is(/^[a-z]+$/);

        try {
            job.assert('abc').isInt();
            assert.ok(false, 'job.assert should have failed');
        } catch (e) {}
    },

    'test job filtering / sanitization': function() {
        //Just test bindings, full test suite for filter methods can be found at:
        //https://github.com/chriso/node-validator/blob/master/test/filter.test.js

        var job = createJob();
        assert.equal(1, job.filter('00000001').ltrim(0));
    },
}
