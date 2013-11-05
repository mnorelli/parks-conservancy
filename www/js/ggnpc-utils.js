var GGNPC = (function(exports){

    var utils = exports.utils = exports.utils || {};

    // ref: http://unscriptable.com/2009/03/20/debouncing-javascript-methods/
    utils.debounce = function (func, threshold, execAsap) {
      var timeout;
      return function debounced () {
        var obj = this, args = arguments;
        function delayed () {
          if (!execAsap)
            func.apply(obj, args);
          timeout = null;
        };
        if (timeout)
          clearTimeout(timeout);
        else if (execAsap)
          func.apply(obj, args);

        timeout = setTimeout(delayed, threshold || 100);
      };
    };

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

    utils.latLngToString = function(latlng) {
      return "loc:" + [latlng.lat(), latlng.lng()].join(",");
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

    var qs = utils.qs = {
      decode: function(str) {
        str = String(str)
          .replace(/\+/g, "%20");
        return decodeURIComponent(str);
      },

      encode: function(str) {
        return encodeURIComponent(str)
          .replace(/%2C/g, ",")
          .replace(/%3A/g, ":")
          .replace(/%3B/g, ";")
          .replace(/%20/g, "+");
      },

      parse: function(str) {

        // remove the leading # or ?
        if (str.charAt(0) === "#" || str.charAt(0) === "?") {
          str = str.substr(1);
        }
        if (!str) return {};

        var data = {};
        str.split("&").forEach(function(bit) {
          var parts = bit.split("=", 2),
              key = qs.decode(parts[0]);

          if (parts.length === 1) {
            val = true;
          } else {
            var val = qs.decode(parts[1]),
                num = +val;
            if (isNaN(num)) {
              switch (val) {
                case "true": val = true; break;
                case "false": val = false; break;
              }
            } else {
              val = num;
            }
          }

          if (data.hasOwnProperty(key)) {
            if (Array.isArray(data[key])) {
              data[key].push(val);
            } else {
              data[key] = [data[key], val];
            }
          } else {
            data[key] = val;
          }
        });
        return data;
      },

      format: function(data) {
        return Object.keys(data)
          .filter(function(k) {
            return k
                && data[k] !== null
                && typeof data[k] !== undefined;
          })
          .map(function(k) {
            return [
              qs.encode(k),
              qs.encode(String(data[k]))
            ].join("=");
          })
          .join("&");
      }
    };

    // calculate distance between points in miles
    var METERS_PER_MILE = 1609.34,
        EARTH_RADIUS_METERS = 6378137,
        EARTH_RADIUS_MILES = EARTH_RADIUS_METERS / METERS_PER_MILE;
    utils.distanceInMiles = function(a, b) {
      return google.maps.geometry.spherical.computeDistanceBetween(a, b, EARTH_RADIUS_MILES);
    };

    utils.wrapFormat = function(format, cleanFormat, cleanParse) {
      var clean = function(input) {
        return cleanFormat(format(input));
      };
      if (cleanParse) {
        clean.parse = function(input) {
          return cleanParse(format.parse(input));
        };
      }
      return clean;
    };

    utils.elementContains = function(a, b) {
      return utils.elementHasAncestor(b, a);
    };

    utils.elementHasAncestor = function(a, b) {
      var p = a.parentNode;
      while (p) {
        if (p === b) return true;
        p = p.parentNode;
      }
      return false;
    };

    utils.getAncestorByClassName = function(node, klass, includeNode) {
      var p = includeNode ? node : node.parentNode;
      while (p) {
        if (p.classList.contains(klass)) return p;
        p = p.parentNode;
      }
      return null;
    };

    utils.template = function(template, format) {
      return function(d) {
        return template.replace(/{([^}]+)}/g, format
          ? function(str, key) {
            return format(d[key], key);
          }
          : function(str, key) {
            return d[key];
          });
      };
    };

    // simple pluralization method
    utils.pluralize = function(str, count, plural){
      if (plural == null)
          plural = str + 's';

        return count == 1 ? count + ' ' + str
                            : count + ' ' + plural;
    }

    return exports;
})(GGNPC || {});
