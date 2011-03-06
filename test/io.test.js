var fs = require('fs'),
    nodeio = require('node.io'),
    processor = new nodeio.Processor(),
    JobClass = nodeio.JobClass,
    assert = require('assert');

var lorem = __dirname+'/resources/lorem.txt',
    lorem_crlf = __dirname+'/resources/lorem_crlf.txt',
    output = __dirname+'/resources/output.txt',
    output2 = __dirname+'/resources/output2.txt',
    output3 = __dirname+'/resources/output3.txt',
    test_dir = __dirname+'/resources/test_dir_input';

function createJob(options, methods) {
    if (typeof methods === 'undefined') {
        methods = options;
        options = {};
    }
    return nodeio.Job(options, methods);
}

module.exports = {

    'test #read()': function() {
        var job = new JobClass();

        //Test sync read
        assert.equal(4042, job.read(lorem).length);

        //Test async read
        job.read(lorem, function(err, lorem) {
            assert.equal(4042, lorem.length);
        });

        assert.throws(function() {
            job.read(); //No file
        });
    },

    'test #readLines()': function() {

        var job = createJob();

        job.error_hook = function(err) {
            assert.ok(false, err.message);
        }

        job.inputFromFile(lorem);
        job.input(0, 1, function(lines) {
            assert.equal(1, lines.length);
            assert.match(lines[0], /^Lorem ipsum/);
            assert.match(lines[0], /vel risus ante\.$/);
        });

        job.input(1, 1, function(lines) {
            assert.equal(1, lines.length);
                assert.match(lines[0], /^Praesent/);
                assert.match(lines[0], /risus\.$/);
        });

        job.input(2, 2, function(lines) {
            assert.equal(2, lines.length);
            assert.match(lines[0], /^Nullam/);
            assert.match(lines[0], /leo\.$/);
            assert.match(lines[1], /^Fusce/);
            assert.match(lines[1], /odio\.$/);
        });

        job.input(4, 10, function(lines) {
            assert.equal(1, lines.length);
            assert.match(lines[0], /^Pellentesque/);
            assert.match(lines[0], /leo\.$/);
        });

        job.input(14, 1, function(lines) {
            assert.equal(false, lines);
            assert.equal(4042, job.getBytesRead());
        });

        var job_crlf = createJob();

        job_crlf.error_hook = function(err) {
            assert.ok(false, err.message);
        }

        job_crlf.inputFromFile(lorem_crlf);
        job_crlf.input(0, 1, function(lines) {
            assert.equal(1, lines.length);
            assert.match(lines[0], /^Lorem ipsum/);
            assert.match(lines[0], /vel risus ante\.$/);
        });

        job_crlf.input(1, 1, function(lines) {
            assert.equal(1, lines.length);
                assert.match(lines[0], /^Praesent/);
                assert.match(lines[0], /risus\.$/);
        });

        job_crlf.input(2, 2, function(lines) {
            assert.equal(2, lines.length);
            assert.match(lines[0], /^Nullam/);
            assert.match(lines[0], /leo\.$/);
            assert.match(lines[1], /^Fusce/);
            assert.match(lines[1], /odio\.$/);
        });

        job_crlf.input(4, 10, function(lines) {
            assert.equal(1, lines.length);
            assert.match(lines[0], /^Pellentesque/);
            assert.match(lines[0], /leo\.$/);
        });

        job_crlf.input(14, 1, function(lines) {
            assert.equal(false, lines);
            assert.equal(4046, job_crlf.getBytesRead(), '4042 !== 4046.. test/resources/lorem_crlf.txt probably had \\r\\n converted to \\n');
        });

    },

    'test #write()': function() {
        var i = 0;

        var job = new JobClass();

        job.write(output, 'test', function() {
            assert.equal(0, i++);
        });

        job.write(output, {foo:'bar',bar:'foo'}, function() {
            assert.equal(1, i++);
        });

        job.write(output, [1,2,[3,4,5]], function() {
            assert.equal(2, i++);
            assert.equal('test\n{"foo":"bar","bar":"foo"}\n1\n2\n[3,4,5]\n', fs.readFileSync(output, 'utf8'));
            assert.equal(43, job.getBytesWritten());
        });
    },

    'test where job.input == false': function() {
        var job = createJob({input:true});
        assert.equal('function', typeof job.input);
        //input() will return as many lines requested (job will run forever)
        assert.equal(10, job.input(0, 10).length);
        assert.equal(5, job.input(10, 5).length);
        assert.equal(2, job.input(15, 2).length);
        assert.equal(10, job.input(17, 10).length);
    },

    'test where job.input is an array': function() {
        var job = createJob({input:[0,1,2,3,4]});
        assert.equal('function', typeof job.input);
        assert.equal('[0,1]', JSON.stringify(job.input(0, 2)));
        assert.equal('[2,3]', JSON.stringify(job.input(2, 2)));
        assert.equal('[4]', JSON.stringify(job.input(4, 2)));
        assert.equal(false, job.input(6, 2));
    },

    'test where job.input is a string (file)': function() {
        var job = createJob({input:lorem});
        assert.equal('function', typeof job.input);

        job.input(0, 1, function(lines) {
            assert.equal(1, lines.length);
            assert.match(lines[0], /^Lorem ipsum/);
            assert.match(lines[0], /vel risus ante\.$/);
        });

        job.input(1, 1, function(lines) {
            assert.equal(1, lines.length);
                assert.match(lines[0], /^Praesent/);
                assert.match(lines[0], /risus\.$/);
        });

        job.input(2, 2, function(lines) {
            assert.equal(2, lines.length);
            assert.match(lines[0], /^Nullam/);
            assert.match(lines[0], /leo\.$/);
            assert.match(lines[1], /^Fusce/);
            assert.match(lines[1], /odio\.$/);
        });

        job.input(4, 10, function(lines) {
            assert.equal(1, lines.length);
            assert.match(lines[0], /^Pellentesque/);
            assert.match(lines[0], /leo\.$/);
        });

        job.input(14, 1, function(lines) {
            assert.equal(false, lines);
            assert.equal(4042, job.getBytesRead());
        });

    },

    'test where job.input is a string (dir)': function() {
        //Test specialised case where input is a path to a dir
        var job = createJob({recurse:true},{input:test_dir});
        assert.equal('function', typeof job.input);
        var files = job.input(0, 100); //['dir','file.a','file.b','file.c']
        assert.equal(4, files.length);

        assert.ok(files.indexOf(__dirname+'/resources/test_dir_input/dir') >= 0);
        assert.ok(files.indexOf(__dirname+'/resources/test_dir_input/file.a') >= 0);
        assert.ok(files.indexOf(__dirname+'/resources/test_dir_input/file.b') >= 0);
        assert.ok(files.indexOf(__dirname+'/resources/test_dir_input/file.c') >= 0);

        job.output_hook = function(){}

        job.add = function(dir_files) {
            dir_files.forEach(function(file) {
                files.push(file);
            });
        }

        job.emit = function() {}

        job.skip = function() {
            //'file.d' was added
            assert.equal(5, files.length);
            assert.ok(files.indexOf(__dirname+'/resources/test_dir_input/dir/file.d') >= 0);
        }

        //Test recursing directories
        files.forEach(function(file) {
            job.run(file);
        });
    },


    'test where job.input is an unknown string': function() {
        try {
            createJob({input:'xyz897asd'});
            assert.ok(false, 'An exception was not thrown when input is an unknown string');
        } catch (e) {
            assert.ok(true);
        }
    },

    'test where job.output is an unknown string': function() {
        try {
            createJob({output:'xyz897asd'});
            assert.ok(false, 'An exception was not thrown when output is an unknown string');
        } catch (e) {
            assert.ok(true);
        }
    },

    'test where job.output is a string': function() {
        var job = createJob({output:output2});

        job.output([1,2,3]);

        setTimeout(function() {
            assert.equal('1\n2\n3\n', fs.readFileSync(output2, 'utf8'));
        }, 2000);

    },

    'test newline': function() {
        var job = createJob({newline:'\r\n'},{output:output3});

        job.output([1,2,3]);

        setTimeout(function() {
            assert.equal('1\r\n2\r\n3\r\n', fs.readFileSync(output3, 'utf8'));
        }, 2000);

    },

    'test writeValues': function() {
        var job = createJob();

        assert.equal('foo,bar,foobar', job.writeValues(['foo','bar','foobar']));
        assert.equal('foo,bar,foobar', job.writeValues(['foo','bar','foobar'], 'csv'));
        assert.equal('foo\tbar\tfoobar', job.writeValues(['foo','bar','foobar'], 'tsv'));
        assert.equal('foo,bar,"foo,bar"', job.writeValues(['foo','bar','foo,bar'], 'csv'));
        assert.equal('foo,bar,"foo""bar"', job.writeValues(['foo','bar','foo"bar'], 'csv'));
        assert.equal('foo.bar.foo,bar', job.writeValues(['foo','bar','foo,bar'], '.'));
        assert.equal('foo.bar.|foo\\|bar|', job.writeValues(['foo','bar','foo|bar'], '.', '|', '\\'));

    },

    'test parseValues': function() {
        var job = createJob();

        assert.equal(JSON.stringify(['foo','bar','foobar']), JSON.stringify(job.parseValues('foo,bar,foobar')));
        assert.equal(JSON.stringify(['foo','bar','foobar']), JSON.stringify(job.parseValues('foo,bar,foobar', 'csv')));
        assert.equal(JSON.stringify(['foo','bar','foobar']), JSON.stringify(job.parseValues('foo\tbar\tfoobar', 'tsv')));
        assert.equal(JSON.stringify(['foo','bar','foo"bar']), JSON.stringify(job.parseValues('foo,bar,"foo""bar"', 'csv')));
        assert.equal(JSON.stringify(['foo','bar','foo"bar']), JSON.stringify(job.parseValues('foo,bar,"foo\"bar"', ',', '"', '\\')));
        assert.equal(JSON.stringify(['foo','bar','foo,bar']), JSON.stringify(job.parseValues('foo,bar,"foo,bar"', 'csv')));
        assert.equal(JSON.stringify(['foo','bar','foo,bar']), JSON.stringify(job.parseValues('foo.bar.foo,bar', '.')));

        //FIX ME PLZ
        //assert.equal(JSON.stringify(['foo','bar','foo|bar']), JSON.stringify(job.parseValues('foo.bar.|foo\|bar|', '.', '|', '\\')));
    },

}
