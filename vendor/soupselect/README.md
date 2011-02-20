node-soupselect
---------------

A port of Simon Willison's [soupselect](http://code.google.com/p/soupselect/) for use with node.js and node-htmlparser.

    $ npm install soupselect

Minimal example...

    var select = require('soupselect').select;
    // dom provided by htmlparser...
    select(dom, "#main a.article").forEach(function(element) {//...});

Wanted a friendly way to scrape HTML using node.js. Tried using [jsdom](http://github.com/tmpvar/jsdom), prompted by [this article](http://blog.nodejitsu.com/jsdom-jquery-in-5-lines-on-nodejs) but, unfortunately, [jsdom](http://github.com/tmpvar/jsdom) takes a strict view of lax HTML making it unusable for scraping the kind of soup found in real world web pages. Luckily [htmlparser](http://github.com/tautologistics/node-htmlparser/) is more forgiving. More details on this found [here](http://www.reddit.com/r/node/comments/dm0tz/nodesoupselect_for_scraping_html_with_css/c118r23).

A complete example including fetching HTML etc...;

    var select = require('soupselect').select,
        htmlparser = require("htmlparser"),
        http = require('http'),
        sys = require('sys');

    // fetch some HTML...
    var http = require('http');
    var host = 'www.reddit.com';
    var client = http.createClient(80, host);
    var request = client.request('GET', '/',{'host': host});

    request.on('response', function (response) {
        response.setEncoding('utf8');
    
        var body = "";
        response.on('data', function (chunk) {
            body = body + chunk;
        });
    
        response.on('end', function() {
        
            // now we have the whole body, parse it and select the nodes we want...
            var handler = new htmlparser.DefaultHandler(function(err, dom) {
                if (err) {
                    sys.debug("Error: " + err);
                } else {
                
                    // soupselect happening here...
                    var titles = select(dom, 'a.title');
                
                    sys.puts("Top stories from reddit");
                    titles.forEach(function(title) {
                        sys.puts("- " + title.children[0].raw + " [" + title.attribs.href + "]\n");
                    })
                }
            });

            var parser = new htmlparser.Parser(handler);
            parser.parseComplete(body);
        });
    });
    request.end();

Notes:

* Requires node-htmlparser > 1.6.2 & node.js 2+
* Calls to select are synchronous - not worth trying to make it asynchronous IMO given the use case

