usage = '''
This module evaluates an expression on each line of input and emits the result (unless the result is null)

   1. To convert a TSV (tab separated file) to CSV
       $ cat data.tsv | node.io -s eval "input.split('\t').join(',')" > data.csv

   2. To remove empty lines from text.txt
       $ cat text.txt | node.io -s eval "input.length ? input : null" > modified.txt
'''

nodeio = require 'node.io'

class EvalExp extends nodeio.JobClass
    init: -> 
        if @options.args.length is 0
            @exit 'Please enter an expression, e.g. `node.io eval "input.length"`'    
        if (expression = @options.args[0]) is 'help'
            @exit 'node.io eval [EXPRESSION]'
        
    run: (input) ->
        result = eval expression
        if result? then @emit result else @skip

class UsageDetails extends nodeio.JobClass
    input: -> 
        @status usage
        @exit()

@class = EvalExp
@job = {
    eval: new EvalExp()
    help: new UsageDetails()
}