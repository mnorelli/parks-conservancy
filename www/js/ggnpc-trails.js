(function(exports) {

  var ggnpc = exports.GGNPC || (exports.GGNPC = {}),
      trails = ggnpc.trails = {},
      utils = ggnpc.utils;

  var TrailsView = trails.TrailsView = new ggnpc.maps.Class(Object, {
    defaults: {
      // FIXME: remove baseURL when this is live
      api: new ggnpc.API("http://localhost:5000/"),
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

      trails.forEach(function(d) {
        d.expanded = false;

        var points = d.geometry.coordinates,
            changes = [];
        points.forEach(function(c, i) {
          if (i === 0) return;
          var change = c[2] - points[i - 1][2];
          if (change > 0) changes.push(change);
        });
        d.properties.elevation_gain = d3.sum(changes);
      });

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
        .attr("class", "graph");

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
        .attr("src", function(d) {
          return that.api.getUrl("trips/" + d.id + "/elevation-profile.svg");
        });

      location.replace(location.hash);
    },

    expandTrail: function(trail, node) {
      var root = d3.select(node)
        .classed("expanded", true);

      var svg = root.select("svg.graph"),
          mapRoot = root.select(".map");

      var map = trail.map || (trail.map = new ggnpc.maps.Map(mapRoot.node()));
      map.resize();
    },

    collapseTrail: function(trail, node) {
      var root = d3.select(node)
        .classed("expanded", false);

      // XXX dispose google map?
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
