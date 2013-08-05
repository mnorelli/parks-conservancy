parks-conservancy
=================

Markup for Parks Conservancy HTML components.

## Views

Views live in `views/` and only consist of HTML fragments:

```html
<a class="fancybox fancybox.iframe" href="http://www.mapsportal.org/ggnpc/finder/?controls=1&customize=1&thumbmap=1&layers=places-park&cluster=1"><img src="http://www.parksconservancy.org/assets/images/ggnpc-map-sidebar.jpg" alt="Map" width="220" height="300" /></a>
```

## Layouts

Layouts live in `views/layouts/` and can be wrapped around views (in
`views/`) by specifying routes as:

```javascript
app.get("/visit/park-sites/muir-woods-national-monument.html", function(req, res) {
  return res.render("muwo.html.ejs", {
    layout: "layouts/park-site.html.ejs"
  });
});
```

Layouts inject view content by looking for `<%- body -%>` (which will render
the content of the `body` local at that point; view content is provided to its
corresponding layout as `body`).

## Static Assets

Anything under `public/` will be served up statically.  E.g.,
`public/css/site.css` will be available at http://localhost:8080/css/site.css.

## Starting (locally)

```bash
npm start
open http://localhost:8080/
open http://localhost:8080/visit/park-sites/muir-woods-national-monument.html
```

## Deployment Setup

```bash
git remote add development git@heroku.com:stamen-parks-dev.git
git remote add staging git@heroku.com:stamen-parks-staging.git
```

## Deployment

### Development

This will push the templates to http://dev.parks.stamen.com/

```bash
git push development www:master
```

### Staging

This will push the templates to http://staging.parks.stamen.com/

```bash
git push staging www:master
```

## Heroku Environment Variables

Banner to display current environment context relies on Heroku, PARKS_ENV, environment variable

```bash
heroku config:set PARKS_ENV=development --app stamen-parks-dev
heroku config:set PARKS_ENV=staging --app stamen-parks-staging
```


### Current available layouts

Index - [staging](http://staging.parks.stamen.com/) | [development](http://dev.parks.stamen.com/)

Single Park - [staging](http://staging.parks.stamen.com/visit/park-sites/muir-woods-national-monument.html) | [development](http://dev.parks.stamen.com/visit/park-sites/muir-woods-national-monument.html)

County Projects - [staging](http://staging.parks.stamen.com/park-improvements/current-projects/marin/) | [development](http://dev.parks.stamen.com/park-improvements/current-projects/marin/)

Single Project - [staging](http://staging.parks.stamen.com/park-improvements/current-projects/marin/redwood-creek.html) | [development](http://dev.parks.stamen.com/park-improvements/current-projects/marin/redwood-creek.html)

Events List - [staging](http://staging.parks.stamen.com/get-involved/volunteer/upcoming-events/) | [development](http://dev.parks.stamen.com/get-involved/volunteer/upcoming-events/)

Single Event - [staging](http://staging.parks.stamen.com/events/volunteer-events/special-events/california-coastal-cleanup.html) | [development](http://dev.parks.stamen.com/events/volunteer-events/special-events/california-coastal-cleanup.html)






