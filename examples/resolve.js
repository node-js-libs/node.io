// This module wraps the dns.lookup() method. There are a few different uses:
// (In each case replace domains.txt with your list of domains)
//
//   1. To resolve domains and return "domain,ip":
//       $ cat domains.txt | node.io resolve
//
//   2. To return domains that do not resolve:
//       $ cat domains.txt | node.io resolve notfound
//
//   3. To return domains that do resolve:
//       $ cat domains.txt | node.io resolve found
//
// To output the results to a file, use either:
//       $ cat domains.txt | node.io -s resolve > result.txt
//       $ node.io -i domains.txt -o result.txt resolve

var Job = require('../').Job, dns = require('dns');

var options = {
    max: 100,
    timeout: 10,
    retries: 3
}

var methods = {
    
    run: function(domain) {
        var self = this, type = this.options.args;
        
        dns.lookup(domain, 4, function(err, ip) {
            if (err) {
            
                //The domain didn't resolve
                switch(err.errno) {
                    case 4: case 8: // == notfound
                        if (type === 'notfound') {
                            self.emit(domain);
                        } else if (type === 'found') {
                            self.skip();
                        } else {
                            self.emit(domain + ',');
                        }
                        break;
                    default: self.retry();
                }
                
            } else {
            
                //The domain resolved successfully
                if (type === 'notfound') {
                    self.skip();
                } else if (type === 'found') {
                    self.emit(domain);
                } else {
                    self.emit(domain + ',' + ip);
                }
                
            }
        });
    },
    
    fail: function(status, domain) {
    
        //The domain either timed out or exceeded the max number of retries
        if (type === 'notfound') {
            self.emit(domain);
        } else if (type === 'found') {
            self.skip();
        } else {
            self.emit(domain + ',');
        }
        this.emit(domain+',');
        
    }
    
}

exports.job = new Job(options, methods);