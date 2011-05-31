(function() {
  var StatusCode, nodeio, usage;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  }, __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  usage = 'Make a HEAD request to each URL of input and return the status code\n\n   1. To return the status code (url,status)\n       $ cat urls.txt | node.io -s statuscode\n\n   2. To find domains that 404\n       $ cat urls.txt | node.io -s statuscode 404\n\n   3. To find domains that redirect\n       $ cat urls.txt | node.io -s statuscode 3';
  nodeio = require('node.io');
  StatusCode = (function() {
    __extends(StatusCode, nodeio.JobClass);
    function StatusCode() {
      StatusCode.__super__.constructor.apply(this, arguments);
    }
    StatusCode.prototype.init = function() {
      if (this.options.args.length && this.options.args[0] === 'help') {
        this.status(usage);
        return this.exit;
      }
    };
    StatusCode.prototype.run = function(url) {
      return this.head(url, __bind(function(err, data, headers, res) {
        var status;
        status = res != null ? res.statusCode : '-1';
        if (err) {
          if (err.length === 3) {
            status = err;
          }
          if (err === 'redirects') {
            status = 302;
          }
        }
        if (this.options.args.length && this.options.args[0].length === 3) {
          if (this.options.args[0] === '' + status) {
            return this.emit(url);
          } else {
            return this.skip();
          }
        } else if (this.options.args.length && this.options.args[0].length === 1) {
          if (this.options.args[0] === ('' + status)[0]) {
            return this.emit(url);
          } else {
            return this.skip();
          }
        } else {
          return this.emit(url + ',' + status);
        }
      }, this));
    };
    return StatusCode;
  })();
  this["class"] = StatusCode;
  this.job = new StatusCode({
    timeout: 10,
    redirects: 0
  });
}).call(this);
