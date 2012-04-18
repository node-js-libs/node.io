/*!
 * node.io
 * Copyright(c) 2010 Chris O'Hara <cohara87@gmail.com>
 * MIT Licensed
 */

var Job = require('./job').JobProto,
    utils = require('./utils'),
    soupselect;

/**
 * The CSS selector function. See the documentation for usage examples.
 *
 * @param {String} selector
 * @param {Function} context
 * @api public
 */
Job.prototype.$ = function (selector, context, suppressErrors) {
    suppressErrors = suppressErrors || false;
    if (!soupselect) {
        soupselect = require('../../vendor/soupselect').select;
    }
    var selected = soupselect(context, selector);
    if (selected.length === 0) {
        this.debug('\x1B[31mERR\x1B[0m No elements matching "' + selector + '"');
        if (suppressErrors)
          selected = false;
        else
          throw new Error("No elements matching '" + selector + "'");
    } else if (selected.length === 1 && this.options.expand_single_selected) {
        selected = selected[0];
        this.bindToDomElement(selected);
    } else {
        this.bindToDomCollection(selected);
    }
    return selected;
}

/**
 * Parses the specified data using HtmlParser and SoupSelect. `callback` takes
 * (err, $, data, headers) - $ is the selector object bound to the parsed DOM.
 *
 * @param {String} data
 * @param {Function} callback
 * @param {Object} headers (optional)
 * @api public
 */
Job.prototype.parseHtml = function (data, callback, response) {
    var self = this, recurse = this.options.recurse;
    var headers = response && response.headers ? response.headers : {};
    if (this.options.jsdom) {
        var features = {
                FetchExternalResources: this.options.external_resources,
                ProcessExternalResources: this.options.external_resources,
                QuerySelector: false
        };
        var $, jquery, default_$;
        try {
            this.window = require('jsdom').jsdom(data, null, {features:features, url:response.url}).createWindow();
            jquery = require('jquery');
            default_$ = jquery.create(this.window);
            $ = function (selector, context) {
                return context ? jquery.create(context)(selector) : default_$(selector);
            };
        } catch (e) {
            callback.apply(self, [e, $, data, headers, response]);
            return;
        }
        if (recurse === 1 || recurse === true || recurse instanceof Array) {
            this.recurseUrls($);
        }
        callback.apply(self, [null, $, data, headers, response]);
    } else {
        var self = this;
        this.postParse = function (err, dom) {
            if (err) {
                callback.call(self, err);
            } else {
                $ = function (selector, context, suppressErrors) {
                    //Allow the user to specify a custom context (thanks to github.com/jimbishopp)
                    return self.$(selector, context || dom, suppressErrors);
                };
                if (recurse === 1 || recurse === true || recurse instanceof Array) {
                    self.recurseUrls($);
                }
                callback.apply(self, [null, $, data, headers, response]);
            }
        };
        //Check if the parser is already initalised
        if (!this.htmlparser) {
            this.prepareHtmlparser();
        }
        this.htmlparser.parseComplete(data);
    }
};

/**
 * Prepare htmlparser so that data can be parsed as chunks are received
 * (for use with getHtml and postHtml).
 *
 * @api public
 */
Job.prototype.prepareHtmlparser = function () {
    var self = this, $, htmlparser = require('htmlparser');
    this.postParse = this.postParse || function () {};
    this.htmlparser = new htmlparser.Parser(new htmlparser.DefaultHandler(function () {
            self.htmlparser = null;
            self.postParse.apply(this, arguments);
        }, {verbose: true, ignoreWhitespace: true}
    ));
}

