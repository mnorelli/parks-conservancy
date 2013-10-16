// create an index for the trips data
var d3 = require("d3"),
    fs = require("fs");


function writeFile(data, filename) {
  // var filename = "tnt-geojson/" + id + ".geojson";
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
      console.log("[*] file exists, skipping");
    }
  });
}

var tripsDir = "trips/";
fs.readdir(tripsDir, function(err, filenames) {
  var filenames = filenames.filter(function(d) { 
    var f = d.split(".");
    return f[f.length-1] === "json";
  });

  var meta = {
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
    tripData.elevation.forEach(function(d) {
      meta.scales.distance.push(+d.distance);
      meta.scales.height.push(+d.height);
    });
    var metadata = tripData.metadata;
    delete metadata["description"];   // it's fat and unnecessary
    meta.profiles.push(metadata);
  });

  d3.keys(meta.scales).forEach(function(scale) {
    meta.scales[scale] = d3.extent(meta.scales[scale].sort(d3.ascending));
  });

  writeFile(meta, "index.json");

});