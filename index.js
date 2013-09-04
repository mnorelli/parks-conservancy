"use strict";

var express = require("express"),
    partials = require("express-partials"),
    app = express();


var getEnvironmentUrl = function(){
  var environment = process.env.PARKS_ENV || null;

  var environmentBaseUrl = 'http://0.0.0.0:8080';

  if (environment && environment == 'staging') {
      environmentBaseUrl = 'http://staging.parks.stamen.com';
  }else if(environment && environment == 'development'){
      environmentBaseUrl = 'http://dev.parks.stamen.com';
  } else {
      environmentBaseUrl = 'http://0.0.0.0:8080';
  }

  return environmentBaseUrl;
}


//app.use(express.logger());
app.use(partials());

app.configure("production", function() {
  // add some cache headers
  app.use(function(req, res, next) {
    res.set("Cache-Control", "public,max-age=300,stale-while-revalidate=300,stale-if-error=300");
    next();
  });
});

app.use(express.static(__dirname + "/public"));

app.get("/about", function(req, res) {
  return res.render("index.html.ejs", {
    layout: "layouts/maps-list.html.ejs",
    environment: process.env.PARKS_ENV,
    environmentBaseUrl: getEnvironmentUrl(),
    title: 'About Context :: Golden Gate National Parks Conservancy'
  });
});

app.get("/", function(req, res) {
  return res.render("index.html.ejs", {
    layout: "layouts/index.html.ejs",
    environment: process.env.PARKS_ENV,
    environmentBaseUrl: getEnvironmentUrl(),
    title: 'Homepage :: Golden Gate National Parks Conservancy'
  });
});

app.get("/map", function(req, res) {
  return res.render("index.html.ejs", {
    layout: "layouts/map.ejs",
    environment: process.env.PARKS_ENV,
    environmentBaseUrl: getEnvironmentUrl(),
    title: "Map"
  });
});

app.get("/visit/park-sites/:filename", function(req, res) {
  return res.render("index.html.ejs", {
    layout: "layouts/basic.ejs",
    environment: process.env.PARKS_ENV,
    environmentBaseUrl: getEnvironmentUrl(),
    title: req.params['filename']
  });
});

app.get("/events/:filename", function(req, res) {
  return res.render("index.html.ejs", {
    layout: "layouts/basic.ejs",
    environment: process.env.PARKS_ENV,
    environmentBaseUrl: getEnvironmentUrl(),
    title: req.params['filename']
  });
});

app.get("/location/:filename", function(req, res) {
  return res.render("index.html.ejs", {
    layout: "layouts/basic.ejs",
    environment: process.env.PARKS_ENV,
    environmentBaseUrl: getEnvironmentUrl(),
    title: req.params['filename']
  });
});

app.get("/learn/:filename", function(req, res) {
  return res.render("index.html.ejs", {
    layout: "layouts/basic.ejs",
    environment: process.env.PARKS_ENV,
    environmentBaseUrl: getEnvironmentUrl(),
    title: req.params['filename']
  });
});

app.get("/learn/community-programs/:filename", function(req, res) {
  return res.render("index.html.ejs", {
    layout: "layouts/basic.ejs",
    environment: process.env.PARKS_ENV,
    environmentBaseUrl: getEnvironmentUrl(),
    title: req.params['filename']
  });
});

app.get("/conservation/plants-animals/endangered-species/:filename", function(req, res) {
  return res.render("index.html.ejs", {
    layout: "layouts/basic.ejs",
    environment: process.env.PARKS_ENV,
    environmentBaseUrl: getEnvironmentUrl(),
    title: req.params['filename']
  });
});

app.get("/park-improvements/current-projects/:filename", function(req, res) {
  return res.render("index.html.ejs", {
    layout: "layouts/basic.ejs",
    environment: process.env.PARKS_ENV,
    environmentBaseUrl: getEnvironmentUrl(),
    title: req.params['filename']
  });
});

/*



app.get("/visit/park-sites/muir-woods-national-monument.html", function(req, res) {
  return res.render("muwo.html.ejs", {
    layout: "layouts/park-site.html.ejs",
    environment: process.env.PARKS_ENV
  });
});

app.get("/park-improvements/current-projects/marin/", function(req, res) {
  return res.render("countyprojects.html.ejs", {
    layout: "layouts/projects-county.html.ejs",
    environment: process.env.PARKS_ENV
  });
});

app.get("/park-improvements/current-projects/marin/redwood-creek.html", function(req, res) {
  return res.render("project-rcmu.html.ejs", {
    layout: "layouts/projects-project.html.ejs",
    environment: process.env.PARKS_ENV
  });
});

app.get("/get-involved/volunteer/upcoming-events/", function(req, res) {
  return res.render("events.html.ejs", {
    layout: "layouts/events.html.ejs",
    environment: process.env.PARKS_ENV
  });
});

app.get("/events/volunteer-events/special-events/california-coastal-cleanup.html", function(req, res) {
  return res.render("event-cccd.html.ejs", {
    layout: "layouts/events-event.html.ejs",
    environment: process.env.PARKS_ENV
  });
});
*/

app.get('*', function(req, res, next){
  res.redirect('/');
});


app.listen(process.env.PORT || 8080, function() {
  console.log("Listening at http://%s:%d/", this.address().address, this.address().port);
});
