/*!
 * node.io
 * Copyright(c) 2010 Chris O'Hara <cohara87@gmail.com>
 * MIT Licensed
 */

var http = require('http'),
    https = require('https'),
    resolve = require('url').resolve,
    urlparse = require('url').parse,
    query = require('querystring'),
    Job = require('./job').JobProto,
    utils = require('./utils');

/**
 * The default headers to send when using createClient()
 */
var default_headers = {
    accept: '*/*',
    'accept-charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.3',
    'user-agent': 'node.io'
};

/**
 * Some user-agents for spoofing
 */
var user_agents = [
    'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)',
    'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0)',
    'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 6.0)',
    'Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US; rv:1.9.2.13) Gecko/20101203 Firefox/3.6.13',
    'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-GB; rv:1.8.1.6) Gecko/20070725 Firefox/2.0.0.6',
    'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.1; .NET CLR 1.1.4322; .NET CLR 2.0.50727; .NET CLR 3.0.04506.30)',
    'Opera/9.20 (Windows NT 6.0; U; en)',
    'Mozilla/5.0 (Windows; U; Windows NT 6.1; ru; rv:1.9.2) Gecko/20100115 Firefox/3.6',
    'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0; MS-RTC LM 8)',
    'Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US) AppleWebKit/533.2 (KHTML, like Gecko) Chrome/6.0',
    'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_7; en-us) AppleWebKit/533.4 (KHTML, like Gecko) Version/4.1 Safari/533.4',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_6) AppleWebKit/534.22 (KHTML, like Gecko) Chrome/11.0.683.0 Safari/534.22'
];

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
 * Makes a HEAD request to the specified resource. See doRequest().
 *
 * @param {String} resource
 * @param {Object} headers (optional)
 * @param {Function} callback
 * @api public
 */
