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
