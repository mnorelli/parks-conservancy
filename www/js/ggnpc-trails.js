(function(exports) {

  var ggnpc = exports.GGNPC || (exports.GGNPC = {}),
      trails = ggnpc.trails = {},
      utils = ggnpc.utils;

  var TrailsView = trails.TrailsView = new ggnpc.maps.Class(Object, {
    defaults: {
      // FIXME: remove baseURL when this is live
      api: new ggnpc.API(),
      trailDataUri: "trips.json",
      autoLoad: true,
      expandLinkText: "View Detail + Map"
    },

    initialize: function(root, options) {
      this.root = utils.coerceElement(root);

      this.options = utils.extend({}, TrailsView.defaults, options);
      this.api = this.options.api || new ggnpc.API();

      this._trails = [];
      this._setupDom();

      if (this.options.autoLoad) this.loadTrails();
    },

    _setupDom: function() {
      var root = d3.select(this.root),
          trails = root.append("div")
            .attr("class", "trails");

      this._trailRoot = trails;

      // TODO selector
    },

    loadTrails: function(uri, callback) {
      var that = this;
      if (!uri) uri = this.options.trailDataUri;
      return this.api.get(uri, function(error, data) {
        if (error) {
          console.error("unable to load trails:", error);
          return callback ? callback(error) : null;
        }
        that.setTrails(data.features);
        if (callback) callback(null, that.getTrails());
      });
    },

    getTrails: function() {
      return this._trails.slice();
    },

    setTrails: function(trails) {
      trails = this._trails = trails.slice();

      var distances = [],
          elevations = [];
      trails.forEach(function(d) {
        d.expanded = false;
        distances.push(d.properties.length_miles);

        var points = d.geometry.coordinates,
            changes = [];
        
        points.forEach(function(c, i) {
          elevations.push(c[2]);
          if (i === 0) return;
          var change = c[2] - points[i - 1][2];
          if (change > 0) changes.push(change);
        });
        d.properties.elevation_gain = d3.sum(changes);
      });

      this.distanceDomain = [0, d3.max(distances)];
      this.elevationDomain = d3.extent(elevations);

      var that = this,
          items = this._trailRoot.selectAll(".trail")
            .data(trails, function(d) {
              return d.id;
            });

      // exit
      var exit = items.exit().remove();

      // enter
      var enter = items.enter()
        .append("div")
          .attr("class", "trail");

      var row = enter.append("div")
        .attr("class", "row");
      var left = row.append("div")
        .attr("class", "column left");
      var right = row.append("div")
        .attr("class", "column right");

      var title = left.append("h3")
        .attr("class", "title");
      title.append("span")
        .attr("class", "text");
      title.append("span")
        .attr("class", "duration");

      var details = left.append("div")
        .attr("class", "details");
      details.append("span")
        .attr("class", "distance");
      details.append("span")
        .attr("class", "elevation");
      details.append("span")
        .attr("class", "intensity");

      var image = right.append("div")
        .attr("class", "image");
      image.append("img")
        .attr("class", "thumbnail");
      image.append("svg")
        .attr("class", "graph")
        .append("g")
          .attr("class", "content");

      left.append("a")
        .attr("class", "expand")
        .text(this.options.expandLinkText)
        .attr("href", function(d) {
          return "#trail-" + d.id;
        })
        .on("click", function(d) {
          // don't set the hash
          d3.event.preventDefault();

          var expanded = d.expanded = !d.expanded;
          var node = this.parentNode.parentNode.parentNode;
          if (expanded) {
            that.expandTrail(d, node);
          } else {
            that.collapseTrail(d, node);
          }
        });

      enter.append("div")
        .attr("class", "row")
        .append("div")
          .attr("class", "map");

      // update
      items
        .attr("id", function(d) { return "trail-" + d.id; })
        .select(".title .text")
          .text(function(d) { return d.properties.name; });

      var commas = d3.format(","),
          decimalCommas = d3.format(".1f,");

      items.select(".distance")
        .text(function(d) {
          return decimalCommas(d.properties.length_miles) + " miles";
        });
      items.select(".elevation")
        .text(function(d) {
          var gain = Math.round(d.properties.elevation_gain);
          return commas(gain) + "ft elevation gain";
        });
      items.select(".intensity")
        .text(function(d) { return d.properties.intensity; });

      items.select("img.thumbnail")
        /*
        .attr("src", function(d) {
          return that.api.getUrl("trips/" + d.id + "/elevation-profile.svg");
        });
        */

      location.replace(location.hash);
    },

    expandTrail: function(trail, node) {
      var root = d3.select(node)
        .classed("expanded", true);

      var svg = root.select("svg.graph"),
          g = svg.select("g.content"),
          mapRoot = root.select(".map"),
          margin = {
            top: 10,
            left: 50,
            bottom: 20,
            right: 10
          },
          width = svg.property("offsetWidth")
          height = svg.property("offsetHeight"),
          xScale = d3.scale.linear()
            .domain(this.distanceDomain)
            .range([margin.left, width - margin.right]),
          yScale = d3.scale.linear()
            .domain(this.elevationDomain)
            .range([height - margin.bottom, margin.top])
            .nice(),
          yMin = yScale.domain()[0],
          yMax = yScale.domain()[1],
          yDelta = yMax - yMin,
          yBands = 4,
          yDomain = d3.range(yBands)
            .map(function(i) {
              return yMin + yDelta * i / (yBands - 1);
            }),
          color = d3.scale.linear()
            .domain(yDomain)
            .range(["#5b9240", "#3e6a32", "#bb5a4c", "#982e20"]);

      var points = trail.geometry.coordinates.map(function(c) {
            var distance = c[3],
                elevation = c[2];
            return {
              lat: c[1],
              lon: c[0],
              distance: distance,
              elevation: elevation,
              x: xScale(distance),
              y: yScale(elevation)
            };
          }),
          segments = points.slice(1).map(function(d, i) {
            var a = points[i],
                b = points[i + 1];
            return {
              start:  a,
              end:    b,
              x1:     a.x,
              x2:     b.x,
              y1:     a.y,
              y2:     b.y
            };
          });

      var lines = g.selectAll("path.segment")
        .data(segments);
      lines.exit().remove();
      lines.enter().append("path")
        .attr("class", "segment");

      lines
        .attr("stroke", function(d) {
          return color(d.end.elevation);
        })
        .attr("d", function(d) {
          return "M" + [d.x1, d.y1] + "L" + [d.x2, d.y2] + "Z";
        });

      var fg = svg.select("g.fg");
      if (fg.empty()) {
        fg = svg.append("g")
          .attr("class", "fg");
      }

      var blocks = fg.selectAll("rect")
        .data(segments);
      blocks.exit().remove();
      blocks.enter().append("rect");

      blocks
        .attr("x", function(d) { return d.x1; })
        .attr("y", 0)
        .attr("width", function(d) { return d.x2 - d.x1; })
        .attr("height", height)
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .on("mouseover", function(d, i) { focus(d.start, i); })
        .on("mouseout", function(d, i) { blur(d.start, i); });

      var hilite = fg.select("circle.hilite");
      if (hilite.empty()) {
        hilite = fg.append("circle")
          .attr("class", "hilite");
      }

      hilite
        .attr("r", 6)
        .style("visibility", "hidden");

      var map = trail.map || (trail.map = new ggnpc.maps.Map(mapRoot.node()));
      map.resize();

      var bounds = new google.maps.LatLngBounds(),
          backs = points.map(function(d, i) {
            var center = new google.maps.LatLng(d.lat, d.lon),
                marker = new google.maps.Marker({
                  position: center,
                  map: map,
                  zIndex: i,
                  icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: "black",
                    fillOpacity: 1,
                    strokeOpacity: 0
                  }
                });
            return marker;
          }),
          markers = points.map(function(d, i) {
            var center = new google.maps.LatLng(d.lat, d.lon),
                fill = color(d.elevation),
                marker = new google.maps.Marker({
                  position: center,
                  map: map,
                  zIndex: i * 2,
                  icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 6,
                    fillColor: fill,
                    fillOpacity: 1,
                    strokeOpacity: 0
                  }
                });

            // console.log(d.elevation, "->", fill);
            bounds.extend(center);

            marker.addListener("mouseover", function() { focus(d, i); });
            marker.addListener("mouseout", function() { blur(d, i); });
            return marker;
          });

      console.log("bounds:", bounds.toString());
      map.fitBounds(bounds);

      function focus(d, i) {
        hilite.style("visibility", "visible")
          .attr("fill", color(d.elevation))
          .attr("transform", "translate(" + [d.x, d.y] + ")");
      }

      function blur(d, i) {
        hilite.style("visibility", "hidden");
      }

      trail.markers = backs.concat(markers);
    },

    collapseTrail: function(trail, node) {
      var root = d3.select(node)
        .classed("expanded", false);

      trail.markers.forEach(function(marker) {
        marker.setMap(null);
      });

      trail.markers = [];
    }
  });

  TrailsView.inject = function(options) {
    console.log("TrailsView.inject(", options, ")");

    // XXX remove this
    d3.selectAll("#page_leftcolumn > p:not(:first-child)")
      .style("display", "none");

    var view = new TrailsView(options.root, options);
    TrailsView.instance = view;
  };

  var TrailOverlay = trails.TrailOverlay = new ggnpc.maps.Class(google.maps.OverlayView, {
    defaults: {
    },

    initialize: function(feature, options) {
      this.options = utils.extend({}, TrailOverlay.defaults, options);
      if (feature) this.setFeature(feature);
    },

    setFeature: function(feature) {
      this._feature = feature;
      // TODO
    }
  });

})(this);
