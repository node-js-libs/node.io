// This versatile module runs an expression for each line of input
//
//   1. To convert a TSV (tab separated file) to CSV
//       $ cat data.tsv | node.io -s eval "input.split('\t').join(',')" > data.csv
//
//   2. To remove empty lines from text.txt
//       $ cat text.txt | node.io -s eval "input.length ? input : null" > modified.txt

var Job = require('node.io').Job;

var methods = {

    run: function(input) {
        if (!this.options.args.length) {
            this.exit('Please enter an expression , e.g. `node.io eval "input.length"`');
            return;
        }
                    
        var result = (function(input, expression) {
            return eval(expression);
        })(input, this.options.args[0]);
        
        if (typeof result !== 'undefined' && result !== null) {
            this.emit(result);
        } else {
            this.skip();
        }
    }
}

//Export the job
exports.job = new Job({}, methods);