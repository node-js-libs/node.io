[node.io](http://node.io/) is a distributed data scraping and processing framework

- Jobs are written in Javascript or Coffeescript and run in Node.js - jobs are concise, asynchronous and _FAST_
- Includes a robust framework for scraping, selecting and traversing data from the web
- Includes a data validation and sanitization framework
- Easily handle a variety of input / output - files, databases, streams, stdin/stdout, etc.
- Speed up execution by distributing work across multiple processes and (soon) other servers
- Manage & run jobs through a web interface

Follow [@nodeio](http://twitter.com/nodeio) for updates.

## Installation

To install node.io, run

    $ npm install node.io

If you do not have [Node.JS](http://nodejs.org/) or [npm](http://github.com/isaacs/npm) installed, [see this page](https://github.com/chriso/node.io/wiki/Installation).
    
## Getting started

[Head over to the wiki for documentation, examples and the API](https://github.com/chriso/node.io/wiki)

## Roadmap

- More tests & better coverage
- Finish writing up the wiki
- Fix up the [http://node.io/](http://node.io/) page
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
