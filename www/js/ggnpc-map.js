(function(exports) {

    // turn on the Google Maps "visual refresh"
    // <https://developers.google.com/maps/documentation/javascript/basics#VisualRefresh>
    google.maps.visualRefresh = true;

    var GGNPC = exports.GGNPC || (exports.GGNPC = {}),
        maps = GGNPC.maps = {};

    // base() just returns a new map
    maps.base = function(root, options) {
      return new maps.Map(root, options);
    };

    /*
     * GGNPC.maps.Map extends google.maps.Map
     * and sets the default map type to our ParkMapType (to show our tiles)
     */
    maps.Map = function(root, options) {
      if (arguments.length === 1) {
        if (typeof root === "string") {
          options = GGNPC.utils.extend({}, maps.Map.defaults);
        } else {
          options = GGNPC.utils.extend({}, maps.Map.defaults, arguments[1]);
          root = null;
        }
      } else {
        options = GGNPC.utils.extend({}, maps.Map.defaults, options);
      }

      root = GGNPC.utils.coerceElement(root || options.root);
      google.maps.Map.call(this, root, options);

      this.mapTypes.set(maps.ParkMapType.name, maps.ParkMapType);
      this.setMapTypeId(maps.ParkMapType.name);
    };

    maps.Map.prototype = new google.maps.Map(document.createElement("div"));

    maps.Map.defaults = {
      root: "map",
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

    maps.ParkMapType = new google.maps.ImageMapType({
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

})(this);