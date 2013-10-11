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
      if (typeof loc === "string") {
        loc = loc.split(/\s*,\s*/);
      }
      return lonLat
        ? new google.maps.LatLng(+loc[1], +loc[0])
        : new google.maps.LatLng(+loc[0], +loc[1]);
    };

    return exports;
})(GGNPC || {});
