// create an index for the trips data
var d3 = require("d3"),
    fs = require("fs");


function writeFile(data, filename) {
  // var filename = "tnt-geojson/" + id + ".geojson";
  fs.exists(filename, function(exists) {
    if (!exists) {
      fs.writeFile(filename, JSON.stringify(data, null, 2), function(err) {
        if (err) {
          console.error("error writing file (create_index):", err);
          return;
        } else {
          console.log("[*] data written to file", filename);
        }
      });
    } else {
      console.log("[*] file " + filename + " exists, skipping");
    }
  });
}

var tripsDir = "trips/";
fs.readdir(tripsDir, function(err, filenames) {
  if (err) {
    console.error("error reading trips directory (create_index):", err);
    return;
  }
  var filenames = filenames.filter(function(d) { 
    var f = d.split(".");
    return f[f.length-1] === "json";
  });

  var index = {
    profiles: [], 
    scales: {
      distance: [],
      height: []
    }
  };

  filenames.forEach(function(filename) {
    var file = fs.readFileSync(tripsDir + filename);
    // XXX FIX: log errors???

    var tripData = JSON.parse(file);
    var metadata = tripData.metadata;
    delete metadata["description"];   // it's fat and unnecessary
    metadata.scales = {
      distance: [],
      height: []
    };

    tripData.elevation.forEach(function(d) {
      ["distance", "height"].forEach(function(measure) {
        index.scales[measure].push(+d[measure]);  // for overall extent
        metadata.scales[measure].push(+d[measure]); // for trip-local extent
      });
    });

    d3.keys(metadata.scales).forEach(function(scale) {
      metadata.scales[scale] = d3.extent(metadata.scales[scale].sort(d3.ascending));
    });

    index.profiles.push(metadata);
  });

  d3.keys(index.scales).forEach(function(scale) {
    index.scales[scale] = d3.extent(index.scales[scale].sort(d3.ascending));
  });

  writeFile(index, "index.json");

});