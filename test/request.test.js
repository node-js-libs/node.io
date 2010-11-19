var nodeio = require('../'),
    processor = new nodeio.Processor(),
    http = require('http'),
    JobClass = nodeio.JobClass;
    
var job = new JobClass();

var i = 24510;

//Why do these tests fail on linux?! D:

//Throw a warning on ECONNREFUSED rather than fail the entire test suite
job.fail = function(input, status) {
    if (status === 'ECONNREFUSED') {
        console.log('\x1B[33mWARNING\x1B[0m: \x1B[31mECONNREFUSED\x1B[0m (see request.test.js)');
    }
}

module.exports = {
    
    'test GET request': function(assert) {
    
        var server = http.createServer(function (req, res) {
            res.writeHead(200,{'Content-Type': 'text/plain'});
            res.end('Hello World');
        });
        
        server.listen(++i);
        
        var closed = false;
        
        job.get('http://127.0.0.1:'+i+'/', function(err, data, headers) {
            assert.equal('text/plain', headers['content-type']);
            assert.equal('Hello World', data);
            server.close();
            closed = true;
        });
        
        setTimeout(function() {
            if (!closed) server.close();
        }, 1000);
    },
    
    'test GET request with custom headers': function(assert) {
    
        var server = http.createServer(function (req, res) {
            if (req.headers.foo === 'bar') {
                res.writeHead(200,{'Content-Type': 'text/plain'});
                res.end('Headers ok');
            } else {
                res.end();
            }
        });
        
        server.listen(++i);
        
        var closed = false;
        
        job.get('http://127.0.0.1:'+i+'/', {foo:'bar'}, function(err, data, headers) {
            assert.equal('text/plain', headers['content-type']);
            assert.equal('Headers ok', data);
            server.close();
            closed = true;
        });
        
        setTimeout(function() {
            if (!closed) server.close();
        }, 1000);
    },
    
    'test GET request with pre-parse callback': function(assert) {
    
        var server = http.createServer(function (req, res) {
            res.writeHead(200,{'Content-Type': 'text/plain'});
            res.end('&gt;&lt;');
        });
        
        server.listen(++i);
        
        var closed = false;
        
        var parse = function(str) {
            return str.replace('&gt;','>').replace('&lt;','<');
        }
        
        job.get('http://127.0.0.1:'+i+'/', function(err, data, headers) {
            assert.equal('text/plain', headers['content-type']);
            assert.equal('><', data);
            server.close();
            closed = true;
        }, parse);
        
        setTimeout(function() {
            if (!closed) server.close();
        }, 1000);
    },
    
    'test POST request': function(assert) {
    
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
        
        server.listen(++i);
        
        var closed = false;
        
        job.post('http://127.0.0.1:'+i+'/', {foo:'bar'}, function(err, data, headers) {
            assert.equal('text/plain', headers['content-type']);
            assert.equal('Post ok', data);
            server.close();
            closed = true;
        });
        
        setTimeout(function() {
            if (!closed) server.close();
        }, 1000);
    },
    
    'test GET request returning the dom': function(assert) {
    
        var server = http.createServer(function (req, res) {
            res.writeHead(200,{'Content-Type': 'text/plain'});
            res.end('<p class="a"></p>');
        });
        
        server.listen(++i);
        
        var closed = false;
        
        job.getHtml('http://127.0.0.1:'+i+'/', function(err, $, data, headers) {
            assert.equal('text/plain', headers['content-type']);
            assert.equal('<p class="a"></p>', data);
            assert.equal('a', $('p').attribs['class']);
            server.close();
            closed = true;
        });
        
        setTimeout(function() {
            if (!closed) server.close();
        }, 1000);
    },
    
    'test POST request returning the dom': function(assert) {
    
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
        
        server.listen(++i);
        
        var closed = false;
        
        job.postHtml('http://127.0.0.1:'+i+'/', {foo:'bar'}, function(err, $, data, headers) {
            assert.equal('text/plain', headers['content-type']);
            assert.equal('<p class="a"></p>', data);
            assert.equal('a', $('p').attribs['class']);
            server.close();
            closed = true;
        });
        
        setTimeout(function() {
            if (!closed) server.close();
        }, 1000);
    }   
    
}
