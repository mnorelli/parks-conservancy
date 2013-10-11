(function(exports) {

  var ggnpc = exports.GGNPC || (exports.GGNPC = {}),
      planner = ggnpc.planner = {};

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
    destTitle: "Going to...",

    travelModes: [
      {label: "Driving", value: google.maps.DirectionsTravelMode.DRIVING},
      {label: "Transit", value: google.maps.DirectionsTravelMode.TRANSIT},
      {label: "Biking", value: google.maps.DirectionsTravelMode.BICYCLING},
      {label: "Walking", value: google.maps.DirectionsTravelMode.WALKING}
    ],

    pointImageUrls: {
      origin: "http://mt.googleapis.com/vt/icon/name=icons/spotlight/spotlight-waypoint-a.png&text=A&psize=16&font=fonts/Roboto-Regular.ttf&color=ff333333&ax=44&ay=48&scale=1",
      destination: "http://mt.googleapis.com/vt/icon/name=icons/spotlight/spotlight-waypoint-b.png&text=B&psize=16&font=fonts/Roboto-Regular.ttf&color=ff333333&ax=44&ay=48&scale=1"
    }
  };

  /*
   * TripPlanner API
   */
  TripPlanner.prototype = ggnpc.utils.extend(new google.maps.MVCObject(), {
    // the constructor
    initialize: function(root, options) {
      this.root = ggnpc.utils.coerceElement(root);
      this.options = ggnpc.utils.extend({}, planner.TripPlanner.defaults, options);

      this._request = {
        origin: this.options.origin,
        destination: this.options.destination,
        travelMode: this.options.travelMode || this.options.travelModes[0].value
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
            .attr("class", "origin column half"),
          destInputs = inputs.append("div")
            .attr("class", "dest column half"),
          mapRoot = form.append("div")
            .attr("class", "maps row"),
          originMapRoot = mapRoot.append("div")
            .attr("class", "map origin column half"),
          destMapRoot = mapRoot.append("div")
            .attr("class", "map origin column half"),
          directionsRoot = form.append("div")
            .attr("class", "row directions"),
          directionsPanel = directionsRoot.append("div")
            .attr("class", "directions-panel");

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
            .text(function(d) { return d.label; })
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

    setDestination: function(dest) {
      if (dest != this._request.destination) {
        this._request.destination = dest;
        google.maps.event.trigger(this, "destination", dest);
      }
      return this;
    },

    getTravelMode: function(mode) {
      return this._request.travelMode;
    },

    setTravelMode: function(mode) {
      this._request.travelMode = mode;
      return this;
    },

    setLocationLookup: function(locationsById) {
      this._locationsById = locationsById;
      return this;
    },

    getLocationById: function(id) {
      return this._locationsById
        ? this._locationsById[id]
        : null;
    },

    route: function(callback) {
      this._clearRoute();

      var request = ggnpc.utils.extend({}, this._request);
      console.log("request:", this._request);
      if (typeof request.destination === "object") {
        request.destination = this._getObjectLocation(request.destination);
      } else {
        request.destination = this._parseLocation(request.destination);
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

    _getObjectLocation: function(obj) {
      return obj.location;
    },

    _clearRoute: function() {
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

      this.originMap.setZoom(this.options.originMap.zoom || 15);
      this.originMap.setCenter(start);
      this.originMap.directionsDisplay.setDirections(response);

      this.destMap.setZoom(this.options.destMap.zoom || 15);
      this.destMap.setCenter(end);
      this.destMap.directionsDisplay.setDirections(response);

      this._updateBespokeDirections();
    },

    _updateBespokeDirections: function() {
      // XXX
      this.destMap.directionsDisplay;
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

})(this);