Job.prototype.head = function (resource, headers, callback) {
    this.doRequest('HEAD', resource, null, headers, callback, null);
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

    if (!this.options.jsdom) {
        this.prepareHtmlparser();
    }

    //`headers` is optional
    if (typeof headers === 'function') {
        callback = headers;
        headers = default_headers;
    }

    this.get(resource, headers, function (err, data, headers, response) {
        if (err) {
            callback.call(this, err);
        } else {
            self.parseHtml(data, callback, response);
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

    if (!this.options.jsdom) {
        this.prepareHtmlparser();
    }

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

    this.post(resource, body, headers, function (err, data, headers, response) {
        if (err) {
            callback.call(this, err);
        } else {
            self.parseHtml(data, callback, response);
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
    var self = this, host, port, url, path, rid, secure, request, cleanup, h,
        request_response, options, on_complete;

    //Give each a request a unique ID for debugging
    rid = Math.floor(Math.random() * 100000);

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
        utils.put_default(headers, default_headers);
    }

    //Proxy the callback to provide auto retry support
    on_complete = callback;
    callback = function() {
        if (self.options.auto_retry) {
            var err = Array.prototype.slice.call(arguments)[0];
            try {
                if (err) {
                    throw err;
                }
                on_complete.apply(self, arguments);
            } catch (e) {
                self.retry();
            }
        } else {
            on_complete.apply(self, arguments);
        }
    };

    //Internally keep track of the # of redirects
    redirects = redirects || 0;
    if (redirects > this.options.redirects) {
        callback('redirects');
        return;
    }

    //Add a protocol if there isn't one
    if (!resource.match(/https?:\/\//)) {
        resource = 'http://' + resource;
    }

    //Parse the URL into parts
    url = urlparse(resource, false),

    //Get the request path
    path = url.pathname || '/';
    if (url.search) {
        path += url.search;
    }

    //Copy `headers` before modifying it
    headers = utils.put({}, headers);

    if (typeof headers.host === 'undefined') {
        headers.host = url.hostname;
    }

    //Add headers set before the doRequest call if from the same host (e.g. cookie, user-agent, referer, etc.)
    if (typeof this.last.headers === 'object' && this.last.host === url.hostname) {
        utils.put(headers, this.last.headers);
        this.last = {};
    }

    //Add headers added by setHeader, setCookie, etc.
    utils.put(headers, this.next);
    this.next = {};

    //Set a random user agent if using --spoof
    if (this.options.spoof) {
        headers['user-agent'] = user_agents[Math.floor(Math.random() * user_agents.length)];
    }

    //Prepare the body to write and get the content length
    if (body) {
        if (typeof body === 'object') {
            body = query.stringify(body);
        }
        headers['Content-Length'] = Buffer.byteLength(body);
    }

    //Determine the port and add it to the host header  
    port = url.port;
    if (!port) {
        switch (url.protocol) {
            case 'http:':
                port = 80;
                break;
            case 'https:':
                port = 443;
                secure = true;
                break;
            case 'ftp:':
                port = 21;
                break;
            default:
                port = 80;
        }
    } else {
        headers.host += ':' + port;
    }

    method = method.toUpperCase();

    //Debug request headers
    this.debug('\033[7m'+method+'\033[0m '+resource + ' (request ' + rid + ')');
    this.debug('  | ' + method + ' ' + path + ' HTTP/1.1');
    for (h in headers) {
        this.debug('  | ' + h[0].toUpperCase() + h.substr(1) + ': ' + headers[h]);
    }

    host = url.hostname ? url.hostname : headers.host;

    options = {
        host: host,
        port: port,
        path: path,
        method: method,
        headers: headers
    };

    request = (secure ? https : http).request(options, function (response) {

        response.url = resource;

        request_reponse = response;

        if (self.is_complete) {
            return cleanup();
        }

        response.setEncoding(self.options.encoding);

        var code = response.statusCode || 200;

        //Debug response headers
        self.debug('\033[7m'+code+'\033[0m '+resource + ' (response ' + rid + ')');
        for (h in response.headers) {
            self.debug('  | ' + h[0].toUpperCase() + h.substr(1) + ': ' + response.headers[h]);
        }

        //Save the response headers for the next request (if to the same host)
        var cookies = response.headers['set-cookie'];
        self.last = {
            url: resource,
            host: url.hostname,
            headers: {
                referer: resource,
                cookie: cookies instanceof Array ? cookies.join('; ') : cookies
            }
        };

        //Handle http response codes
        if (!self.ignore_code) {
            switch (Math.floor(code/100)) {
                case 4:
                case 5:
                    self.debug('\x1B[31mERR\x1B[0m Request ' + rid + ' failed with code ' + code + ' ('+resource+')');
                    return callback(code);
                case 3:
                    if (typeof response.headers.location === 'undefined') {
                        self.debug('\x1B[31mERR\x1B[0m Request ' + rid + ' failed with invalid 30x response ('+resource+')');
                        callback(code);
                    } else {
                        //Handle the 30x redirect
                        var location = resolve(resource, response.headers.location);
                        var redirect = urlparse(location);
                        if (redirect.host) {
                            headers.host = redirect.host;
                        }
                        if (code === 302 || code === 303) {
                            // morph this post request into a get request 
                            for (header in headers) {
                                h = header.toLowerCase();
                                if (h === 'content-length' || h === 'content-type') {
                                   delete headers[header];  
                                }
                            }
                            self.doRequest('GET', location, null, headers, callback, parse, ++redirects);
                        } else {
                            self.doRequest(method, location, body, headers, callback, parse, ++redirects);
                        }
                    }
                    return;
            }
        }

        var body = '';
        response.on('data', function (chunk) {
            self.bytes_received += chunk.length;
            if (self.htmlparser) {
                self.htmlparser.parseChunk(chunk);
            }
            if (self.is_complete) {
                return cleanup();
            }
            body = body + chunk;
        });

        response.on('end', function () {
            if (self.is_complete) {
                return cleanup();
            }

            var parse_callback = function (err, data) {
                callback(null, data, response.headers, response);
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

            cleanup();
        });

    });

    //Write a body if it was specified
    if (body) {
        request.write(body);
    }

    //This method is called on each event if the instance is already complete (i.e. timed out)
    cleanup = function () {
        if (request.socket && request.socket.destroy) {
            request.socket.destroy();
        }
        if (request_response) {
            request_response.abort();
        }
    };

    //Watch for errors
    request.on('error', function (err) {
        if (self.is_complete) return;
        self.debug('\x1B[31mERR\x1B[0m Request ' + rid + ' failed with (' + err.errno + ') ' + err + ' ('+resource+')');
        cleanup();
        callback(err);
    });

    //Set a special timeout if the `timeout` option is set. Redirects do not reset the timeout
    if (this.options.timeout && redirects === 0) {
        self.cancel_timeout();
        self.timeout = setTimeout(function() {
            if (self.is_complete) return;
            self.debug('\x1B[31mERR\x1B[0m Request ' + rid + ' timed out ('+resource+')');
            cleanup();
            callback('timeout');
        }, this.options.timeout * 1000);
    }

    //We're done
    request.end();
};

/**
 * Sets a header on the next request.
 *
 * @param {Object|String} key
 * @param {String} value
 * @api public
 */
Job.prototype.setHeader = function (key, value) {
    if (typeof key === 'object') {
        utils.put(this.next, key);
    } else {
        this.next[key.toLowerCase()] = value;
    }
};

/**
 * Sets the Cookie for the next request.
 *
 * @param {String} cookie
 * @api public
 */
Job.prototype.setCookie = function (key, value) {
    if (value) {
        key = encodeURIComponent(key) + '=' + encodeURIComponent(value);
    }
    this.setHeader('cookie', key);
};

/**
 * Sets the User-Agent for the next request.
 *
 * @param {String} agent
 * @api public
 */
Job.prototype.setUserAgent = function (agent) {
    this.setHeader('user-agent', agent);
};

/**
 * Adds a cookie to the next request.
 *
 * @param {String} key
 * @param {String} value
 * @api public
 */
Job.prototype.addCookie = function (key, value) {
    key = encodeURIComponent(key);
    value = encodeURIComponent(value);
    if (typeof this.next.cookie !== 'undefined' && this.next.cookie.length) {
        this.next.cookie += '; ' + key + '=' + value;
    } else {
        this.next.cookie = key + '=' + value;
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
 * @param {Function} host
 * @api public
 */
var HttpProxy = function (host) {
    var proxy = urlparse(host), urlhost;
    var url_callback = function (url) {
        var u = urlparse(url);
        urlhost = u.host;
        url = (proxy.protocol || 'http:')
            + '//' + proxy.host
            + (u.pathname || '/');

        if (u.search) {
            url += u.search;
        }
        return url;
    };
    var header_callback = function (headers) {
        headers = headers || {};
        headers.host = urlhost;
        return headers;
    };
    return new Proxy(url_callback, header_callback);
};

/**
 * Export proxies
 */
exports.HttpProxy = HttpProxy;
exports.Proxy = Proxy;
