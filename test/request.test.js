var nodeio = require('node.io'),
    http = require('http'),
    assert = require('assert');

var port = 24510, timeout = 2000;

function createJob() {
    var JobClass = nodeio.JobClass, job = new JobClass();
    job.debug = function () {};
    //Throw a warning on ECONNREFUSED rather than fail the entire test suite
    job.fail = function (input, status) {
        if (status === 'ECONNREFUSED') {
            console.log('\x1B[33mWARNING\x1B[0m: \x1B[31mECONNREFUSED\x1B[0m (see request.test.js)');
        }
    };
    return job;
}

function close (server) {
    try {
        server.close();
    } catch (e) {}
}

module.exports = {

    'test GET request': function() {

        var job = createJob();

        var server = http.createServer(function (req, res) {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end('Hello World');
        });

        server.listen(++port);

        job.get('http://127.0.0.1:'+port+'/', function(err, data, headers) {
            if (err) throw err;
            assert.equal('text/plain', headers['content-type']);
            assert.equal('Hello World', data);
            close(server);
        });

        setTimeout(function() {
            close(server);
        }, timeout);
    },

    'test GET request with custom headers': function() {

        var job = createJob();

        var server = http.createServer(function (req, res) {
            if (req.headers.foo === 'bar') {
                res.writeHead(200,{'Content-Type': 'text/plain'});
                res.end('Headers ok');
            } else {
                res.end();
            }
        });

        server.listen(++port);

        job.get('http://127.0.0.1:'+port+'/', {foo:'bar'}, function(err, data, headers) {
            assert.equal('text/plain', headers['content-type']);
            assert.equal('Headers ok', data);
            close(server);
        });

        setTimeout(function() {
            close(server);
        }, timeout);
    },

    'test GET request with pre-parse callback': function() {

        var job = createJob();

        var server = http.createServer(function (req, res) {
            res.writeHead(200,{'Content-Type': 'text/plain'});
            res.end('&gt;&lt;');
        });

        server.listen(++port);

        var parse = function(str) {
            return str.replace('&gt;','>').replace('&lt;','<');
        }

        job.get('http://127.0.0.1:'+port+'/', function(err, data, headers) {
            assert.equal('text/plain', headers['content-type']);
            assert.equal('><', data);
            close(server);
        }, parse);

        setTimeout(function() {
            close(server);
        }, timeout);
    },

    'test POST request': function() {

        var job = createJob();

        var server = http.createServer(function (req, res) {
            var data = '';
            req.setEncoding('utf8');
            req.addListener('data', function(chunk) { data += chunk; });
            req.addListener('end', function() {
                if (data === 'foo=bar') {
                    res.writeHead(200,{'Content-Type': 'text/plain'});
                    res.end('Post ok');
                } else {
                    res.end();
                }
            });
        });

        server.listen(++port);

        job.post('http://127.0.0.1:'+port+'/', {foo:'bar'}, function(err, data, headers) {
            assert.equal('text/plain', headers['content-type']);
            assert.equal('Post ok', data);
            close(server);
        });

        setTimeout(function() {
            close(server);
        }, timeout);
    },

    'test GET request returning the dom': function() {

        var job = createJob();

        var server = http.createServer(function (req, res) {
            res.writeHead(200,{'Content-Type': 'text/plain'});
            res.end('<p class="a"></p>');
        });

        server.listen(++port);

        job.getHtml('http://127.0.0.1:'+port+'/', function(err, $, data, headers) {
            assert.equal('text/plain', headers['content-type']);
            assert.equal('<p class="a"></p>', data);
            assert.equal('a', $('p').attribs['class']);
            close(server);
        });

        setTimeout(function() {
            close(server);
        }, timeout);
    },

    'test POST request returning the dom': function() {

        var job = createJob();

        var server = http.createServer(function (req, res) {
            var data = '';
            req.setEncoding('utf8');
            req.addListener('data', function(chunk) { data += chunk; });
            req.addListener('end', function() {
                if (data === 'foo=bar') {
                    res.writeHead(200,{'Content-Type': 'text/plain'});
                    res.end('<p class="a"></p>');
                } else {
                    res.end();
                }
            });
        });

        server.listen(++port);

        job.postHtml('http://127.0.0.1:'+port+'/', {foo:'bar'}, function(err, $, data, headers) {
            assert.equal('text/plain', headers['content-type']);
            assert.equal('<p class="a"></p>', data);
            assert.equal('a', $('p').attribs['class']);
            close(server);
        });

        setTimeout(function() {
            close(server);
        }, timeout);
    },

    'test nested request': function() {

        var p = ++port, job = createJob();

        var server = http.createServer(function (req, res) {
            if (!req.headers.cookie) {
                res.writeHead(200, {'Content-Type': 'text/plain', 'Set-Cookie': 'foo=bar'});
                res.end('Ok');
            } else if (req.headers.cookie === 'foo=bar' && req.headers.referer === 'http://127.0.0.1:'+p+'/') {
                res.writeHead(200, {'Content-Type': 'text/plain'});
                res.end('Ok2');
            } else {
                res.end();
            }
        });

        server.listen(p);

        job.get('http://127.0.0.1:'+p+'/', function(err, data, headers) {
            assert.equal('Ok', data);
            job.get('http://127.0.0.1:'+p+'/', function(err, data, headers) {
                assert.equal('Ok2', data);
                close(server);
            });
        });

        setTimeout(function() {
            close(server);
        }, timeout);
    },

    'test GET request with custom headers 2': function() {

        var job = createJob();

        var server = http.createServer(function (req, res) {
            if (req.headers.foo === 'bar' && req.headers.cookie === 'coo=kie' && req.headers['user-agent'] === 'Firefox') {
                res.writeHead(200, {'Content-Type': 'text/plain'});
                res.end('Headers ok');
            } else {
                res.end();
            }
        });

        server.listen(++port);

        job.setHeader('foo', 'bar');
        job.setCookie('coo', 'kie');
        job.setUserAgent('Firefox');

        job.get('http://127.0.0.1:'+port+'/', function(err, data, headers) {
            assert.equal('text/plain', headers['content-type']);
            assert.equal('Headers ok', data);
            close(server);
        });

        setTimeout(function() {
            close(server);
        }, timeout);
    },

    'test GET request with addCookie': function() {

        var job = createJob();

        var server = http.createServer(function (req, res) {
            var cookies = req.headers.cookie.split('; ');
            if (cookies[0] === 'coo=kie' && cookies[1] === 'foo=bar') {
                res.writeHead(200, {'Content-Type': 'text/plain'});
                res.end('Headers ok');
            } else {
                res.end();
            }
        });

        server.listen(++port);

        job.addCookie('coo', 'kie');
        job.addCookie('foo', 'bar');

        job.get('http://127.0.0.1:'+port+'/', function(err, data, headers) {
            assert.equal('text/plain', headers['content-type']);
            assert.equal('Headers ok', data);
            close(server);
        });

        setTimeout(function() {
            close(server);
        }, timeout);
    },

    'test GET request with 4xx response': function() {

        var job = createJob();

        var server = http.createServer(function (req, res) {
            res.writeHead(400, {'Content-Type': 'text/plain'});
            res.end('Forbidden');
        });

        server.listen(++port);

        job.get('http://127.0.0.1:'+port+'/', function(err, data, headers) {
            assert.equal(400, err);
            assert.equal(null, data);
            close(server);
        });

        setTimeout(function() {
            close(server);
        }, timeout);
    },

    'test GET request with 5xx response': function() {

        var job = createJob();

        var server = http.createServer(function (req, res) {
            res.writeHead(500, {'Content-Type': 'text/plain'});
            res.end('Internal Server Error');
        });

        server.listen(++port);

        job.get('http://127.0.0.1:'+port+'/', function(err, data, headers) {
            assert.equal(500, err);
            assert.equal(null, data);
            close(server);
        });

        setTimeout(function() {
            close(server);
        }, timeout);
    },

    'test GET request with too many redirects': function() {

        var job = createJob();

        var server = http.createServer(function (req, res) {
            res.writeHead(302, {'Content-Type': 'text/plain', 'Location': '/'});
            res.end();
        });

        server.listen(++port);

        job.get('http://127.0.0.1:'+port+'/', function(err, data, headers) {
            assert.equal('redirects', err);
            assert.equal(null, data);
            close(server);
        });

        setTimeout(function() {
            close(server);
        }, timeout);
    },

    'test get() is in same scope as job': function() {

        var job = createJob();

        var server = http.createServer(function (req, res) {
            res.end();
        });

        server.listen(++port);

        job.foo = 'bar';

        job.get('http://127.0.0.1:'+port+'/', function(err, data, headers) {
            assert.equal('bar', this.foo);
        });

        setTimeout(function() {
            close(server);
        }, timeout);
    },

    'test getHtml() is in same scope as job': function() {

        var job = createJob();

        var server = http.createServer(function (req, res) {
            res.end();
        });

        server.listen(++port);

        job.foo = 'bar';

        job.getHtml('http://127.0.0.1:'+port+'/', function(err, $) {
            assert.equal('bar', this.foo);
        });

        setTimeout(function() {
            close(server);
        }, timeout);
    },
}
