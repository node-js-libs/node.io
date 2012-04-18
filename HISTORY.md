### v0.4.9
    * Disabled streaming parsing as mikeal/request no longer supports options.onResponse

### v0.4.8
    * Fix the pagerank builtin
    * Fix for nested parseHtml calls

### v0.4.7
    * Break out of .each early with return false
    * Bug fix for nested getHtml
    * Bug fix for write permissions
    * Bug fix for the eval builtin

### v0.4.1
    * node v0.6 support

### v0.4.0
    * Ported the entire request process to use mikeal/request
    * Full HTTP proxy support

### v0.3.9
    * Expose JSDOM window so it can be closed manually to prevent leaks
    * Added the expand_single_selected option (see issue #34)

### v0.3.6-0.3.8
    * Bug fixes

### v0.3.5
    * Further proxy fixes
    * Fixed an bug when specifying a custom jQuery context
    * Added JSDOM as a required package

### v0.3.3
    * Fix when a 30x redirect is to another host
    * Better HttpProxy support

### v0.3.0
    * Fixed -f, --fork

### v0.2.6 - v0.2.9
    * Various fixes to CSV reading and writing
    * Added an option to control whether JSDOM processes external resources
    * When using JSDOM, don't run the callback until the window is loaded
    * Ability to specify request encoding
    * Added URL recursion

### v0.2.5
    * Added the -m (--max) switch for overridding max concurrent requests
    * Speed improvements when parsing HTML using getHtml and postHtml
    * Moved validator, jQuery and htmlparser to ./vendor as submodules
    * npm is no longer required to install node.io
    * Built-in modules are stored relative to the install dir
    * Added url recursion and a helper for resolving and filtering links on a page

### v0.2.4
    * Moved to the new node v0.4 request API with full HTTPS support
    * Added the auto_retry option to improve code readability
    * Callbacks are now called in the same scope as job methods (no more self = this)

### v0.2.3
    * Removed daemon and expresso as a required dependencies
    * Added --spoof for spoofing user agents
    * Fixed relative Location header bug
    * Moved soupselect to ./vendor as its package.json is broken
    * Added more information to --debug

### v0.2.2-4
    * Bug fixes
    * Improved debug information for requests
    * Added a new builtin - query

### v0.2.2-3
    * Added JSDOM as an optional parser (for jQuery access)
    * Added head() to make HEAD requests
    * Added "io" as a command line alias
    * Added a new builtin - statuscode

### v0.2.1-20
    * Bug fixes
    * Works with node >= v0.3.6

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
