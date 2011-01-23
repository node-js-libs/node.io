usage = '''
This module can find/remove duplicates in a list

   1. To remove duplicates from a list and output unique lines:
       $ node.io duplicates < list.txt

   2. To output lines that appear more than once:
       $ node.io duplicates find < list.txt
'''

nodeio = require 'node.io'

seen_lines = []
emitted_lines = []

class RemoveDuplicates extends nodeio.JobClass
    reduce: (lines) ->
        for line in lines
            if not line in seen_lines 
                @emit line
                seen_lines.push line

class FindDuplicates extends nodeio.JobClass
    reduce: (lines) ->
        for line in lines
            if line in seen_lines
                if not line in emitted_lines
                    @emit line
                    emitted_lines.push line
                else 
                    seen_lines.push line

class UsageDetails extends nodeio.JobClass
    input: -> 
        @status usage
        @exit()

@class = RemoveDuplicates
@job = {
    remove: new RemoveDuplicates()
    find: new FindDuplicates()
    help: new UsageDetails()
}