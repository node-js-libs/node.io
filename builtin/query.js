(function() {
  var Query, nodeio, usage;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  }, __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  usage = 'The query module can be used to select data from a URL.\nUsage: `$ node.io query url [selector] [attribute]`\n\n   1. To pull front page stories from reddit:\n       $ node.io query "http://www.reddit.com" a.title\n\n   2. To pull the href attribute from these links:\n       $ node.io query "http://www.reddit.com" a.title href';
  nodeio = require('node.io');
  Query = (function() {
    __extends(Query, nodeio.JobClass);
    function Query() {
      Query.__super__.constructor.apply(this, arguments);
    }
    Query.prototype.init = function() {
      if (this.options.args.length === 0 || this.options.args[0] === 'help') {
        this.status(usage);
        return this.exit();
      }
    };
    Query.prototype.input = false;
    Query.prototype.run = function() {
      if (this.options.args.length === 1) {
        return this.get(this.options.args[0], __bind(function(err, data) {
          if (err != null) {
            return this.retry();
          } else {
            return this.emit(data);
          }
        }, this));
      } else {
        return this.getHtml(this.options.args[0], __bind(function(err, $) {
          var elems, results;
          if (err != null) {
            return this.retry();
          } else {
            elems = $(this.options.args[1]);
            if (elems.each != null) {
              results = [];
              if (this.options.args.length === 3) {
                elems.each(this.options.args[2], function(attr) {
                  return results.push(attr);
                });
              } else {
                elems.each(function(e) {
                  return results.push(e.text);
                });
              }
            } else {
              if (this.options.args.length === 3) {
                results = elems.attribs[this.options.args[2]];
              } else {
                results = elems.text;
              }
            }
            return this.emit(results);
          }
        }, this));
      }
    };
    return Query;
  })();
  this["class"] = Query;
  this.job = new Query({
    timeout: 10
  });
}).call(this);
