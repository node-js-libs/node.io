// This module is a simple wrapper for the built in node-validator
// Available filters are: int, url, ip, alpha, alphanumeric, email
//
//   1. To filter out lines that do not match a filter:
//       $ cat list.txt | node.io validate [FILTER]
//
//   2. To filter out lines that do match a filter
//       $ cat list.txt | node.io validate not [FILTER]
//
// To output the results to a file, use either:
//       $ cat list.txt | node.io -s validate url > urls.txt
//       $ node.io -i list.txt -o urls.txt validate url
//
// The results can also be piped into another job. E.g. to validate a list of 
// domains and then resolve them:
//       $ cat domains.txt | node.io -s validate url | node.io resolve

var Job = require('../').Job;

var methods = {
    run: function(input) {
        if (typeof this.options.args === 'undefined') {
            this.exit('Please enter a filter, e.g. `node.io validate url`');
            return;
        }
        
        var args = this.options.args.split(' '),
            arg = args[0] === 'not' ? args[1] : args[0];
        
        switch(arg) {
            case 'int': this.assert(input).isInt(); break;
            case 'url': this.assert(input).isUrl(); break;
            case 'ip': this.assert(input).isIP(); break;
            case 'alpha': this.assert(input).isAlpha(); break;
            case 'alphanumeric': this.assert(input).isAlphanumeric(); break;
            case 'email': this.assert(input).isEmail(); break;
            default: 
        }
        
        if (args[0] === 'not') {
            this.skip();
        } else {
            this.emit(input);
        }
    },
    
    fail: function(status, input) {
        if (this.options.args.split(' ')[0] === 'not') {
            this.emit(input);
        } else {
            this.skip();
        }
    }
}

exports.job = new Job({}, methods);