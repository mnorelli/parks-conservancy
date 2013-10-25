(function(exports) {
  // locate or create the parks global namespace
  var ggnpc = exports.GGNPC || (exports.GGNPC = {});

  var injector = ggnpc.injector = {
    version: "0.1.0",
    script: null,
    baseUrl: null,
    defaultParams: {
    },
    reqs: [
      {
        // XXX we can't use the client ID here because the Business account
        // doesn't allow access on our Heroku domains...
        // url: "http://maps.googleapis.com/maps/api/js?client=gme-goldengatenational&sensor=false&v=3.13&libraries=geometry&async=2&callback=GGNPC.injector.mapsCallback",
        url: "http://maps.googleapis.com/maps/api/js?sensor=false&v=3.13&libraries=geometry&async=2&callback=GGNPC.injector.mapsCallback",
        wait: function(callback) {
          GGNPC.injector.mapsCallback = callback;
        }
      },
      "js/vendor/aight.min.js",
      "js/ggnpc-utils.js",
      "js/ggnpc-map.js"
      // "styles/ggnpc-map.css"
    ],
    routes: [

      {
        name: "trip-planner",
        reqs: [
          "js/vendor/d3.v3.min.js",
          "js/ggnpc-api.js",
          "css/ggnpc-planner.css",
          "js/ggnpc-planner.js",
          "js/ggnpc-ui.js"
        ],
        // path: new RegExp("/planner(/|.html)?$"),
        path: "/mapping/trip-planner.html",
        options: {
          root: "#page_content"
        },
        run: function(options) {
          GGNPC.planner.TripPlanner.inject(options);
        }
      },

      {
        name: "big-map",
        reqs: [
          "js/vendor/d3.v3.min.js",
          "js/vendor/geojson.js",
          "css/ggnpc-big-map.css"
        ],
        // path: new RegExp("/planner(/|.html)?$"),
        path: "/mapping/big-map.html",
        options: {
          root: "#big-map"
        },
        run: function(options) {
          GGNPC.maps.BigMap.inject(options);
        }
      },

      // this is the "default" route that runs for all other pages
      {
        name: "default",
        reqs: [
          "js/vendor/d3.v3.min.js",
          "js/vendor/geojson.js",
          "css/ggnpc-mini-map.css"
        ],
        path: /.*/,
        options: {
          mini: "#sidebar-map"
        },
        run: function(options) {
          // note that MiniMap.inject() will bail if it can't find
          // its root node (options.mini = "#sidebar-map")
          GGNPC.maps.MiniMap.inject(options);
        }
      }

    ]
  };

  /*
   * This is the injection function, which is run at the bottom of this file.
   * Here's what it does:
   *
   * 1. Gather the script (injector.js's <script> src query string) and host
   *    (location.search) parameters, and merge those together into an
   *    "options" object. These are stashed in injector.options, and passed to
   *    route.run() as the first argument.
   * 2. Look for a "route" key in the options object, and if found use that to
   *    find the named route. Otherwise, look for a route that matches the host
   *    URI (location.pathname).
   * 3. If no route is found, bail.
   * 4. If a route is found, load all of the files in both injector.reqs and
   *    route.reqs.
   * 5. When done loading prerequisites, call route.run() with the options and
   *    the optional callback as its arguments.
   *
   * If a route is found, it's stored in injector.route.
   */
  injector.init = function(callback) {
    var scriptUri = injector.script.src,
        scriptParams = injector.getQueryString(scriptUri),
        hostUri = location.pathname,
        hostParams = qs.parse(location.search.substr(1)),
        options = injector.merge({}, injector.defaultParams, scriptParams, hostParams);

    injector.options = options;

    var route = options.route
        ? injector.getRouteByName(options.route)
        : injector.getRouteByUri(hostUri);
    // console.log("route:", route);
    if (!route) {
      if (callback) callback("No route found");
      return;
    }

    // remember the route for later
    injector.route = route;

    if (route.options) {
      options = injector.merge({}, route.options, options);
    }

    var loaded = 0,
        reqs = injector.reqs;
    if (route.reqs) {
      reqs = reqs.concat(route.reqs);
    }

    injector.preloadAll(reqs, function() {
      if (route) {
        route.run(options, callback);
      } else {
        if (callback) callback("No route found");
      }
    });
  };

  /*
   * Preload all uris (or spec objects) in the list sequentially, and call
   * callback() when done.
   *
   * FIXME this always advances through the list if a preload fails. Should we
   * error out early here?
   */
  injector.preloadAll = function(uris, callback) {
    var loading = uris.slice();
    next();

    function next() {
      if (loading.length === 0) return callback();
      var uri = loading.shift();
      if (typeof uri === "object") {
        var url = injector.getUrl(uri.url);
        injector.preload(url, function() {
          uri.wait(next);
        });
      } else {
        var url = injector.getUrl(uri);
        injector.preload(url, next);
      }
    }
  };

  // get an URL relative to injector.baseUrl
  injector.getUrl = function(uri) {
    if (uri.indexOf("//") > -1) return uri;
    return injector.baseUrl
      ? [injector.baseUrl, uri].join("/")
      : uri;
  };

  // get a route matching the specified hostUri
  injector.getRouteByUri = function(hostUri) {
    var routes = injector.routes;
    for (var i = 0; i < routes.length; i++) {
      var route = routes[i],
          match = (route.path instanceof RegExp)
            ? hostUri.match(route.path)
            : hostUri.indexOf(route.path) > -1;
      if (match) {
        route.match = match;
        return route;
      }
    }
    return null;
  };

  // get a route by name
  injector.getRouteByName = function(name) {
    var found;
    forEach(injector.routes, function(route) {
      if (!found && route.name === name) {
        found = route;
      }
    });
    return found;
  };

  // get the injector's own <script> DOM element
  injector.getSelfScript = function(filename) {
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      var script = scripts[i],
          src = script.src,
          matches = false;
      if (filename instanceof RegExp) {
        // check for whether the regular expression matches
        matches = src.match(filename);
      } else {
        // check for whether the filename is at the end of the src
        matches = src.indexOf(filename) > -1;
      }
      if (matches) return script;
    }
  };

  // extract and parse the query string from a URL/URI
  injector.getQueryString = function(uri) {
    if (uri.indexOf("?") > -1) {
      var query = uri.split("?").pop();
      return qs.parse(query);
    }
    return null;
  };

  /*
   * Preload an arbitrary URL by grabbing its file extension and calling the
   * appropriate preloader for "js" or "css". There's a special exception here
   * for the Google Maps JavaScrip API URL, which ends in "/js" instead of
   * ".js"; to deal with it, we check to see if there's a "/" later in the URL
   * than the last ".", and split on "/" to determine the extension if so.
   */
  injector.preload = function(url, callback) {
    // check the filename extension
    var filename = url.split("?").shift(),
        ext = filename.split(".").pop();
    switch (ext) {
      case "css":
        return injector.preloadCSS(url, callback);
      default:
        // XXX should we bail here?
    }
    return injector.preloadJS(url, callback);
  };

  /*
   * Preload a JavaScript URL and call the callback when loaded.
   */
  injector.preloadJS = function(url, callback) {
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.onload = function() {
      callback(null, script);
    };
    script.onerror = function(error) {
      callback(error);
    };
    head.appendChild(script);
    script.src = url;
    return script;
  };

  /*
   * Preload a CSS URL and call the callback when finished.
   *
   * This uses a hacky technique detailed here:
   * <http://www.backalleycoder.com/2011/03/20/link-tag-css-stylesheet-load-event/>
   *
   * in which we create an Image object and use its "error" handler to register
   * the callback, since <link> elements don't dispact "load" events.
   */
  injector.preloadCSS = function(url, callback) {
    var link = document.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = url;

    head.appendChild(link);

    var img = new Image();
    img.onerror = img.onload = function(e) {
      // console.log(this, e.type);
      callback(null, link);
    };
    img.src = url;

    return link;
  };

  /*
   * Merge multiple object keys into a single object. Null objects are skipped.
   */
  injector.merge = function(obj, other) {
    forEach([].slice.call(arguments, 1), function(other) {
      if (!other) return;
      for (var key in other) {
        obj[key] = other[key];
      }
    });
    return obj;
  };

  /*
   * Derive a "base URL" from a URL by chopping off the component after the
   * last "/".
   */
  injector.getBaseUrl = function(url) {
    if (!url) return "";
    var parts = url.split("/");
    parts.pop();
    return parts.join("/");
  };

  // this is a wrapper that iterates over an array with
  // Array.prototype.forEach() if it exists (modern browsers),
  // and uses a simple for loop if not (IE8).
  var forEach = Array.prototype.forEach
    ? function(a, fn, ctx) { return a.forEach(fn, ctx); }
    : function(a, fn, ctx) {
      for (var i = 0; i < a.length; i++) {
        fn.call(ctx || this, a[i], i);
      }
    };

  /**
   * IE8-safe adapted query string parse & format:
   * <https://github.com/shawnbot/qs>
   */
  var qs={decode:function(str){str=String(str).replace(/\+/g,"%20");return decodeURIComponent(str)},encode:function(str){return encodeURIComponent(str).replace(/%2C/g,",").replace(/%3A/g,":").replace(/%3B/g,";").replace(/%20/g,"+")},parse:function(str){if(str.charAt(0)==="#"||str.charAt(0)==="?"){str=str.substr(1)}var data={},bits=str.split("&"),len=bits.length;for(var i=0;i<len;i++){var bit=bits[i];if(!bit)continue;var parts=bit.split("=",2),key=qs.decode(parts[0]),val=qs.decode(parts[1]);if(val){var num=+val;if(isNaN(num)){switch(val){case"true":val=true;break;case"false":val=false;break}}else{val=num}}if(data.hasOwnProperty(key)){if(Array.isArray(data[key])){data[key].push(val)}else{data[key]=[data[key],val]}}else{data[key]=val}}return data},format:function(data){var keys=Object.keys(data),len=keys.length,bits=[];for(var i=0;i<len;i++){var k=keys[i];if(k&&data[k]!==null||typeof data[k]!=="undefined"){bits.push([qs.encode(k),qs.encode(String(data[k]))].join("="))}}return bits.join("&")}};

  // this is where <script> and <link> elements get appended
  var head = document.getElementsByTagName("head")[0];

  // remember the script and base URL for later use
  injector.script = injector.getSelfScript("inject.js");
  injector.baseUrl = injector.getBaseUrl(injector.script.src);

  // kick off the injection
  injector.init();

})(this);
