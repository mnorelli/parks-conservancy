(function(exports) {

  // locate or create the parks global namespace
  var ggnpc = exports.GGNPC || (exports.GGNPC = {});

  var injector = ggnpc.injector = {
    version: "0.0.1",
    script: null,
    baseUrl: null,
    defaultParams: {
    },
    prereqs: [
      /*
      // FIXME: make preloading google maps work!
      {
        uri: "//maps.googleapis.com/maps/api/js?v=3.pre&amp;libraries=geometry&sensor=false",
        wait: function(callback) {
          google.maps.event.addDomListener(window, 'load', callback);
        }
      },
      */
      "js/vendor/aight.min.js",
      "js/ggnpc-map.js",
      "styles/ggnpc-map.css"
    ],
    routes: [
      {
        name: "trip-planner",
        prereqs: [
          "js/vendor/d3.v3.min.js",
          "js/ggnpc-utils.js",
          "js/ggnpc-planner.js",
          "planner/css/style.css"
        ],
        pattern: new RegExp("/planner(/|.html)$"),
        run: function(options) {
          GGNPC.planner.TripPlanner.inject(options);
        }
      },
      {
        pattern: new RegExp("/locations/(\w+).html$"),
        run: function(options) {
          // mini-map?
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
   * 4. If a route is found, load all of the files in both injector.prereqs and
   *    route.prereqs.
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

    var loaded = 0,
        prereqs = injector.prereqs;
    if (route.prereqs) {
      prereqs = prereqs.concat(route.prereqs);
    }

    injector.preloadAll(prereqs, function() {
      if (route) {
        route.run(options, callback);
      } else {
        if (callback) callback("No route found");
      }
    });
  };

  injector.preloadAll = function(uris, callback) {
    var loading = uris.slice();
    next();

    function next() {
      if (loading.length === 0) return callback();
      var uri = loading.shift();
      if (typeof uri === "object") {
        var url = injector.getUrl(uri.uri);
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
          match = hostUri.match(route.pattern);
      if (match) {
        route.match = match;
        return route;
      }
    }
    return null;
  };

  injector.getRouteByName = function(name) {
    var found;
    forEach(injector.routes, function(route) {
      if (!found && route.name === name) {
        found = route;
      }
    });
    return found;
  };

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

  injector.getQueryString = function(uri) {
    if (uri.indexOf("?") > -1) {
      var query = uri.split("?").pop();
      return qs.parse(query);
    }
    return null;
  };

  injector.preload = function(url, callback) {
    // check the filename extension
    var filename = url.split("?").shift(),
        delim = (filename.lastIndexOf("/") > filename.lastIndexOf("."))
          ? "/"
          : ".",
        ext = filename.split(delim).pop();
    console.log(url, "ext:", ext);
    switch (ext) {
      case "js":
        return injector.preloadJS(url, callback);
      case "css":
        return injector.preloadCSS(url, callback);
      default:
        throw "Unrecognized preload extension: ." + ext;
    }
  };

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

  // see: http://www.backalleycoder.com/2011/03/20/link-tag-css-stylesheet-load-event/
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

  injector.coerceElement = function(element) {
    if (typeof element === "object") {
      return element;
    } else if (element.match(/^[a-z]/i)) {
      return document.getElementById(element);
    } else {
      return document.querySelector(element);
    }
  };

  injector.merge = function(obj, other) {
    forEach([].slice.call(arguments, 1), function(other) {
      if (!other) return;
      for (var key in other) {
        obj[key] = other[key];
      }
    });
    return obj;
  };

  injector.getBaseUrl = function(url) {
    if (!url) return "";
    var parts = url.split("/");
    parts.pop();
    return parts.join("/");
  };

  // stupid IE8.
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

  injector.script = injector.getSelfScript("inject.js");
  injector.baseUrl = injector.getBaseUrl(injector.script.src);

  injector.init();

})(this);
