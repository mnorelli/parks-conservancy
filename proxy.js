var http = require("http"),
    httpProxy = require("http-proxy"),
    connect = require("connect"),
    proxyPort = 8000,
    proxyTarget = {
      host: "www.parksconservancy.org",
      port: 80
    },
    filePattern = new RegExp("^/map/(.*)$"),
    filePath = __dirname + "/www",
    fileTarget = {
      host: "localhost",
      port: 8001
    },
    options = {
      changeOrigin: true
    },
    injection = '\n<script src="/map/inject.js"></script>';

console.log("+ proxying requests from:", proxyTarget.host);

/*
 * our proxy server either:
 * 1. serves up static assets from www/ if the path matches /map/*, or
 * 2. proxies requests from parksconservancy.org and modifies HTML output
 *    to include the injection payload.
 */
var proxyServer = httpProxy
  .createServer(options, function(req, res, proxy) {
    console.log("  -", req.url);
    // if the request URL matches our file pattern...
    var match = req.url.match(filePattern);
    if (match) {
      // then proxy it through our static file server
      proxy.proxyRequest(req, res, fileTarget);
    } else {
      // otherwise, proxy it from parksconservancy.org
      proxy.proxyRequest(req, res, proxyTarget);

      // and add the proxyResponse listener to inject our payload
      // if the response has an HTML content-type
      if (proxy.listeners("proxyResponse").length === 0) {
        proxy.on("proxyResponse", function(req, res, response) {
          // ignore "local" requests
          if (req.local) return;
          var type = response.headers["content-type"],
              html = type ? type.match(/html/) : false;
          if (html) {
            // this is kind of tricky... we monkey patch res.write
            // to write our payload to the end of the response body
            var _end = res.end;
            res.end = function() {
              this.write(injection);
              return _end.apply(this, arguments);
            };
          }
        });
      }
    }
  })
  .listen(proxyPort);

console.log("+ serving static files from:", filePath);

/*
 * our static file server rewrites the request path like so
 * (URI -> file path):
 *
 * /map/(.*) -> www/$1
 */
var serveStatic = connect.static(filePath),
    fileServer = connect()
      .use(function(req, res) {
        var match = req.url.match(filePattern),
            path = match[1];
        console.log("  *", req.url, "->", path);
        req.url = "/" + path;
        // flag this request as local so we don't rewrite it
        req.local = true;
        return serveStatic.apply(this, arguments);
      })
      .listen(fileTarget.port);
