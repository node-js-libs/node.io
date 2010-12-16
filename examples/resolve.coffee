nodeio = require 'node.io'
dns = require 'dns'

options = {
    max: 100
    timeout: 5
    retries: 3
}

class Resolve extends nodeio.JobClass
    run: (domain) -> 
        dns.lookup domain, 4, (err, ip) =>
            if err? @retry() else @emit domain + ',' + ip

    fail: (domain) -> @emit domain + ',failed'

@class = Resolve
@job = new Resolve(options)
