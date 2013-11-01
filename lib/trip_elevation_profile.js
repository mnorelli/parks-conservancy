"use strict";

// Parks: convert trail elevation data to an svg for the elevation profile thumbnails
// this is the renderer to use with @shawnbot's d3-to-png 

var util = require("util");

module.exports = function(window, options, callback) {
  var d3 = window.d3,
      trip = options.trip,
      width = intor(options.width, 760),
      height = intor(options.height, 150),
      svg = d3.select("svg")
        .attr("width", width)
        .attr("height", height);

  var milesToFeet = function(mi) {
    return 5280 * mi;
  };

  var createSVG = function(trip) {
    var coordinates = trip.geometry.coordinates;

    var heightExtent   = trip.properties.heightRange,
        distanceExtent = trip.properties.distanceRange,
        minH = heightExtent[0],
        maxH = heightExtent[1],
        heightDiff     = maxH - minH; 

    var heightAnchors = d3.range(3).map(function(n) { 
      return ((n + 1) * (heightDiff / 3)) + minH;
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
          .x(function(d) { return ~~x(d[3]); })
          .y(function(d) { return ~~y(d[2]); });
    
    svg.selectAll("path.elevation")
        .data(coordinates)
      .enter().append("path")
        // .style("stroke", "#000")
        .style("stroke", function(d) { 
          return color(d[2]);
        })
        .attr("class", function(d, i) { return "elevation route-segment" + (i+1); })
        .attr("d", function(d, i) {
          if (i === coordinates.length - 1) {
            return "M0,0";
          }

          return line([d, coordinates[i + 1]]);
        });

    return callback(null, svg);
  };

  createSVG(trip);
};

function intor(val, def) {
    var num = +val;
    return isNaN(num) ? def : num;
}
