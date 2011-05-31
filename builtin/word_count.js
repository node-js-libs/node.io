(function() {
  var UsageDetails, WordCount, nodeio, options, usage, word_count;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  };
  usage = 'This module uses map/reduce to count word occurrences\n\n    1. To count the words from a file\n        $ node.io word_count < input.txt';
  nodeio = require('node.io');
  options = {
    max: 10,
    take: 10
  };
  word_count = {};
  WordCount = (function() {
    __extends(WordCount, nodeio.JobClass);
    function WordCount() {
      WordCount.__super__.constructor.apply(this, arguments);
    }
    WordCount.prototype.run = function(lines) {
      var line, word, words, _i, _j, _len, _len2;
      words = [];
      for (_i = 0, _len = lines.length; _i < _len; _i++) {
        line = lines[_i];
        line = line.toLowerCase().replace(/[^a-z0-9\s]+/g, '').split(' ');
        for (_j = 0, _len2 = line.length; _j < _len2; _j++) {
          word = line[_j];
          words.push(word);
        }
      }
      return this.emit(words);
    };
    WordCount.prototype.reduce = function(words) {
      var word, _i, _len;
      for (_i = 0, _len = words.length; _i < _len; _i++) {
        word = words[_i];
        if (word_count[word] != null) {
          word_count[word]++;
        } else {
          word_count[word] = 1;
        }
      }
      return null;
    };
    WordCount.prototype.complete = function() {
      var count, output, word;
      output = [];
      for (word in word_count) {
        count = word_count[word];
        output.push(count + ' ' + word);
      }
      this.output(output);
      return true;
    };
    return WordCount;
  })();
  UsageDetails = (function() {
    __extends(UsageDetails, nodeio.JobClass);
    function UsageDetails() {
      UsageDetails.__super__.constructor.apply(this, arguments);
    }
    UsageDetails.prototype.input = function() {
      this.status(usage);
      return this.exit();
    };
    return UsageDetails;
  })();
  this.job = {
    count: new WordCount(options),
    help: new UsageDetails()
  };
}).call(this);