/**
 * Gets all a~href links on the page based on the filter options.
 *
 * Default options are:
 *    resolve: true      - resolve relative links
 *    external: false    - include links to different hosts
 *    static: false      - include links to static resources (images, etc.)
 *    strip_anchor: true - links have their anchors stripped
 *    strip_query: false - strips query strings. Set this to 'smart' to strip
 *                         all queries unless they contain a page variable
 *                         such as 'page', 'offset', etc.
 *
 * @param {Function} $
 * @param {String} selector (optional - defaults to 'a')
 * @param {Object} options
 * @api public
 */
 Job.prototype.getLinks = function ($, selector, options) {
    if (typeof selector === 'object' || typeof selector === 'undefined') {
        options = selector || {};
        selector = 'a';
    }
    options = utils.put({
        resolve: true,
        external: true,
        static: false,
        strip_anchor: true,
        strip_query: false
    }, options);

    var current_url = this.last.url,
        current_host = this.last.host.replace('www.',''),
        resolve = require('url').resolve,
        urlparse = require('url').parse,
        urls = [];

    $(selector).each('href', function (href) {
        if (!href || href === '#' || href.substr(0, 11) === 'javascript:') return;

        //Ignore links to static resource if static=false
        if (!options.static && href.match(/\.(jpg|jpeg|ico|css|gif|png|swf)$/i)) {
            return;
        }

        //Strip off the anchor if strip_anchor=true
        var anchor;
        if (options.strip_anchor && (anchor = href.indexOf('#')) !== -1) {
            href = href.substr(0, anchor);
        }

        //Resolve relative links if resolve=true
        if (options.resolve) {
            href = resolve(current_url, href);
        }

        //Cleanup common entities
        href = href.replace(/\s/g,'%20').replace(/&amp;/g,'&');

        //Strip off query strings unless strip_query=false. If strip_query is 'smart' then
        //let query strings through if they appear to link to separate pages of results
        var query_str;
        if (options.strip_query && (query_str = href.indexOf('?')) != -1) {
            if (options.strip_query != 'smart' || (href.indexOf('page=') === -1
                    && href.indexOf('offset=') === -1 && href.indexOf('start=') === -1)) {
                href = href.substr(0, query_str);
            }
        }

        //Prevent duplicates
        if (urls.indexOf(href) != -1) {
            return;
        }

        //Ignore external resources if external=false
        if (!options.external) {
            var host = urlparse(href).host;
            if (host && current_host != host.replace('www.','')) {
                return;
            }
        }

        urls.push(href);
    });
    return urls;
 }

/**
 * Recurses URLs based on a pattern. If no pattern is specified, URLs
 * that are children of the current URL are recursed.
 *
 * Specify two regex patterns for filtering links. Links will be recursed
 * if they match pattern1 and do not match pattern2.
 *        recurse: [pattern1, pattern2]
 *
 * @param {Function} $
 * @api public
 */
 Job.prototype.recurseUrls = function ($) {
    var i, l, links = this.getLinks($, {
        external: false,
        strip_query: 'smart'
    });

    if ((l = links.length) === 0) {
        return;
    }

    if (this.options.recurse instanceof Array) {
        var pattern, n_pattern, p = this.options.recurse.length;
        if (p >= 1) {
            pattern = this.options.recurse[0];
        }
        if (p >= 2) {
            n_pattern = this.options.recurse[1];
        }

        //Iterate over links on the page and recurse urls based on the patterns
        for (i = 0; i < l; i++) {
            if ((pattern && !links[i].match(pattern))
                    || (n_pattern && links[i].match(n_pattern))) {
                continue;
            }
            this.add(links[i]);
        }
    } else {
        //Iterate over links on the page and recurse children of the current url
        for (i = 0; i < l; i++) {
            if (links[i].indexOf(this.last.url) === -1) {
                continue;
            }
            this.add(links[i]);
        }
    }
 }

/**
 * Augments a collection of DOM elements with some helpful methods.
 *
 * Methods:
 *     - filter(selector)
 *     - each(callback)  -OR-  each(attribute, callback)
 *     - first(), last(), even(), odd()
 *     - has(selector)
 *
 * @param {Array} collection
 * @api public
 */
