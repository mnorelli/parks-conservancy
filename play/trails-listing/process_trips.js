// node script to grab tnt data and mash it up with mapquest elevation data
var TransitAndTrails = require("transitandtrails");
var fs = require("fs"),
    http = require("http"),
    request = require("request"),
    d3 = require("d3");

var tnt = new TransitAndTrails({
  key: "267de82bc6c6c1c56ac5c10dfc0f50e42dde75810f4b32c1c0c4db012d3f22d4"
});

var mapquest = {
  key: "Fmjtd%7Cluub2q61n5%2Crx%3Do5-9610g6"
};
mapquest.host = "http://open.mapquestapi.com";
mapquest.path = "/elevation/v1/profile?key=" + mapquest.key + "&unit=f";

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

// grab raw trips data from T&T
// XXX TODO: LOG ERRORS TO A FILE SO WE CAN RERUN THIS WHOLE PROCESS
trips.forEach(function(id) {
  
  console.log("[*] starting", id);
  
  var tntFilename = "trips/" + id + ".geojson";
  fs.exists(tntFilename, function(exists) {
    if (!exists) {
      tnt.getTrip(id, function(err, trip) {
        if (err) {
          console.error("error getting tnt trip (process_trips):", err);
          return;
        }

        console.log("[*] got trip metadata from TnT for " + id);

        tnt.getTripRoute(id, function(err, route) {
          if (err) {
            console.error("error getting tnt trip route (process_trips):", err);
            return;
          }

          console.log("[*] got TnT trip coordinates for " + id);

          var route = route.map(function(d) { return d.reverse(); });

          var data = {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: {
                  type: "LineString",
                  coordinates: route
                },
                properties: trip
              }
            ]
          };
          writeFile(data, tntFilename);
          
          var latLngCollection = route.map(function(d) { return d.join(","); }).join(",");
          var mapquestUrl = mapquest.host + mapquest.path;

          request.post({
            url: mapquestUrl,
            form: {
              latLngCollection: latLngCollection
            }
          }, function(err, res, body) {
            if (err) {
              console.error("error getting mapquest elevation data (process_trips):", err);
              return;
            }

            console.log("[*] got mapquest elevation data for " + id);
            
            var elevation = JSON.parse(body).elevationProfile;
            elevation = elevation.map(function(d, i) { 
              d.coordinates = route[i];
              return d;
            });

            ["height", "distance"].forEach(function(measure) {
              trip[measure] = d3.extent(elevation.map(function(d) { return d[measure]; }).sort(d3.ascending));
            });

            var profile = {elevation: elevation, metadata: trip};
            var filename = "trips/" + id + "-elevation.json";
            // XXX TODO: THIS NEEDS TO GO IN A DATABASE OR SOMETHING
            writeFile(profile, filename);
          });

          // console.log("%j", data);
        });
      });
    } else {
      console.log("[*] data already exists, skipping " + id + "(process_trips)");
    }
  });
});
