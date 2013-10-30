(function(exports) {

  var ggnpc = exports.GGNPC || (exports.GGNPC = {}),
      trails = ggnpc.trails = {},
      utils = ggnpc.utils;

  var TrailsView = trails.TrailsView = new ggnpc.maps.Class(Object, {
    defaults: {
      // FIXME: remove baseURL when this is live
      api: new ggnpc.API("http://localhost:5000/"),
      trailDataUri: "trips.json",
      autoLoad: true
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

      var left = enter.append("div")
        .attr("class", "column left");

      var right = enter.append("div")
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
        .attr("class", "trail");

      left.append("a")
        .attr("class", "expand")
        .text(this.options.expandLinkText)
        .on("click", function(d) {
          // that.expandTrail(d, this);
        });

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

      return; // XXX
      var render = this.renderer();
      // XXX more options here?
      items.call(render);
    },

    renderer: function() {
      var that = this,
          options = this.options;
      return function() {
        var width = 500,
            height = 200;

        var xa = d3.svg.axis()
          .orient("bottom");

        var ya = d3.svg.axis()
          .orient("left");

        var color = d3.scale.linear()
          .domain([0,     1000,   5000,   10000])
          .range(["#00f", "#0f0", "#ff0", "#f00"]);

        var render = function(selection) {
          var svg = selection.select("svg.trail");

          var g = svg.selectAll("g.render")
            .data(function(d) { return [d]; });
          g.exit().remove();
          g.enter().append("g")
            .attr("class", "render");

          // elevation (feet)
          var yScale = d3.scale.linear()
            .domain([0, 10000]) // TODO derive from data
            .range([height, 0]);

          // time (minutes? seconds?)
          var xScale = d3.scale.linear()
            .domain([0, 500]) // TODO derive from data
            .range([height, 0]);

          var map = selection.select(".map")
            .each(function(d) {
              var map = d._map || (d._map = new TrailMap(this));
              map.setData(d);
            });
        };

        render.remove = function(selection) {
          selection.select(".map")
            .each(function(d) {
              d._map.remove();
              d._map = null;
            });
        };

        return render;
      };
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
