var nodeio = require('node.io'),
    resolve = require('url').resolve,
    options = {timeout: 10, max: 20, spoof: true},
    pattern = null;

exports.job = new nodeio.Job(options, {
    run: function (url) {
        var self = this;

        //Allow a pattern to be specified at the command line
        if (this.options.args.length) {
            pattern = new RegExp(this.options.args[0], 'i');
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

                    //Ignore links to the same page
                    if (href == url || href.substr(url.length, 1).match(/[#?&]/)) {
                        return;
                    }

                    //If a pattern has been specified, output the urls that match the pattern
                    if (pattern && href.match(pattern)) {

                        children.push(href);

                    //Otherwise match urls that are children of the base url
                    } else if (href.indexOf(url) !== -1) {

                        children.push(href);

                    }

                });

                //Output URLs
                children.length ? self.emit(children) : self.skip();

            } catch (e) {
                self.retry();
            }
        });
    }
});
