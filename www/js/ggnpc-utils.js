var GGNPC = (function(exports){
    var utils = exports.utils = exports.utils || {};

    utils.extend = function(o) {
      Array.prototype.slice.call(arguments, 1).forEach(function(other) {
        if (!other) return;
        Object.keys(other).forEach(function(k) {
          o[k] = other[k];
        });
      });
      return o;
    };

    return exports;
})(GGNPC || {});
