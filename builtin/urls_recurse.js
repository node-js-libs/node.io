var nodeio = require('node.io'),
    resolve = require('url').resolve,
    options = {timeout: 10, max: 20, spoof: true},
    add_pattern = recurse_pattern = null;

exports.job = new nodeio.Job(options, {
    run: function (url) {
        var self = this;

        //Allow patterns to be specified at the command line
        //Pattern 1: Urls to recurse
        //Pattern 2: Urls to output
        if (this.options.args.length >= 1) {
            recurse_pattern = new RegExp(this.options.args[0], 'i');
        } else if (this.options.args.length >= 2) {
            add_pattern = new RegExp(this.options.args[1], 'i');
        }

        this.getHtml(url, function (err, $, data) {
            try {

                //If there was an error or the page was incomplete, retry
                if (err) throw err;

                var children = [];

                //Iterate over all links on the page
                $('a').each('href', function (href) {

                    //Resolve relative links
                    href = resolve(url, href);

                    //Recurse urls matching the pattern
                    if (recurse_pattern && href.match(recurse_pattern)) {
                        self.add(href);
                    }

                    //Ignore links to the same page
                    if (href == url || href.substr(url.length, 1).match(/[#?&]/)) {
                        return;
                    }

                    //If a pattern has been specified, output the urls that match the pattern
                    if (add_pattern && href.match(add_pattern)) {
                        children.push(href);

                    //Otherwise match urls that are children of the base url
                    } else if (href.indexOf(url) !== -1) {
                        children.push(href);
                    }

                });

                //If there's no recurse pattern, recurse all children
                if (!recurse_pattern) {
                    chilren.forEach(function (url) {
                        self.add(url);
                    });
                }

                //Output urls
                children.length ? self.emit(children) : self.skip();

            } catch (e) {
                self.retry();
            }
        });
    }
});
