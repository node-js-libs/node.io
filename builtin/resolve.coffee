usage = '''
This module provides DNS resolution utilities

   1. To resolve domains and return "domain,ip":
       $ node.io resolve < domains.txt

   2. To return domains that do not resolve (potentially available):
       $ node.io resolve available < domains.txt

   3. To return domains that do resolve:
       $ node.io resolve found < domains.txt

   3. To return unique IPs:
       $ node.io resolve ips < domains.txt
'''

nodeio = require 'node.io'
dns = require 'dns'
options = {max: 100, timeout: 5, retries: 1}

# Outputs "domain,ip"
class ResolveAll extends nodeio.JobClass
    run: (domain) ->
        dns.lookup domain, 4, (err, ip) =>
            if err? then @retry() else @emit domain + ',' + ip
    fail: (domain) -> @emit domain + ',failed'

# Outputs domains that have a record
class HasRecord extends nodeio.JobClass
    run: (domain) ->
        dns.lookup domain, 4, (err, ip) =>
            if err? then @retry() else @emit domain
    fail: (domain) -> @skip()

# Outputs domains that do not have a record
class Available extends nodeio.JobClass
    run: (domain) ->
        dns.lookup domain, 4, (err, ip) =>
            if err? then @retry() else @skip()
    fail: (domain) -> @emit domain

# Outputs unique IPs
unique_ips  = []
class UniqueIPs extends nodeio.JobClass
    run: (domain) ->
        dns.lookup domain, 4, (err, ip) =>
            if err? then @retry() else
                if ip in unique_ips
                    @skip()
                else
                    unique_ips.push ip
                    @emit ip
    fail: (domain) -> @skip()

class UsageDetails extends nodeio.JobClass
    input: ->
        @status usage
        @exit()

#Run `node.io resolve [all|found|available|ips] < input.txt`
@class = ResolveAll
@job = {
    all: new ResolveAll(options)
    found: new HasRecord(options)
    available: new Available(options)
    ips: new UniqueIPs(options)
    help: new UsageDetails()
}
