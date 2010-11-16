//This module is a basic example of using map/reduce to count how many times each word occurs
// To count the words from a file, `$ cat file.txt | node.io word_count

var Job = require('node.io').Job;

//Take 30 lines at a time
var options = {max:30, take:30};

var word_count = {};

var methods = {
    
    run: function(lines) { //aka. map()
        var self = this, words = [];
        lines.forEach(function(line) {
            line.split(' ').forEach(function(word) {
                word = word.toLowerCase().replace(/[^a-z0-9]+/g, '');
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
        this.finish();
    },
    
    output: false,
    
    complete: function() {
        console.log(word_count);
    }
    
};

//Export the job
exports.job = new Job(options, methods);
