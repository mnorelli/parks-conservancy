(function(exports) {

  var mtc = exports.mtc = {};

  mtc.baseUrl = "http://maps.onebayarea.org/data/";

  mtc.blk2url = function(fips) {
    var n = 0,
        bits = [2, 3, 6, 4],
        url = [];
    for (var i = 0; i < bits.length; i++) {
      url.push(fips.substr(n, bits[i]));
      n += bits[i];
    }
    return [
      "blk2taz/", url.join("/"), ".txt"
    ].join("");
  };

  mtc.blk2taz = function(fips, callback) {
    var url = mtc.baseUrl + mtc.blk2url(fips);
    return d3.text(url, callback);
  };

  mtc.blockFindUrl = "http://data.fcc.gov/api/block/find";

  mtc.location2fips = function(loc, callback) {
    if (typeof loc === "string") {
      loc = loc.split(/\s*,\s*/).reverse();
    }
    var url = [
      mtc.blockFindUrl, "?",
      "longitude=", loc[0], "&",
      "latitude=", loc[1], "&",
      "format=jsonp&callback={callback}"
    ].join("");
    return d3.jsonp(url, function(data) {
      if (data) {
        if (data.status === "OK") {
          var fips = data.Block.FIPS;
          return callback(null, fips);
        } else if (data.Err) {
          return callback(data.Err);
        }
      }
      return callback(null, data);
    });
  };

  mtc.location2taz = function(loc, callback) {
    return mtc.location2fips(loc, function(error, fips) {
      if (fips) {
        return mtc.blk2taz(fips, callback);
      } else {
        return callback(error);
      }
    });
  };

  mtc.tazTravelTimes = function(data, callback) {
    var taz,
        dir = "from",
        time = "MD",
        mode = "s3",
        scenario = 2005; // XXX
    if (typeof data === "object") {
      taz = data.taz;
      if (data.dir) direction = data.dir;
      if (data.time) time = data.time;
      if (data.mode) mode = data.mode;
      if (data.scenario) scenario = data.scenario;
    } else {
      taz = String(data);
    }

    var url = [
      mtc.baseUrl,
      "scenarios/", scenario, "/time/",
      [time, dir, taz].join("/"),
      ".csv"
    ].join("");
    return d3.csv(url, callback);
  };

  mtc.travelTimeBetweenTazs = function(data, callback) {
    var origin = data.from || data.origin,
        dest = data.to || data.dest,
        time = data.time || "MD",
        mode = data.mode || "s3";
    return mtc.tazTravelTimes({
      taz: origin,
      dir: "from",
      time: time,
      mode: mode
    }, function(error, data) {
      if (error) return callback(error);
      var found = false;
      data.forEach(function(row) {
        if (row.dest == dest) {
          found = true;
          callback(null, +row[mode], {
            origin: origin,
            dest: dest,
            time: time,
            mode: mode,
            data: row
          });
        }
      });
      if (!found) {
        callback("Destination TAZ not found: " + dest);
      }
    });
  };

  if (!d3.jsonp) {
    d3.jsonp = function(url, callback) {
      function rand() {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
            c = '',
            i = -1;
        while (++i < 15) c += chars.charAt(Math.floor(Math.random() * 52));
        return c;
      }

      function create(url) {
        var e = url.match(/callback=d3.jsonp.(\w+)/),
            c = e ? e[1] : rand();
        d3.jsonp[c] = function(data) {
          callback(data);
          delete d3.jsonp[c];
          script.remove();
        };
        return 'd3.jsonp.' + c;
      }

      var cb = create(url),
        script = d3.select('head')
        .append('script')
        .attr('type', 'text/javascript')
        .attr('src', url.replace(/(\{|%7B)callback(\}|%7D)/, cb));
    };
  }

})(this);
