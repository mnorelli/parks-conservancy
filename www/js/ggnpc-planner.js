(function(exports) {

  var ggnpc = exports.GGNPC || (exports.GGNPC = {}),
      planner = ggnpc.planner = {},
      utils = ggnpc.utils;

  /*
   * Trip Planner
   */
  var TripPlanner = planner.TripPlanner = function(root, options) {
    this.initialize(root, options);
  };

  /*
   * default options
   */
  TripPlanner.defaults = {
    bounds: new google.maps.LatLngBounds(
      new google.maps.LatLng(37.558072, -122.681354),
      new google.maps.LatLng(37.99226, -122.276233)
    ),

    originMap: {
      zoom: 15,
    },
    destMap: {
      zoom: 14
    },

    originTitle: "Where are you coming from?",
    originColumnSize: "one-third",
    destTitle: "Going to...",
    destColumnSize: "two-thirds",

    travelModes: [
      {title: "Driving", value: google.maps.DirectionsTravelMode.DRIVING},
      {title: "Transit", value: google.maps.DirectionsTravelMode.TRANSIT},
      {title: "Biking", value: google.maps.DirectionsTravelMode.BICYCLING},
      {title: "Walking", value: google.maps.DirectionsTravelMode.WALKING}
    ],

    destinationOptions: [],

    pointImageUrls: {
      origin: "http://mt.googleapis.com/vt/icon/name=icons/spotlight/spotlight-waypoint-a.png&text=A&psize=16&font=fonts/Roboto-Regular.ttf&color=ff333333&ax=44&ay=48&scale=1",
      destination: "http://mt.googleapis.com/vt/icon/name=icons/spotlight/spotlight-waypoint-b.png&text=B&psize=16&font=fonts/Roboto-Regular.ttf&color=ff333333&ax=44&ay=48&scale=1"
    }
  };

  /*
   * TripPlanner API
   */
  TripPlanner.prototype = utils.extend(new google.maps.MVCObject(), {
    // the constructor
    initialize: function(root, options) {
      this.root = utils.coerceElement(root);
      this.options = utils.extend({}, planner.TripPlanner.defaults, options);

      this._request = {
        origin: this.options.origin,
        destination: this._resolveDestination(this.options.destination),
        travelMode: String(this.options.travelMode || this.options.travelModes[0].value).toUpperCase()
      };

      this.directions = new google.maps.DirectionsService();
      this._setupDom();

      if (this.options.bounds) {
        this.originMap.fitBounds(this.options.bounds);
        this.destMap.fitBounds(this.options.bounds);
      }
    },

    //
    _setupDom: function() {
      var that = this,
          root = d3.select(this.root),
          form = this._form = root.append("form")
            .attr("target", "#")
            .attr("class", "trip-planner"),
          inputs = form.append("div")
            .attr("class", "inputs row"),
          originInputs = inputs.append("div")
            .attr("class", "origin column " + this.options.originColumnSize),
          destInputs = inputs.append("div")
            .attr("class", "destination column " + this.options.destColumnSize),
          mapRoot = form.append("div")
            .attr("class", "maps row"),
          originMapRoot = mapRoot.append("div")
            .attr("class", "map origin column " + this.options.originColumnSize),
          destMapRoot = mapRoot.append("div")
            .attr("class", "map destination column " + this.options.destColumnSize),
          directionsRoot = form.append("div")
            .attr("class", "row directions"),
          directionsPanel = directionsRoot.append("div")
            .attr("class", "directions-panel column half"),
          nearbyPanel = directionsRoot.append("div")
            .attr("class", "nearby-panel column half");

      originInputs.append("h3")
        .attr("class", "title")
        .html(this.options.originTitle || "");

      var originLabel = originInputs.append("p")
        .append("label");
      originLabel.append("img")
        .attr("src", this.options.pointImageUrls.origin)
        .attr("class", "point")
        .attr("title", "origin");
      originLabel
        .append("input")
          .attr("class", "origin")
          .attr({
            type: "text",
            name: "origin",
            value: this._request.origin
          })
          .on("change", function() {
            that.setOrigin(this.value);
          });

      destInputs.append("h3")
        .attr("class", "title")
        .html(this.options.destTitle || "");

      destInputs = destInputs.append("p");

      var destLabel = destInputs.append("label");
      destLabel.append("img")
        .attr("src", this.options.pointImageUrls.destination)
        .attr("class", "point")
        .attr("title", "destination");

      if (Array.isArray(this.options.destinationOptions)) {

        var destSelect = destLabel.append("select")
          .attr("class", "destination")
          .attr("name", "destination")
          .on("change", function() {
            var dest = d3.select(this.options[this.selectedIndex]).datum();
            that.setDestination(dest);
          });

        var dests = this.options.destinationOptions,
            options = [
              {title: "Select a location..."}
            ],
            groups = [];
        dests.forEach(function(d, i) {
          d._index = i;
          if (d.children) {
            groups.push(d);
          } else {
            options.push(d);
          }
        });

        var destOptions = destSelect.selectAll("option")
          .data(options)
          .enter()
          .append("option")
            .text(function(d) { return d.title; });

        var destGroups = destSelect.selectAll("optgroup")
          .data(groups)
          .enter()
          .append("optgroup")
            .attr("label", function(d) { return d.title; });
        destGroups.selectAll("option")
          .data(function(d) { return d.children; })
          .enter()
          .append("option")
            .text(function(d) { return d.title; });

        destSelect.selectAll("option, optgroup")
          .filter(function(d) {
            return !isNaN(d._index);
          })
          .sort(function(a, b) {
            return d3.ascending(a._index, b._index);
          });

        var dest = this.getDestination();
        destSelect.selectAll("option")
          .attr("selected", function(d) {
            var selected = (d === dest);
            return selected ? "selected" : null;
          });

      } else {

        destLabel.append("input")
          .attr("class", "destination")
          .attr({
            type: "text",
            name: "destination",
            value: this._request.destination
          })
          .on("change", function() {
            that.setDestination(this.value);
          });

      }

      destInputs.append("select")
        .attr("class", "mode")
        .on("change", function() {
          var mode = this.options[this.selectedIndex].value;
          that.setTravelMode(mode);
        })
        .selectAll("option")
          .data(this.options.travelModes)
          .enter()
          .append("option")
            .attr("value", function(d) { return d.value; })
            .text(function(d) { return d.title; })
            .attr("selected", function(d) {
              return d.value === that._request.travelMode
                ? "selected"
                : null;
            });

      destInputs.append("input")
        .attr("class", "submit")
        .attr({
          type: "submit",
          value: "Go!"
        });

      nearbyPanel.append("h3")
        .text("Nearby");

      nearbyPanel.append("div")
        .attr("class", "nearby-locations");

      this.originMap = new ggnpc.maps.Map(originMapRoot.node(), this.options.originMap);
      this.destMap = new ggnpc.maps.Map(destMapRoot.node(), this.options.destMap);

      this.originMap.directionsDisplay = new google.maps.DirectionsRenderer({
        map: this.originMap,
        preserveViewport: true
      });

      this.destMap.directionsDisplay = new google.maps.DirectionsRenderer({
        map: this.destMap,
        preserveViewport: true,
        panel: directionsPanel.node()
      });

      form.on("submit", function submit() {
        d3.event.preventDefault();
        that.route();
      });
    },

    getOrigin: function() {
      return this._request.origin;
    },

    setOrigin: function(origin) {
      if (origin != this._request.origin) {
        this._request.origin = origin;
        google.maps.event.trigger(this, "origin", origin);
      }
      return this;
    },

    getDestination: function() {
      return this._request.destination;
    },

    getDestinationString: function() {
      var dest = this.getDestination();
      return (typeof dest === "string")
        ? dest
        : [dest.title, dest.id].join(":");
    },

    setDestination: function(dest) {
      if (dest != this._request.destination) {
        this._request.destination = this._resolveDestination(dest);
        google.maps.event.trigger(this, "destination", dest);
      }
      return this;
    },

    getTravelMode: function(mode) {
      return this._request.travelMode;
    },

    setTravelMode: function(mode) {
      this._request.travelMode = mode.toUpperCase();
      return this;
    },

    route: function(callback) {
      this._clearRoute();

      var request = utils.extend({}, this._request);
      if (typeof request.destination === "object") {
        request.destination = this._getObjectLocation(request.destination);
      } else {
        request.destination = this._parseLocation(request.destination);
      }

      var error;
      if (!request.origin) {
        google.maps.event.trigger(this, "error", error = "No origin provided");
        return callback && callback(error);
      } else if (!request.destination) {
        google.maps.event.trigger(this, "error", error = "No destination provided");
        return callback && callback(error);
      } else if (!request.travelMode) {
        google.maps.event.trigger(this, "error", error = "No travel mode provided");
        return callback && callback(error);
      }

      console.log("route(", request, ")");

      var that = this;

      this._form.classed("routing", true);
      this.directions.route(request, function(response, stat) {
        that._form.classed("routing", false);
        if (stat === google.maps.DirectionsStatus.OK) {
          that._updateRoute(response);
          if (callback) callback(null, response);
        } else {
          google.maps.event.trigger(this, "error", response);
          if (callback) callback(response, null);
        }
      });
    },

    _resolveDestination: function(dest) {
      if (typeof dest === "string" && this.options.destinationOptions) {
        var parts = dest.split(":"),
            name = parts[0],
            id = parts[1],
            found = null;

        // console.log("_resolveDestination():", name, id);
        this.options.destinationOptions.forEach(function(option) {
          if (option.children) {
            option.children.forEach(check);
          } else {
            check(option);
          }
        });

        function check(option) {
          if (found) return;
          if (id && option.id === id) {
            return found = option;
          }
          if (name && option.title === name) {
            return found = option;
          }
          console.log("x", option.title, option.id);
        }

        // console.log("_resolveDestination(", dest, ") ->", found);
        return found || dest;
      }
      return dest;
    },

    _getObjectLocation: function(obj) {
      return obj.location;
    },

    _clearRoute: function() {
      // clear nearby locations
      d3.select(this.root).select(".nearby-locations")
        .selectAll(".location")
        .remove();

      // this.originMap.directionsDisplay.setDirections(null);
      // this.destMap.directionsDisplay.setDirections(null);
    },

    _updateRoute: function(response) {
      google.maps.event.trigger(this, "route", response);

      var route = response.routes[0],
          leg0 = route.legs[0],
          legN = route.legs[route.legs.length - 1],
          start = leg0.start_location,
          end = legN.end_location;

      this.originMap.directionsDisplay.setDirections(response);
      this.originMap.setZoom(this.options.originMap.zoom || 15);
      var bounds = utils.getLatLngBounds(start, end);
      this.originMap.fitBounds(bounds);

      this.destMap.directionsDisplay.setDirections(response);
      this.destMap.setZoom(this.options.destMap.zoom || 15);
      this.destMap.setCenter(end);

      this._updateNearbyLocations();
      this._updateBespokeDirections();
    },

    _updateNearbyLocations: function() {
      var dest = this.getDestination();
      
      var loc = d3.select(this.root).select(".nearby-locations")
        .selectAll(".location")
        .data(dest.nearby || []);

      loc.exit().remove();

      var enter = loc.enter()
        .append("div")
          .attr("class", "location");

      enter.append("span")
        .attr("class", "icon");

      enter.append("span")
        .attr("class", "title");

      enter.append("span")
        .attr("class", "distance");

      loc
        .attr("class", function(d) {
          var type = d.parklocationtype
            .toLowerCase()
            .replace(/ +/g, "_");
          return ["location", type].join(" ");
        });

      loc.select(".title")
        .text(function(d) { return d.title; });

      loc.select(".distance")
        .text(function(d) {
          if (!d.latlng) d.latlng = utils.coerceLatLng(dest.location);
          var dist = quantize(utils.distanceInMiles(dest.latlng, d.latlng), .1),
              round = dist % 1 === 0,
              one = dist === 1,
              num = round ? dist : dist.toFixed(1),
              word = one ? "mile" : "miles";
          return [num, word].join(" ");
        });

      function quantize(n, f) {
        return f * Math.round(n / f);
      }

    },

    _updateBespokeDirections: function() {
      clearTimeout(this._bespokeDirectionsInterval);

      var dest = this.getDestination();
      if (dest && dest.bespoke_directions) {
        var panel = this.destMap.directionsDisplay.getPanel();
        this._bespokeDirectionsInterval = setTimeout(function() {
          d3.select(panel)
            .select("table.adp-directions tbody")
            .call(planner.BespokeDirections.augmentGoogleDisplay, dest.bespoke_directions);
        }, 100);
        return true;
      }

      return false;
    },

    _parseLocation: function(loc) {
      if (typeof loc === "string" && loc.indexOf(":") > -1) {
        var parts = loc.split(":", 2),
            type = parts[0],
            id = parts[1];
        return this.getLocationById(id) || {
          type: type,
          id: id
        };
      }
      return loc;
    }

  });

  /*
   * Bespoke Directions stuff
   */
  planner.BespokeDirections = {
    load: function(sheetId, callback) {
      return Tabletop.init({
        key: sheetId,
        simpleSheet: true,
        callback: function(rows) {
          var rowsByFilename = d3.nest()
            .key(function(d) { return d.filename; })
            .rollup(function(d) {
              return planner.BespokeDirections.parse(d[0].directions);
            })
            .map(rows);
          callback(null, rowsByFilename);
        }
      });
    },

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

  /*
   * GGNPC.planner.DestinationLoader loads locations from the API. Usage:
   *
   * var loader = new GGNPC.planner.DestinationLoader({ ... });
   * loader.load(function(error, locations) {
   * });
   */
  var DestinationLoader = planner.DestinationLoader = function(options) {
    this.options = utils.extend({}, DestinationLoader.defaults, options);
    this._parks = [];
    this._parksById = {};
  };

  DestinationLoader.defaults = {
    // TODO: fix this URL
    apiUrl: "http://stamen-parks-api-staging.herokuapp.com/",
    locationTypes: ["Access", "Trailhead", "Visitor Center"],
    groupByPark: true,
    nearbyThreshold: 1, // miles
    nearbyTypes: ["Restroom", "Cafe", "Visitor Center", "Trailhead"] 
  };
  
  DestinationLoader.prototype = {
    load: function(callback) {
      var that = this,
          options = this.options;
      return d3.json(options.apiUrl + "kind/park", function(error, data) {
        if (error) return callback(error, null);

        var parks = that._parks = data.results.map(that._getAttibutes)
          .sort(that._sortByTitle);
        parks.forEach(function(d) {
          that._parksById[d.id] = d;
        });

        var parksById = that._parksById;

        d3.json(options.apiUrl + "kind/location", function(error, data) {
          if (error) return callback(error, null);

          var locations = data.results.map(that._getAttibutes);

          if (options.locationTypes && options.locationTypes.length > 0) {
            locations = locations.filter(function(d) {
              return d.relatedpark && options.locationTypes.indexOf(d.parklocationtype) > -1;
            });
          }

          if (options.nearbyThreshold) {
            var nearbyTypes = options.nearbyTypes,
                nearbyThreshold = options.nearbyThreshold,
                nearbyLimit = options.nearbyLimit,
                nearbyCandidates = nearbyTypes
                  ? locations.filter(function(d) {
                    return nearbyTypes.indexOf(d.parklocationtype) > -1;
                  })
                  : locations.slice();

            // give each nearby candidate a google.maps.LatLng
            nearbyCandidates.forEach(function(d) {
              d.latlng = utils.coerceLatLng(d.location);
            });

            // assign a nearby[] array to each location based on distance from
            // it to the other locations
            locations.forEach(function(d) {
              var a = d.latlng || (d.latlng = utils.coerceLatLng(d.location));
              d.nearby = nearbyCandidates
                .filter(function(b) {
                  return b != d && utils.distanceInMiles(a, b.latlng) <= nearbyThreshold;
                });
              if (nearbyLimit > 0) {
                d.nearby = d.nearby.slice(0, nearbyLimit);
              }
              /*
              if (d.nearby.length) {
                console.log(d.title, "has", d.nearby.length, "nearby locations");
              }
              */
            });
          }

          if (options.groupByPark) {
            locations = d3.nest()
              .key(function(d) { return d.relatedpark; })
              .entries(locations)
              .map(function(d) {
                if (!parksById[d.key]) console.warn("bad park id:", d.key);
                return (d.values.length > 1 && parksById[d.key])
                  ? {
                    title: parksById[d.key].title,
                    children: d.values.sort(that._sortByTitle)
                  }
                  : d.values[0];
              })
              .sort(that._sortByTitle);
          }

          callback(null, that._locations = locations);
        });
      });
    },

    getParks: function() {
      return this._parks;
    },

    getParkById: function(id) {
      return this._parksById[id];
    },

    _getAttibutes: function(d) {
      return d.attributes;
    },

    _sortByTitle: function(a, b) {
      return d3.ascending(a.title, b.title);
    }
  };

})(this);
