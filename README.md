# Parks Conservancy Map

![map thumbnail](https://github.com/stamen/parks-conservancy/raw/basemap/.thumb.png)

To set the project up for the first time, run `make install`. This will cause
the basemap to show up within TileMill and will configure git hooks so that
`project.mml` will be rebuilt when the project is updated.

## Data Dependencies

* `sql/zoom.sql`

See the `Makefile` in the [`data`
branch](https://github.com/stamen/parks-conservancy/tree/data) to load data.

## Dependencies

* [node.js](http://nodejs.org/)
* `make` (this is available as part of Xcode's Command Line Tools)
* [TileMill](http://www.mapbox.com/tilemill/)
