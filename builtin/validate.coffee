usage = '''
This module is a simple wrapper for node-validator
Available filters are: int, url, ip, alpha, alphanumeric, email

   1. To filter out lines that do not match a filter:
       $ node.io validate [FILTER] < list.txt

   2. To filter out lines that match a filter:
       $ node.io validate not [FILTER] < list.txt
'''

nodeio = require 'node.io'

class Validate extends nodeio.JobClass
    init: ->
        if @options.args.length is 0 or @options.args[0] is 'help'
            @status usage
            @exit()

    run: (line) ->
        invert = @options.args[0] is 'not'
        filter = if invert then @options.args[1] else @options.args[0]

        try
            switch filter
                when 'url' then @assert(line).isUrl()
                when 'email' then @assert(line).isEmail()
                when 'int' then @assert(line).isInt()
                when 'ip' then @assert(line).isIp()
                when 'alpha' then @assert(line).isAlpha()
                when 'alphanumeric' then @assert(line).isAlphanumeric()
                else
                    @status usage
                    @exit()
            if invert then @skip() else @emit line

        catch error
            if invert then @emit line else @skip()

@job = new Validate()
