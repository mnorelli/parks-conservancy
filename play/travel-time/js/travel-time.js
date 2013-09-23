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
      "format=json"
    ].join("");
    return d3.json(url, function(error, data) {
      if (error) {
        return callback(error, data);
      } else if (data.status === "OK") {
        var fips = data.Block.FIPS;
        return callback(null, fips);
      } else {
        if (data.Err) {
          return callback(data.Err);
        }
      }
      return callback(data);
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

})(this);
