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
      if (err) throw err; // should log this and continue instead
      var tripData = JSON.parse(file);
      cb(tripData);
    });
  };

  var milesToFeet = function(mi) {
    return 5280 * mi;
  };

  var createSVG = function(tripData) {
    var elevation = tripData.elevation,
        elevationData = elevation.slice(1);

    // XXX FIX: these values should be coming from the index.json file
    // which will contain aggregated statistics
    // var maxDistInFeet = 0,
    //     maxDist = 0,
    //     maxHeight = 0;

    // elevation.forEach(function(d) { 
    //   var coordinates = d.coordinates;
    //   maxDistInFeet = Math.max(maxDistInFeet, milesToFeet(d.distance));
    //   maxDist = Math.max(maxDist, d.distance);
    //   maxHeight = Math.max(maxHeight, d.height);
    // });

    var heightExtent = d3.extent(elevation.map(function(d) { return +d.height; }).sort(d3.ascending)),
        distanceExtent = d3.extent(elevation.map(function(d) { return +d.distance; }).sort(d3.ascending));

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
      .style("stroke", "#000")
      // .style("stroke", function(d) { 
      //   var roundedHeight = Math.round(d.height / 100) * 100;
      //   return heightColorScale(roundedHeight); 
      // })
      .attr("class", function(d, i) { return "elevation route-segment" + (i+1); })
      .attr("d", function(d, i) {
        if (i === elevationData.length-1) return "";
        return line([d, elevationData[i+1]]);
      });

    callback(null, svg);

  };

  var main = (function() {
    readTripData(tripId, createSVG);
  })();

};
