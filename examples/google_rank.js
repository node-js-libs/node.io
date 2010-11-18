// This module checks a domain's Google rank for a given keyword (rate limits obviously apply)
//
//   1. To find the rank of a domain for a given keyword:
//       $ echo "mastercard.com,Credit Cards" | node.io -s google_rank    
//          => mastercard.com,Credit Cards,9

var Job = require('node.io').Job;

 //Timeout after 10s, maximum of 3 retries
var options = {timeout:10, retries:3};

var methods = {

    run: function google(input) {
        var links, self = this;
        
        var input = input.split(',');
        
        this.getHtml('http://www.google.com/search?hl=en&num=100&q='+encodeURIComponent(input[1]), function(err, $, data) {
            if (err) self.retry();
                        
            var rank, i = 0;
            
            if (links = $('a.l')) {
                links.each('href', function(href) {
                    i++;
                    if (href.indexOf('www.'+input[0]+'/') >= 0) {
                        rank = i;
                    } else if (href.indexOf('/'+input[0]+'/') >= 0) {
                        rank = i;
                    }
                });
                if (rank) {
                    self.emit(input[0]+','+input[1]+','+rank);
                } else {
                    self.emit(input+',');
                }
            }
        });
    }, 
    
    fail: function(input) {
        this.emit(input+',');
    }

}

//Export the job
exports.job = new Job(options, methods);