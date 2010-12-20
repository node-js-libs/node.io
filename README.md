# What is [node.io](http://node.io/)?

node.io is a data scraping and processing framework for [Node.js](http://nodejs.org/) inspired by [Google's MapReduce](http://labs.google.com/papers/mapreduce.html).

node.io can streamline the process of:

- Parsing, filtering or sanitizing large amounts of data
- Scraping data from the web using familiar CSS selectors and traversal methods
- Map Reduce
- Transferring data, e.g. CSV => a database
- Distributing work across multiple processes, and multiple servers (soon)
- Working with continuous data & streams
- Managing jobs through a web interface
- Running encrypted jobs made with [packnode](https://github.com/chriso/packnode)

## Why node.io?

- Create modular and extendable jobs for scraping and processing data
- Jobs are written in Javascript or Coffeescript and run in Node.js - jobs are concise, asynchronous and _FAST_
- Speed up execution by distributing work among child processes and other servers (soon)     
- Includes a robust framework for scraping, selecting and traversing data from the web + support for a variety of proxies
- Includes a data validation and sanitization framework
- Provides support for retries, timeouts, dynamically adding input, etc.
- Includes a basic web interface for running jobs 
- Easily handle a variety of input output situations - node.io does the heavy lifting
    * Reading / writing lines to and from files
    * Reading / writing rows to and from a database
    * Traversing files in a directory
    * STDIN / STDOUT / streams / continuous IO
    * Piping data to other processes or node.io jobs
    * Any combination of the above, or write your own IO

## Installation

To install node.io, use [npm](http://github.com/isaacs/npm):

    $ npm install node.io

To run tests

    $ make test

For usage details

    $ node.io --help

## Getting started

To get started, see the [documentation](https://github.com/chriso/node.io/blob/master/docs/README.md), [API](https://github.com/chriso/node.io/blob/master/docs/api.md), and [examples](https://github.com/chriso/node.io/tree/master/examples/).

Better documentation will be available soon.

*Note: node.io is a _BETA_ release. There will no doubt be some bugs and oddities.*

Check [@nodeio](http://twitter.com/nodeio) or [http://node.io/](http://node.io/) for updates.

## Running a web interface

To run jobs through a web interface, put your jobs in `~/.node_modules` and run

    $ node.io-web

## Roadmap

- More tests & better coverage
- Improve documentation and examples
- Installation without NPM
- Fix up the [http://node.io/](http://node.io/) site
- Add more DOM [selector](http://api.jquery.com/category/selectors/) / [traversal](http://api.jquery.com/category/traversing/) methods
- Add distributed processing
- Speed improvements

[history.md](https://github.com/chriso/node.io/blob/master/HISTORY.md) lists recent changes.

## Contributing

If you find a bug, please report the issue [here](https://github.com/chriso/node.io/issues). 

If you want to contribute, please [fork/pull](https://github.com/chriso/node.io/fork).

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
