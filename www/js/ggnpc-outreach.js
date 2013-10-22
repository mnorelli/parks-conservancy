(function(exports) {

  var ggnpc = exports.GGNPC || (exports.GGNPC = {}),
      utils = ggnpc.utils;

  var Outreach = ggnpc.Outreach = function(root, options) {
    this.initialize(root, options);
  };

  var Map = new ggnpc.maps.Map(document.createElement("div"));

  Outreach.prototype = utils.extend(Map, {
    initialize: function(root, options) {
      options = this.options = ggnpc.maps.collapseOptions(root, options, Outreach.defaults);
      ggnpc.maps.Map.call(this, options.root, options);

      this.info = new google.maps.InfoWindow({
        content: this.options.contentTemplate,
        maxWidth: 300
      });
    },

    showLocations: function(ids) {
      var map = this,
          url = ggnpc.maps.Map.defaults.apiUrl + "kind/location";

      // console.log("loading:", url);
      d3.json(url, function(error, data) {
        var allLocations = data.results
              .map(function(d) { return d.attributes; }),
            locationsById = d3.nest()
              .key(function(d) { return d.id; })
              .rollup(function(d) { return d[0]; })
              .map(allLocations),
            locations = ids.map(function(id) {
              return locationsById[id];
            });
        // console.log("locations:", locations);

        var markers = map.markers = locations.map(function(d) {
          var pos = utils.coerceLatLng(d.location),
              marker = new google.maps.Marker({
                position: pos,
                map: map,
                title: d.title
              });
          // console.log("loc @", pos.toString());

          var content = marker.content = d3.select(document.createElement("div"))
            .html(map.options.contentTemplate);

          content.select(".title")
            .text(d.title);
          content.select(".description")
            .text(d.description);
          content.select("a.directions")
            .attr("href", function() {
              return [
                this.href,
                utils.qs.format({
                  to: [d.title, d.id].join(":"),
                  freeze: true
                })
              ].join("#");
            });

          marker.addListener("click", function() {
            map.info.setContent(content.node());
            map.info.open(map, marker);
          });
          return marker;
        });

      });
    }
  });

  Outreach.defaults = {
    contentTemplate: [
      '<h4 class="title">{title}</h4>',
      '<p class="description">{description}</p>',
      '<a class="directions" href="/mapping/trip-planner.html">Get Directions</a>'
    ].join("\n")
  };

})(this);
