(function(exports) {

    // turn on the Google Maps "visual refresh"
    // <https://developers.google.com/maps/documentation/javascript/basics#VisualRefresh>
    google.maps.visualRefresh = true;

    var GGNPC = exports.GGNPC || (exports.GGNPC = {}),
        utils = GGNPC.utils,
        maps = GGNPC.maps = {};

    // technique lifted from:
    // <http://www.portlandwebworks.com/blog/extending-googlemapsmap-object>
    google.maps.Map = (function(constructor) {
      var f = function() {
        if (!arguments.length) return;
        constructor.apply(this, arguments);
      };
      f.prototype = constructor.prototype;
      return f;
    })(google.maps.Map);

    /*
     * create a new extensible class. Note that the
     * "initialize" method of your prototype will become the
     * class constructor.
     *
     * var MyClass = new maps.Class(google.maps.Map, {
     *  initialize: function(root, options) {
     *    google.maps.Map.apply(this, arguments);
     *    // ...
     *  }
     * });
     */
    maps.Class = function(parent, proto) {
      var klass = function() {
        if (typeof klass.prototype.initialize === "function") {
          klass.prototype.initialize.apply(this, arguments);
        }
      };
      klass.prototype = utils.extend(new parent(), proto);
      klass.extend = function(methods) {
        return new maps.Class(klass, methods);
      };
      return klass;
    };

    maps.collapseOptions = function(root, options, defaults) {
      if (arguments.length === 1) {
        if (typeof root === "string") {
          options = utils.extend({}, defaults);
        } else {
          options = utils.extend({}, defaults, arguments[1]);
          root = null;
        }
      } else {
        options = utils.extend({}, defaults, options);
      }
      options.root = utils.coerceElement(root || options.root);
      return options;
    };

    /*
     * GGNPC.maps.Map extends google.maps.Map
     * and sets the default map type to our ParkMapType (to show our tiles)
     */
    var Map = maps.Map = new maps.Class(
      google.maps.Map,
    {
      initialize: function(root, options) {
        options = this.options = maps.collapseOptions(root, options, Map.defaults);
        google.maps.Map.call(this, options.root || document.createElement("div"), options);

        this.mapTypes.set(maps.ParkMapType.name, maps.ParkMapType);
        this.setMapTypeId(maps.ParkMapType.name);
      }
    });

    Map.defaults = {
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
      maxZoom: 18,
      apiUrl: "http://stamen-parks-api-staging.herokuapp.com/"
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

    var MiniMap = maps.MiniMap = Map.extend({
      initialize: function(root, options) {
        var options = maps.collapseOptions(root, options, MiniMap.defaults);
        Map.call(this, options.root, options);

        var root = this.root;
        root.classList.add("mini-map");
        this._setupExtras(root);

        google.maps.event.trigger(this, "resize");

        if (this.options.bounds) this.fitBounds(this.options.bounds);

        // XXX this happens automatically if it's called setPath()
        //if (this.options.path) this._setPath(this.options.path);
        if(this.options.path) this._setContext(this.options.path);
      },

      _setupExtras: function(root) {
        var extras = this._extras = document.createElement("div");
        extras.className = "mini-map-extras";
        root.parentNode.insertBefore(extras, root.nextSibling);

        var p = d3.select(extras)
              .append("p")
                .attr("class", "links"),
            links = p.selectAll("a")
              .data(this.options.links)
              .enter()
              .append("a")
                .attr("class", function(d) { return d.type; })
                .attr("href", function(d) { return d.href; })
                .text(function(d) { return d.text; });
      },

      _setPath: function(rawPath) {
        if (this._path === rawPath) return this;

        if (rawPath) {
          var found = false;
          this.options.paths.forEach(function(path) {
            if (found) return;
            var match = rawPath.match(path.pattern);
            if (match) {
              path.match = match;
              found = path;
            }
          });
          if (found) {
            found.run.apply(this, found.match);
          }
        } else {
          console.warn("mini-map: no path specified");
        }

        this._path = rawPath;

        d3.select(this._extras)
          .select("a.big-map")
            .attr("href", function(d) {
              return [d.href, rawPath].join("#");
            });

        return this;
      },

      _setContext: function(file) {

        if (this._contextRequest) this._contextRequest.abort();

        // XXX abstract this in GGNPC.API?
        var url = [this.options.apiUrl, "record", "url", encodeURIComponent(file)].join("/"),
            that = this;


        console.log("URL: ", url);

        this._contextRequest = d3.json(url, function(error, data) {
          if (error) {
            console.warn("mini-map: no such context:", file, error);
            return;
          }
          // XXX: normalizing data until I fix this in api
          data.outlines = data.geojson[0] || [];
          data.parent = data.results[0] || {};

          that._updateContext(data);
          that._contextRequest = null;
        });
      },

      _updateContext: function(data) {
        console.log("mini-map update context:", data);

        var that = this;
        var fitBoundsCalled = false;
        if (data.outlines.length) {
          if (this._shapes) {
            this._shapes.forEach(function(shape) {
              shape.setMap(null);
            });
            this._shapes = null;
          }

          // XXX will this data structure ever *not* exist?
          var feature = JSON.parse(data.outlines.results[0].geom),
              shapes = new GeoJSON(feature, this.options.outline, true);
          console.log("shapes:", shapes);

          shapes.forEach(function(shape) {
            shape.setMap(that);
          });

          this._shapes = shapes;
          if (shapes.geojsonBounds && this.options.outline.fitBounds) {
            fitBoundsCalled = true;
            this.fitBounds(shapes.geojsonBounds);
          }
        }

        // stick a pin in it!
        if(data.parent.hasOwnProperty('latitude') && data.parent.hasOwnProperty('longitude')){

          if(this._markers){
            this._markers.forEach(function(marker){
              marker.setMap(null);
            });
          }

          this._markers = [];

          var marker = new google.maps.Marker({
              position: new google.maps.LatLng(data.parent.latitude, data.parent.longitude),
              map: that
          });
          this._markers.push(marker);

          // adjust map bounds only if fitBounds hasn't been called
          if(!fitBoundsCalled && this.options.outline.fitBounds){
            var bounds = new google.maps.LatLngBounds();

            this._markers.forEach(function (m, i) {
                bounds.extend(m.getPosition());
            });

            this.fitBounds(this._bufferBounds(bounds, .02));
          }
        }

        // update directions link
        if(data.parent.hasOwnProperty('attributes')){
          var parent = data.parent.attributes;
          d3.select(this._extras)
            .select("a.directions")
              .attr("href", function(d) {
                return [d.href, utils.qs.format({
                  from: "2017 Mission St, SF CA",
                  to: [parent.title, parent.id].join(":"),
                  freeze: true
                })].join("#");
              });

        }

      },

      _bufferBounds: function(bds, amount){

        var ne = bds.getNorthEast(),
          sw = bds.getSouthWest(),
          n = ne.lat() + amount,
          e = ne.lng() + amount,
          s = sw.lat() - amount,
          w = sw.lng() - amount;

        console.log(new google.maps.LatLng(s,w), new google.maps.LatLng(n,e))

        return new google.maps.LatLngBounds(new google.maps.LatLng(s,w), new google.maps.LatLng(n,e));
      }

    });

    MiniMap.defaults = {
      bounds: new google.maps.LatLngBounds(
        new google.maps.LatLng(37.558072, -122.681354),
        new google.maps.LatLng(37.99226, -122.276233)
      ),
      zoomControl: false,
      links: [
        {type: "big-map", href: "/mapping/", text: "See Larger Map"},
        {type: "directions", href: "/mapping/trip-planner.html", text: "Get Directions"}
      ],
      outline: {
        fitBounds: true,
        strokeColor: "#333",
        strokeOpacity: .4,
        strokeWeight: 1,
        fillColor: "#4afb05",
        fillOpacity: .55,
        zIndex: 1000
      },
      paths: [
        /*
        {
          //pattern: new RegExp("/visit/park-sites/(.+)$"),
          pattern: new RegExp(".*"),
          run: function(str, file) {
            this._setContext(file);
          }
        }
        */
      ]
    };



    MiniMap.inject = function(options, callback) {
      if (options.mini) {
        var root = utils.coerceElement(options.mini);
        if (root) {
          var map = new MiniMap(root, {
            path: location.pathname
          });

          if (callback) callback(null, map);

          MiniMap.instance = map;
        }
      }
    };

})(this);
