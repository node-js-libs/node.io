usage = '''
The query module can be used to select data from a URL.
Usage: `$ node.io query url [selector] [attribute]`

   1. To pull front page stories from reddit:
       $ node.io query "http://www.reddit.com" a.title

   2. To pull the href attribute from these links:
       $ node.io query "http://www.reddit.com" a.title href
'''

nodeio = require 'node.io'

class Query extends nodeio.JobClass
    init: ->
        if @options.args.length is 0 or @options.args[0] is 'help'
            @status usage
            @exit()
    input: false
    run: ->
        if @options.args.length is 1
            @get @options.args[0], (err, data) =>
                if err? then @retry() else @emit data
        else
            @getHtml @options.args[0], (err, $) =>
                if err?
                    @retry()
                else
                    elems = $ @options.args[1]
                    if elems.each?
                        results = []
                        if @options.args.length is 3
                            elems.each @options.args[2], (attr) -> results.push attr
                        else
                            elems.each (e) -> results.push e.text
                    else
                        if @options.args.length is 3
                            results = elems.attribs[@options.args[2]]
                        else
                            results = elems.text
                    @emit results

@class = Query
@job = new Query {timeout: 10}
