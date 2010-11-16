# [node.io](http://node.io/)

A distributed data scraping and processing engine for [Node.JS](http://nodejs.org/)

To install node.io, use [npm](http://github.com/isaacs/npm):

    $ npm install node.io

For usage details, run

    $ node.io --help    
        
## Why node.io?

- Create modular and extensible jobs for scraping and processing data
- Seamlessly distribute work between child processes and servers (soon)
- Handles a variety of input / output situations
    * Reading / writing lines to and from files
    * Reading all files in a directory (and recursing if specified)    
    * To / from a database
    * STDIN / STDOUT
    * Piping between node.io jobs
    * Custom IO / any combination of the above
- Includes a robust framework for scraping and selecting HTML data
- Support for a variety of proxies when making requests
- Includes a data validation and sanitization framework
- Provides support for retries, timeouts, dynamically adding input, etc.

## Examples

See ./examples

## Documentation

Coming soon. See [http://node.io/](http://node.io/) for updates

## Credits

node.io uses the following awesome libraries:

- [tautologistics'](https://github.com/tautologistics) [node-htmlparser](https://github.com/tautologistics/node-htmlparser)
- [harryf's](https://github.com/harryf) [soupselect](https://github.com/harryf/node-soupselect)
- [kriszyp's](https://github.com/kriszyp) [multi-node](https://github.com/kriszyp/multi-node)

## License

[MIT License](https://github.com/chriso/node.io/raw/master/LICENSE)