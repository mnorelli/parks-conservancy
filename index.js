"use strict";

var express = require("express"),
    partials = require("express-partials"),
    app = express();

app.use(express.logger());
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
  res.locals.st_nocache = 200;
  return res.render("index.html.ejs", {
    layout: "layouts/index.html.ejs"
  });
});

app.get("/visit/park-sites/muir-woods-national-monument.html", function(req, res) {
  return res.render("muwo.html.ejs", {
    layout: "layouts/park-site.html.ejs"
  });
});

app.get("/park-improvements/current-projects/marin/", function(req, res) {
  return res.render("countyprojects.html.ejs", {
    layout: "layouts/projects-county.html.ejs"
  });
});

app.get("/park-improvements/current-projects/marin/redwood-creek.html", function(req, res) {
  return res.render("project-rcmu.html.ejs", {
    layout: "layouts/projects-project.html.ejs"
  });
});

app.get("/get-involved/volunteer/upcoming-events/", function(req, res) {
  return res.render("events.html.ejs", {
    layout: "layouts/events.html.ejs"
  });
});

app.get("/events/volunteer-events/special-events/california-coastal-cleanup.html", function(req, res) {
  return res.render("event-cccd.html.ejs", {
    layout: "layouts/events-event.html.ejs"
  });
});

app.listen(process.env.PORT || 8080, function() {
  console.log("Listening at http://%s:%d/", this.address().address, this.address().port);
});
