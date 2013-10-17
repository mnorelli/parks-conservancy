// Parks: convert trail elevation data to an svg for the elevation profile thumbnails
// this is the renderer to use with @shawnbot's d3-to-png 

module.exports = function(window, options, callback) {
  var d3 = window.d3,
      tripId = options.trip || 1287,
      width = options.width || 760,
      height = options.height || 150,
      count = options.count || 100,
      svg = d3.select("svg")
        .attr("width", width)
        .attr("height", height);
  var padding = 20;

  var fs = require("fs");

  var readTripData = function(tripId, cb) {
    fs.readFile("trips/" + tripId + "-elevation.json", function(err, file) {
      if (err) {
        console.error("error reading file (svg_trail_paths):", err); // should log this and continue instead
        return;
      }
      var tripData = JSON.parse(file);
      cb(tripData);
    });
  };

  var milesToFeet = function(mi) {
    return 5280 * mi;
  };

  var createSVG = function(tripData, scales) {
    var elevation = tripData.elevation,
        elevationData = elevation.slice(1);

    var heightExtent   = scales.height,
        distanceExtent = scales.distance,
        minH = heightExtent[0],
        maxH = heightExtent[1],
        heightDiff     = maxH - minH; 

    var heightAnchors = d3.range(3).map(function(n) { 
      return ((n+1) * (heightDiff/3)) + minH;
    });

    heightAnchors = [heightExtent[0]].concat(heightAnchors);

    var color = d3.scale.linear()
          .domain(heightAnchors)
          .range(["#5b9240", "#3e6a32", "#bb5a4c", "#982e20"]);

    var x = d3.scale.linear().domain(distanceExtent).range([0, width]);
    var y = d3.scale.linear().domain(heightExtent).range([height, 0]);

    // console.log(distanceExtent, heightExtent);

    var line = d3.svg.line()
          // .x(function(d) { return x(milesToFeet(d.distance)); })
          .x(function(d) { return ~~x(d.distance) })
          .y(function(d) { return ~~y(d.height); });
    
    var profile = svg.selectAll("path.elevation")
        .data(elevationData)
      .enter().append("path")
        // .style("stroke", "#000")
        .style("stroke", function(d) { 
          var roundedHeight = Math.round(d.height / 100) * 100;
          return color(roundedHeight);
        })
        .attr("class", function(d, i) { return "elevation route-segment" + (i+1); })
        .attr("d", function(d, i) {
          if (i === elevationData.length-1) return "";
          return line([d, elevationData[i+1]]);
        });

    callback(null, svg);

  };

  var main = (function() {
    var index = JSON.parse(fs.readFileSync("index.json")),
        scales = index.scales;

    readTripData(tripId, function(tripData) {
      createSVG(tripData, scales); 
    });
  })();

};
