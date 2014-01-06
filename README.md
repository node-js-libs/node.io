**Note: this library is no longer maintained.**

I wrote node.io in 2010 when node.js was still in its infancy and the npm repository didn't have the amazing choice of libraries as it does today.

Since it's now quite trivial to write your own scraper I've decided to stop maintaining the library.

Here's an example using [request](https://github.com/mikeal/request), [cheerio](https://github.com/MatthewMueller/cheerio) and [async](https://github.com/caolan/async).

```javascript
var request = require('request')
  , cheerio = require('cheerio')
  , async = require('async')
  , format = require('util').format;

var reddits = [ 'programming', 'javascript', 'node' ]
  , concurrency = 2;

async.eachLimit(reddits, concurrency, function (reddit, next) {
    var url = format('http://reddit.com/r/%s', reddit);
    request(url, function (err, response, body) {
        if (err) throw err;
        var $ = cheerio.load(body);
        $('a.title').each(function () {
            console.log('%s (%s)', $(this).text(), $(this).attr('href'));
        });
        next();
    });
});
```

The **node.io** domain name is now for sale. [Contact me](mailto:cohara87@gmail.com) if you'd like to make an offer.

Happy scraping.
