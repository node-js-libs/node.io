To install node.io, use [npm](http://github.com/isaacs/npm):

    $ npm install node.io

For usage details, run

    $ node.io --help    

To get started, see the [documentation](https://github.com/chriso/node.io/blob/master/docs/README.md), [examples](https://github.com/chriso/node.io/tree/master/examples/), or [API](https://github.com/chriso/node.io/blob/master/docs/api.md).

## What is [node.io](http://node.io/)?

node.io is a data scraping and processing framework for [node.js](http://nodejs.org/).

A node.io job typically consists of a) taking some input, b) using or transforming it, and c) outputting something. 

node.io can simplify the process of:

- Filtering / sanitizing a list
- MapReduce
- Loading a list of URLs and scraping some data from each
- Parsing log files
- Transforming data from one format to another, e.g. from CSV to a database
- Recursively load all files in a directory and execute a command on each
- etc. etc.

## Why node.io?

- Create modular and extensible jobs for scraping and processing data
- Written in Node.js and Javascript - jobs are concise, asynchronous and FAST
- Speed up execution by distributing work among child processes and other servers (soon) 
- Easily handle a variety of input / output situations
    * Reading / writing lines to and from files
    * Reading all files in a directory (and optionally recursing)    
    * Reading / writing rows to and from a database
    * STDIN / STDOUT
    * Piping between other node.io jobs
    * Any combination of the above, or your own IO     
- Includes a robust framework for scraping and selecting web data
- Support for a variety of proxies when making requests
- Includes a data validation and sanitization framework
- Provides support for retries, timeouts, dynamically adding input, etc.

## Documentation

Initial documentation is [available here](https://github.com/chriso/node.io/tree/master/docs/). 

Better documentation will be available once I have time to write it.

## Roadmap

- Fix up the [http://node.io/](http://node.io/) site
- Automatically handle HTTP codes, e.g. redirect on 3xx or call fail() on 4xx/5xx
- Nested requests inherit referrer / cookies if to the same domain
- Add more DOM selector / traversal methods
- Test proxy callbacks
- Add distributed processing
- Installation without NPM (install.sh)
- Refactoring
- More tests / better test coverage

## Credits

node.io uses the following libraries

- [ry's](https://github.com/ry) [node.js](http://nodejs.org/)
- [tautologistics'](https://github.com/tautologistics) [node-htmlparser](https://github.com/tautologistics/node-htmlparser)
- [harryf's](https://github.com/harryf) [soupselect](https://github.com/harryf/node-soupselect)
- [kriszyp's](https://github.com/kriszyp) [multi-node](https://github.com/kriszyp/multi-node)

## License

[MIT License](https://github.com/chriso/node.io/raw/master/LICENSE)