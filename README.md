# Parks Conservancy Map

![map thumbnail](https://github.com/stamen/parks-conservancy/raw/basemap/.thumb.png)

To set the project up for the first time, run `make install`. This will cause
the basemap to show up within TileMill and will configure git hooks so that
`project.mml` will be rebuilt when the project is updated.

## Deploying

[map.parks.stamen.com](http://map.parks.stamen.com) is fronted by Varnish (part
of the parks-aws@stamen.com AWS account; credentials are in Mitro).  It's
ec2-50-17-97-174.compute-1.amazonaws.com, aka map.parks.stamen.com.  To log in,
use the `parks-conservancy-us-east-1.pem` keypair (`in studio.local:~seanc/`)
to log in as Ubuntu:

```bash
ssh -i ~/.ssh/parks-conservancy-us-east-1.pem ubuntu@map.parks.stamen.com
```

Varnish fronts S3 (bucket: tiles.parksconservancy.org, also in
parks-aws@stamen.com's AWS account) and falls back to
stamen-parks-tp.herokuapp.com (git@heroku.com:stamen-parks-tp.git /
https://github.com/mojodna/tp).

stamen-parks-tp fronts stamen-parks-map.herokuapp.com
(git@heroku.com:stamen-parks-map.git /
https://github.com/stamen/parks-conservancy/tree/basemap). 'tp asks
stamen-parks-map to render tiles and uploads them into S3 for Varnish to fetch
when objects fall out of cache.  (Use `heroku config` to see the AWS
credentials in use.)

stamen-parks-map is the map.  It uses the Heroku Mapnik / tile serving
buildpack and responds to all requests by rendering (i.e. it does not cache).

So...

Deploying a new version of the map (currently) involves the following steps:

1. Push from parks-conservancy#basemap to stamen-parks-map after updating:

```bash
$ git push heroku basemap:master
```

2. Purge S3 from stamen-parks-tp:

```bash
$ foreman run node bin/purge.js
```

3. Purge Varnish's cache:

```bash
you@your $ ssh -i ~/.ssh/parks-conservancy-us-east-1.pem ubuntu@map.parks.stamen.com
ubuntu@map $ sudo varnishadm
varnish> ban.url .
ubuntu@map $ sudo varnishstat
```

It's important that things be done in this order so that new map tiles will
replace old ones at each cache tier.

`varnishstat` (`sudo varnishstat` on map.parks) can be used to monitor the
process.  `cache_hit` should increase when panning around areas that are known
to be cached.  After running `ban.url .`, cache_miss should start increasing as
it requests updated tiles from stamen-parks-map.

'tp sets max-age to 5 minutes so that we can see updated tiles in relatively
short order after deploying them.  If you're not seeing them (or are seeing a
mixture of new and old), try emptying your browser cache (I was briefly caching
for a month while debugging Varnish).

## Seeding

`node ../bin/seed.js -b="-123.640 36.791 -121.025 38.719" -z 10 -Z 14`

Focused extent, covering park most park areas:

`-122.7177 37.4828 -122.3538 37.9543`

## Data Dependencies

* `sql/zoom.sql`

See the `Makefile` in the [`data`
branch](https://github.com/stamen/parks-conservancy/tree/data) to load data.

## Dependencies

* [node.js](http://nodejs.org/)
* `make` (this is available as part of Xcode's Command Line Tools)
* [TileMill](http://www.mapbox.com/tilemill/)
