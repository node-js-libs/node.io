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
//   3. To return just the IPs:
//       $ cat domains.txt | node.io -s resolve ips | sort | uniq
//
// To output the results to a file, use either:
//       $ cat domains.txt | node.io -s resolve > result.txt
//       $ node.io -i domains.txt -o result.txt resolve

var Job = require('node.io').Job, dns = require('dns');

var options = {
    max: 100,       //Run a maximum of 100 DNS requests concurrently
    timeout: 10,    //Timeout after 10s
    retries: 3      //Maximum of 3 retries
}

var methods = {
    run: function(domain) {
        var self = this, type = this.options.arg1;
        
        dns.lookup(domain, 4, function(err, ip) {
        
            //The domain didn't resolve
            if (err) {
            
                switch(err.errno) {
                case 4: case 8: // == notfound
                    self.fail(domain);
                    break;
                default: 
                    self.retry();
                    break;
                }
                
            } else {
            
                //The domain resolved successfully
                if (type === 'notfound') {
                    self.skip();
                } else if (type === 'found') {
                    self.emit(domain);
                } else if (type === 'ips') {
                    self.emit(ip);
                } else {
                    self.emit(domain + ',' + ip);
                }
                
            }
        });
    },
    
    fail: function(domain, status) {
        var type = this.options.arg1;
        
        //The domain either timed out or exceeded the max number of retries
        if (type === 'notfound') {
            this.emit(domain);
        } else if (type === 'found' || type === 'ips') {
            this.skip();
        } else {
            this.emit(domain + ',failed');
        }
    }
}

//Export the job
exports.job = new Job(options, methods);