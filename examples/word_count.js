//This module is a basic example of using map/reduce to count how many times each word occurs
//To count the words from a file, `$ cat file.txt | node.io word_count`

var Job = require('../').Job;

//Take 30 lines at a time
var options = {max:30, take:30};

var word_count = {};

var methods = {
    
    run: function(lines) {
        var self = this, words = [];
        lines.forEach(function(line) {
            line.toLowerCase().replace(/[^a-z0-9\s]+/g, '').split(' ').forEach(function(word) {
                words.push(word);
            });
        });
        return words;
    },
    
    reduce: function(words) {
        words.forEach(function(word) {
            if (typeof word_count[word] === 'undefined') {
                word_count[word] = 1;
            } else {
                word_count[word]++;
            }
        });
    },
    
    complete: function() {
        var out = [];
        for (var word in word_count) {
            out.push(word + ',' + word_count[word]);
        }
        //Now that we have the full list of words, output
        this.output(out);
    }
    
};

exports.job = new Job(options, methods);
