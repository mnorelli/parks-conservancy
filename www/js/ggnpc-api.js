(function(exports) {

  var ggnpc = exports.GGNPC || (exports.GGNPC = {}),
      utils = ggnpc.utils;

  var API = ggnpc.API = function(options) {
    if (typeof options === "string") {
      options = {baseUrl: options};
    }

    this.options = utils.extend({}, API.defaults, options);
    this.baseUrl = this.options.baseUrl;
    this._load = (typeof d3 === "object")
      ? d3.json
      : function(url, callback) {
        return jQuery.ajax(url, {
          success: function(data) {
            callback(null, data);
          },
          error: function(error) {
            callback(error, null);
          }
        });
      };
  };

  API.defaults = {
    baseUrl: "http://stamen-parks-api-staging.herokuapp.com/"
  };

  API.prototype = {
    get: function(uri, callback) {
      var url = this.baseUrl + uri;
      return this._load(url, callback);
    }
  };

})(this);
