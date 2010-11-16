// This module can find/remove duplicates in a list
//
//   1. To remove duplicates from a list and output unique lines:
//       $ cat list.txt | node.io duplicates
//
//   2. To output lines that appear more than once:
//       $ cat list.txt | node.io duplicates find
//
// To output the results to a file, use either:
//       $ cat list.txt | node.io -s duplicates > unique.txt
//       $ node.io -i list.txt -o unique.txt duplicates

var Job = require('node.io').Job;

var seen_lines = [], emitted_lines = [];

var methods = {

    reduce: function(lines) {

        var args = this.options.args, emit = [];
        
        lines.forEach(function(line) {
            if (args === 'find') {
            
                //Output duplicate lines
                if (seen_lines.indexOf(line) >= 0 && !~emitted_lines.indexOf(line)) {
                    emit.push(line);
                    emitted_lines.push(line); //Only output once
                } else {
                    seen_lines.push(line);
                }
                
            } else {
            
                //Remove duplicate lines (default)
                if (!~seen_lines.indexOf(line)) {
                    emit.push(line);
                    seen_lines.push(line);
                }
                
            }
        });
        
        this.emit(emit);
    }
};

//Export the job
exports.job = new Job({}, methods);