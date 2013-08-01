parks-conservancy
=================

Redesign of the interactive map used on
[parksconservancy.org](http://www.parksconservancy.org/) Parks for all forever!

## Branches

* [`master`](https://github.com/stamen/parks-conservancy) - you're looking at it.
* [`www`](https://github.com/stamen/parks-conservancy/tree/www) - site
  templates for testing in situ.
* [`basemap`](https://github.com/stamen/parks-conservancy/tree/basemap) - Basemap.
* [`data`](https://github.com/stamen/parks-conservancy/tree/data) - Data import scripts.
* [`api`](https://github.com/stamen/parks-conservancy/tree/api) - Convio API
  wrapper.

To clone a specific branch (to prevent having to switch branches when working
on different components), use:

```bash
git clone git@github.com:stamen/parks-conservancy.git -b <branch> parks-conservancy-<branch>
```

## Heroku Apps

* stamen-parks-staging - http://staging.parks.stamen.com/ - site templates
  (staging)
* stamen-parks-dev - http://dev.parks.stamen.com/ - site templates (dev)
* stamen-parks-api-staging - Convio API wrapper (staging)

## Heroku Databases

* `HEROKU_POSTGRESQL_COBALT` (see stamen-data for the connection string)
