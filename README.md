**[node.io](http://node.io/) is a distributed data scraping and processing framework**

- Jobs are written in Javascript or [Coffeescript](http://jashkenas.github.com/coffee-script/) and run in [Node.JS](http://nodejs.org/) - jobs are concise, asynchronous and _FAST_
- Includes a robust framework for scraping, selecting and traversing data from the web (choose between jQuery or SoupSelect)
- Includes a data validation and sanitization framework
- Easily handle a variety of input / output - files, databases, streams, stdin/stdout, etc.
- Speed up execution by distributing work across multiple processes and (soon) other servers
- Manage & run jobs through a web interface

Follow [@nodeio](http://twitter.com/nodeio) or visit [http://node.io/](http://node.io/) for updates.

## Scrape example

Let's pull the front page stories from reddit

    require('node.io').scrape(function() {
        this.getHtml('http://www.reddit.com/', function(err, $) {
            var stories = [];
            $('a.title').each(function(title) {
                stories.push(title.text);
            });
            this.emit(stories);
        });
    });

If you want to incorporate timeouts, retries, batch-type jobs, etc. head over to [the wiki](https://github.com/chriso/node.io/wiki) for documentation.

## Built-in modules

node.io comes with some [built-in scraping modules](https://github.com/chriso/node.io/tree/master/builtin).

Find the pagerank of a domain

    $ echo "mastercard.com" | node.io pagerank
       => mastercard.com,7

..or a list of URLs

    $ node.io pagerank < urls.txt

Quickly check the http code for each URL in a list

    $ node.io statuscode < urls.txt

Grab the front page stories from [reddit](http://www.reddit.com)

    $ node.io query "http://www.reddit.com/" a.title

## Installation

To install node.io, use [npm](http://github.com/isaacs/npm)

    $ npm install -g node.io

If you do not have npm or Node.JS, [see this page](https://github.com/chriso/node.io/wiki/Installation).

## Getting started

If you want to create your own scraping / processing jobs, head over to [the wiki](https://github.com/chriso/node.io/wiki) for documentation, examples and the API.

node.io comes bundled with several modules (including the pagerank example from above). See [this page](https://github.com/chriso/node.io/blob/master/builtin/README.md) for usage details.

## Roadmap

- Finish writing up the wiki
- More tests & improve coverage
- Add distributed processing
- Fix up the [http://node.io/](http://node.io/) page
- Cookie jar for persistent cookies
- Speed improvements

[history.md](https://github.com/chriso/node.io/blob/master/HISTORY.md) lists recent changes.

If you want to contribute, please [fork/pull](https://github.com/chriso/node.io/fork).

If you find a bug, please report the issue [here](https://github.com/chriso/node.io/issues). 

## Credits

node.io wouldn't be possible without

- [ry's](https://github.com/ry) [node.js](http://nodejs.org/)
- [tautologistics'](https://github.com/tautologistics) [node-htmlparser](https://github.com/tautologistics/node-htmlparser)
- [harryf's](https://github.com/harryf) [soupselect](https://github.com/harryf/node-soupselect)
- [kriszyp's](https://github.com/kriszyp) [multi-node](https://github.com/kriszyp/multi-node)

## License

(MIT License)

Copyright (c) 2010 Chris O'Hara <cohara87@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
