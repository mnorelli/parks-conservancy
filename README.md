# Parks Conservancy Map and Data

## Map

To setup the project for the first time, run `make install`. This will cause
the basemap to show up within TileMill.

## Data

To load data (missing source files will be downloaded automatically), run `make
data`. Careful, though, as it may already be loaded.

### Prerequisites

* `curl`
* `7z`
* `gdal` (w/ FileGDB support)
* `osm2pgsql`
* `psql`
