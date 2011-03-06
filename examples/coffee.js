// This module compiles coffee script files in the specified directory
// Coffee script is required (npm install coffee-script)
//
//   1. To compile all coffee files in a dir:
//       $ node.io -i /coffee/dir coffee

var Job = require('node.io').Job;

var options = {
    max: 10,         //Compile a max of 10 files concurrently
    recurse: true    //Compile .coffee scripts in subdirectories
}

var methods = {

    run: function(file) {
        var self = this, len = file.length;

        if (file.substr(len-7, len-1) === '.coffee') {
            //Only compile .coffee files
            this.exec('coffee -c "' + file + '"', function(err) {
                if (err) {
                    self.exit(err);
                } else {
                    self.finish();
                }
            });
        } else {
            this.skip();
        }
    }
}

//Export the job
exports.job = new Job(options, methods);
