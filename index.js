"use strict";

var async = require("async"),
    env = require("require-env"),
    TransitAndTrails = require("transitandtrails");

var tnt = new TransitAndTrails({
  key: env.require("TNT_API_KEY")
});

var getTrailheadsAsGeoJSON = function(options, callback) {
  options.offset = 0;
  options.limit = 50;

  var count,
      trailheads = [];

  return async.doWhilst(function(next) {
    return tnt.getTrailheads(options, function(err, data) {
      if (err) {
        return next(err);
      }

      count = data.length;
      trailheads = trailheads.concat(data);
      options.offset += data.length;

      return next();
    });
  }, function() {
    return count > 0;
  }, function(err) {
    if (err) {
      return callback(err);
    }

    var data = {
      type: "FeatureCollection",
      features: trailheads.map(function(x) {
        var feature = {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [x.longitude, x.latitude]
          },
          properties: x
        };

        delete feature.properties.latitude;
        delete feature.properties.longitude;

        return feature;
      })
    };
      
    return callback(null, data);
  });
};

async.map([
  { non_profit_partner_id: 1 },
  { user_id: 2280 }
], getTrailheadsAsGeoJSON, function(err, data) {
  if (err) {
    throw err;
  }

  var features = {};
  var trailheads = {
    type: "FeatureCollection",
    features: []
  };

  data.forEach(function(x) {
    x.features.forEach(function(th) {
      features[th.properties.id] = th;
    });
  });

  Object.keys(features).forEach(function(id) {
    trailheads.features.push(features[id]);
  });

  console.log(JSON.stringify(trailheads));
});
