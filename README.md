# [node.io](http://node.io/)

A distributed data scraping and processing engine for [Node.JS](http://nodejs.org/)

To install node.io, use [npm](http://github.com/isaacs/npm):

    $ npm install node.io

For usage details, run

    $ node.io --help    
        
## Why node.io?

- Seamlessly distribute work across child processes and servers (soon)
- Handles a variety of input / output situations
    * Reading / writing lines to and from files
    * To / from a database
    * STDIN / STDOUT
    * Piping between node.io jobs
    * Any combination of the above
- Includes a robust framework for scraping and selecting HTML data
- Support for proxied requests
- Provides support for retries and timeouts

## Examples

See ./examples

## Documentation

Coming soon. See [http://node.io/](http://node.io/) for updates

## Credits

node.io uses the following (awesome) libraries:

- [tautologistics](https://github.com/tautologistics)' [node-htmlparser](https://github.com/tautologistics/node-htmlparser)
- [harryf](https://github.com/harryf)'s [soupselect](https://github.com/harryf/node-soupselect)
- [kriszyp](https://github.com/kriszyp)'s [multi-node](https://github.com/kriszyp/multi-node)

## License

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