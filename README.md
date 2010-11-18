# What is [node.io](http://node.io/)?

node.io is a data scraping and processing framework for [node.js](http://nodejs.org/).

node.io can simplify the process of:

- Filtering / sanitizing a list
- MapReduce
- Scraping data from the web using with familiar CSS selectors / traversal methods
- Scraping web data through a proxy
- Parsing log files
- Transforming data from one format to another, e.g. from CSV to a database
- Recursively load all files in a directory and its subdirs and execute a command on each
- ETC

## Why node.io?

- Create modular and extensible jobs for scraping and processing data
- Jobs are written in Javascript or Coffeescript and run in Node.js - jobs are concise, asynchronous and FAST
- Speed up execution by distributing work among child processes and other servers (soon) 
- Easily handle a variety of input / output situations
    * Reading / writing lines to and from files
    * Traversing files in a directory    
    * Reading / writing rows to and from a database
    * STDIN / STDOUT / Custom streams
    * Piping between other node.io jobs    
    * Any combination of the above, or your own IO     
- Includes a robust framework for scraping and selecting web data
- Support for a variety of proxies when scraping web data
- Includes a data validation and sanitization framework
- Provides support for retries, timeouts, dynamically adding input, etc.

## Installation

To install node.io, use [npm](http://github.com/isaacs/npm):

    $ npm install node.io

For usage details, run

    $ node.io --help

## Documentation

To get started, see the [documentation](https://github.com/chriso/node.io/blob/master/docs/README.md), [API](https://github.com/chriso/node.io/blob/master/docs/api.md), and [examples](https://github.com/chriso/node.io/tree/master/examples/).

Better documentation will be available once I have time to write it.

## Roadmap

- Fix up the [http://node.io/](http://node.io/) site
- Automatically handle HTTP codes, e.g. redirect on 3xx or call fail() on 4xx/5xx
- Nested requests inherit referrer / cookies if to the same domain
- Add more DOM selector / traversal methods
- Test proxy callbacks and write proxy documentation
- Add distributed processing
- Installation without NPM (install.sh)
- Refactoring
- More tests / better test coverage

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
