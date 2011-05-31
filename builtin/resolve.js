(function() {
  var Available, HasRecord, ResolveAll, UniqueIPs, UsageDetails, dns, nodeio, options, unique_ips, usage;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  }, __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; }, __indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++) {
      if (this[i] === item) return i;
    }
    return -1;
  };
  usage = 'This module provides DNS resolution utilities\n\n   1. To resolve domains and return "domain,ip":\n       $ node.io resolve < domains.txt\n\n   2. To return domains that do not resolve (potentially available):\n       $ node.io resolve available < domains.txt\n\n   3. To return domains that do resolve:\n       $ node.io resolve found < domains.txt\n\n   3. To return unique IPs:\n       $ node.io resolve ips < domains.txt';
  nodeio = require('node.io');
  dns = require('dns');
  options = {
    max: 100,
    timeout: 5,
    retries: 1
  };
  ResolveAll = (function() {
    __extends(ResolveAll, nodeio.JobClass);
    function ResolveAll() {
      ResolveAll.__super__.constructor.apply(this, arguments);
    }
    ResolveAll.prototype.run = function(domain) {
      return dns.lookup(domain, 4, __bind(function(err, ip) {
        if (err != null) {
          return this.retry();
        } else {
          return this.emit(domain + ',' + ip);
        }
      }, this));
    };
    ResolveAll.prototype.fail = function(domain) {
      return this.emit(domain + ',failed');
    };
    return ResolveAll;
  })();
  HasRecord = (function() {
    __extends(HasRecord, nodeio.JobClass);
    function HasRecord() {
      HasRecord.__super__.constructor.apply(this, arguments);
    }
    HasRecord.prototype.run = function(domain) {
      return dns.lookup(domain, 4, __bind(function(err, ip) {
        if (err != null) {
          return this.retry();
        } else {
          return this.emit(domain);
        }
      }, this));
    };
    HasRecord.prototype.fail = function(domain) {
      return this.skip();
    };
    return HasRecord;
  })();
  Available = (function() {
    __extends(Available, nodeio.JobClass);
    function Available() {
      Available.__super__.constructor.apply(this, arguments);
    }
    Available.prototype.run = function(domain) {
      return dns.lookup(domain, 4, __bind(function(err, ip) {
        if (err != null) {
          return this.retry();
        } else {
          return this.skip();
        }
      }, this));
    };
    Available.prototype.fail = function(domain) {
      return this.emit(domain);
    };
    return Available;
  })();
  unique_ips = [];
  UniqueIPs = (function() {
    __extends(UniqueIPs, nodeio.JobClass);
    function UniqueIPs() {
      UniqueIPs.__super__.constructor.apply(this, arguments);
    }
    UniqueIPs.prototype.run = function(domain) {
      return dns.lookup(domain, 4, __bind(function(err, ip) {
        if (err != null) {
          return this.retry();
        } else {
          if (__indexOf.call(unique_ips, ip) >= 0) {
            return this.skip();
          } else {
            unique_ips.push(ip);
            return this.emit(ip);
          }
        }
      }, this));
    };
    UniqueIPs.prototype.fail = function(domain) {
      return this.skip();
    };
    return UniqueIPs;
  })();
  UsageDetails = (function() {
    __extends(UsageDetails, nodeio.JobClass);
    function UsageDetails() {
      UsageDetails.__super__.constructor.apply(this, arguments);
    }
    UsageDetails.prototype.input = function() {
      this.status(usage);
      return this.exit();
    };
    return UsageDetails;
  })();
  this["class"] = ResolveAll;
  this.job = {
    all: new ResolveAll(options),
    found: new HasRecord(options),
    available: new Available(options),
    ips: new UniqueIPs(options),
    help: new UsageDetails()
  };
}).call(this);
