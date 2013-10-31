(function(exports) {

  var ggnpc = exports.GGNPC || (exports.GGNPC = {}),
      trails = ggnpc.trails = {},
      utils = ggnpc.utils;

  var TrailsView = trails.TrailsView = new ggnpc.maps.Class(Object, {
    defaults: {
      titleText: "Browse Trails",
      api: new ggnpc.API(),
      trailDataUri: "trips.json",
      autoLoad: true,
      expandLinkText: "View Detail + Map",
      intensities: [
        "Easy",
        "Moderate",
        "Strenuous"
      ]
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
      var that = this,
          root = d3.select(this.root),
          title = root.append("h2")
            .text(this.options.titleText),
          selector = root.append("div")
            .attr("class", "intensity-selector")
            .append("span")
              .attr("class", "wrapper"),
          trails = root.append("div")
            .attr("class", "trails");

      this._trailRoot = trails;

      var all = "All",
          intensities = [all].concat(this.options.intensities),
          selectedIntensity = this.options.selectedIntensity || all,
          buttons = selector.selectAll("a.intensity")
            .data(intensities)
            .enter()
            .append("a")
              .attr("class", "intensity")
              .text(function(d) { return d; })
              .on("click", function(intensity) {
                if (selectedIntensity === intensity) return;

                that.setFilter((intensity === all)
                  ? d3.functor(true)
                  : function(d) {
                    return d.properties.intensity === intensity;
                  });

                selectedIntensity = intensity;
                updateButtons();
              });

      updateButtons();

      function updateButtons() {
        buttons.classed("selected", function(d) {
          return d === selectedIntensity;
        });
      }
    },

    loadTrails: function(uri, callback) {
      var that = this,
          root = d3.select(this.root)
            .classed("loading", true);
      if (!uri) uri = this.options.trailDataUri;
      return this.api.get(uri, function(error, data) {
        root.classed("loading", false);
        if (error) {
          console.error("unable to load trails:", error);
          return callback ? callback(error) : null;
        }
        that.setTrails(data);
        if (callback) callback(null, that.getTrails());
      });
    },

    getTrails: function() {
      return this._trails.slice();
    },

    setTrails: function(collection) {
      var trails = this._trails = collection.features;

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

      var intensityOrder = this.options.intensities,
          intensityValue = function(d) {
            return intensityOrder.indexOf(d.properties.intensity);
          };
      trails.sort(function(a, b) {
        var ai = intensityValue(a),
            bi = intensityValue(b);
        return d3.ascending(ai, bi) ||
               d3.ascending(a.properties.length_miles, b.properties.length_miles);
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
          return d.href = ("#trail-" + d.id);
        })
        .on("click", function(d) {
          d3.event.preventDefault();
          var expanded = !d.expanded,
              // XXX this is stupid.
              node = this.parentNode.parentNode.parentNode;
          if (expanded) {
            that.expandTrail(d, node);
            preserveScroll(function() {
              location.hash = d.href;
            });
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

      items.select(".duration")
        .text(function(d) { return d.properties.duration; });

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

      // look for #trail-{id} in the hash
      var match = location.hash.match(/^#?trail-(\d+)$/);
      if (match) {
        var id = match[1], found;
        items.each(function(d) {
          // weak check compares Number & String
          if (!found && d.id == id) {
            found = d;
            // and expand the trail if there's a match
            that.expandTrail(d, this);
          }
        });
        console.log("found:", found);
        // scroll to the item
        location.replace(location.hash);
      } else {
        console.log("no hash match:", location.hash);
      }
    },

    setFilter: function(filter) {
      filter = d3.functor(filter);
      this._trailRoot.selectAll(".trail")
        .style("display", function() {
          return filter.apply(this, arguments)
            ? null
            : "none";
        });
    },

    expandTrail: function(trail, node) {
      trail.expanded = true;

      var root = d3.select(node)
        .classed("expanded", true);

      var svg = root.select("svg.graph"),
          g = svg.select("g.content"),
          mapRoot = root.select(".map"),
          margin = {
            top: 20,
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

      var axes = svg.select(".axes");
      if (axes.empty()) {
        axes = svg.insert("g", "g")
          .attr("class", "axes");
        axes.selectAll(".axis")
          .data(["x", "y"])
          .enter()
          .append("g")
            .attr("class", function(d) {
              return ["axis", d].join(" ");
            });
      }

      var commas = d3.format(","),
          tickFormat = function(zero) {
            return function(n) {
              return n > 0
                ? commas(n)
                : zero;
            };
          };

      var xAxis = d3.svg.axis()
        .orient("bottom")
        .scale(xScale)
        .ticks(5)
        .tickFormat(tickFormat(0));
      axes.select(".axis.x")
        .attr("transform", "translate(0," + (height - margin.bottom) + ")")
        .call(xAxis);

      var yAxis = d3.svg.axis()
        .orient("left")
        .scale(yScale)
        .ticks(2)
        .tickFormat(tickFormat("sea"));
      axes.select(".axis.y")
        .attr("transform", "translate(" + margin.left + ",0)")
        .call(yAxis);

      var points = trail.geometry.coordinates.map(function(c) {
            var distance = c[3],
                elevation = c[2];
            return {
              lat: c[1],
              lon: c[0],
              latlng: new google.maps.LatLng(c[1], c[0]),
              distance: distance,
              elevation: elevation,
              color: color(elevation),
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
          return d.color = d.start.color;
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
        .attr("x", function(d) { return Math.floor(d.x1) - 1; })
        .attr("y", 0)
        .attr("width", function(d) { return Math.ceil(d.x2 - d.x1) + 2; })
        .attr("height", height)
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .on("mouseover", function(d, i) { focus(i); })
        .on("mouseout", function(d, i) { blur(i); });

      var hilite = fg.select(".hilite");
      if (hilite.empty()) {
        hilite = fg.append("g")
          .attr("class", "hilite")
          .attr("pointer-events", "none");
        hilite.selectAll("path")
          .data(["bg", "fg"])
          .enter()
          .append("path")
            .attr("class", function(d) { return d; })
            .attr("d", "M0,0L-4,-5L-1,-5L-1,-10L1,-10L1,-5L4,-5L0,0Z")
            .attr("transform", "translate(0,-2)");
        hilite.append("text")
          .attr("dy", "-1.4em")
          .attr("text-anchor", "middle");
      }

      hilite
        .attr("r", 6)
        .style("visibility", "hidden");

      var map = trail.map || (trail.map = new ggnpc.maps.Map(mapRoot.node()));
      map.resize();

      var bounds = new google.maps.LatLngBounds(),
          innerStroke = 5,
          outerStroke = 10,
          listeners = [],
          path = points.map(function(d, i) {
            var c = d.latlng;
            bounds.extend(c);
            return c;
          }),
          bgPath = new google.maps.Polyline({
            zIndex:           1,
            map:              map,
            path:             path,
            strokeOpacity:    1,
            strokeColor:      "black",
            strokeWeight:     outerStroke,
            fillOpacity:      0
          }),
          fgPaths = path.slice(1).map(function(p, i) {
            var strokeColor = color(points[i].elevation),
                segment = [path[i], p],
                line = new google.maps.Polyline({
                  zIndex:         100 + 1,
                  map:            map,
                  path:           segment,
                  strokeOpacity:  1,
                  strokeColor:    strokeColor,
                  strokeWeight:   innerStroke,
                  fillOpacity:    0
                });
            listeners.push(
              line.addListener("mouseover", function() { focus(i); }),
              line.addListener("mouseout", function() { blur(i); })
            );
            return line;
          });

      // console.log("bounds:", bounds.toString());
      map.fitBounds(bounds);

      var boundsChanged = utils.debounce(function() {
        var extent = map.getBounds(),
            oob;
        // if the extent is contained within the bounds, then all are in bounds
        if (extent.contains(bounds.getNorthEast()) &&
            extent.contains(bounds.getSouthWest())) {
          oob = false;
        // otherwise, check each segment individually
        } else {
          oob = function(d) {
            return !extent.contains(d.start.latlng) || !extent.contains(d.end.latlng);
          };
        }
        lines.classed("out-of-bounds", oob);
      }, 10);

      listeners.push(
        map.addListener("bounds_changed", boundsChanged)
      );

      function focus(i) {
        var d = points[i];
        fgPaths[i].setOptions({
          strokeWeight: outerStroke + 2
        });
        hilite.style("visibility", "visible")
          .attr("fill", d.color)
          .attr("transform", "translate(" + [d.x, d.y].map(Math.round) + ")")
          .select("text")
            // .text(commas(~~d.elevation) + "ft, " + d.distance.toFixed(1) + "mi");
            .text(commas(~~d.elevation) + "ft");
      }

      function blur(i) {
        fgPaths[i].setOptions({
          strokeWeight: innerStroke
        });
        hilite.style("visibility", "hidden");
      }

      trail.overlays = [bgPath].concat(fgPaths);
      trail.listeners = listeners;
    },

    collapseTrail: function(trail, node) {
      trail.expanded = false;

      var root = d3.select(node)
        .classed("expanded", false);

      trail.overlays.forEach(function(overlay) { overlay.setMap(null); });
      trail.listeners.forEach(function(d) { d.remove(); });

      trail.overlays = [];
      trail.listeners = [];

      if (location.hash === ("#trail-" + trail.id)) {
        preserveScroll(function() {
          location.hash = "";
        });
      }
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

  function stashScroll() {
    window._scroll = [window.scrollX, window.scrollY];
  }

  function popScroll() {
    window.scrollTo(window._scroll[0], window._scroll[1]);
  }

  function preserveScroll(fn) {
    stashScroll();
    fn();
    popScroll();
  }

})(this);
