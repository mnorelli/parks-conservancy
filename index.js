"use strict";

var express = require("express"),
    partials = require("express-partials"),
    app = express();

app.use(partials());

app.configure("production", function() {
  // add some cache headers
  app.use(function(req, res, next) {
    res.set("Cache-Control", "public,max-age=300,stale-while-revalidate=300,stale-if-error=300");

    next();
  });
});

app.use(express.static(__dirname + "/public"));

app.get("/", function(req, res) {
  return res.render("index.html.ejs", {
    layout: "layouts/index.html.ejs"
  });
});

app.get("/visit/park-sites/muir-woods-national-monument.html", function(req, res) {
  return res.render("muwo.html.ejs", {
    layout: "layouts/park-site.html.ejs"
  });
});

app.listen(process.env.PORT || 8080, function() {
  console.log("Listening at http://%s:%d/", this.address().address, this.address().port);
});
