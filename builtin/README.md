# Built-in modules

Node.io comes with several built-in modules which can be accessed through the command line or web interface.

To run a built-in module, run

    $ node.io [MODULE] [ARGS]
    
To see usage details, run
    
    $ node.io [MODULE] help

### digest

This module calculates the hash/checksum of each element of input. Available hashes are [md5, crc32, sha1, sha256, sha512, ...]

Example 1 - find the MD5 hash of a string
    
    $ echo "this is a string" | node.io digest md5
       => b37e16c620c055cf8207b999e3270e9b

### pagerank

This module checks a URL's Google pagerank (rate limits apply)

Example 1 - find the pagerank of mastercard.com

    $ echo "mastercard.com" | node.io pagerank    
       => mastercard.com,7
       
### resolve

This module provides DNS resolution utilities

Example 1 - resolve domains and output "domain,ip"
    
    $ node.io resolve < domains.txt

Example 2 - return domains that do not resolve (potentially available)

    $ node.io resolve available < domains.txt

Example 3 - return domains that do resolve

    $ node.io resolve found < domains.txt

Example 4 - return unique IPs
    
    $ node.io resolve ips < domains.txt
    
### validate

This module is a simple wrapper for [node-validator](https://github.com/chriso/node-validator). Available filters are: [int, url, ip, alpha, alphanumeric, email]

Example 1 - remove lines that **do not** match a filter

    $ node.io validate [FILTER] < list.txt

Example 2 - output lines that do not match a filter (remove valid lines)

    $ node.io validate not [FILTER] < list.txt
    
### eval

This module evaluates an expression on each line of input and emits the result (unless the result is null)

Example 1 - remove empty lines
    
    $ node.io -s eval "input.trim() != '' ? input : null" < input.txt > modified.txt
    
Example 2 - convert a TSV (tab separated file) to CSV
       
    $ node.io -s eval "input.split('\t').join(',')" < data.tsv > data.csv

### word_count

This module uses map/reduce to count word occurrences in a file

    $ node.io word_count < input.txt
    
### duplicates

This module can find or remove duplicates from a list

Example 1 - remove duplicates from a list and output unique lines
    
    $ node.io duplicates < list.txt

Example 2 - to output duplicate lines
    
    $ node.io duplicates find < list.txt
    