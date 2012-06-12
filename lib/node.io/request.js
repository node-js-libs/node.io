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
    utils = require('./utils')
    request = require('request');

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
Job.prototype.doRequest = function (method, resource, body, headers, callback, parse) {
    var self = this, host, port, url, path, rid, secure, h, options, on_complete;

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
    
    //Set a random user agent if using --spoof
    if (this.options.spoof) {
        headers['user-agent'] = user_agents[Math.floor(Math.random() * user_agents.length)];
    }

    //Add headers from a previous request if this is a nested request
    if (this.last.headers) {
        utils.put(headers, this.last.headers);
    }

    //Add headers added by setHeader, setCookie, etc.
    utils.put(headers, this.next);
    this.next = {};

    //Prepare the body to write and get the content length
    if (body) {
        if (typeof body === 'object') {
            body = query.stringify(body);
        }
        headers['Content-Length'] = Buffer.byteLength(body);
    }

    method = method.toUpperCase();

    //Debug request headers
    this.debug('\033[7m'+method+'\033[0m '+resource + ' (request ' + rid + ')');
    this.debug('  | ' + method + ' ' + path + ' HTTP/1.1');
    for (h in headers) {
        this.debug('  | ' + h[0].toUpperCase() + h.substr(1) + ': ' + headers[h]);
    }

    options = {
        url: url,
        method: method,
        headers: headers,
        body: body,
        maxRedirects: this.options.redirects,
        followRedirect: this.options.redirects > 0,
        followAllRedirects: this.options.redirects > 0,
        encoding: this.options.encoding,
        jar: false,
        pool: false
    }

    //Use a HTTP proxy?
    if (this.options.proxy) {
        options.proxy = typeof this.options.proxy === 'function'
                      ? this.options.proxy()
                      : this.options.proxy;
    }

    //Set a request timeout?
    if (this.options.timeout) {
        self.cancel_timeout();
        options.timeout = this.options.timeout * 1000;
    }

    request(options, function (err, response, body) {
        if (self.is_complete) {
            return;
        }

        if (err) {
            self.debug('\x1B[31mERR\x1B[0m Request ' + rid + ' failed with (' + (err.errno || '?') + ') ' + err + ' ('+resource+')');
            if (/maxRedirects/.test(err.message)) {
                err = 'redirects'; //compat
            }
            return callback(err);
        }

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
                case 3:
                case 4:
                case 5:
                    self.debug('\x1B[31mERR\x1B[0m Request ' + rid + ' failed with code ' + code + ' ('+resource+')');
                    return callback(code);
            }
        }

        var parse_callback = function (err, data) {
            callback(err, data, response.headers, response);
        }

        //Parse the response body with a custom parser?
        if (parse) {
            var ret = parse(body, parse_callback);
            if (typeof ret !== 'undefined') {
                callback(null, ret, response.headers, response);
            }
        } else {
            parse_callback(null, body)
        }
    });
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

