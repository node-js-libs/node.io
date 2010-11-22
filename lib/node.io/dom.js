/*!
 * node.io
 * Copyright(c) 2010 Chris O'Hara <cohara87@gmail.com>
 * MIT Licensed
 */

var Job = require('./job').JobProto,
    soupselect = require('soupselect').select,
    htmlparser = require('htmlparser');

Job.prototype.parseHtml = function (data, callback, headers) {
    var self = this;
    var handler = new htmlparser.DefaultHandler(function (err, dom) {
        if (err) {
            callback(err);
        } else {
            var $ = function (select) {
                var selected = soupselect(dom, select);
                if (selected.length === 0) {
                    self.fail(self.instance_input, "No elements matching '" + select + "'");
                    return;
                } else if (selected.length === 1) {
                    selected = selected[0];
                    self.bindToDomElement(selected);
                } else {
                    self.bindToDomCollection(selected);
                }
                return selected;
            };
            callback(null, $, data, headers);
        }
    }, {verbose: true, ignoreWhitespace: true});
    var parser = new htmlparser.Parser(handler);
    parser.parseComplete(data);
};

Job.prototype.bindToDomCollection = function (collection) {
    var self = this;
    var last = collection.length - 1;
    collection.each = function (attrib, callback) {
        if (typeof attrib === 'function') {
            callback = attrib;
            collection.forEach(function (elem) {
                self.bindToDomElement(elem);
                callback(elem);
            });
        } else {
            collection.forEach(function (elem) {
                callback(elem.attribs[attrib]);
            });
        }
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
        var selected = soupselect(collection, select);
        if (selected.length === 0) {
            self.fail(self.instance_input, "No elements matching '" + select + "'");
            return;
        } else if (selected.length === 1) {
            selected = selected[0];
            self.bindToDomElement(selected);
        } else {
            self.bindToDomCollection(selected);
        }
        return selected;
    };
};

Job.prototype.bindToDomElement = function (elem) {
    var hasChildren;
    if (elem.children && elem.children.length > 0) {
        this.bindToDomCollection(elem.children);
        hasChildren = true;
    }
        
    elem.__defineGetter__('text', function () {
        var text = '';
        if (hasChildren) {
            for (var i in elem.children) {
                if (elem.children[i].type === 'text') {
                    text += elem.children[i].data.trim();
                } else if (elem.children[i].type === 'tag' && elem.children[i].name === 'br') {
                    text += '\n';
                }
            }
        }
        return text;
    });
    
    var fulltext = function (elem) {
        var text = '';
        if (elem.children && elem.children.length > 0) {
            for (var i in elem.children) {
                if (elem.children[i].type === 'text') {
                    text += elem.children[i].data.trim();
                } else if (elem.children[i].type === 'tag') {
                    if (elem.children[i].name === 'br') {
                        text += '\n';
                    } else {
                        text += fulltext(elem.children[i]);
                    }
                }
            }
        }
        return text;
    };
    
    elem.__defineGetter__('fulltext', function () { return fulltext(elem); });
};