Job.prototype.bindToDomCollection = function (collection) {
    var self = this, last = collection.length - 1, x;

    var traverse = function (attrib, callback, condition) {
        if (typeof attrib === 'function') {
            callback = attrib;
            for (x = 0; x <= last; x++) {
                if (!condition()) continue;
                self.bindToDomElement(collection[x]);
                if (false === callback(collection[x])) break;
            }
        } else {
            for (x = 0; x <= last; x++) {
                if (!condition()) continue;
                if (false === callback(collection[x].attribs[attrib])) break;
            }
        }
    };

    collection.each = function (attrib, callback) {
        traverse(attrib, callback, function() { return true; });
    };

    //odd() includes the 1st, 3rd, etc..
    collection.odd = function (attrib, callback) {
        var i = 0;
        traverse(attrib, callback, function() { return ++i % 2 === 1; });
    };

    //even() includes the 2nd, 4th, etc..
    collection.even = function (attrib, callback) {
        var i = 0;
        traverse(attrib, callback, function() { return ++i % 2 === 0; });
    };

    collection.first = function (callback) {
        var elem = collection[0];
        self.bindToDomElement(elem);
        if (callback) {
            callback(elem);
        }
        return elem;
    };

    collection.last = function (callback) {
        var elem = collection[last];
        self.bindToDomElement(elem);
        if (callback) {
            callback(elem);
        }
        return elem;
    };

    collection.filter = function (select) {
        return self.$(select, collection);
    };

    //Filter out elements in the collection that do not have a descendant that
    //matches `select`
    collection.has = function (select) {
        var has = [];
        for (x = 0; x <= last; x++) {
            if (soupselect(collection[x], select).length > 0) {
                has.push(collection[x]);
            }
        };
        self.bindToDomCollection(has);
        return has;
    };
};

/**
 * Augments a DOM element with some helpful methods / getters.
 *
 * Getters:
 *     - innerHTML
 *     - rawtext - returns text immediately inside the selected element
 *     - rawfulltext - same as rawtext, but also includes text inside nested elems
 *     - text - rawtext but trimmed, BR's replaced with \n, and entities decoded
 *     - fulltext
 *
 * Note: <br> and <br /> are replaced with \n when using text and fulltext
 *
 * @param {Object} elem
 * @api public
 */
Job.prototype.bindToDomElement = function (elem) {
    var self = this, hasChildren, x, last;

    if (elem.children && elem.children.length > 0) {
        this.bindToDomCollection(elem.children);
        last = elem.children.length - 1;
        hasChildren = true;
    }

    var rawtext = function () {
        var text = '';
        if (hasChildren) {
            for (x = 0; x <= last; x++) {
                if (elem.children[x].type === 'text') {
                    text += elem.children[x].data;
                }
            }
        }
        return text;
    };

    var text = function () {
        var text = '';
        if (hasChildren) {
            for (x = 0; x <= last; x++) {
                if (elem.children[x].type === 'text') {
                    text += elem.children[x].data.trim();
                } else if (elem.children[x].name === 'br') {
                    text += '\n';
                }
            }
        }

        text = self.filter(text).entityDecode();

        return text;
    };

    var rawfulltext = function (elem) {
        var text = '';
        if (elem.children && elem.children.length > 0) {
            for (var i = 0, l = elem.children.length; i < l; i++) {
                if (elem.children[i].type === 'text') {
                    text += elem.children[i].data;
                } else if (elem.children[i].type === 'tag') {
                    text += rawfulltext(elem.children[i]);
                }
            }
        }
        return text;
    };

    var fulltext = function (elem) {
        var text = '';
        if (elem.children && elem.children.length > 0) {
            for (var i = 0, l = elem.children.length; i < l; i++) {
                if (elem.children[i].type === 'text') {
                    text += elem.children[i].data.trim();
                } else if (elem.children[i].name === 'br') {
                    text += '\n';
                } else if (elem.children[i].type === 'tag') {
                    text += fulltext(elem.children[i]);
                }
            }
        }

        text = self.filter(text).entityDecode();

        return text;
    };

    var innerHTML = function (elem) {
        var text;

        switch (elem.type) {
        case 'tag':
        case 'script':
        case 'style':
            text = '<' + elem.raw + '>';
            //Skip if the tag is <short />
            if (elem.raw[elem.raw.length-1] !== '/') {
                if (elem.children && elem.children.length > 0) {
                    for (var i = 0, l = elem.children.length; i < l; i++) {
                        text += innerHTML(elem.children[i]);
                    }
                }
                text += '</' + elem.name + '>';
            }
            break;

        case 'comment':
            text = '<!--' + elem.raw + '-->';
            break;

        case 'text':
            text = elem.raw;
            break;

        default:
            break;
        }

        return text;
    };

    //Define getters
    elem.__defineGetter__('rawtext', rawtext);
    elem.__defineGetter__('text', text);
    elem.__defineGetter__('striptags', function () { return rawfulltext(elem); });
    elem.__defineGetter__('fulltext', function () { return fulltext(elem); });
    elem.__defineGetter__('innerHTML', function () { return innerHTML(elem); });
};

