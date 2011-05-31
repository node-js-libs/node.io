usage = '''
This module uses map/reduce to count word occurrences

    1. To count the words from a file
        $ node.io word_count < input.txt
'''

nodeio = require 'node.io'

options = {
    max: 10
    take:10
}

word_count = {}

class WordCount extends nodeio.JobClass
    run: (lines) ->
        words = []
        for line in lines
            line = line.toLowerCase().replace(/[^a-z0-9\s]+/g, '').split(' ')
            for word in line
                words.push word
        @emit words

    reduce: (words) ->
        for word in words
            if word_count[word]?
                word_count[word]++
            else
                word_count[word] = 1
        return null

    complete: ->
        output = []
        for word, count of word_count
            output.push count + ' ' + word
        @output output
        return true

class UsageDetails extends nodeio.JobClass
    input: ->
        @status usage
        @exit()

@job = {
    count: new WordCount(options)
    help: new UsageDetails()
}
