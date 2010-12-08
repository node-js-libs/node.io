var Job = require('node.io').Job;

var options = {
    take: 10000
};

var temp_files = [];

var methods = {

    run: function(lines) {
        lines.sort();
        this.emit(lines);
    },
    
    reduce: function (lines) { 
        var self = this, temp_file = '/tmp/' + Math.floor(10000000 * Math.random());
        this.write(temp_file, lines, function () {
            temp_files.push(temp_file);
            self.skip();
        });
    },
    
    complete: function (callback) {
        var self = this;
        this.spawn('sort -m ' + temp_files.join(' '), function (err, stdout, stderr) {
            self.output(stdout.substr(0, stdout.length-1));
            self.exec('rm -f ' + temp_files.join(' '), callback);
        });
    }
};

//Export the job
exports.job = new Job(options, methods);