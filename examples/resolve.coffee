nodeio = require 'node.io'
dns = require 'dns'
options = {max: 100, timeout: 5, retries: 3}

# Outputs "domain,ip"
class ResolveAll extends nodeio.JobClass
    run: (domain) -> 
        dns.lookup domain, 4, (err, ip) =>
            if err? then @retry() else @emit domain + ',' + ip
    fail: (domain) -> @emit domain + ',failed'

# Outputs domains that have a DNS record
class HasRecord extends nodeio.JobClass
    run: (domain) -> 
        dns.lookup domain, 4, (err, ip) =>
            if err? then @retry() else @emit domain
    fail: (domain) -> @skip()

# Outputs domains that do not have a DNS record
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

#Run `node.io resolve [all|found|available|ips] < input.txt`
@job = {
    all: new ResolveAll(options)
    found: new HasRecord(options)
    available: new Available(options)
    ips: new UniqueIPs(options)
}