usage = '''
Make a HEAD request to each URL of input and return the status code

   1. To return the status code (url,status)
       $ cat urls.txt | node.io -s statuscode

   2. To find domains that 404
       $ cat urls.txt | node.io -s statuscode 404

   3. To find domains that redirect
       $ cat urls.txt | node.io -s statuscode 3
'''

nodeio = require 'node.io'

class StatusCode extends nodeio.JobClass
    init: ->
        if @options.args.length and @options.args[0] is 'help'
            @status usage
            @exit

    run: (url) ->
        @head url, (err, data, headers, res) =>
            status = if res? then res.statusCode else '-1'
            if err
                if err.length is 3 then status = err
                if err is 'redirects' then status = 302
            if @options.args.length and @options.args[0].length is 3
                if @options.args[0] is ''+status then @emit url else @skip()
            else if @options.args.length and @options.args[0].length is 1
                if @options.args[0] is (''+status)[0] then @emit url else @skip()
            else
                @emit url + ',' + status

@class = StatusCode
@job = new StatusCode {timeout: 10, redirects: 0}
