var GGNPC = (function(exports){

    var utils = exports.utils = exports.utils || {};

    utils.extend = function(o) {
      Array.prototype.slice.call(arguments, 1).forEach(function(other) {
        if (!other) return;
        for (var k in other) {
          if (other.hasOwnProperty(k)) {
            o[k] = other[k];
          }
        }
      });
      return o;
    };

    utils.coerceElement = function(el) {
      if (typeof el === "object") return el;
      return document.getElementById(el) || document.querySelector(el);
    };

    utils.coerceLatLng = function(loc, lonLat) {
      if (loc instanceof google.maps.LatLng) return loc;
      if (typeof loc === "string") {
        loc = loc.split(/\s*,\s*/);
      }
      return lonLat
        ? new google.maps.LatLng(+loc[1], +loc[0])
        : new google.maps.LatLng(+loc[0], +loc[1]);
    };

    utils.getLatLngBounds = function(locA, locB) {
      var locations = Array.isArray(locA)
        ? locA.map(function(d) {
          return utils.coerceLatLng(d);
        })
        : [].slice.call(arguments).map(function(d) {
          return utils.coerceLatLng(d);
        });
      var north = -Infinity,
          south = Infinity,
          east = -Infinity,
          west = Infinity;
      for (var i = 0; i < locations.length; i++) {
        var loc = locations[i],
            lat = loc.lat(),
            lng = loc.lng();
        if (lat > north) north = lat;
        if (lat < south) south = lat;
        if (lng < west) west = lng;
        if (lng > east) east = lng;
      }
      return new google.maps.LatLngBounds(
        new google.maps.LatLng(north, west),
        new google.maps.LatLng(south, east)
      );
    };

    return exports;
})(GGNPC || {});
