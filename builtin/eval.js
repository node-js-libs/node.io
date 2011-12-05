(function() {
  var EvalExp, nodeio, usage;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  };
  usage = 'This module evaluates an expression on each line of input and emits the result (unless the result is null)\n\n   1. To convert a TSV (tab separated file) to CSV\n       $ cat data.tsv | node.io -s eval "input.split(\'\t\').join(\',\')" > data.csv\n\n   2. To remove empty lines from text.txt\n       $ cat text.txt | node.io -s eval "input.length ? input : null" > modified.txt';
  nodeio = require('node.io');
  EvalExp = (function() {
    __extends(EvalExp, nodeio.JobClass);
    function EvalExp() {
      EvalExp.__super__.constructor.apply(this, arguments);
    }
    EvalExp.prototype.init = function() {
      if (this.options.args.length === 0) {
        this.exit('Please enter an expression, e.g. `node.io eval "input.length"`');
      }
      if (this.options.args[0] === 'help') {
        this.status(usage);
        return this.exit;
      }
    };
    EvalExp.prototype.run = function(input) {
      var result;
      result = eval(this.options.args[0]);
      if (result != null) {
        return this.emit(result);
      } else {
        return this.skip();
      }
    };
    return EvalExp;
  })();
  this["class"] = EvalExp;
  this.job = new EvalExp();
}).call(this);
