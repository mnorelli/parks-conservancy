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

var proxyServer = httpProxy
  .createServer(options, function(req, res, proxy) {
    console.log("  -", req.url);
    var match = req.url.match(filePattern);
    if (match) {
      proxy.proxyRequest(req, res, fileTarget);
    } else {
      proxy.proxyRequest(req, res, proxyTarget);

      if (proxy.listeners("proxyResponse").length === 0) {
        proxy.on("proxyResponse", function(req, res, response) {
          if (req.local) return;
          var type = response.headers["content-type"],
              html = type ? type.match(/html/) : false;
          if (html) {
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

var serveStatic = connect.static(filePath),
    fileServer = connect()
      .use(function(req, res) {
        var match = req.url.match(filePattern),
            path = match[1];
        console.log("  *", req.url, "->", path);
        req.url = "/" + path;
        req.local = true;
        return serveStatic.apply(this, arguments);
      })
      .listen(fileTarget.port);
