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
        if @options.args[0] is 'help'
            @status usage
            @exit

    run: (input) ->
        result = eval @options.args[0]
        if result? then @emit result else @skip()

@class = EvalExp
@job = new EvalExp()
