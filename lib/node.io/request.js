/*!
 * node.io
 * Copyright(c) 2010 Chris O'Hara <cohara87@gmail.com>
 * MIT Licensed
 */

var http = require('http'),
    urlparse = require('url').parse,
    query = require('querystring'),
    Job = require('./job').JobProto;

/**
 * The default headers to send when using createClient()
 */
var default_headers = {
    accept: '*/*',
    'accept-charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.3',
    'user-agent': 'node.io'
};

/**
 * Makes a GET request to the specified resource. See doRequest().
 *
 * @param {String} resource
 * @param {Object} headers (optional)
 * @param {Function} callback
 * @param {Function} parse (optional)
 * @api public
 */
Job.prototype.get = function (resource, headers, callback, parse) {
    this.doRequest('GET', resource, null, headers, callback, parse);
};

/**
 * Makes a POST request to the specified resource. See doRequest().
 *
 * @param {String} resource
 * @param {Object} body (optional)
 * @param {Object} headers (optional)
 * @param {Function} callback
 * @param {Function} parse (optional)
 * @api public
 */
Job.prototype.post = function (resource, body, headers, callback, parse) {
    this.doRequest('POST', resource, body, headers, callback, parse);
};

/**
 * Makes a GET request to the specified resource and returns a selector object.
 * See parseHtml() in ./dom.js
 *
 * @param {String} resource
 * @param {Object} headers (optional)
 * @param {Function} callback
 * @param {Function} parse (optional)
 * @api public
 */
Job.prototype.getHtml = function (resource, headers, callback, parse) {
    var self = this;
    
    //`headers` is optional
    if (typeof headers === 'function') {
        callback = headers;
        headers = default_headers;
    }
    
    this.get(resource, headers, function (err, data, headers) {
        if (err) {
            callback(err);
        } else {
            self.parseHtml(data, callback, headers);
        }
    }, parse);
};

/**
 * Makes a POST request to the specified resource and returns a selector object.
 * See parseHtml() in ./dom.js
 *
 * @param {String} resource
 * @param {Object} body (optional)
 * @param {Object} headers (optional)
 * @param {Function} callback
 * @param {Function} parse (optional)
 * @api public
 */
Job.prototype.postHtml = function (resource, body, headers, callback, parse) {
    var self = this;
    
    //`body` and `headers` are optional
    if (typeof body === 'function') {
        callback = body;
        preparse = headers;
        headers = default_headers;
    } else if (typeof headers === 'function') {
        parse = callback;
        callback = headers;
        headers = default_headers;
    }
    
    this.post(resource, body, headers, function (err, data, headers) {
        if (err) {
            callback(err);
        } else {
            self.parseHtml(data, callback, headers);
        }
    }, parse);
};

/**
 * Encodes the body of a request.
 *
 * @param {Object} body
 * @param {Boolean} use_json (optional)
 * @api public
 */
Job.prototype.encodeBody = function (body, use_json) {
    if (use_json) {
        JSON.stringify(body);
    } else {
        query.stringify(body);
    }
};

/**
 * Makes a request to the specified resource and returns the response body
 * response headers. `callback` takes (err, data, headers).
 *
 * `parse` is an optional callback which can be used to filter or decode the body
 * before `callback` is called.
 *
 * @param {String} method
 * @param {String} resource
 * @param {Object} body (optional)
 * @param {Object} headers (optional)
 * @param {Function} callback
 * @param {Function} parse (optional)
 * @api public
 */
