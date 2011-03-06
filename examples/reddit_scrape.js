//This module pulls the front page stories and scores from reddit.com
//There are API's for doing this - this is just as a quick demonstration of
//scraping and selecting web data -> `$ node.io reddit_scrape`

var Job = require('node.io').Job;

//Timeout after 10s
var options = {timeout: 10};

var methods = {

    //Run the job once with no input
    input: false,

    run: function() {
        var self = this;

        this.getHtml('http://www.reddit.com/', function(err, $) {

            //Handle any request / parsing errors
            if (err) self.exit(err);

            var titles = [], scores = [], output = [];

            //Select all titles on the page
            $('a.title').each(function(a) {
                titles.push(a.text);
            });

            //Select all scores on the page
            $('div.score.unvoted').each(function(div) {
                scores.push(div.rawtext); //See the API for an explanation of element getters
            });

            //Mismatch? page probably didn't load properly
            if (scores.length != titles.length) {
                self.exit('Title / score mismatch');
            }

            for (var i = 0, len = scores.length; i < len; i++) {
                //Ignore upcoming stories
                if (scores[i] == '&bull;') continue;

                //Check the data is ok
                self.assert(scores[i]).isInt();

                //Output = [score] title
                output.push('['+scores[i]+'] '+titles[i]);
            }

            self.emit(output);
        });
    }
}

//Export the job
exports.job = new Job(options, methods);
