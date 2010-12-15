// This module uses Google suggest to spell check a word or list of words (rate limits obviously apply)
//
//   1. To output the result of Google suggest:
//       $ echo "definately" | node.io -s google_spell    
//          => definitely

var Job = require('/cygdrive/c/Users/Chris/My Dropbox/Work/Node/node.io').Job;

 //Timeout after 10s, maximum of 3 retries
var options = {timeout:10, retries:3};

var methods = {

    run: function google(input) {
        var spell, self = this;
        
        this.getHtml('http://www.google.com/search?hl=en&q='+encodeURIComponent(input), function(err, $, data) {
            try {
                if (err) throw err;
                spell = $('a.spell')
                self.emit(spell.first().striptags);
            } catch (e) {
                self.retry();
            }
        });
    }, 
    
    //Output the original word if no suggestion was found
    fail: function(input) {
        this.emit(input);
    }
};

//Export the job
exports.job = new Job(options, methods);