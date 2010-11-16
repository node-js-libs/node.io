var http = require('http'),
    urlparse = require('url').parse,
    query = require('querystring'),
    Job = require('./job').Job;

var default_headers = {
    accept: '*/*',
    'accept-charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.3',
    'user-agent': 'node.io',
    //accept-encoding: 'gzip,deflate', //TODO
}

Job.prototype.get = function(resource, headers, callback, parse) {
    this.doRequest('GET', resource, null, headers, callback, parse);
}

Job.prototype.post = function(resource, body, headers, callback, parse) {
    this.doRequest('POST', resource, body, headers, callback, parse);
}

Job.prototype.encodeBody = function(body, use_json) {
    if (use_json) {
        JSON.stringify(body);
    } else {
        query.stringify(body);
    }
}

Job.prototype.doRequest = function(method, resource, body, headers, callback, parse) {
    if (typeof headers === 'function') {
        parse = callback;
        callback = headers;
        headers = default_headers;
    } else {
        //Mixin default headers
        for (var i in default_headers) {
            if (typeof headers[i] === 'undefined') {
                headers[i] = default_headers[i];
            }
        }
    }
    
    if (!resource.match(/https?:\/\//)) {
        resource = 'http://' + resource;
    }
    
    var url = urlparse(resource, false),
        port = url.port;
    
    if (!port) port = (url.protocol === 'http:') ? 80 : 443;
    
    host = http.createClient(port, url.hostname),
    req_url = url.pathname;
    
    if (typeof headers.host === 'undefined') {
        headers.host = url.hostname;
    }
    
    if (url.search) {
        req_url += url.search;
    }
    
    if (typeof body === 'object') {
        body = query.stringify(body);
    }
    
    if (body) {
        headers['Content-Length'] = body.length;
    }
    
    var request = host.request(method.toUpperCase(), req_url, headers);
    
    if (body) {
        request.write(body);
    }
    
    request.on('response', function (response) {
        response.setEncoding('utf8');
        
        var body = '';
        response.on('data', function (chunk) { body = body + chunk; });
        
        response.on('end', function() {
                        
            var parse_callback = function(err, data) {
                callback(null, data, response.headers);
            }
            
            if (!parse) {
                //If no parse function was specified, just return the body
                parse_callback(null, body);
            } else {
                //Call the parse function on the response body - handle async and sync cases
                var ret = parse(body, parse_callback);
                if (typeof ret !== 'undefined') parse_callback(null, ret);
            }
            
        });
    });
    
    if (request.end) {
        request.end();
    } else {
        request.close();
    }
}

Job.prototype.getHtml = function(file, headers, callback, preparse) {
    var self = this;
    
    if (typeof headers === 'function') {
        callback = headers;
        headers = default_headers;
    }
    
    this.get(file, headers, function(err, data, headers) {
        if (err) {
            callback(err);
        } else {
            self.parseHtml(data, callback, headers);
        }
    }, preparse);
}

Job.prototype.postHtml = function(file, headers, callback, preparse) {
    var self = this;
    
    if (typeof headers === 'function') {
        callback = headers;
        headers = default_headers;
    }
    
    this.post(file, headers, function(err, data, headers) {
        if (err) {
            callback(err);
        } else {
            self.parseHtml(data, callback, headers);
        }
    }, preparse);
}

var Proxy = exports.Proxy = function(url_callback, req_header_callback, parse_callback, res_header_callback) {
    this.url_callback = url_callback;
    this.req_header_callback = req_header_callback;
    this.res_header_callback = res_header_callback;
    this.parse_callback = parse_callback;
}

//Proxifies doRequest (+ get, getHtml, post, postHtml)
//Note: this is untested!
Proxy.prototype.proxify = function(job) {
    var self = this, fetch = job.fetch;

    job.doRequest = function(method, resource, body, headers, callback, parse) {
        
        if (typeof headers === 'function') {
            parse = callback;
            callback = headers;
            headers = default_headers;
        }
    
        //Modify the request url
        if (self.url_callback) {
            resource = self.url_callback(resource);
        }
        
        //Modify request headers
        if (self.req_header_callback) {
            headers = self.req_header_callback(header);
        }
        
        //Modify the response body
        if (self.parse_callback) {
            if (!parse) {
                parse = self.parse_callback;
            } else {
                //If a parse function is passed to fetch, chain it together with the proxy parse_callback
                var old_parse = parse;
                parse = function(err, data) {
                    var ret = self.parse_callback(data, old_parse);
                    if (typeof ret === 'undefined') old_parse(null, ret);
                }
            }
        }
        
        //Modify response headers
        if (self.res_header_callback) {        
            var old_callback = callback;
            callback = function(err, data, headers) {
                headers = self.res_header_callback(headers);
                return old_callback(err, data, headers);
            }
        }
        
        doRequest(method, resource, body, headers, callback, parse);
    }
}

//Note: this is untested!
var HttpProxy = exports.HttpProxy = function(host) {
    var url_callback = function(url) {
        var u = urlparse(url);
        this.url_host = u.host;
        url = u.protocol+'//'+u.host+'/'+u.pathname;
        if (u.search) {
            url =+ u.search;
        }
        return u;
    }
    var header_callback = function(headers) {
        headers = headers || {};
        headers.host = this.url_host;
        return headers;
    }
    return new Proxy(url_callback, header_callback);
}