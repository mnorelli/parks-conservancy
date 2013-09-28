(function(exports) {

  var ggnpc = exports.ggnpc || (exports.ggnpc = {});

  ggnpc.Map = function(element, options) {
    options = merge({}, ggnpc.Map.defaults, options);
    if (typeof element === "string") {
      element = document.getElementById(element);
    }
    google.maps.Map.call(this, element, options);
    this.mapTypes.set(ggnpc.ParkMapType.name, ggnpc.ParkMapType);
    this.setMapTypeId(ggnpc.ParkMapType.name);
  };

  ggnpc.Map.prototype = google.maps.Map.prototype;

  ggnpc.Map.defaults = {
    backgroundColor: '#fff',
    center: new google.maps.LatLng(37.7706, -122.3782),
    zoom: 12,
    mapTypeControlOptions: {
      mapTypeIds: ['parks']
    },
    scrollwheel: false,
    panControl: false,
    streetViewControl: false,
    scaleControl: false,
    mapTypeControl: false,
    minZoom: 10,
    maxZoom: 18
  };

  ggnpc.ParkMapType = new google.maps.ImageMapType({
    name: "parks",
    urlTemplate: "http://{S}.map.parks.stamen.com/{Z}/{X}/{Y}.png",
    subdomains: "a b c d".split(" "),
    maxZoom: 18,
    minZoom: 10,
    tileSize: new google.maps.Size(256, 256),
    getTileUrl: function(coord, zoom) {
      coord = this.getNormalizedCoord(coord, zoom);
      if (!coord) return null;
      var x = coord.x,
          y = coord.y,
          i = (zoom + x + y) % this.subdomains.length;
      return this.urlTemplate
        .replace("{S}", this.subdomains[i])
        .replace("{Z}", zoom)
        .replace("{X}", x)
        .replace("{Y}", y);
    },

    getNormalizedCoord: function(coord, zoom) {
      var y = coord.y;
      var x = coord.x;
      // tile range in one direction range is dependent on zoom level
      // 0 = 1 tile, 1 = 2 tiles, 2 = 4 tiles, 3 = 8 tiles, etc
      var tileRange = 1 << zoom;
      // don't repeat across y-axis (vertically)
      if (y < 0 || y >= tileRange) {
          return null;
      }
      // repeat across x-axis
      if (x < 0 || x >= tileRange) {
          x = (x % tileRange + tileRange) % tileRange;
      }
      return {x: x, y: y};
    }
  });

  ggnpc.BespokeDirections = {
    parse: function(text) {
      if (!text) return null;
      return text.split(/[\r\n]+/g)
        .filter(function(line) {
          return line.charAt(0) === "*";
        })
        .map(function(line) {
          return line.replace(/^\*\s*/, "");
        });
    },

    augmentGoogleDisplay: function(selection, directions) {
      var steps = selection.selectAll("tr").data().length + 1,
          rows = selection.selectAll("tr.bespoke")
            .data(directions)
            .enter()
            .append("tr")
              .attr("class", "bespoke"),
          first = rows.append("td")
            .attr("class", "adp-substep"),
          second = rows.append("td")
            .attr("class", "adp-substep")
            .text(function(d, i) { return (steps + i) + "."; }),
          third = rows.append("td")
            .attr("class", "adp-substep")
            .text(String),
          fourth = rows.append("td")
            .attr("class", "adp-substep")
            .text(function(d) { /* distance goes here */ });
    }
  };

  function merge(o) {
    var others = [].slice.call(arguments, 1);
    others.forEach(function(d) {
      if (!d) return;
      for (var k in d) {
        o[k] = d[k];
      }
    });
    return o;
  }

})(this);
