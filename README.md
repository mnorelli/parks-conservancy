# Parks Conservancy API


## Overview

There are three main steps to getting the api working.

* Creating the XML templates in CONVIO that will populate the database

* Ingest CONVIO XML and write to database

* Writing API interface that interacts with database


## Creating or updating CONVIO XML

Notes for this process are [here](https://github.com/stamen/parks-conservancy/blob/master/Notes/Creating_XML_feed.txt)

Current XML templates/schemas are [here](https://github.com/stamen/parks-conservancy/blob/master/Notes/Templates.txt)


## Running locally

### Setup

Create a '.env' file for foreman and requires the two variables below:

```bash
DATABASE_URL='postgres://ggnpc:@localhost:5433/ggnpc'
XML_PATH='http://www.parksconservancy.org/z-testing/stamens-sandbox/stamen-xml-feed.xml'
```

### Ingest CONVIO XML feed

```bash
node index.js
```

### Starting API server

```bash
foreman start web
```


## Deployment Setup

### Add remote

```bash
git remote add api-staging git@heroku.com:stamen-parks-api-staging.git
```

### Set Environment Variables for XML

```bash
heroku config:set XML_PATH='http://www.parksconservancy.org/z-testing/stamens-sandbox/stamen-xml-feed.xml' --app stamen-parks-api-staging
```

### Pushing changes

```bash
git push api-staging api:master
```

### Ingesting CONVIO XML feed

```bash
heroku run node index.js
```

### API server

Will be running at http://stamen-parks-api-staging.herokuapp.com/


## Current API Methods & examples:

[See api.js file](https://github.com/stamen/parks-conservancy/blob/api/api.js)

Also, these blog posts:

[Simple API Demo](http://studio.stamen.com/parks_conservancy/blog/?p=645)

[API for Convio data](http://studio.stamen.com/parks_conservancy/blog/?p=631)
