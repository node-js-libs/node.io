// This module uses Google suggest to spell check a word or list of words (rate limits obviously apply)
//
//   1. To output the result of Google suggest:
//       $ echo "definately" | node.io -s google_spell    
//          => definitely

var Job = require('../').Job;

exports.job = new Job({timeout:10, retries:3}, {

    run: function google(input) {
        var spell, self = this;
        
        this.getHtml('http://www.google.com/search?hl=en&q='+encodeURIComponent(input), function(err, $) {
            if (err) self.retry();
            
            if (spell = $('a.spell')) {
                self.emit(spell.first().fulltext);
            }
        });
    }, 
    
    fail: function(input) {
        this.emit(input);
    }

});