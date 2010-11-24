// This module checks whether a domain is available using the GNU whois tool.
// If a domain's WHOIS server can't be contacted, the domain is output as 
// available unless running in strict mode.
// It's best used with the ./resolve.js to filter out domains that resolve
//
//   1. To find (potentially) available domains in a list
//       $ cat domains.txt | node.io -s resolve notfound | node.io available
//
//   2. To omit domains whose whois server can't be contacted
//       $ cat domains.txt | node.io -s resolve notfound | node.io available strict

var Job = require('node.io').Job;

var options = {
    max: 20,       //Run a maximum of 20 WHOIS requests concurrently
    timeout: 5,    //Timeout after 10s
    retries: 2     //Maximum of 2 retries
}

//A fairly exhaustive list of not found strings
var not_found = [
    'No match for', 'NOT FOUND', 'Not found', 'Not Found', 'not found',
    'No Data Found', 'Status: free', 'No match for',
    'No domain records were found', 'No Match', 'No match',
    'no matching record', 'domain available', 'No entries found',
    'No Found', 'Not Registered', 'NO MATCH',
    '220 Available', '- Available', 'no match',
    'does not exist', 'do not have an entry', 'no existe',
    'NO OBJECT FOUND', 'STATUS: AVAILABLE', 'not registered',
    'No information found', 'no entries found', 'Information not available',
    'No match', 'No data was found', 'was not found',  
    'do not have an entry', 'No such domain', '230 No Objects', 
    'Nothing found', 'Object_Not_Found', ' is free', 'No information available',
    'domain name not known', 
];

var methods = {
    
    run: function(domain) {
        var self = this, strict = this.options.args.length && this.options.args[0] === 'strict';
                                
        this.exec('whois "' + domain + '"', function(err, stdout) {
            if (err) {
                
                console.log(stdout);
                
                self.exit(err);
                
            } else {
            
                if (stdout.indexOf('No whois server is known') === 0) {
                    
                    //Unknown TLD
                    self.skip();
                    
                } else if (stdout.indexOf('This TLD has no whois server') === 0 ||
                    stdout.indexOf('connect: Operation not permitted') === 0) {
                    
                    //We can't contact the WHOIS server for this tld, output as potentially available
                    //unless running in strict mode
                    if (!strict) {
                        self.emit(domain);
                    } else {
                        self.skip();
                    }
                    
                } else if (stdout.indexOf('connect: ') === 0 ||
                           stdout.indexOf('fgets: Connection') === 0) {
                    
                    //Connection problem..
                    self.retry();
                    
                } else {
                    
                    //Look for a not found str
                    not_found.forEach(function(nf) {
                        if (stdout.indexOf(nf) >= 0) {
                            self.emit(domain);
                            return;
                        }
                    });
                    
                    if (stdout.match(/status:[\t\s]+(available|free)/i)) {
                        self.emit(domain);
                    }
                    
                }
            }
        });
    },
    
    fail: function(domain, status) {
        var strict = this.options.args.length && this.options.args[0] === 'strict';
        
        if (!strict && (status === 'retries' || status === 'timeout')) {
            this.emit(domain);
        } else {
            this.skip();
        }
    }
}

//Export the job
exports.job = new Job(options, methods);