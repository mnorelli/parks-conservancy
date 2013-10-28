(function(exports) {

  var ggnpc = exports.GGNPC || (exports.GGNPC = {}),
      utils = ggnpc.utils;

  var Outreach = ggnpc.Outreach = ggnpc.maps.Map.extend({
    defaults: {
      locationData: {},
      contentTemplate: [
        '<h4 class="title">{title}</h4>',
        '<p class="description">{description}</p>',
        '<a class="directions" href="/map/trip-planner.html">Get Directions</a>'
      ].join("\n")
    },

    initialize: function(root, options) {
      options = this.options = ggnpc.maps.collapseOptions(root, options, Outreach.defaults);
      console.log("options:", options);
      ggnpc.maps.Map.call(this, options.root, options);

      this.info = new google.maps.InfoWindow({
        content: this.options.contentTemplate,
        maxWidth: 320
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
          //console.log("locations:", locations);

        var markers = map.markers = locations.map(function(d) {
          if (d.id in map.options.locationData) {
            console.log("merging:", d, map.options.locationData[d.id]);
            utils.extend(d, map.options.locationData[d.id]);
            console.log("merged:", d);
          }

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

})(this);