Job.prototype.doRequest = function (method, resource, body, headers, callback, parse, redirects) {
    var self = this;
    
    //Internally keep track of the # of redirects
    redirects = redirects || 0;
    if (redirects > this.options.redirects) {
        self.fail_with('redirects');
        return;
    }
    
    //`body` and `headers` are optional
    if (typeof body === 'function') {
        parse = headers;
        callback = body;
        headers = default_headers;
        body = null;
    } else if (typeof headers === 'function') {
        parse = callback;
        callback = headers;
        headers = default_headers;
    } else {
        //Add default headers
        for (var i in default_headers) {
            if (typeof headers[i] === 'undefined') {
                headers[i] = default_headers[i];
            }
        }
    }
    
    if (!resource.match(/https?:\/\//)) {
        resource = 'http://' + resource;
    }
    
    var url = urlparse(resource, false), port = url.port;
    
    if (!port) {
        port = (url.protocol === 'http:') ? 80 : 443;
    }
    
    var host = http.createClient(port, url.hostname),
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
    
    method = method.toUpperCase();
    
    var request = host.request(method, req_url, headers);
    
    this.debug('\033[7m'+method+'\033[0m '+resource);
    
    if (body) {
        request.write(body);
    }
    
    //This method is called on each event if the instance is already complete (i.e. timed out)
    var cleanup = function () {
    
        //I'll clean up this mess once I figure out which destroy() to call (API is unclear with 0.2.4 => 0.3.1)
        if (request) {
            if (request.socket && request.socket.destroy) {
                request.socket.destroy();
            }
            if (request.destroy) {
                request.destroy();
            }
        }
        if (host.destroy) {
            host.destroy();
        }
        
    };
    
    //Watch for errors
    host.addListener('error', function (connectionException) {
        if (self.is_complete) return;
        
        var err;
        switch (connectionException.errno) {
        case 111:
            err = 'ECONNREFUSED';
            break;
        case 104:
            err = 'ECONNRESET';
            break;
        case 12:
            err = 'ETIMEOUT';
            break;
        case 11:
            err = 'DNSFAIL';
            break;
        case 4:
            err = 'ENOTFOUND';
            break;
        case 1:
            err = 'EPERM';
            break;
        default:
            err = 'connection';
            break;
        }
        self.debug('Request failed with: ('+connectionException.errno+') ' + connectionException + ' ('+resource+')');
        self.fail_with(err);
        cleanup();
    });
    
    //Set a special timeout if the `timeout` option is set. Redirects do not reset the timeout
    if (this.options.timeout && redirects === 0) {
        self.cancel_timeout();
        self.timeout = setTimeout(function() {
            if (self.is_complete) return;
            self.debug('Request timed out ('+resource+')');
            self.fail_with('timeout');
            cleanup();
        }, this.options.timeout * 1000);
    }
    
    request.on('response', function (response) {
        if (self.is_complete) {
            cleanup();
            return;
        }
        
        response.setEncoding('utf8');
        
        var code = response.statusCode || 200;
        
        self.debug('\033[7m'+code+'\033[0m '+resource);
    
        switch (Math.floor(code/100)) {
            case 4:
                self.fail_with(code);
                return;
            
            case 3:
                if (typeof response.headers.location === 'undefined') {
                    self.fail_with(code);
                } else {
                    headers.referer = resource;
                    self.debug('  \033[7m>\033[0m ' + response.headers.location);
                    self.doRequest(method, response.headers.location, body, headers, callback, parse, ++redirects);
                }
                return;
                
            case 5:
                self.fail_with(code);
                return;
        }
        
        var body = '';
        response.on('data', function (chunk) { 
            self.bytes_received += chunk.length;
            
            if (self.is_complete) {
                cleanup();
                return;
            }
            
            body = body + chunk; 
        });
        
        response.on('end', function () {
            if (self.is_complete) {
                cleanup();
                return;
            }
            
            var parse_callback = function (err, data) {
                callback(null, data, response.headers);
            };
            
            if (!parse) {
                //If no parse function was specified, just return the body
                parse_callback(null, body);
            } else {
                //Call the parse function on the response body - handle async and sync cases
                var ret = parse(body, parse_callback);
                if (typeof ret !== 'undefined') {
                    parse_callback(null, ret);
                }
            }
            
            host.destroy();
        });
    });
    
    if (request.end) {
        request.end();
    } else {
        request.close();
    }
};

/**
 * Returns the total bytes received by any doRequest() calls.
 *
 * @return {Number} bytes_received
 * @api public
 */
Job.prototype.getBytesReceived = function () {
    return this.bytes_received;
};

/**
 * Creates a new proxy with the specified (optional) callbacks. The callbacks
 * are used to synchronously modify the url, request headers, parse callback, 
 * and response headers surrounding a doRequest().
 *
 * @param {Function} url_callback
 * @param {Function} req_header_callback
 * @param {Function} parse_callback
 * @param {Function} res_header_callback
 * @api public
 */
var Proxy = function (url_callback, req_header_callback, parse_callback, res_header_callback) {
    this.url_callback = url_callback;
    this.req_header_callback = req_header_callback;
    this.res_header_callback = res_header_callback;
    this.parse_callback = parse_callback;
};

/**
 * Proxifies the doRequest() method in the specified job instance.
 *
 * @param {Object} job
 * @return {Object} job
 * @api public
 */
Proxy.prototype.proxify = function (job) {
    var self = this, doRequest = job.doRequest;

    job.doRequest = function (method, resource, body, headers, callback, parse, redirects) {
        
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
            headers = self.req_header_callback(headers);
        }
        
        //Modify the response body
        if (self.parse_callback) {
            if (!parse) {
                parse = self.parse_callback;
            } else {
                //If a parse function is passed to fetch, chain it together with the proxy parse_callback
                var old_parse = parse;
                parse = function (err, data) {
                    var ret = self.parse_callback(data, old_parse);
                    if (typeof ret !== 'undefined') {
                        old_parse(null, ret);
                    }
                };
            }
        }
        
        //Modify response headers
        if (self.res_header_callback) {        
            var old_callback = callback;
            callback = function (err, data, headers) {
                headers = self.res_header_callback(headers);
                return old_callback(err, data, headers);
            };
        }
        
        doRequest.apply(job, [method, resource, body, headers, callback, parse, redirects]);
    };
    
    return job;
};

/**
 * Creates a new proxy that routes requests through the specified host.
 *
 * Note: 100% UNTESTED - use at your own peril.
 * 
 * @param {Function} host
 * @api public
 */
var HttpProxy = function (host) {
    var url_callback = function (url) {
        var u = urlparse(url);
        this.url_host = u.host;
        url = u.protocol + '//' + u.host + '/' + u.pathname;
        if (u.search) {
            url += u.search;
        }
        return u;
    };
    var header_callback = function (headers) {
        headers = headers || {};
        headers.host = this.url_host;
        return headers;
    };
    return new Proxy(url_callback, header_callback);
};

/**
 * Export proxies
 */
exports.HttpProxy = HttpProxy;
exports.Proxy = Proxy;