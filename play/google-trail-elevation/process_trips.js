// node script to grab and process T&T trips data
var TransitAndTrails = require("transitandtrails");
var fs = require("fs");

var tnt = new TransitAndTrails({
  key: "267de82bc6c6c1c56ac5c10dfc0f50e42dde75810f4b32c1c0c4db012d3f22d4"
});

var trips = [
  1287, 1424, 1431, 89, 45, 1297, 216, 
  1338, 1446, 1295, 140, 1333, 63, 1448, 
  1449, 263, 1433
];

function writeGeojson(data, id) {
  var filename = "tnt-geojson/" + id + ".geojson";
  fs.exists(filename, function(exists) {
    if (!exists) {
      fs.writeFile(filename, JSON.stringify(data, null, 2), function(err) {
        if (err) {
          console.log(err);
        } else {
          console.log("[*] data written to file", filename);
        }
      });
    } else {
      console.log("[*] tnt data for " + id + " already exists. skipping.");
    }
  });
}

// grab raw trips data from T&T
trips.forEach(function(id) {
  tnt.getTrip(id, function(err, trip) {
    if (err) {
      console.error(err);
      // return;
    }

    tnt.getTripRoute(id, function(err, route) {
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
      // data.features[0].properties.trip.tnt_id = id;

      writeGeojson(data, id);

      // console.log("%j", data);
    });
  });
});
