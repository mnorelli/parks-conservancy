(function(exports) {

    var GGNPC = exports.GGNPC || (exports.GGNPC = {}),
        maps = GGNPC.maps = {};

    maps.base = function(options){
        options = GGNPC.utils.extend({}, maps.base.defaults, options);
        var base = {};
        var map;

        var initialize = function(){
            return new google.maps.Map(document.getElementById(options.root), options.mapOptions);
        }

        return initialize();
        //return base;
    }

    maps.base.defaults = {
        mapOptions: {
            center: new google.maps.LatLng(37.7706, -122.3782),
            zoom: 12,
            mapTypeId: google.maps.MapTypeId.TERRAIN
        },
        root: 'map'
    };

    maps.Map = function(element, options) {
      options = GGNPC.utils.extend({}, maps.Map.defaults, options);
      if (typeof element === "string") {
        element = document.getElementById(element);
      }
      google.maps.Map.call(this, element, options);
      this.mapTypes.set(maps.ParkMapType.name, maps.ParkMapType);
      this.setMapTypeId(maps.ParkMapType.name);
    };

    maps.Map.prototype = google.maps.Map.prototype;

    maps.Map.defaults = {
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
