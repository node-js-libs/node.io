//This module is a basic example of using map/reduce to count how many times each word occurs
//To count the words from a file, `$ cat file.txt | node.io word_count`

var Job = require('node.io').Job;

//Take 30 lines at a time
var options = {max:10, take:10};

var word_count = {};

var methods = {
    
    run: function(lines) {
        var self = this, words = [], line, i, l, j, k;
        for (i = 0, l = lines.length; i < l; i++) {
            line = lines[i].split(' ');
            //.toLowerCase().replace(/[^a-z0-9\s]+/g, '')
            for (j = 0, k = line.length; j < k; j++) {
                words.push(line[j]);
            }
        }
        this.emit(words);
    },
    
    reduce: function(words) {
        for (var i = 0, l = words.length; i < l; i++) {
            word_count[words[i]] = typeof word_count[words[i]] === 'undefined' ? 1 : word_count[words[i]] + 1;
        };
    },
    
    complete: function() {
        var out = [];
        for (var word in word_count) {
            out.push(word_count[word] + ' ' + word);
        }
        //Now that we have the full list of words, output
        this.output(out);
    }
    
};

exports.job = new Job(options, methods);
