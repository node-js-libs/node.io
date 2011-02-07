/*!
 * node.io
 * Copyright(c) 2010 Chris O'Hara <cohara87@gmail.com>
 * MIT Licensed
 */

var Job = require('./job').JobProto, soupselect;

/**
 * The CSS selector function. See the documentation for usage examples.
 *
 * @param {String} selector
 * @param {Function} context
 * @api public
 */
Job.prototype.$ = function (selector, context) {
    if (!soupselect) {
        soupselect = require('soupselect').select;
    }
    var selected = soupselect(context, selector);
    if (selected.length === 0) {
        throw new Error("No elements matching '" + selector + "'");
    } else if (selected.length === 1) {
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
    if (this.options.jsdom) {
        var features = {
                FetchExternalResources: false, 
                ProcessExternalResources: false, 
                QuerySelector: false
        };
        var $, window = require('jsdom').jsdom(data, null, {features:features}).createWindow(),
            jquery = require('jquery'),
            default_$ = jquery.create(window);
        $ = function (selector, context) {
            return context ? jquery.create(context) : default_$(selector);
        };
        callback(null, $, data, response.headers, response);
    } else {
        var self = this, handler, parser, $, htmlparser = require('htmlparser');
        handler = new htmlparser.DefaultHandler(function (err, dom) {
            if (err) {
                callback(err);
            } else {
                $ = function (selector, context) {
                    //Allow the user to specify a custom context (thanks to github.com/jimbishopp)
                    return self.$(selector, context || dom);
                };
                callback(null, $, data, response.headers, response);
            }
        }, {verbose: true, ignoreWhitespace: true});
        parser = new htmlparser.Parser(handler);
        parser.parseComplete(data);
    }
};

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
                callback(collection[x]);
            }
        } else {
            for (x = 0; x <= last; x++) {
                if (!condition()) continue;
                callback(collection[x].attribs[attrib]);
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
