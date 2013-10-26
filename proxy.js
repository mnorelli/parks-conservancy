var express = require("express"),
    request = require("request"),
    injection = [
      '\n<script src="/map/inject.js"></script>',
      '\n<script src="/map/nav.js"></script>'
    ].join("");

var app = express();
app.use("/map", express.static(__dirname + "/www"));
app.use(function(req, res, next) {
  var headers = req.headers;
  headers.Host = "www.parksconservancy.org";

  // ensure we don't get a compressed response
  delete headers["accept-encoding"];

  return request[req.method.toLowerCase()]({
    headers: headers,
    uri: "http://www.parksconservancy.org" + req.url,
    encoding: "utf8"
  }, function(error, response, body) {
    if (error) {
      return res.send(503);
    }

    res.status(response.statusCode);

    Object.keys(response.headers).forEach(function(header) {
      if (["connection", "content-encoding", "transfer-encoding"].indexOf(header) < 0) {
        res.set(header, response.headers[header]);
      }
    });

    body = body.replace("</body>", injection + "</body>");

    return res.send(body);
  });
});
app.listen(process.env.PORT || 8000, function() {
  console.log("+ listening on port:", this.address().port);
});
