"use strict";

// node script to grab tnt data and mash it up with mapquest elevation data

var fs = require("fs"),
    util = require("util");

var async = require("async"),
    d3 = require("d3"),
    request = require("crequest"),
    TransitAndTrails = require("transitandtrails");

// TODO fetch from the environment
var tnt = new TransitAndTrails({
  key: "267de82bc6c6c1c56ac5c10dfc0f50e42dde75810f4b32c1c0c4db012d3f22d4"
});

// TODO fetch from the environment
var MAPQUEST_KEY = "Fmjtd%7Cluub2q61n5%2Crx%3Do5-9610g6";
var MAPQUEST_URL = "http://open.mapquestapi.com/elevation/v1/profile?key=" + MAPQUEST_KEY + "&unit=f";

// XXX FIX: need a way to get this list automatically, somehow
var trips = process.argv.slice(2).map(Number);
// console.log(trips);
// process.exit();
// var trips = [
//   1287, 1424, 1431, 89, 45, 1297, 216, 
//   1338, 1446, 1295, 140, 1333, 63, 1448, 
//   1449, 263, 1433
// ];

function writeFile(data, filename) {
  // var filename = "tnt-geojson/" + id + ".geojson";
  fs.exists(filename, function(exists) {
    if (!exists) {
      fs.writeFile(filename, JSON.stringify(data, null, 2), function(err) {
        if (err) {
          console.error("error writing file (process_trips):", err);
        } else {
          console.log("[*] data written to file", filename);
        }
      });
    } else {
      console.log("[*] file exists, skipping");
      // console.log("[*] tnt data for " + id + " already exists. skipping.");
    }
  });
}

var enrichWithElevation = function(feature, callback) {
  var coordinates = feature.geometry.coordinates;

  var latLngCollection = coordinates
    .map(function(d) {
      // GeoJSON is x,y, MapQuest expects lat,lng
      return d.slice().reverse();
    })
    .map(function(d) {
      return d.join(",");
    }).join(",");

  return request.post({
    url: MAPQUEST_URL,
    form: {
      latLngCollection: latLngCollection
    }
  }, function(err, res, body) {
    if (err) {
      console.error("error getting mapquest elevation data (process_trips):", err);
      return callback(err);
    }

    var elevation = body.elevationProfile;

    if (elevation.length !== coordinates.length) {
      return callback(new Error(util.format("Point counts don't match: %d/%d.",
                                            coordinates.length,
                                            elevation.length)));
    }

    // add height as Z, distance as M
    feature.geometry.coordinates = coordinates.map(function(coords, i) {
      var d = elevation[i];
      coords.push(d.height, d.distance);

      return coords;
    });

    ["height", "distance"].forEach(function(measure) {
      feature.properties[measure] = d3.extent(elevation.map(function(d) {
        return d[measure];
      }).sort(d3.ascending));
    });

    return callback(null, feature);
  });
};

// grab raw trips data from T&T
// XXX TODO: LOG ERRORS TO A FILE SO WE CAN RERUN THIS WHOLE PROCESS
trips.forEach(function(id) {
  
  console.log("[*] starting", id);
  
  var tntFilename = "trips/" + id + ".geojson";

  fs.exists(tntFilename, function(exists) {
    if (!exists) {
      tnt.getTripAsGeoJSON(id, function(err, data) {
        if (err) {
          console.error("error getting tnt trip (process_trips):", err);
          return;
        }

        console.log("[*] got trip from TnT for " + id);

        writeFile(data, tntFilename);

        return async.map(data.features, enrichWithElevation, function(err, features) {
          data.features = features;

          // XXX TODO: THIS NEEDS TO GO IN A DATABASE OR SOMETHING
          var filename = "trips/" + id + "-elevation.json";
          writeFile(data, filename);
        });
      });
    } else {
      console.log("[*] data already exists, skipping " + id + "(process_trips)");
    }
  });
});
