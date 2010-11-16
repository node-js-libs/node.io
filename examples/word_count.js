//This module is a basic example of using map/reduce to count how many times each word occurs

var Job = require('../').Job;

var options = {
    max:30, take:30
}

var word_count = {};

exports.job = new Job(options, {
    
    run: function(lines) {
        var self = this, words = [];
        lines.forEach(function(line) {
            line.split(' ').forEach(function(word) {
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
    
});
