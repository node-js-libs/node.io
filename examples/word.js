var start = require('../').start;

var wc = require('./word_count').job.extend({benchmark:true,fork:2}, {input:'./lorem.txt'});

start(wc, function(err, output) {
    //console.log(err);
    //console.log(output);
});
