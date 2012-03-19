(function() {
  var Pagerank, UsageDetails, nodeio, options, usage,
    __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  usage = 'This module checks a URL\'s Google pagerank (rate limits apply)\n\n   1. To find the pagerank of a URL:\n       $ echo "mastercard.com" | node.io -s pagerank\n          => mastercard.com,7';

  nodeio = require('node.io');

  options = {
    timeout: 10,
    retries: 3
  };

  Pagerank = (function(_super) {

    __extends(Pagerank, _super);

    function Pagerank() {
      Pagerank.__super__.constructor.apply(this, arguments);
    }

    Pagerank.prototype.run = function(input) {
      var ch, url,
        _this = this;
      url = input;
      if (url.indexOf('http://') === -1) url = 'http://' + url;
      ch = '6' + GoogleCH(strord('info:' + url));
      return this.get('http://toolbarqueries.google.com/tbr?client=navclient-auto&ch=' + ch + '&features=Rank&q=info:' + encodeURIComponent(url), function(err, data) {
        var match;
        if (err != null) return _this.retry();
        data = data || '';
        if (match = data.match(/Rank_1:1:(10|[0-9])/)) {
          return _this.emit(input + ',' + match[1]);
        } else {
          return _this.emit(input + ',');
        }
      });
    };

    return Pagerank;

  })(nodeio.JobClass);

  UsageDetails = (function(_super) {

    __extends(UsageDetails, _super);

    function UsageDetails() {
      UsageDetails.__super__.constructor.apply(this, arguments);
    }

    UsageDetails.prototype.input = function() {
      this.status(usage);
      return this.exit();
    };

    return UsageDetails;

  })(nodeio.JobClass);

  this["class"] = Pagerank;

  this.job = {
    pagerank: new Pagerank(options),
    help: new UsageDetails()
  };

  
// BEGIN CODE FOR GENERATING GOOGLE PAGERANK CHECKSUMS
//----------------------------------------------------------------------------------------------
function zF(a,b) {
    var z = parseInt(80000000,16);
    if (z & a) {
        a = a>>1;
        a &=~z;
        a |= 0x40000000;
        a = a>>(b-1);
    } else {
        a = a>>b;
    }
    return(a);
}
function mix(a,b,c) {
    a-=b; a-=c; a^=(zF(c,13));
    b-=c; b-=a; b^=(a<<8);
    c-=a; c-=b; c^=(zF(b,13));
    a-=b; a-=c; a^=(zF(c,12));
    b-=c; b-=a; b^=(a<<16);
    c-=a; c-=b; c^=(zF(b,5));
    a-=b; a-=c; a^=(zF(c,3));
    b-=c; b-=a; b^=(a<<10);
    c-=a; c-=b; c^=(zF(b,15));
    return (new Array((a),(b),(c)));
}
function GoogleCH(url,length) {
    if(arguments.length == 1) length=url.length;
    var a=0x9E3779B9, b=0x9E3779B9, c=0xE6359A60, k=0, len=length, mx=new Array();
    while(len>=12) {
        a+=(url[k+0]+(url[k+1]<<8)+(url[k+2]<<16)+(url[k+3]<<24));
        b+=(url[k+4]+(url[k+5]<<8)+(url[k+6]<<16)+(url[k+7]<<24));
        c+=(url[k+8]+(url[k+9]<<8)+(url[k+10]<<16)+(url[k+11]<<24));
        mx=mix(a,b,c);
        a=mx[0]; b=mx[1]; c=mx[2];
        k+=12; len-=12;
    }
    c+=length;
    switch(len) {
        case 11: c+=url[k+10]<<24;
        case 10: c+=url[k+9]<<16;
        case 9:c+=url[k+8]<<8;
        case 8:b+=(url[k+7]<<24);
        case 7:b+=(url[k+6]<<16);
        case 6:b+=(url[k+5]<<8);
        case 5:b+=(url[k+4]);
        case 4:a+=(url[k+3]<<24);
        case 3:a+=(url[k+2]<<16);
        case 2:a+=(url[k+1]<<8);
        case 1:a+=(url[k+0]);
    }
    mx=mix(a,b,c);
    if(mx[2]<0) {
        return(0x100000000+mx[2]);
    } else {
        return(mx[2]);
    }
}
function strord(string) {
    var result=new Array();
    for(i=0;i<string.length;i++){
        result[i]=string[i].charCodeAt(0);
    }
    return(result);
}
//----------------------------------------------------------------------------------------------
;

}).call(this);
