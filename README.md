# Parks Conservancy Data

## Data

To load data (missing source files will be downloaded automatically), run `make
data`. Careful, though, as it may already be loaded.

### Prerequisites

* `curl`
* `7z`
* `gdal` (w/ FileGDB support)
* `osm2pgsql`
* `psql`

## trailheads.sql

`trailheads` is a subset of Transit & Trails trailheads combined with
GGNPC-provided "locations":

```sql
-- subset T&T trailheads by fetching those that are within 1km of
-- a GGNPC-provided trail
CREATE TABLE selected_tnt_trailheads AS (
  SELECT DISTINCT ON (name) name,
    tnt_trailheads.id,
    description,
    author_id,
    park_name,
    tnt_trailheads.geom
  FROM tnt_trailheads
  LEFT JOIN trails ON ST_DWithin(tnt_trailheads.geom, trails.geom, 1000)
  WHERE trails.ogc_fid IS NOT NULL
);

CREATE TABLE trailheads(
  id SERIAL,
  tnt_id INTEGER,
  name VARCHAR,
  geom geometry(Point, 900913) NOT NULL,
  CONSTRAINT trailheads_pkey PRIMARY KEY(id)
);

-- copy T&T trailheads over
INSERT INTO trailheads (tnt_id, name, geom)
  SELECT id, name, geom
  FROM selected_tnt_trailheads
  -- filter out REI meeting places
  WHERE author_id != 3413;

-- copy GGNPC trailheads that are more than 500m from a T&T trailhead over
INSERT INTO trailheads (name, geom)
  SELECT locations.name, locations.geom
  FROM locations
  LEFT JOIN selected_tnt_trailheads ON ST_DWithin(locations.geom, selected_tnt_trailheads.geom, 500)
  WHERE type='Trailhead'
    AND selected_tnt_trailheads.name IS NULL;
```

`tnt_trailheads` were obtained by using
[transitandtrails-cli](https://github.com/mojodna/node-transitandtrails-cli).

## `convio_parking_lots_20131024.zip`

```
ogr2ogr parking_lots.shp PG:"<redacted>" -sql "select attributes->'id' id, attributes->'url' url, attributes->'title' title, attributes->'filename' filename, attributes->'description' description, attributes->'relatedpark' relatedpark, geom from convio where attributes->'parklocationtype' = 'Parking Lot'"
```
