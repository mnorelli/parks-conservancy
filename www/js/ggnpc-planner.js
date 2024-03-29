(function(exports) {

  var ggnpc = exports.GGNPC || (exports.GGNPC = {}),
      planner = ggnpc.planner = {},
      utils = ggnpc.utils;

  /*
   * Trip Planner
   */
  var TripPlanner = planner.TripPlanner = new ggnpc.maps.Class(
    google.maps.MVCObject,
  {
    defaults: {
      bounds: ggnpc.maps.BOUNDS,

      originMap: {
        zoom: 15,
      },
      destMap: {
        zoom: 15
      },

      originTitle: "Where are you coming from?",
      originColumnSize: "one-third",

      travelTimeTitle: "When do you want to leave?",
      travelModeTitle: "How will you travel?",

      destTitle: "Going to...",
      destColumnSize: "two-thirds",

      tripDescriptionHTML: 'That&rsquo;s <b class="distance"></b>, and should take about <b class="duration"></b> to get there <b class="mode">by car</b>. ',

      nearbyDistance: 1.0, // miles
      nearbyTypes: {
        "Restroom": 1,
        "Cafe": 1,
        "Visitor Center": 1,
        "Trailhead": 2
      },

      freezeDestination: false,
      destinationOptions: [],

      travelTimeType: null,

      pointImageUrls: {
        origin: "http://mt.googleapis.com/vt/icon/name=icons/spotlight/spotlight-waypoint-a.png&text=A&psize=16&font=fonts/Roboto-Regular.ttf&color=ff333333&ax=44&ay=48&scale=1",
        destination: "http://mt.googleapis.com/vt/icon/name=icons/spotlight/spotlight-waypoint-b.png&text=B&psize=16&font=fonts/Roboto-Regular.ttf&color=ff333333&ax=44&ay=48&scale=1"
      }
    },

    // the constructor
    initialize: function(root, options) {
      this.root = utils.coerceElement(root).appendChild(document.createElement("div"));
      this.root.className = "trip-planner";
      this.options = utils.extend({}, TripPlanner.defaults, options);

      this._model = this.options.destinationModel || new DestinationModel();

      this._request = {};

      this._travelTime = this._coerceDate(this.options.departureTime) || new Date();
      this._travelTimeType = this.options.travelTimeType;

      this.directions = new google.maps.DirectionsService();

      this._setupDom();
      this._updateTravelTime();

      if (this.options.bounds) {
        this.originMap.fitBounds(this.options.bounds);
        this.destMap.fitBounds(this.options.bounds);
      }

      if (this.options.origin) this.setOrigin(this.options.origin);
      if (this.options.destination) this.setDestination(this.options.destination);
      if (this.options.travelMode) this.setTravelMode(this.options.travelMode);
    },

    //
    _setupDom: function() {
      var that = this,
          frozen = !!this.options.freezeDestination,
          root = d3.select(this.root)
            .classed("frozen", frozen)
            .classed("has-origin", !!this.getOrigin())
            .classed("has-destination", !!this.getDestination()),
          form = this._form = root.append("form")
            .attr("target", "#"),
          inputs = form.append("div")
            .attr("class", "inputs row"),
          originColumn = inputs.append("div")
            .attr("class", "origin column half"),
          destColumn = inputs.append("div")
            .attr("class", "destination column half"),
          mapRoot = form.append("div")
            .attr("class", "maps hide-default")
            .append("div")
              .attr("class", "row"),
          originMapRoot = mapRoot.append("div")
            .attr("class", "map origin column " + this.options.originColumnSize),
          destMapRoot = mapRoot.append("div")
            .attr("class", "map destination column " + this.options.destColumnSize),
          tripInfo = form.append("div")
            .attr("class", "trip-info-wrapper hide-default")
            .append("div")
              .attr("class", "row trip-info"),
          tripDesc = tripInfo.append("span")
            .attr("class", "trip-desc")
            .html(this.options.tripDescriptionHTML),
          linksRoot = tripInfo.append("span")
            .attr("class", "links"),
          warningRow = form.append("div")
            .attr("class", "row warning hide-default"),
          destInfoRow = form.append("div")
            .attr("class", "row dest-info-row hide-default"),
          directionsColumn = destInfoRow.append("div")
            .attr("class", "directions column one-third"),
          directionsPanel = directionsColumn.append("div")
            .attr("class", "google-directions"),
          destInfoColumn = destInfoRow.append("div")
            .attr("class", "column two-thirds"),
          destInfoBlock = destInfoColumn.append("div")
            .attr("class", "dest-info section"),
          nearbyBlock = destInfoColumn.append("div")
            .attr("class", "nearby-panel section");

      /*
      var toggleDirectionsLink = tripDesc.append("a")
        .attr("class", "toggle-directions")
        .html("Show directions")
        .call(makeToggle, directionsPanel.classed("active", true), "Hide directions");
      */

      var originGroup = originColumn.append("div")
        .attr("class", "origin-group");

      var originLocation = originGroup.append("div")
        .attr("class", "section");

      var originTitle = originLocation.append("h3")
        .attr("class", "title")
        .html(this.options.originTitle || "");

      /*
      var originToggle = originTitle.append("a")
        .text("Change Transportation")
        .attr("class", "toggle")
        .on("click", function() {
          var visible = originInputs.style("display") === "none";
          originInputs
            .style("display", visible ? null : "none");
          if (visible) {
            originInputs.select("input.origin")
              .node()
                .focus();
          }
        });
      */

      var originRow = originLocation.append("div");

      originRow.append("img")
        .attr("class", "point")
        .attr("src", this.options.pointImageUrls.origin);

      originRow.append("input")
        .attr("class", "origin")
        .attr("tabindex", 1)
        .attr({
          type: "text",
          name: "origin",
          value: this._request.origin
        })
        .on("change", function() {
          that.setOrigin(this.value);
        });

      var originInputs = originGroup.append("div")
        .attr("class", "time-transport");
      /*
        .style("display", !!this.getOrigin()
          ? "none"
          : null);
      */

      /*
       * travel mode inputs
       */
      var travelMode = originInputs.append("div")
        .attr("class", "travel-mode section");

      travelMode.append("h3")
        .attr("class", "title")
        .html(this.options.travelModeTitle || "");

      // set up the travel mode selector
      var modeRoot = travelMode.append("div")
        .attr("class", "travel-modes");
      this._modeSelector = new TravelModePicker(modeRoot.node(), {
        mode: this.getTravelMode()
      });
      this._modeSelector.addListener("change", function(mode) {
        that.setTravelMode(mode);
      });

      if (!this.getTravelMode()) {
        var mode = this._modeSelector.getMode();
        this.setTravelMode(mode);
      }

      /*
       * travel time inputs
       */
      var travelTime = originInputs.append("div")
        .attr("class", "travel-time section");

      travelTime.append("h3")
        .attr("class", "title")
        .html(this.options.travelTimeTitle || "");

      // set up the date/time picker
      var datePicker = travelTime.append("div")
        .attr("class", "date-picker");

      var departChanged = false,
          departOptions = datePicker.append("span")
            .attr("class", "time-type")
            .append("select")
              .attr("name", "time-type")
              .on("change", function() {
                var d = d3.select(this.options[this.selectedIndex]).datum();
                if (d.value) {
                  that.setTravelTimeType(d.value);
                } else {
                  departChanged = true;
                  that._datePicker.setDate(new Date());
                  departChanged = false;
                }
              })
              .selectAll("option")
              .data([
                {title: "Leave now", value: null},
                {title: "Depart at", value: "departure"},
                {title: "Arrive at", value: "arrival"}
              ])
              .enter()
              .append("option")
                .attr("value", function(d) { return d.value; })
                .text(function(d) { return d.title; });

      this._datePicker = new DateTimePicker(datePicker.node());
      this._datePicker.addListener("change", function(date) {
        console.log("date change:", date);
        that.setTravelTime(date);

        if (!departChanged && !that.getTravelTimeType()) {
          that.setTravelTimeType(null);
          departOptions
            .attr("selected", function(d, i) {
              return (d.value === "departure") ? "selected" : null;
            });
        }
      });

      var destSection = destColumn.append("div")
        .attr("class", "destination section");

      destSection.append("h3")
        .attr("class", "title")
        .html(this.options.destTitle || "");

      var destRow = destSection.append("div");

      destRow.append("img")
        .attr("class", "point")
        .attr("src", this.options.pointImageUrls.destination);

      destSection.append("p")
        .attr("class", "description");

      if (this.options.freezeDestination) {

        destRow.append("span")
          .attr("class", "frozen-title");

      } else if (Array.isArray(this.options.destinationOptions)) {

        var destSelect = destRow.append("select")
          .attr("class", "destination")
          .attr("name", "destination")
          .attr("tabindex", 2)
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

        destRow.append("input")
          .attr("class", "destination")
          .attr("tabindex", 2)
          .attr({
            type: "text",
            name: "destination",
            value: this._request.destination
          })
          .on("change", function() {
            that.setDestination(this.value);
          });

      }

      var submitButton = originColumn.append("input")
        .attr("class", "submit")
        .attr("tabindex", 3)
        .attr({
          type: "submit",
          value: "Plan my Trip!"
        });

      var nearbyTitle = nearbyBlock.append("h3")
        .attr("class", "title")
        .text("Nearby");

      nearbyBlock.append("div")
        .attr("class", "nearby-locations");

      var destTitle = destInfoBlock.append("h3")
        .attr("class", "title");
      destTitle.append("span")
        .attr("class", "icon");
      destTitle.append("span")
        .attr("class", "text");

      destInfoBlock.append("p")
        .attr("class", "description");

      // XXX custom "welcome" content certain locations (outreach)
      // console.log("frozen?", frozen);
      if (frozen) {
        destColumn
          // .classed("has-welcome", true)
          .append("div")
            .attr("class", "section welcome");
      }

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
        d3.select(this.root)
          .classed("has-origin", !!origin);

        this._form.select("input.origin")
          .property("value", origin);

        this.resize();
        google.maps.event.trigger(this, "origin", origin);
      }
      return this;
    },

    /*
     * Resize the maps. This is necessary if the maps' DOM elements (or
     * their ancestors) were display: none previously, as Google can't
     * infer their directions when they're not displayed.
     */
    resize: function() {
      this.originMap.resize();
      this.destMap.resize();
    },

    // get the destination
    getDestination: function() {
      return this._request.destination;
    },

    // get the destination title
    getDestinationTitle: function(dest) {
      if (!dest) dest = this.getDestination();
      if (!dest) return null;
      return (typeof dest === "string")
        ? dest
        : dest.title;
    },

    // get the destination as a linkable string (for the hash/query)
    getDestinationString: function(dest) {
      if (!dest) dest = this.getDestination();
      if (!dest) return null;
      return (typeof dest === "string")
        ? dest
        : [dest.title, dest.id].join(":");
    },

    // set the destination
    setDestination: function(dest) {
      if (dest != this._request.destination) {
        var value = dest;
        dest = this._request.destination = this._resolveDestination(dest);
        google.maps.event.trigger(this, "destination", dest);

        var that = this;
        d3.select(this.root)
          .classed("has-destination", !!this._request.destination)
          .selectAll("select.destination option")
            .attr("selected", function(d) {
              return d === that._request.destination
                ? "selected"
                : null;
            });

        if (this.options.freezeDestination) {
          this._form.select(".frozen-title")
            .text(this.getDestinationTitle());

          var welcome = dest ? dest.welcomeContent : null;
          this._form.select(".destination.column")
            .classed("has-welcome", welcome)
            .select(".welcome")
              .html(welcome);
        }

        var descRoot = this._form.select(".destination .description");
        // console.log("desc root:", descRoot.node());
        if (typeof dest === "object") {
          var desc = this._getDestinationDescription(dest, true);
          descRoot.html(desc);
        } else {
          descRoot.text("");
        }

        this.resize();
      }
      return this;
    },

    // get the travel mode
    getTravelMode: function(mode) {
      return this._request.travelMode;
    },

    // set the travel mode
    setTravelMode: function(mode) {
      if (mode != this._request.travelMode) {
        this._request.travelMode = mode.toUpperCase();
        google.maps.event.trigger(this, "travelMode", this._request.travelMode);
        this._updateTravelTime();
      }
      return this;
    },

    // get the travel time
    getTravelTime: function() {
      return this._travelTime;
    },

    // set the travel time
    setTravelTime: function(time) {
      if (time != this._travelTime) {
        this._travelTime = this._coerceDate(time);
        google.maps.event.trigger(this, "travelTime", this._travelTime);
      }
      return this;
    },

    // (private) update the travel time
    _updateTravelTime: function() {
      var transit = this._request.travelMode === google.maps.DirectionsTravelMode.TRANSIT;
      d3.select(this.root)
        .select(".travel-time.section")
          .style("display", transit ? null : "none");
    },

    // get the travel time type: "arrival" or "departure"
    getTravelTimeType: function() {
      return this._travelTimeType;
    },

    // set the travel time type: "arrival" or "departure"
    setTravelTimeType: function(type) {
      if (this._travelTimeType != type) {
        this._travelTimeType = type;
        google.maps.event.trigger(this, "travelTimeType", this._travelTimeType);
      }
      return this;
    },

    // attempt to route between the current origin and destination
    route: function(callback) {
      this._clearRoute();

      var request = utils.extend({}, this._request);
      if (typeof request.destination === "object") {
        request.destination = this._getObjectLocation(request.destination);
      }

      if (request.travelMode === google.maps.DirectionsTravelMode.TRANSIT && (this._travelTime instanceof Date)) {
        switch (this._travelTimeType) {
          case "departure":
            request.transitOptions = {
              departureTime: this._travelTime
            };
            break;
          case "arrival":
            request.transitOptions = {
              arrivalTime: this._travelTime
            };
            break;
          default:
            if (this._travelTimeType) {
              console.warn("invalid travel time type:", this._travelTimeType);
          }
        }
      }

      // request.destination = "loc:" + request.destination;

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
      // this._setElementOrder(".origin.column", ".destination.column");

      var that = this,
          root = d3.select(this.root)
            .classed("routing", true);

      clearTimeout(this._unroutedTimeout);
      this._unroutedTimeout = setTimeout(function() {
        root.classed("routed", false);
      }, 200);

      this.directions.route(request, function(response, stat) {
        clearTimeout(that._unroutedTimeout);

        root
          .classed("routed", true)
          .classed("routing", false);

        if (stat === google.maps.DirectionsStatus.OK) {
          that._updateRoute(response, request);
          if (callback) callback(null, response);
        } else {
          alert("Unable to route: " + stat);
          google.maps.event.trigger(this, "error", response);
          if (callback) callback(response, null);
        }
      });
    },

    /*
     * reorder elements by selector, e.g.:
     * _setElementOrder(".foo", ".bar")
     */
    _setElementOrder: function() {
      var selectors = [].slice.call(arguments),
          first = this.root.querySelector(selectors[0]),
          root = first.parentNode,
          previous;
      while (selectors.length) {
        var el = this.root.querySelector(selectors.shift());
        if (previous) {
          root.insertBefore(el, previous.nextChild);
        } else {
          root.insertBefore(el, root.firstChild);
        }
        previous = el;
      }
    },

    _coerceDate: function(time) {
      if (typeof time === "string") {
        var formats = ["%Y-%m-%d", "%Y-%m-%d %H:%M"].map(d3.time.format);
        for (var i = 0; i < formats.length; i++) {
          var parsed = formats[i].parse(time);
          if (parsed instanceof Date) return parsed;
        }
      }
      return (time instanceof Date)
        ? time
        : null;
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
          } else if (!id && (name && option.title === name)) {
            return found = option;
          }
          // console.log("x", option.title, option.id);
        }

        // console.log("_resolveDestination(", dest, ") ->", found);
        return found || dest;
      }
      return dest;
    },

    _getObjectLocation: function(obj) {
      var latlng = obj.latlng || utils.coerceLatLng(obj.location);
      return utils.latLngToString(latlng);
    },

    _clearRoute: function() {
      // clear nearby locations
      var root = d3.select(this.root);

      root.selectAll(".nearby-locations")
        .selectAll(".location")
        .remove();

      root.selectAll(".links a.custom")
        .remove();

      root.select(".dest-info")
        .selectAll(".title .text, .description")
          .text("");

      this.originMap.directionsDisplay.setMap();
      this.destMap.directionsDisplay.setMap();
    },

    _updateRoute: function(response, request) {
      google.maps.event.trigger(this, "route", response);

      var route = response.routes[0],
          leg = route.legs[0],
          start = leg.start_location,
          end = leg.end_location;

      var root = d3.select(this.root);

      var tripDesc = root.select(".trip-desc");
      tripDesc.select(".distance")
        .text(leg.distance.text.replace(/ mi$/, " miles"));
      tripDesc.select(".duration")
        .text(leg.duration.text.replace(/ mins$/, " minutes"));

      var mode = this._modeSelector.getModeTitle(request.travelMode);
      tripDesc.select(".mode")
        .text(mode);

      this._updateDestinationName(response);

      this.resize();

      this.originMap.directionsDisplay.setMap(this.originMap);
      this.originMap.directionsDisplay.setDirections(response);
      this.originMap.setZoom(this.options.originMap.zoom || 15);
      var bounds = utils.getLatLngBounds(start, end);
      this.originMap.fitBounds(bounds);

      this.destMap.directionsDisplay.setMap(this.destMap);
      this.destMap.directionsDisplay.setDirections(response);
      this.destMap.setZoom(this.options.destMap.zoom || 15);
      this.destMap.setCenter(end);

      this._updateLinks(response, request);
      this._updateDestinationInfo(this._request.destination, leg.end_address);
      this._updateNearbyLocations();
      this._updateBespokeDirections();
    },

    // URL params cribbed from:
    // <http://moz.com/ugc/everything-you-never-wanted-to-know-about-google-maps-parameters>
    _getGoogleMapsUrl: function(d) {
      var url = "https://maps.google.com/maps",
          params = {
            f: "d", // directions
            saddr: d.origin,
            daddr: d.destination
          };
      switch (d.travelMode) {
        case google.maps.DirectionsTravelMode.TRANSIT:
          params.dirflg = "r";
          break;
        case google.maps.DirectionsTravelMode.BICYCLING:
          params.dirflg = "b";
          break;
        case google.maps.DirectionsTravelMode.WALKING:
          params.dirflg = "w";
          break;
      }

      if (d.date instanceof Date) {
        // "date=10%2F17%2F13&time=7:33pm"
        params.date = d3.time.format("%m/%e/%y")(d.date).replace(/ /g, "");
        params.time = d3.time.format("%I:%M%p")(d.date).replace(/^0/, "");
      }
      return [url, utils.qs.format(params)].join("?");
    },

    _updateLinks: function(res, req) {
      var that = this,
          linkRoot = d3.select(this.root)
            .select(".links");

      var params = {
        origin:       req.origin,
        destination:  req.destination,
        travelMode:   req.travelMode
      };

      if (req.transitOptions && req.transitOptions.departureTime instanceof Date) {
        params.date = req.transitOptions.departureTime;
      }
      // TODO how to specify arrival time???

      console.log("link params:", params);

      var links = linkRoot.selectAll("a.custom")
        .data([
          {text: "Print Directions", href: "?print"}, // TODO: add params to URL
          {text: "View in Google Maps", href: this._getGoogleMapsUrl(params)}
        ])
        .enter()
        .append("a")
          .attr("class", "custom")
          .attr("target", "_blank")
          .text(function(d) { return d.text; })
          .attr("href", function(d) { return d.href; });
    },


    _updateDestinationInfo: function(dest, address) {
      var info = this._form.select(".dest-info"),
          warning = this._form.select(".warning");

      // console.log("destination info:", dest);

      if (typeof dest === "object") {
        info.datum(dest)
          .select(".title .text")
            .text(dest.title);

        info.select(".icon")
          .attr("class", function(d) {
            var klass = this.className.replace(/icon-\w+/g, ""),
                type = dest.parklocationtype
                  .toLowerCase()
                  .replace(/ +/g, "_");
            return [klass, "icon-" + type].join(" ");
          });

        var desc = this._getDestinationDescription(dest);
        info.select(".description").html(desc || "");

        // TODO: figure out which field this comes from in different data sources
        // (TnT, Convio)
        /*
        dest.warning = [
          "<h4>Drivers, Please Note:</h4>",
          "Parking is <u><i>very</i></u> difficult, <b>blah blah blah</b>."
        ].join("\n");
        */

        warning.style("display", dest.warning ? null : "none")
          .html(dest.warning);

      } else {
        info.select(".title")
          .text(dest);
        info.select(".desc")
          .text("");

        warning.style("display", "none")
          .text("");
      }
    },

    _getDestinationDescription: function(dest, usePark) {
      var desc = dest.description;
      if (!desc && usePark && dest.relatedpark) {
        var park = this._model.getParkById(dest.relatedpark);
        if (park) return park.description;
      }
      return desc;
    },

    _updateNearbyLocations: function() {
      var dest = this.getDestination(),
          that = this,
          nearby = this._model.getLocationsNearLocation(dest,
            this.options.nearbyDistance,
            this.options.nearbyTypes),
          loc = d3.select(this.root).select(".nearby-locations")
            .selectAll(".location")
            .data(nearby);

      loc.exit().remove();

      var enter = loc.enter()
        .append("div")
          .attr("class", "location");

      enter.append("span")
        .attr("class", "icon");

      enter.append("span")
        .attr("class", "title")
        .append("a");

      enter.append("span")
        .attr("class", "distance");

      loc
        .attr("id", function(d) { return "nearby-" + d.id; })
        .attr("class", function(d) {
          var type = d.parklocationtype
            .toLowerCase()
            .replace(/ +/g, "_");
          return ["location", type].join(" ");
        });

      loc.select(".title a")
        .attr("href", function(d) {
          if (!that._hasDestination(d)) return;
          return "#" + utils.qs.format({
            to: that.getDestinationString(d)
          });
        })
        .on("click", function(d) {
          d3.event.preventDefault();
          if (this.href) {
            that.setDestination(d);
          }
        })
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

    },

    _updateBespokeDirections: function() {
      clearTimeout(this._bespokeDirectionsInterval);

      var dest = this.getDestination();
      if (dest && dest.bespoke_directions) {
        var panel = this.destMap.directionsDisplay.getPanel();
        this._bespokeDirectionsInterval = setTimeout(function() {
          d3.select(panel)
            .select("table.adp-directions tbody")
            .call(BespokeDirections.augmentGoogleDisplay, dest.bespoke_directions);
        }, 100);
        return true;
      }

      return false;
    },

    _updateDestinationName: function(response) {
      var dest = this.getDestination();
      if (typeof dest !== "object") return;
      var route = response.routes[0],
          leg = route.legs[0];
      switch (leg.end_address) {
        case "":
        case "United States":
          leg.end_address = dest.title;
          return true;
          break;
      }
      return false;
    },

    _hasDestination: function(dest) {
      // TODO make this work with the destination model
      var options = this.options.destinationOptions;
      // console.log("has dest:", dest);
      if (!options) {
        return true;
      } else if (options.indexOf(dest) > -1) {
        return true;
      } else {
        var found = null;
        options.forEach(function(d) {
          if (found) return;
          if (d.children) {
            var i = d.children.indexOf(dest);
            if (i > -1) {
              found = d.children[i];
            }
          }
        });
        return found ? true : false;
      }
    }

  });

  TripPlanner.inject = function(options) {
    console.log("TripPlanner.inject(", options, ")");
    if (!options) options = {};

    var planner,
        layout,
        destinations,
        model = new DestinationModel(),
        hash = utils.qs.parse(location.hash),
        root = utils.coerceElement(options.root || "trip-planner");

    if (!root) {
      console.log("planner: no root", options.root);
      return;
    }

    root = d3.select(root)
      .classed("loading", true);

    GGNPC.planner.DestinationModel.instance = model;

    var message = root.append("p")
      .attr("class", "loading-message")
      .text("Loading the trip planner...");

    // console.log("loading destinations...");
    model.load(function(error) {
      if (error) {
        message.text("Unable to load locations!");
        return console.error("unable to load locations:", error);
      }

      message
        // .text("Loaded " + destinations.length + " destinations!")
        .remove();

      if (options.nearby === true) {
        console.log("using the nearby planner...");
        planner = new NearbyPlanner(root.node(), {
          origin: hash.from,
          travelMode: hash.mode,
          destinationModel: model
        });

        GGNPC.planner.NearbyPlanner.instance = planner;

        planner.addListener("travelMode", updateHash);
        planner.addListener("nearby", updateHash);

        function updateHash() {
          location.hash = GGNPC.utils.qs.format({
            from: planner.getOrigin(),
            mode: planner.getTravelMode().toLowerCase()
          });
        }

        return;
      }

      // get the appropriate destinations from the model
      destinations = model.getDestinations({
        access: true,
        groupByPark: true
      });

      console.log("loaded", destinations.length, "destinations");

      if (options.bespokeURL) {
        console.log("loading bespoke directions from CSV:", options.bespokeURL);
        BespokeDirections.loadFromCSV(options.bespokeURL, function(error, rowsById) {
          if (error) {
            console.warn("Unable to get bespoke directions:", error);
          } else {
            console.log("got bespoke directions:", rowsById);
            model.setBespokeDirections(rowsById);
          }

          initialize();
        });
      } else if (options.bespokeSheetId) {
        console.log("loading bespoke directions from:", options.bespokeSheetId);
        BespokeDirections.loadFromSpreadsheet(options.bespokeSheetId, function(error, rowsById) {
          if (error) {
            console.warn("Unable to get bespoke directions:", error);
          } else {
            console.log("got bespoke directions:", rowsById);
            model.setBespokeDirections(rowsById);
          }

          initialize();
        });
      } else {
        initialize();
      }
    });

    function initialize() {
      root.classed("loading", false);

      var to = options.to || hash.to,
          frozen = options.to || (hash.to && hash.freeze === true),
          dest;
      // resolve the destination asynchronously
      model.resolveLocation(to, function(error, loc) {
        dest = loc;
        if (dest && dest.id) {
          return loadContent(dest, done);
        } else {
          done();
        }
      });

      // for loading welcome outreach content
      function loadContent(loc, callback) {
        var url = ["/map/outreach-data", loc.id + ".html"].join("/");
        return d3.text(url, function(error, content) {
          if (error) return callback(null, loc);
          loc.welcomeContent = content;
          callback(null, loc);
        });
      }

      function done() {
        if (dest && dest.accessLocations) {
          console.log("got access for:", dest, dest.accessLocations[0]);
          dest = dest.accessLocations[0];
        }
        console.log("resolved dest:", to, "->", dest);

        planner = new TripPlanner(root.node(), {
          origin: hash.from, // || "2017 Mission St, SF",
          destination: dest,
          travelMode: hash.mode,
          destinationOptions: destinations,
          freezeDestination: frozen,
          destinationModel: model
        });

        autoRoute();

        planner.addListener("origin", autoRoute);
        planner.addListener("destination", autoRoute);
        planner.addListener("travelMode", autoRoute);
        planner.addListener("travelTime", autoRoute);
        planner.addListener("travelTimeType", autoRoute);

        planner.addListener("route", function(route) {
          console.log("routed:", route);
          location.hash = GGNPC.utils.qs.format({
            from: planner.getOrigin(),
            to: frozen ? null : planner.getDestinationString(),
            mode: planner.getTravelMode().toLowerCase(),
            freeze: frozen ? true : null
          });
          // TODO: implement date, time and (arrival|departure)
        });

        planner.addListener("error", function(error) {
          console.warn("error:", error);
        });

        TripPlanner.instance = planner;
      }
    }

    function autoRoute() {
      if (planner.getOrigin() && planner.getDestination()) {
        planner.route();
      }
    }
  };


  planner.BaseClass = new ggnpc.maps.Class(google.maps.MVCObject);

  // "nearby" view
  var NearbyPlanner = planner.NearbyPlanner = planner.BaseClass.extend({
    defaults: {
      bounds: ggnpc.maps.BOUNDS,

      // various text bits
      originTitle: "You&rsquo;re coming from:",
      modeTitle: "Leaving:",
      nearbyTitle: "Here are a few options for a park visit:",

      // distance threshold in miles
      nearbyDistance: 100,
      // group nearby locations by this distance interval (in miles)
      nearbyDistanceGroup: 5,
      // limit the nearby location list to this many items
      nearbyLimit: 15,
      // only show nearby locations of this type.
      // NOTE: if this is an object e.g. {"Trailhead": 3, ...}, then the
      // results will be cut down to a max number of locations by type
      nearbyTypes: [
        "Trailhead",
        "Visitor Center",
        "Landmark"
      ],

      pointImageUrls: TripPlanner.defaults.pointImageUrls
    },

    initialize: function(root, options) {
      this.root = utils.coerceElement(root).appendChild(document.createElement("div"));
      this.root.className = "trip-planner nearby-planner";
      this.options = utils.extend({}, NearbyPlanner.defaults, options);

      this._setupDom();

      this.geocoder = new google.maps.Geocoder();
      this.directions = new google.maps.DirectionsService();
      this.directionsDisplay = new google.maps.DirectionsRenderer();

      if (this.options.travelMode) this.setTravelMode(this.options.travelMode);
      if (this.options.origin) this.setOrigin(this.options.origin);

      this._model = this.options.destinationModel || new DestinationModel();
    },

    _setupDom: function() {
      var that = this,
          root = d3.select(this.root),
          form = this._form = root.append("form")
            .attr("target", "?#")
            .on("submit", function() {
              d3.event.preventDefault();
              var origin = originInput.property("value");
              that.setOrigin(origin);
            }),
          inputs = form.append("div")
            .attr("class", "row inputs"),
          originColumn = inputs.append("div")
            .attr("class", "column origin"),
          originSection = originColumn.append("div")
            .attr("class", "section"),
          modeColumn = inputs.append("div")
            .attr("class", "column mode"),
          modeSection = modeColumn.append("div")
            .attr("class", "section"),
          mainRow = form.append("div")
            .attr("class", "row main"),
          mapColumn = mainRow.append("div")
            .attr("class", "column map half"),
          nearbyColumn = mainRow.append("div")
            .attr("class", "column nearby half");

      originSection.append("h3")
        .attr("class", "title")
        .html(this.options.originTitle);

      originSection.append("img")
        .attr("class", "point")
        .attr("src", this.options.pointImageUrls.origin);

      var originInput = originSection.append("input")
        .attr("class", "origin")
        .attr("type", "text")
        .attr("tabindex", 1)
        .attr("value", this._origin)
        .on("change", function() {
          that.setOrigin(this.value);
        })
        .each(function() {
          this.focus();
        });

      modeSection.append("h3")
        .attr("class", "title")
        .html(this.options.modeTitle || "&nbsp;");

      var modeDiv = modeSection.append("div");

      var modeSelect = modeDiv.append("select")
        .attr("name", "mode")
        .attr("class", "mode")
        .on("change", function() {
          var mode = this.options[this.selectedIndex].value;
          that.setTravelMode(mode);
        });
      
      var selectedMode = this.getTravelMode(),
          modes = TravelModePicker.defaults.modes;
      modeSelect.selectAll("option")
        .data(modes)
        .enter()
        .append("option")
          .text(function(d) { return d.title; })
          .attr("value", function(d) { return d.value; })
          .attr("selected", function(d) {
            return d.value === selectedMode
              ? "selected"
              : null;
          });

      if (!this._travelMode) {
        this._travelMode = modes[0].value;
      }

      var dateRoot = modeDiv.append("span")
        .attr("class", "date-picker");
      var datePicker = this._datePicker = new DateTimePicker(dateRoot.node());
      datePicker.addListener("change", function(date) {
        that.setTravelTime(date);
      });

      var mapRoot = mapColumn.append("div")
        .attr("class", "map");
      var map = this.map = new ggnpc.maps.Map(mapRoot.node());
      if (this.options.bounds) {
        map.fitBounds(this.options.bounds);
      }

      this.originMarker = new google.maps.Marker({
        map: map,
        icon: this.options.pointImageUrls.origin
      });

      var nearbySection = nearbyColumn.append("div")
        .attr("class", "section");

      nearbySection.append("h3")
        .attr("class", "title")
        .text(this.options.nearbyTitle);

      this._nearbyRoot = nearbySection.append("div")
        .attr("class", "nearby-locations");
    },

    getOrigin: function() {
      return this._origin;
    },

    setOrigin: function(origin) {
      if (origin != this._origin) {
        this._origin = origin;
        google.maps.event.trigger(this, "origin", this._origin);

        this._form.select("input.origin")
          .property("value", this._origin);

        this._updateOrigin();
      }
      return this;
    },

    getTravelTime: function() {
      return this._travelTime;
    },

    setTravelTime: function(date) {
      if (!this._travelTime || date.getTime() != this._travelTime.getTime()) {
        this._travelTime = date;
        google.maps.event.trigger(this, "travelTime", this._travelTime);
      }
      return this;
    },

    getTravelMode: function() {
      return this._travelMode;
    },

    setTravelMode: function(mode) {
      if (mode !== this._travelMode) {
        mode = this._travelMode = mode.toUpperCase();
        google.maps.event.trigger(this, "travelMode", this._travelMode);

        this._form.selectAll("select.mode option")
          .attr("selected", function(d) {
            return d.value === mode
              ? "selected"
              : null;
          });

        this._form.select(".date-picker")
          .style("display", this._travelMode === google.maps.DirectionsTravelMode.TRANSIT
            ? null
            : "none");
      }
      return this;
    },

    _updateOrigin: function() {
      // XXX cancel last request?
      var origin = this.getOrigin();
      if (origin) {
        var that = this,
            request = {
              address: origin,
              bounds: this.options.bounds,
              region: "us"
            };
        this._clearNearbyLocations();
        this.geocoder.geocode(request, function(results, stat) {
          if (stat === google.maps.GeocoderStatus.OK) {
            console.log("got geocode results:", results);
            that._setResult(results[0]);
          } else {
            that._showOriginError(stat);
          }
        });
      } else {
        console.warn("no origin");
      }
    },

    _setResult: function(result) {
      var center = result.geometry.location,
          origin = this.getOrigin(),
          options = this.options,
          that = this;

      this._result = result;
      this.originMarker.setOptions({
        position: center,
        content: result.formatted_address
      });

      var nearby = this._model.getLocationsNearLatLng(center,
          options.nearbyDistance,
          options.nearbyTypes);
      console.log("got", nearby.length, "nearby locations:", nearby);

      nearby = nearby.slice(0, this.options.nearbyLimit);

      google.maps.event.trigger(this, "nearby", nearby);

      var bounds = new google.maps.LatLngBounds(center, center);
      nearby.forEach(function(d) {
        bounds.extend(d.latlng);
      });
      this.map.fitBounds(bounds);

      var byDistance = d3.nest()
        .key(function(d) { return options.nearbyDistanceGroup * Math.ceil(d.distance / options.nearbyDistanceGroup); })
        .entries(nearby);

      var group = this._nearbyRoot.selectAll(".group")
        .data(byDistance, function(d) { return d.key; });

      group.exit().remove();

      group.enter().append("div")
        .attr("class", "group")
        .append("h4")
          .text(function(d) {
            return ["Less than", d.key, "miles away"].join(" ");
          });

      var loc = group.selectAll(".location")
        .data(function(d) { return d.values; });

      loc.exit().remove();
      var enter = loc.enter()
        .append("div")
          .attr("class", "location");

      enter.append("span")
        .attr("class", "icon");

      enter.append("span")
        .attr("class", "title")
        .append("a");

      enter.append("span")
        .attr("class", "distance");

      loc
        .attr("id", function(d) { return "nearby-" + d.id; })
        .attr("class", function(d) {
          var type = d.parklocationtype
            .toLowerCase()
            .replace(/ +/g, "_");
          return ["location", type].join(" ");
        });

      loc.select(".title a")
        .attr("href", function(d) {
          return [
            "?", utils.qs.format({
              to: that.getLocationString(d)
            }),
            "#", utils.qs.format({
              from: origin
            })
          ].join("");
        })
        .on("mouseover", function(d) {
          that.routeTo(d.latlng);
        })
        .on("mouseout", function(d) {
          that.clearRoute();
        })
        /*
        .on("click", function(d) {
          d3.event.preventDefault();
          // console.log("click:", d);
        })
        */
        .text(function(d) { return d.title; });

      this.map.resize();
      this.map.setCenter(center);
    },

    routeTo: function(latlng, callback) {
      this._routeClear = false;
      this.directionsDisplay.setMap(this.map);
      var that = this,
          request = {
            origin: this.getOrigin(),
            destination: utils.latLngToString(latlng),
            travelMode: this.getTravelMode()
          };
      console.log("attempting to route:", request);
      this.directions.route(request, function(response, stat) {
        if (that._routeClear) {
          if (callback) callback("cleared", null);
          return;
        }

        if (stat === google.maps.DirectionsStatus.OK) {
          that._updateRoute(response, request);
          if (callback) callback(null, response);
        } else {
          console.error("Unable to route: " + stat);
          google.maps.event.trigger(this, "error", response);
          if (callback) callback(response, null);
        }
      });
    },

    _updateRoute: function(response, request) {
      this.directionsDisplay.setDirections(response);
    },

    clearRoute: function() {
      this._routeClear = true;
      this.directionsDisplay.setMap();
    },

    getLocationString: function(dest) {
      return (typeof dest === "string")
        ? dest
        : [dest.title, dest.id].join(":");
    },

    _clearNearbyLocations: function() {
      // XXX remove all the groups?
    }
  });

  // rewrite TripPlanner.prototype._setupDatePicker() to use this
  var DateTimePicker = planner.DateTimePicker = planner.BaseClass.extend({
    defaults: {
      minuteStep: 15
    },

    initialize: function(root, options) {
      this.root = utils.coerceElement(root);
      this.options = utils.extend({}, DateTimePicker.defaults, options);
      this._date = this.options.date || new Date();
      this._setup();
      this._update();
    },

    _setup: function() {
      var root = d3.select(this.root),
          dateFormat = d3.time.format("%m/%d/%Y"),
          timeFormat = utils.wrapFormat(d3.time.format("%I:%M%p"),
            function(str) {
              return str.toLowerCase()
                .replace(/^0/, "");
            },
            function(str) {
              return str.toLowerCase();
            }),
          now = this._date,
          that = this;

      var dateRoot = root.append("span")
            .attr("class", "date"),
          dater = new TextPlusOptions(dateRoot.node(), {
            value: dateFormat(now)
          });

      dater.addListener("change", function(str) {
        var date = dateFormat.parse(str);
        if (date) {
          datePicker.month(date);
          setDay(date, true);
          // that.setDate(date, true);
        } else {
          console.warn("bad date:", str);
        }
      });

      var timeRoot = root.append("span")
            .attr("class", "time"),
          timer = new TextPlusOptions(timeRoot.node(), {
            value: timeFormat(now)
          });
      timer.addListener("change", function(str) {
        var time = timeFormat.parse(str);
        if (time) {
          that.setTime(time, true);
        } else {
          console.warn("bad time:", str);
        }
      });

      var datePicker = ggnpc.ui.datePicker()
            .on("month", function(month) {
              // console.log("month:", month);
              table
                .call(datePicker.month(month))
                .call(updateDays, that.getDate());
            })
            .on("day", function(day) {
              dater.close();
              setDay(day);
            }),
          table = d3.select(dater.content)
            .append("table")
              .attr("class", "calendar")
              .call(datePicker)
              .call(updateDays, now);

      var timeOptions = d3.select(timer.content)
        .selectAll(".hour")
        .data(d3.range(0, 24))
        .enter()
        .append("a")
          .attr("class", "hour")
          .text(function(h) {
            var d = new Date();
            d.setHours(h);
            d.setMinutes(0);
            return timeFormat(d);
          })
          .on("click", function(h) {
            that.setHour(h);
            that.setMinutes(0); // XXX
            var d = that.getDate();
            timer.setValue(timeFormat(d));
            timer.close();
          });

      timer.open();

      var currentTime = timeOptions
            .filter(function(h) {
              return h === now.getHours();
            })
            .classed("current", true);
      if (!currentTime.empty()) {
        var offset = currentTime.property("offsetTop");
        d3.select(timer.content)
          .property("scrollTop", offset);
      }

      timer.close();

      function updateDays(selection, day) {
        var isSelected = dayMatcher(day),
            today = d3.time.day.floor(new Date()),
            isToday = dayMatcher(new Date());
        // console.log("select:", day, "today:", new Date());
        selection.selectAll("td.day")
          .classed("today", isSelected)
          .classed("selected", isToday)
          .classed("valid", function(d) {
            return d >= today;
          })
          .classed("invalid", function(d) {
            return d < today;
          });
      }

      function setDay(day) {
        that.setDate(day, true);

        var then = that.getDate();
        dater.setValue(dateFormat(then));

        table
          .call(datePicker.day(then))
          .call(updateDays, then);
      }

      function dayMatcher(date) {
        if (!date) return d3.functor(false);
        var min = d3.time.day.floor(date).getTime(),
            max = d3.time.day.ceil(date).getTime();
        return function(d) {
          var t = d.getTime();
          return t >= min && t < max;
        };
      }

      function toggle(selection) {
        selection.style("display", function() {
          return (this.style.display === "none")
            ? null
            : "none";
        });
      }

      this.addListener("change", function(d) {
        datePicker.month(d);
        setDay(d);
        timer.setValue(timeFormat(d));
      });
    },

    getDate: function() {
      return new Date(this._date.getTime());
    },

    setDate: function(date, preserveTime) {
      var then = this.getDate();
      if (this._date && preserveTime) {
        this._date.setFullYear(date.getFullYear());
        this._date.setMonth(date.getMonth());
        this._date.setDate(date.getDate());
      } else {
        this._date = date;
      }
      this._update(then);
      return this;
    },

    getTime: function() {
      return this.getDate();
    },

    setTime: function(date) {
      var then = this.getDate();
      if (this._date) {
        this._date.setHours(date.getHours());
        this._date.setMinutes(date.getMinutes());
      } else {
        this._date = date;
      }
      this._update(then);
      return this;
    },

    getHour: function() {
      return this._date.getHours();
    },

    setHour: function(hour) {
      if (!this._date || hour != this._date.getHours()) {
        var then = this.getDate();
        this._date.setHours(hour);
        this._update(then);
      }
      return this;
    },

    setMinutes: function(minutes) {
      if (!this._date || minutes != this._date.getMinutes()) {
        var then = this.getDate();
        this._date.setMinutes(minutes);
        this._update(then);
      }
      return this;
    },

    _update: function(then) {
      var round = function(d) { return d3.time.hour.floor(d).getTime(); },
          now = this.getDate();
      if (then && round(then) === round(now)) {
        console.log("same date:", then);
        return;
      }

      // XXX
      var root = d3.select(this.root),
          currentHour = now.getHours(),
          currentMinute = quantize(this._date.getMinutes(), this.options.minuteStep, Math.ceil);
      if (currentMinute === 60) {
        if (++currentHour === 24) {
          currentHour = 0;
        }
        currentMinute = 0;
      }

      console.log("now:", now, [currentHour, currentMinute].join(":"));

      root.select("select.hour")
        .selectAll("option")
          .attr("selected", function(h, i) {
            return i === currentHour ? "selected" : null;
          });

      root.select("select.minute")
        .selectAll("option")
          .attr("selected", function(h) {
            return h === currentMinute ? "selected" : null;
          });

      google.maps.event.trigger(this, "change", this.getDate());
    }
  });

  // rewrite TripPlanner.prototype._setupDom() to use this
  var TravelModePicker = planner.TravelModePicker = planner.BaseClass.extend({
    defaults: {
      modes: [
        {title: "by transit", value: google.maps.DirectionsTravelMode.TRANSIT},
        {title: "by car",     value: google.maps.DirectionsTravelMode.DRIVING},
        {title: "by bike",    value: google.maps.DirectionsTravelMode.BICYCLING},
        {title: "on foot",    value: google.maps.DirectionsTravelMode.WALKING}
      ]
    },

    initialize: function(root, options) {
      this.root = utils.coerceElement(root);
      this.options = utils.extend({}, TravelModePicker.defaults, options);

      this._modes = this.options.modes;

      this._setup();
      this.setMode(this.options.mode || this._modes[0].value);
    },

    getMode: function() {
      return this._mode;
    },

    getModeAt: function(index) {
      return this._modes[index];
    },

    setMode: function(mode) {
      if (mode != this._mode) {
        this._mode = mode.toUpperCase();
        this._update();
        google.maps.event.trigger(this, "change", this._mode);
      }
      return this;
    },

    getModeTitle: function(mode) {
      var mode = this._modes.filter(function(d) {
        return d.value === mode;
      })[0];
      return mode ? mode.title : null;
    },

    _setup: function() {
      var that = this;
      var modes = d3.select(this.root)
        .selectAll("span.mode")
          .data(this._modes)
          .enter()
          .append("a")
            .attr("href", function(d) {
              return "#mode=" + d.value.toLowerCase();
            })
            .attr("class", function(d) {
              return ["mode", d.value.toLowerCase()].join(" ");
            })
            .attr("title", function(d) {
              return d.title;
            })
            .on("click", function(d) {
              d3.event.preventDefault();
              that.setMode(d.value);
              modes.classed("selected", function(o) {
                return o.value === d.value;
              });
            })
            .append("span")
              .text(function(d) { return d.title; });
    },

    _update: function() {
      var that = this,
          mode = this._mode;
      d3.select(this.root)
        .selectAll(".mode")
          .classed("selected", function(d) {
            return d.value === mode;
          });
    }
  });

  var TextPlusOptions = planner.TextPlusOptions = planner.BaseClass.extend({
    defaults: {
      toggleText: ["", ""]
    },

    initialize: function(root, options) {
      this.root = utils.coerceElement(root);

      options = this.options = utils.extend({}, TextPlusOptions.defaults, options);

      var that = this,
          root = d3.select(this.root)
            .classed("text-options", true),
          input = root.append("input")
            .attr("class", "value")
            .attr("type", "text")
            .attr("name", this.options.name)
            .attr("value", this.options.value || "")
            .on("change", function() {
              google.maps.event.trigger(that, "change", this.value);
            }),
          active = false,
          button = root.append("a")
            .attr("class", "toggle")
            .on("click", function() {
              that.toggle();
            }),
          content = root.append("div")
            .attr("class", "content-wrapper")
            .append("div")
              .attr("class", "content");

      var ns = TextPlusOptions.count
        ? ++TextPlusOptions.count
        : (TextPlusOptions.count = 1);
      d3.select(window).on("mousedown.tpo" + ns, function() {
        var target = d3.event.target;
        if (!utils.elementHasAncestor(target, that.root)) {
          // console.log("closing:", that);
          that.close();
        }
      });

      this._input = input;
      this.input = input.node();

      this._content = content;
      this.content = content.node();

      this._button = button;
      this.close();
    },

    open: function() {
      return this._setOpen(true);
    },

    close: function() {
      return this._setOpen(false);
    },

    _setOpen: function(open) {
      this._open = open;
      this._button
        .classed("active", open)
        .html(this.options.toggleText[open ? 1 : 0]);
      this._content
        .style("display", open ? null : "none");
      this._resize();
      return this;
    },

    _resize: function() {
      var width = this._content
        .style("width", "auto")
        .property("offsetWidth");
      this._content
        .style("margin-left", -Math.floor(width / 2) + "px");
      return this;
    },

    toggle: function() {
      return this._setOpen(!this._open);
    },

    getValue: function() {
      return this._input.property("value");
    },

    setValue: function(value) {
      if (value != this._input.property("value")) {
        this._input.property("value", value);
      }
      return this;
    }
  });

  /*
   * Bespoke Directions stuff
   */
  var BespokeDirections = planner.BespokeDirections = {
    loadFromCSV: function(url, callback) {
      return d3.csv(url, function(error, rows) {
        if (error) return callback(error);
        var mapped = BespokeDirections.map(rows, "Convio ID", "Directions");
        return callback(null, mapped);
      });
    },

    loadFromSpreadsheet: function(sheetId, callback) {
      return Tabletop.init({
        key: sheetId,
        simpleSheet: true,
        callback: function(rows) {
          console.log("bespoke rows:", rows);
          var mapped = BespokeDirections.map(rows, "convioid", "directions");
          return callback(null, mapped);
        }
      });
    },

    map: function(rows, idKey, directionsKey) {
      return d3.nest()
        .key(function(d) { return d[idKey]; })
        .rollup(function(d) {
          return BespokeDirections.parse(d[0][directionsKey]);
        })
        .map(rows);
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
   * GGNPC.planner.DestinationModel loads locations from the API. Usage:
   *
   * var loader = new GGNPC.planner.DestinationModel({ ... });
   * loader.load(function(error, locations) {
   * });
   */
  var DestinationModel = planner.DestinationModel = planner.BaseClass.extend({
    defaults: {
    },

    initialize: function(options) {
      this.options = utils.extend({}, DestinationModel.defaults, options);
      this._parks = [];
      this._parksById = {};
      this._allLocations = [];
      this._allLocationsById = {};
      this.api = (this.options.api instanceof ggnpc.API)
        ? this.options.api
        : new ggnpc.API(this.options.api);
    },

    load: function(callback) {
      var that = this;
      return this.api.get("kind/park", function(error, data) {
        if (error) return callback(error);
        that.addParks(data);
        that.loadLocations(callback);
      });
    },

    addParks: function(data) {
      var that = this,
          parks = data.results
            .map(this._getAttibutes)
            .sort(this._sortByTitle);

      parks.forEach(function(d) {
        that.addLocation(d);
        that._parksById[d.id] = d;
      });

      this._parks = parks;
    },

    loadLocations: function(callback) {
      var that = this;
      return this.api.get("kind/location", function(error, data) {
        if (error) return callback(error, null);
        that.addLocations(data);
        callback(null, that);
      });
    },

    addLocation: function(d) {
      d.latlng = utils.coerceLatLng(d.location);
      this._allLocations.push(d);
      this._allLocationsById[d.id] = d;

      if (d.access === "TRUE" && (d.relatedpark in this._parksById)) {
        var park = this._parksById[d.relatedpark];
        if (park.accessLocations) {
          park.accessLocations.push(d);
        } else {
          park.accessLocations = [d];
        }
      }
    },

    addLocations: function(data) {
      var that = this,
          options = this.options,
          parksById = this._parksById,
          locations = data.results.map(that._getAttibutes),
          allLocations = locations.slice();

      allLocations.forEach(this.addLocation.bind(this));
      this._locations = locations;
    },

    getDestinations: function(options) {
      if (!options) options = {};

      var locations = this._locations.slice();

      if (options.access) {
        locations = locations.filter(function(d) {
          return d.access === "TRUE";
        });
      }

      if (options.groupByPark) {
        // filter out locations without a related park?
        locations = locations.filter(function(d) {
          return d.relatedpark;
        });

        var parksById = this._parksById,
            that = this;
        locations = d3.nest()
          .key(function(d) { return d.relatedpark; })
          .entries(locations)
          .map(function(d) {
            var park = parksById[d.key],
                locs = d.values;
            if (park && locs.length > 1) {
              return utils.extend({
                children: locs.sort(that._sortByTitle)
              }, park);
            } else {
              return locs[0];
            }
          });
      }

      return locations;
    },

    setBespokeDirections: function(rowsById) {
      this._allLocations.forEach(function(d) {
        var id = (d.filename || "").split("/").pop();
        if (id in rowsById) {
          console.log("+ bespoke:", d.title);
          d.bespoke_directions = rowsById[id];

          if (d.accessLocations) {
            d.accessLocations.forEach(function(a) {
              a.bespoke_directions = d.bespoke_directions;
            });
          }
        }
      });
    },

    getLocationsNearLocation: function(loc, distance, typeLimits) {
      var latlng = loc.latlng,
          locations = this._allLocations
            .filter(function(d) {
              return d !== loc
                  && d.title !== loc.title
                  && d.latlng instanceof google.maps.LatLng;
            }),
          nearby = locations.filter(function(d) {
            d.distance = utils.distanceInMiles(latlng, d.latlng);
            return d.distance <= distance;
          });

      return typeLimits
        ? this.collateNearby(nearby, typeLimits)
        : nearby.sort(this._sortByDistance);
    },

    getLocationsNearLatLng: function(latlng, distance, typeLimits) {
      var locations = this._allLocations
            .filter(function(d) {
              return d.latlng instanceof google.maps.LatLng;
            }),
          nearby = locations.filter(function(d) {
            d.distance = utils.distanceInMiles(latlng, d.latlng);
            return d.distance <= distance;
          });

      return typeLimits
        ? this.collateNearby(nearby, typeLimits)
        : nearby.sort(this._sortByDistance);
    },

    collateNearby: function(locations, typeLimits) {
      if (locations.length === 0) return locations;

      if (Array.isArray(typeLimits)) {
        var types = typeLimits;
        typeLimits = {};
        types.forEach(function(type) {
          typeLimits[type] = 100; // XXX
        });
      }

      var byType = d3.nest()
        .key(function(d) { return d.parklocationtype; })
        .sortValues(function(a, b) {
          return d3.ascending(a.distance, b.distance);
        })
        .map(locations);

      var collated = [];
      for (var type in typeLimits) {
        var len = typeLimits[type];
        if (type in byType) {
          var subset = byType[type].slice(0, len);
          collated = collated.concat(subset);
        }
      }

      return collated.sort(this._sortByDistance);
    },

    getLocationsByPark: function(filter) {
      var locations = this._allLocations.slice();
      if (filter) {
        locations = locations.filter(filter);
      }

      var locationsByParkId = d3.nest()
        .key(function(d) { return d.relatedpark; })
        .map(this._locations);

      return d3.entries(locationsByParkId)
        .map(function(d) {
          if (!d.key) {
            console.warn("no park id for", d.value.length, "locations");
            return null;
          }

          var park = parksById[d.key];
          if (!park) console.warn("bad park id:", d.key);

          if (park && d.value.length > 1) {
            park.accessLocations = d.value;
            return utils.extend({}, park, {
              children: d.value.sort(that._sortByTitle)
            });
          } else {
            return d.value[0];
          }
        })
        .filter(function(d) { return d; })
        .sort(that._sortByTitle);
    },

    resolveLocation: function(str, callback) {
      if (str && str.indexOf(":") > -1) {
        var parts = str.split(":"),
            title = parts[0],
            id = parts[1];
        if (title === "trip") {
          return this.api.get("trips/" + id + ".json?minimal=true", function(error, data) {
            if (error) return callback(null, str);
            // data is a GeoJSON FeatureCollection,
            // so grab the first feature and its properties
            var feature = data.features[0],
                props = feature.properties,
                start = props.starting_trailhead;
            console.log("resolved trip:", feature);
            // create a dummy destination object with all of the appropriate
            // properties:
            callback(null, {
              title: props.name,
              description: props.description,
              location: [start.latitude, start.longitude].join(","),
              // make this look like a trail
              parklocationtype: "Trailhead",
              trip: feature,
              latlng: new google.maps.LatLng(start.latitude, start.longitude)
            });
          });
        }
        if (id in this._allLocationsById) {
          return callback(null, this._allLocationsById[id]);
        }
        return this.api.get("location/id/" + id, function(error, data) {
          if (error) return callback(null, str);
          console.log("got location:", data);
          callback(null, str);
        });
      }
      return callback(null, str);
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
    },

    _sortByDistance: function(a, b) {
      return d3.ascending(a.distance, b.distance);
    }
  });

  function quantize(n, f, round) {
    if (!round) round = Math.round;
    return f * round(n / f);
  }

  function makeToggle(selection, target, activeText) {
    var offText = selection.html();

    selection
      .classed("toggle", true)
      .on("click", function() {
        d3.event.preventDefault();
        update.call(this);
      });

    function update() {
      var that = d3.select(this),
          active = !that.classed("active");
      that.classed("active", active);

      if (active && activeText) that.html(activeText);
      else if (!active && offText) that.html(offText);

      target.style("display", active ? null : "none");
    }

    selection.each(update);
  }

})(this);
