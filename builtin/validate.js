(function() {
  var Validate, nodeio, usage;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  };
  usage = 'This module is a simple wrapper for node-validator\nAvailable filters are: int, url, ip, alpha, alphanumeric, email\n\n   1. To filter out lines that do not match a filter:\n       $ node.io validate [FILTER] < list.txt\n\n   2. To filter out lines that match a filter:\n       $ node.io validate not [FILTER] < list.txt';
  nodeio = require('node.io');
  Validate = (function() {
    __extends(Validate, nodeio.JobClass);
    function Validate() {
      Validate.__super__.constructor.apply(this, arguments);
    }
    Validate.prototype.init = function() {
      if (this.options.args.length === 0 || this.options.args[0] === 'help') {
        this.status(usage);
        return this.exit();
      }
    };
    Validate.prototype.run = function(line) {
      var filter, invert;
      invert = this.options.args[0] === 'not';
      filter = invert ? this.options.args[1] : this.options.args[0];
      try {
        switch (filter) {
          case 'url':
            this.assert(line).isUrl();
            break;
          case 'email':
            this.assert(line).isEmail();
            break;
          case 'int':
            this.assert(line).isInt();
            break;
          case 'ip':
            this.assert(line).isIp();
            break;
          case 'alpha':
            this.assert(line).isAlpha();
            break;
          case 'alphanumeric':
            this.assert(line).isAlphanumeric();
            break;
          default:
            this.status(usage);
            this.exit();
        }
        if (invert) {
          return this.skip();
        } else {
          return this.emit(line);
        }
      } catch (error) {
        if (invert) {
          return this.emit(line);
        } else {
          return this.skip();
        }
      }
    };
    return Validate;
  })();
  this.job = new Validate();
}).call(this);
