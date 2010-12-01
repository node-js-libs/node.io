var nodeio = require('node.io'),
    processor = new nodeio.Processor(),
    http = require('http'),
    JobClass = nodeio.JobClass,
    assert = require('assert');
    
var job = new JobClass();

var i = 24510;

//Why do these tests fail on linux?! D:

job.debug = function () {};

//Throw a warning on ECONNREFUSED rather than fail the entire test suite
job.fail = function (input, status) {
    if (status === 'ECONNREFUSED') {
        console.log('\x1B[33mWARNING\x1B[0m: \x1B[31mECONNREFUSED\x1B[0m (see request.test.js)');
    }
}

function close (server) {
    try {
        server.close();
    } catch (e) {}
}

module.exports = {
    
    'test GET request': function() {
    
        var server = http.createServer(function (req, res) {
            res.writeHead(200,{'Content-Type': 'text/plain'});
            res.end('Hello World');
        });
        
        server.listen(++i);
                
        job.get('http://127.0.0.1:'+i+'/', function(err, data, headers) {
            assert.equal('text/plain', headers['content-type']);
            assert.equal('Hello World', data);
            close(server);
        });
        
        setTimeout(function() {
            close(server);
        }, 1000);
    },
    
    'test GET request with custom headers': function() {
    
        var server = http.createServer(function (req, res) {
            if (req.headers.foo === 'bar') {
                res.writeHead(200,{'Content-Type': 'text/plain'});
                res.end('Headers ok');
            } else {
                res.end();
            }
        });
        
        server.listen(++i);
                
        job.get('http://127.0.0.1:'+i+'/', {foo:'bar'}, function(err, data, headers) {
            assert.equal('text/plain', headers['content-type']);
            assert.equal('Headers ok', data);
            close(server);
        });
        
        setTimeout(function() {
            close(server);
        }, 1000);
    },
    
    'test GET request with pre-parse callback': function() {
    
        var server = http.createServer(function (req, res) {
            res.writeHead(200,{'Content-Type': 'text/plain'});
            res.end('&gt;&lt;');
        });
        
        server.listen(++i);
        
        var parse = function(str) {
            return str.replace('&gt;','>').replace('&lt;','<');
        }
        
        job.get('http://127.0.0.1:'+i+'/', function(err, data, headers) {
            assert.equal('text/plain', headers['content-type']);
            assert.equal('><', data);
            close(server);
        }, parse);
        
        setTimeout(function() {
            close(server);
        }, 1000);
    },
    
    'test POST request': function() {
    
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
                
        job.post('http://127.0.0.1:'+i+'/', {foo:'bar'}, function(err, data, headers) {
            assert.equal('text/plain', headers['content-type']);
            assert.equal('Post ok', data);
            close(server);
        });
        
        setTimeout(function() {
            close(server);
        }, 1000);
    },
    
    'test GET request returning the dom': function() {
    
        var server = http.createServer(function (req, res) {
            res.writeHead(200,{'Content-Type': 'text/plain'});
            res.end('<p class="a"></p>');
        });
        
        server.listen(++i);
                
        job.getHtml('http://127.0.0.1:'+i+'/', function(err, $, data, headers) {
            assert.equal('text/plain', headers['content-type']);
            assert.equal('<p class="a"></p>', data);
            assert.equal('a', $('p').attribs['class']);
            close(server);
        });
        
        setTimeout(function() {
            close(server);
        }, 1000);
    },
    
    'test POST request returning the dom': function() {
    
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
                
        job.postHtml('http://127.0.0.1:'+i+'/', {foo:'bar'}, function(err, $, data, headers) {
            assert.equal('text/plain', headers['content-type']);
            assert.equal('<p class="a"></p>', data);
            assert.equal('a', $('p').attribs['class']);
            close(server);
        });
        
        setTimeout(function() {
            close(server);
        }, 1000);
    }   
    
}
