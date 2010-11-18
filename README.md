# What is [node.io](http://node.io/)?

node.io is a data scraping and processing framework for [Node.js](http://nodejs.org/) inspired by [Google's MapReduce](http://labs.google.com/papers/mapreduce.html).

node.io can streamline the process of:

- Parsing / filtering / sanitizing large amounts of data
- Scraping data from the web using familiar CSS selectors and traversal methods
- Map Reduce
- Transforming data from one format to another, e.g. from CSV => a database
- Distributing work across multiple processes, and multiple servers (soon)
- Recursively traversing a directory and using each file as input 

## Why node.io?

- Create modular and extensible jobs for scraping and processing data
- Jobs are written in Javascript or Coffeescript and run in Node.js - jobs are concise, asynchronous and _FAST_
- Seamlessly speed up execution by distributing work among child processes and other servers (soon) 
- Easily handle a variety of input / output situations - node.io does the heavy lifting
    * Reading / writing lines to and from files
    * Traversing files in a directory    
    * Reading / writing rows to and from a database
    * STDIN / STDOUT / Custom streams
    * Piping data between multiple node.io jobs
    * Any combination of the above, or your own IO     
- Includes a robust framework for scraping, selecting and traversing web data
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

node.io is an _ALPHA_ release. There will no doubt be some bugs and oddities.

## Roadmap

- Fix up the [http://node.io/](http://node.io/) site
- Handle HTTP codes, e.g. automatically redirect on 3xx or call `fail()` on 4xx/5xx
- Nested requests inherit referrer / cookies if to the same domain
- Add more DOM [selector](http://api.jquery.com/category/selectors/) / [traversal](http://api.jquery.com/category/traversing/) methods
    - ..or attempt a full port of jQuery that's compatible with [htmlparser](https://github.com/tautologistics/node-htmlparser) (I know a port already exists, but it uses the far less forgiving [JSDOM](https://github.com/tmpvar/jsdom))
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

## Contributing

If you find a bug, please report the issue [here](https://github.com/chriso/node.io/issues). 

If you want to contribute / help with the Roadmap / add more tests, please [fork/pull](https://github.com/chriso/node.io/fork).

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
