require.paths.unshift('lib')
require.paths.push('.')
require.paths.push('deps/nodeunit/lib')

var reporter = require('reporters/default');
var args = process.ARGV.slice(2);
if(args.length > 0) {
    reporter.run(args);
} else {
    reporter.run(['tests'])
}
