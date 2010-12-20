# This module pulls the front page stories and scores from reddit.com
# There are API's for doing this - this is just as a quick demonstration of 
# scraping and selecting web data. Run `$ node.io reddit_scrape`

nodeio = require 'node.io'

options = {
    timeout: 10
}

titles = []
scores = []
output = []

class Reddit extends nodeio.JobClass
    input: false
    run: -> 
        @getHtml 'http://www.reddit.com/', (err, $, data) =>
            @exit err if err?
            
            # Select all titles and scores on the page
            $('a.title').each (a) -> titles.push a.text
            $('div.score.unvoted').each (div) -> scores.push div.rawtext
                        
            # Mismatch? page probably didn't load properly
            @exit 'Title / score mismatch' if scores.length isnt titles.length
            
            for score, i in scores
                
                # Ignore upcoming stories
                if score is '&bull;' then continue
                
                # Check the data is ok
                @assert(score).isInt()
                
                # Output: [score] title
                output.push '[' + score + '] ' + titles[i]
            
            @emit output

@class = Reddit
@job = new Reddit(options)
