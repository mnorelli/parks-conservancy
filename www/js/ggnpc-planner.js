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

    travelTimeTitle: "When do you want to leave?",
    travelModeTitle: "How will you travel?",

    destTitle: "Going to...",
    destColumnSize: "two-thirds",

    tripDescriptionHTML: 'That&rsquo;s <b class="distance"></b>, and should take <b>about <span class="duration"></span></b> to get there. ',

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

  TripPlanner.inject = function(options, callback) {
    console.log("TripPlanner.inject(", options, callback, ")");
    if (!options) options = {};

    var planner,
        destinations,
        // XXX make this a global to modify
        bespokeSheetId = "0AnaQ5qurLjURdE9QdGNscWE3dFU1cnJGa3BjU1BNOHc",
        loader = new GGNPC.planner.DestinationLoader(),
        hash = GGNPC.utils.qs.parse(location.hash),
        root = utils.coerceElement(options.root || "trip-planner");

    if (!root) {
      console.log("planner: no root", options.root);
      if (callback) callback("No such element:", options.root);
      return;
    }

    root = d3.select(root)
      .classed("loading", true);

    var message = root.append("p")
      .attr("class", "loading-message")
      .text("Loading the trip planner...");

    // console.log("loading destinations...");
    loader.load(function(error, locations) {
      if (error) {
        message.text("Unable to load locations!");
        return console.error("unable to load locations:", error);
      }

      message
        .text("Loaded " + locations.length + " locations!")
        .remove();

      console.log("loaded", locations.length, "locations");
      destinations = locations;

      /*
      GGNPC.planner.BespokeDirections.load(bespokeSheetId, function(error, rowsByFilename) {
        destinations.forEach(function(d) {
          if (d.filename in rowsByFilename) {
            d.bespoke_directions = rowsByFilename[d.filename];
          }
        });
      });
      */

      initialize();
    });

    // initialize();

    function initialize() {
      root.classed("loading", false);

      planner = new TripPlanner(root.node(), {
        origin: hash.from, // || "2017 Mission St, SF",
        destination: hash.to,
        travelMode: hash.mode,
        destinationOptions: destinations
      });

      autoRoute();

      function autoRoute() {
        if (planner.getOrigin() && planner.getDestination()) {
          planner.route();
        }
      }

      /*
      planner.addListener("origin", autoRoute);
      planner.addListener("travelMode", autoRoute);
      */

      planner.addListener("destination", autoRoute);

      planner.addListener("route", function(route) {
        console.log("routed:", route);
        location.hash = GGNPC.utils.qs.format({
          from: planner.getOrigin(),
          to: planner.getDestinationString(),
          mode: planner.getTravelMode().toLowerCase()
        });
      });

      planner.addListener("error", function(error) {
        console.warn("error:", error);
      });

      if (callback) callback(null, planner);

      TripPlanner.instance = planner;
    }
  };

  /*
   * TripPlanner API
   */
  TripPlanner.prototype = utils.extend(new google.maps.MVCObject(), {
    // the constructor
    initialize: function(root, options) {
      this.root = utils.coerceElement(root).appendChild(document.createElement("div"));
      this.root.className = "trip-planner";
      this.options = utils.extend({}, TripPlanner.defaults, options);

      this._request = {
        origin: this.options.origin,
        destination: this._resolveDestination(this.options.destination),
        travelMode: String(this.options.travelMode || this.options.travelModes[0].value).toUpperCase()
      };

      this._travelTime = this._coerceDate(this.options.departureTime) || new Date();

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
          root = d3.select(this.root)
            .classed("has-origin", !!this.getOrigin())
            .classed("has-destination", !!this.getDestination()),
          form = this._form = root.append("form")
            .attr("target", "#"),
          inputs = form.append("div")
            .attr("class", "inputs row"),
          originColumn = inputs.append("div")
            .attr("class", "origin column " + this.options.originColumnSize),
          destColumn = inputs.append("div")
            .attr("class", "destination column " + this.options.destColumnSize),
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
          directionsRoot = form.append("div")
            .attr("class", "row directions"),
          directionsPanel = directionsRoot.append("div")
            .attr("class", "google-directions"),
          destInfoRow = form.append("div")
            .append("div")
              .attr("class", "dest-info-wrapper hide-default")
              .append("div")
                .attr("class", "row dest-info-row hide-default"),
          destInfoBlock = destInfoRow.append("div")
            .attr("class", "dest-info column half")
            .append("div")
              .attr("class", "section"),
          nearbyBlock = destInfoRow.append("div")
            .attr("class", "nearby-panel column half")
            .append("div")
              .attr("class", "section");

      var toggleDirectionsLink = tripDesc.append("a")
        .attr("class", "toggle-directions")
        .html("Show directions")
        .call(makeToggle, directionsPanel, "Hide directions");

      var originSection = originColumn.append("div")
        .attr("class", "origin-field section");

      originSection.append("h3")
        .attr("class", "title")
        .html(this.options.originTitle || "");

      var originLabel = originSection.append("p")
        .append("label");
      originLabel
        .append("input")
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

      var travelTime = originColumn.append("div")
        .attr("class", "travel-time section");

      travelTime.append("h3")
        .attr("class", "title")
        .html(this.options.travelTimeTitle || "");

      travelTime.append("div")
        .attr("class", "date-picker")
        .call(this._setupDatePicker, this);

      var travelMode = originColumn.append("div")
        .attr("class", "travel-mode section");

      travelMode.append("h3")
        .attr("class", "title")
        .html(this.options.travelModeTitle || "");

      travelMode.append("select")
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

      var destSection = destColumn.append("div")
        .attr("class", "destination section");

      destSection.append("h3")
        .attr("class", "title")
        .html(this.options.destTitle || "");

      this._locationsById = {};

      if (Array.isArray(this.options.destinationOptions)) {

        var destSelect = destSection.append("select")
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
            d.children.forEach(function(c) {
              that._locationsById[c.id] = c;
            });
            groups.push(d);
          } else {
            that._locationsById[d.id] = d;
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

        destSection.append("input")
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

      destSection.append("input")
        .attr("class", "submit")
        .attr("tabindex", 3)
        .attr({
          type: "submit",
          value: "Go!"
        });

      var nearbyTitle = nearbyBlock.append("h3")
        .attr("class", "title")
        .text("Nearby");

      nearbyBlock.append("div")
        .attr("class", "nearby-locations");

      destInfoBlock.append("h3")
        .attr("class", "title");
      destInfoBlock.append("address");
      destInfoBlock.append("p")
        .attr("class", "description");

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

    _setupDatePicker: function(selection, that) {

      var dateFormat = d3.time.format("%a, %b. %e, %Y"),
          now = this._travelTime || new Date();

      var datePicker = ggnpc.ui.datePicker()
            .on("month", function(month) {
              // console.log("month:", month);
              table
                .call(datePicker.month(month))
                .call(updateDays, that.getTravelTime());
            })
            .on("day", function(day) {
              datePopup.call(toggle);
              setDay(day);
            }),
          dateWrapper = selection.append("span")
            .attr("class", "date"),
          dateButton = dateWrapper.append("a")
            .attr("class", "date-toggle")
            .text(dateFormat(now))
            .on("click", function() {
              d3.event.preventDefault();
              datePopup.call(toggle);
            }),
          datePopup = dateWrapper.append("div")
            .style("display", "none")
            .attr("class", "popup"),
          table = datePopup.append("table")
            .attr("class", "calendar")
            .call(datePicker)
            .call(updateDays, now),
          timeWrapper = selection.append("span")
            .attr("class", "time"),
          hourSelect = timeWrapper.append("select")
            .attr("class", "hour")
            .attr("name", "hour")
            .on("change", function() {
              setTime(+this.options[this.selectedIndex].value, null);
            }),
          minuteSelect = timeWrapper.append("select")
            .attr("class", "minute")
            .attr("name", "minute")
            .on("change", function() {
              setTime(null, +this.options[this.selectedIndex].value);
            });

      var currentHour = now.getHours(),
          minuteStep = 15,
          currentMinute = quantize(now.getMinutes(), minuteStep),
          minuteFormat = d3.format("02");
      hourSelect.selectAll("option")
        .data(d3.range(0, 24))
        .enter()
        .append("option")
          .attr("value", function(h) { return h; })
          .text(function(h) {
            var a = h >= 12 ? "pm" : "am";
            return h > 12
              ? (h - 12) + a
              : h + a;
          })
          .attr("selected", function(h) {
            return h === now.getHours()
              ? "selected"
              : null;
          });

      minuteSelect.selectAll("option")
        .data(d3.range(0, 60, minuteStep))
        .enter()
        .append("option")
          .attr("value", function(m) { return m; })
          .text(function(m) {
            return ":" + minuteFormat(m);
          })
          .attr("selected", function(m) {
            return m === currentMinute
              ? "selected"
              : null;
          });

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

      function setTime(hour, minute) {
        var d = that.getTravelTime();
        if (!isNaN(hour)) d.setHours(hour);
        if (!isNaN(minute)) d.setMinutes(minute);
        that.setTravelTime(d);
      }

      function setDay(day) {
        var now = that.getTravelTime(),
            then = new Date(day.getTime());
        then.setHours(now.getHours());
        then.setMinutes(now.getMinutes());

        dateButton
          .text(dateFormat(then));

        that.setTravelTime(then);

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

    },

    getOrigin: function() {
      return this._request.origin;
    },

    setOrigin: function(origin) {
      if (origin != this._request.origin) {
        this._request.origin = origin;
        d3.select(this.root)
          .classed("has-origin", !!origin);
        google.maps.event.trigger(this, "origin", origin);
      }
      return this;
    },

    getDestination: function() {
      return this._request.destination;
    },

    getDestinationString: function(dest) {
      if (!dest) dest = this.getDestination();
      return (typeof dest === "string")
        ? dest
        : [dest.title, dest.id].join(":");
    },

    setDestination: function(dest) {
      if (dest != this._request.destination) {
        this._request.destination = this._resolveDestination(dest);
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
      }
      return this;
    },

    getTravelMode: function(mode) {
      return this._request.travelMode;
    },

    setTravelMode: function(mode) {
      if (mode != this._request.travelMode) {
        this._request.travelMode = mode.toUpperCase();
        google.maps.event.trigger(this, "travelMode", this._request.travelMode);
      }
      return this;
    },

    getTravelTime: function() {
      return this._travelTime;
    },

    setTravelTime: function(time) {
      if (time != this._travelTime) {
        this._travelTime = this._coerceDate(time);
        google.maps.event.trigger(this, "travelTime", this._travelTime);
      }
      return this;
    },

    route: function(callback) {
      this._clearRoute();

      var request = utils.extend({}, this._request);
      if (typeof request.destination === "object") {
        request.destination = this._getObjectLocation(request.destination);
      }

      if (!isNaN(this._travelTime)) {
        request.transitOptions = {
          departureTime: this._travelTime
        };
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

      var that = this,
          root = d3.select(this.root)
            .classed("routed", false)
            .classed("routing", true);

      this.directions.route(request, function(response, stat) {
        root
          .classed("routed", true)
          .classed("routing", false);

        if (stat === google.maps.DirectionsStatus.OK) {
          that._updateRoute(response, request);
          if (callback) callback(null, response);
        } else {
          google.maps.event.trigger(this, "error", response);
          if (callback) callback(response, null);
        }
      });
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
      return obj.location;
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
        .selectAll(".title, address, .description")
          .text("");

      // this.originMap.directionsDisplay.setDirections(null);
      // this.destMap.directionsDisplay.setDirections(null);
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

      this.originMap.directionsDisplay.setDirections(response);
      this.originMap.setZoom(this.options.originMap.zoom || 15);
      var bounds = utils.getLatLngBounds(start, end);
      this.originMap.fitBounds(bounds);

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

      console.log("link params:", params);

      var links = linkRoot.selectAll("a.custom")
        .data([
          {html: "View in Google Maps"}
        ])
        .enter()
        .append("a")
          .attr("class", "custom")
          .attr("target", "_blank")
          .html(function(d) { return d.html; })
          .attr("href", function(d) {
            var p = utils.extend({}, params, d.params);
            return that._getGoogleMapsUrl(p);
          });
    },


    _updateDestinationInfo: function(dest, address) {
      var info = d3.select(this.root)
        .select(".dest-info");

      console.log("destination info:", dest);

      if (typeof dest === "object") {
        info.select(".title")
          .text(dest.title);
        info.select(".description")
          .text(dest.description);
      } else {
        info.select(".title")
          .text(dest);
        info.select(".desc")
          .text("");
      }

      info.select("address")
        .text(address);
    },

    _updateNearbyLocations: function() {
      var dest = this.getDestination(),
          that = this,
          loc = d3.select(this.root).select(".nearby-locations")
            .selectAll(".location")
            .data(dest.nearby || []);

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
            .call(planner.BespokeDirections.augmentGoogleDisplay, dest.bespoke_directions);
        }, 100);
        return true;
      }

      return false;
    },

    getLocationById: function(id) {
      return this._locationsById[id];
    },

    _hasDestination: function(dest) {
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
    // XXX get the apiUrl from Map.defaults
    apiUrl: ggnpc.maps.Map.defaults.apiUrl,
    locationTypes: ["Access", "Trailhead", "Visitor Center"],
    groupByPark: true,
    nearbyThreshold: 1, // miles
    nearbyTypes: ["Restroom", "Cafe", "Visitor Center", "Trailhead"],
    nearbyTypeCounts: {
      "Restroom": 1,
      "Cafe": 1,
      "Visitor Center": 1,
      "Trailhead": 2
    }
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

          var locations = data.results.map(that._getAttibutes),
              allLocations = locations.slice();

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
                  ? allLocations.filter(function(d) {
                    return nearbyTypes.indexOf(d.parklocationtype) > -1;
                  })
                  : allLocations.slice();

            // give each nearby candidate a google.maps.LatLng
            nearbyCandidates.forEach(function(d) {
              d.latlng = utils.coerceLatLng(d.location);
            });

            var collateNearbyLocatons = function(nearby, debug) {
              if (nearby.length === 0) return nearby;

              if (debug) console.log(nearby.length, "nearby locations");

              var byType = d3.nest()
                .key(function(d) { return d.parklocationtype; })
                .sortValues(function(a, b) {
                  return d3.ascending(a._dist, b._dist);
                })
                .map(nearby);

              if (options.nearbyTypeCounts) {
                for (var type in options.nearbyTypeCounts) {
                  var len = options.nearbyTypeCounts[type];
                  if (type in byType) {
                    byType[type] = byType[type].slice(0, len);
                  }
                }
              }

              if (debug) console.log("nearby by type:", byType);

              var collated = [];
              d3.values(byType).forEach(function(typeList) {
                collated = collated.concat(typeList);
              });

              if (debug) console.log("collated:", collated.map(function(d) { return d.parklocationtype; }));

              collated.sort(function(a, b) {
                return d3.ascending(a._dist, b._dist);
              });

              if (nearbyLimit) {
                collated = collated.slice(0, nearbyLimit);
              }

              return collated;
            };

            // assign a nearby[] array to each location based on distance from
            // it to the other locations
            locations.forEach(function(d) {
              var a = d.latlng || (d.latlng = utils.coerceLatLng(d.location)),
                  nearby = nearbyCandidates
                    .filter(function(b) {
                      return b != d &&
                        (b._dist = utils.distanceInMiles(a, b.latlng)) <= nearbyThreshold;
                    });
              d.nearby = collateNearbyLocatons(nearby, false);
            });
          }

          if (options.groupByPark) {
            locations = d3.nest()
              .key(function(d) { return d.relatedpark; })
              .entries(locations)
              .map(function(d) {
                if (!parksById[d.key]) console.warn("bad park id:", d.key);
                return (d.values.length > 1 && parksById[d.key])
                  ? utils.extend({}, parksById[d.key], {
                      children: d.values.sort(that._sortByTitle)
                    })
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

  function quantize(n, f) {
    return f * Math.round(n / f);
  }

  function makeToggle(selection, target, activeText) {
    var offText = selection.html();

    selection
      .classed("toggle", true)
      .on("click", function() {
        d3.event.preventDefault();

        var that = d3.select(this),
            active = !that.classed("active");
        that.classed("active", active);

        if (active && activeText) that.html(activeText);
        else if (!active && offText) that.html(offText);

        target.style("display", active ? null : "none");
      });

    target.style("display", selection.classed("active") ? null : "none");
  }

})(this);
