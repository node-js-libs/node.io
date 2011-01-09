### v0.2.1-14
    * Bug fixes
    * Status messages are written to stderr

### v0.2.1-8
    * Added [built-in modules](https://github.com/chriso/node.io/tree/master/builtin). 

### v0.2.1-5
    * Web interface now supports CoffeeScript jobs
    * Support for multiple jobs in the same file (see ./examples/resolve.coffee)
    * Added the -u (--unpack) switch for decrypting jobs made with [packnode](https://github.com/chriso/packnode)	

### v0.2.1-3
    * Better support for multiple jobs running in the same process
    * Basic web interface
    * .coffee extension is auto-detected

### v0.2.0-4
    * Bug fixes
    * Added -d (--daemon) switch
    * Added helper methods for setting/adding request headers
    * Nested requests have cookies/referer automatically set

### v0.2.0-1
    * Added new DOM element getters - innerHTML, rawtext and striptags
    * Added the ability to specify a custom $ context - $(select, [context])
    * Added odd() and even() traversal methods
    * Added has() (see: api.jquery.com/has/)
    * Added job.parseValues() and job.writeValues() to simplify reading & writing separated values (e.g. CSV / TSV)
    * Major refactoring
    * Improved commenting and internal documentation
    * Speed improvements
    * Added Makefile (test / test-cov)

### v0.1.1-17
    * Fixed incorrect handling of large streams
    * Better support for request timeouts
    * Bug fixes    

### v0.1.1-6
    * Added a -g (--debug) switch
    * Minor bug fixes
    * Added HTTP code handler - auto support for redirects, etc.    

### v0.1.1-1
    * Fixed an inheritance bug when not exclusively using CoffeeScript
    * Added an -e (--eval) switch
    * Updated .coffee compilation so it's compatible with command line switches
    * Added a `proxy` option (see API)