/*
Based on the http://mootools.net/slickspeed/ benchmarks. Uses the same sample document
but only runs those tests where the CSS syntax used is supported by soupselect
*/

var select = require('soupselect').select,
    htmlparser = require("htmlparser"),
    fs = require('fs'),
    sys = require('sys');

var html = fs.readFileSync('testdata/benchmark.html', 'utf-8');

var selectors = [
    'body',
    'div',
    'body div',
    'div p',
    'div p a',
    '.note',
    'div.example',
    'ul .tocline2',
    '#title',
    'h1#title',
    'div #title',
    'ul.toc li.tocline2',
    'div[class]',
    'div[class=example]',
    'div[class^=exa]',
    'div[class$=mple]',
    'div[class*=e]',
    'div[class|=dialog]',
    'div[class!=made_up]',
    'div[class~=example]',
    ];

selectors.forEach(function(selector) {
    
    var handler = new htmlparser.DefaultHandler(function(err, dom) {
        if (err) {
            sys.debug("Error: " + err);
        } else {
            var start = new Date().getTime();
            var els = select(dom, selector);
            var elapsed = new Date().getTime() - start;
            sys.puts(selector + " : " + elapsed + "ms, " + els.length + " elements");
        }
    });

    var parser = new htmlparser.Parser(handler);
    parser.parseComplete(html);
    
});