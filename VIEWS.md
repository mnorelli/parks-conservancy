Materialized views for speed:

```sql
CREATE MATERIALIZED VIEW beach AS
  SELECT way
  FROM planet_osm_polygon
  WHERE tags @> 'natural=>beach';

CREATE INDEX beach_index ON beach USING GIST(way);

CREATE MATERIALIZED VIEW water AS
  SELECT ftype, geom
  FROM nhdwaterbody
  WHERE fcode IN (
      39000, -- Lake/Pond
      39004, -- Lake/Pond: Hydrographic Category = Perennial
      39009, -- Lake/Pond: Hydrographic Category = Perennial; Stage = Average Water Elevation
      39010, -- Lake/Pond: Hydrographic Category = Perennial; Stage = Normal Pool
      39011, -- Lake/Pond: Hydrographic Category = Perennial; Stage = Date of Photography
      39012, -- Lake/Pond: Hydrographic Category = Perennial; Stage = Spillway Elevation

      43600, -- Reservoir
      43601, -- Reservoir: Reservoir Type = Aquaculture
      43603, -- Reservoir: Reservoir Type = Decorative Pool
      43604, -- Reservoir: Reservoir Type = Tailings Pond; Construction Material = Earthen
      43605, -- Reservoir: Reservoir Type = Tailings Pond
      43606, -- Reservoir: Reservoir Type = Disposal
      43607, -- Reservoir: Reservoir Type = Evaporator
      43608, -- Reservoir: Reservoir Type = Swimming Pool
      43609, -- Reservoir: Reservoir Type = Cooling Pond
      43610, -- Reservoir: Reservoir Type = Filtration Pond
      43611, -- Reservoir: Reservoir Type = Settling Pond
      43612, -- Reservoir: Reservoir Type = Sewage Treatment Pond
      43613, -- Reservoir: Reservoir Type = Water Storage; Construction Material = Nonearthen
      43614, -- Reservoir: Reservoir Type = Water Storage; Construction Material = Earthen; Hydrographic Category = Intermittent
      43615, -- Reservoir: Reservoir Type = Water Storage; Construction Material = Earthen; Hydrographic Category = Perennial
      43617, -- Reservoir: Reservoir Type = Water Storage
      43618, -- Reservoir: Construction Material = Earthen
      43619, -- Reservoir: Construction Material = Nonearthen
      43621, -- Reservoir: Reservoir Type = Water Storage; Hydrographic Category = Perennial
      43623, -- Reservoir: Reservoir Type = Evaporator; Construction Material = Earthen
      43624, -- Reservoir; Reservoir Type = Treatment
      43625, -- Reservoir: Reservoir Type = Disposal; Construction Material = Earthen
      43626, -- Reservoir: Reservoir Type = Disposal; Construction Material = Nonearthen

      46600, -- Swamp/Marsh
      46601, -- Swamp/Marsh: Hydrographic Category = Intermittent
      46602, -- Swamp/Marsh: Hydrographic Category = Perennial

        -1
    )
UNION
  SELECT ftype, geom
  FROM nhdarea
  WHERE fcode IN (
      33600, -- Canal/Ditch
      33601, -- Canal/Ditch: Canal/Ditch Type = Aqueduct

      44500, -- Sea/Ocean

      45500, -- Spillway

      46000, -- Stream/River
      46006, -- Stream/River: Hydrographic Category = Perennial

        -1
    )
UNION
  SELECT 445, geom
  FROM water_fill
;

CREATE INDEX water_index ON water USING GIST(geom);

CREATE MATERIALIZED VIEW coastline AS
  SELECT geom, areasqkm
  FROM nhdwaterbody
  WHERE fcode IN (
      39000, -- Lake/Pond
      39004, -- Lake/Pond: Hydrographic Category = Perennial
      39009, -- Lake/Pond: Hydrographic Category = Perennial; Stage = Average Water Elevation
      39010, -- Lake/Pond: Hydrographic Category = Perennial; Stage = Normal Pool
      39011, -- Lake/Pond: Hydrographic Category = Perennial; Stage = Date of Photography
      39012, -- Lake/Pond: Hydrographic Category = Perennial; Stage = Spillway Elevation

      43600, -- Reservoir
      43601, -- Reservoir: Reservoir Type = Aquaculture
      43603, -- Reservoir: Reservoir Type = Decorative Pool
      43604, -- Reservoir: Reservoir Type = Tailings Pond; Construction Material = Earthen
      43605, -- Reservoir: Reservoir Type = Tailings Pond
      43606, -- Reservoir: Reservoir Type = Disposal
      43607, -- Reservoir: Reservoir Type = Evaporator
      43608, -- Reservoir: Reservoir Type = Swimming Pool
      43609, -- Reservoir: Reservoir Type = Cooling Pond
      43610, -- Reservoir: Reservoir Type = Filtration Pond
      43611, -- Reservoir: Reservoir Type = Settling Pond
      43612, -- Reservoir: Reservoir Type = Sewage Treatment Pond
      43613, -- Reservoir: Reservoir Type = Water Storage; Construction Material = Nonearthen
      43614, -- Reservoir: Reservoir Type = Water Storage; Construction Material = Earthen; Hydrographic Category = Intermittent
      43615, -- Reservoir: Reservoir Type = Water Storage; Construction Material = Earthen; Hydrographic Category = Perennial
      43617, -- Reservoir: Reservoir Type = Water Storage
      43618, -- Reservoir: Construction Material = Earthen
      43619, -- Reservoir: Construction Material = Nonearthen
      43621, -- Reservoir: Reservoir Type = Water Storage; Hydrographic Category = Perennial
      43623, -- Reservoir: Reservoir Type = Evaporator; Construction Material = Earthen
      43624, -- Reservoir; Reservoir Type = Treatment
      43625, -- Reservoir: Reservoir Type = Disposal; Construction Material = Earthen
      43626, -- Reservoir: Reservoir Type = Disposal; Construction Material = Nonearthen

      -1
    )
UNION
  SELECT geom, 9999
  FROM nhdarea
  WHERE fcode IN (
      33600, -- Canal/Ditch
      33601, -- Canal/Ditch: Canal/Ditch Type = Aqueduct

      44500, -- Sea/Ocean

      45500, -- Spillway

      46000, -- Stream/River
      46006, -- Stream/River: Hydrographic Category = Perennial

      -1
    )
UNION
  SELECT geom, 9999
  FROM water_fill
;

CREATE INDEX coastline_index ON coastline USING GIST(geom);

CREATE MATERIALIZED VIEW road AS
  SELECT tags -> 'highway' AS highway,
    tags -> 'aeroway' AS aeroway,
    (CASE
    WHEN tags ? 'bridge' AND tags -> 'bridge' NOT IN ('no', 'false') THEN 'yes'
    ELSE NULL
    END) bridge,
    (CASE
    WHEN tags ? 'tunnel' AND tags -> 'tunnel' NOT IN ('no', 'false') THEN 'yes'
    ELSE NULL
    END) tunnel,
    way,
    z_order
  FROM planet_osm_line
  WHERE 
    ((tags ? 'highway'
      AND tags -> 'highway' IN ('motorway', 'trunk', 'primary',
                                'motorway_link', 'trunk_link', 'primary_link',
                                'secondary_link', 'tertiary_link',
                                'secondary', 'tertiary', 'residential',
                                'unclassified', 'service', 'road')
      AND
      (NOT tags ? 'access' OR tags -> 'access' NOT IN ('no', 'false')))
    OR
    (tags ? 'aeroway' AND tags -> 'aeroway' IN ('runway', 'taxiway')))
  ORDER BY z_order ASC
;

CREATE INDEX road_index ON road USING GIST(way);
CREATE INDEX road_highway_idx ON road (highway);


CREATE MATERIALIZED VIEW road_lowzoom AS
  SELECT highway,
    aeroway,
    -- this is wrong; should be 14 so we can antialias effectively
    ST_SnapToGrid(way, 0, 0, 19.1093, 19.1093) way,
    z_order
  FROM road
  WHERE highway IN ('trunk', 'primary', 'secondary', 'tertiary', 'residential',
  'unclassified', 'service', 'road')
  ;

CREATE INDEX road_lowzoom_index ON road_lowzoom USING GIST(way);
CREATE INDEX road_lowzoom_highway_idx ON road_lowzoom (highway);

CREATE MATERIALIZED VIEW places AS
  SELECT DISTINCT ON (name) name, way, place, population,
          priority, size
  FROM
  (
    SELECT (string_to_array(tags -> 'name', ';'))[1] AS name,
            way,
            tags -> 'place' AS place,
            COALESCE(replace(tags -> 'population', ',', '')::numeric, 0) AS population,
            CASE
            WHEN tags -> 'place' IN ('city') THEN 1
            WHEN tags -> 'place' IN ('suburb') THEN 2
            WHEN tags -> 'place' IN ('town') THEN 3
            WHEN tags -> 'place' IN ('neighbourhood') THEN 4
            WHEN tags -> 'place' IN ('village') THEN 5
            ELSE 10
          END AS priority,
          1 as size
    FROM planet_osm_point
    WHERE tags ?& ARRAY['name', 'place']
      AND tags -> 'name' NOT LIKE '%Home%'
      AND tags -> 'name' NOT LIKE '%Trailer Court%'
      AND tags -> 'name' NOT IN ('Doelger City')
      AND NOT tags ? 'historic'
      -- island is intentionally omitted
      AND tags -> 'place' IN ('city','town','village','suburb','neighbourhood','hamlet','islet','locale','locality')
  UNION
    SELECT (string_to_array(tags -> 'name', ';'))[1] AS name,
            way,
            tags -> 'place' AS place,
            way_area size,
    COALESCE(replace(tags -> 'population', ',', '')::numeric, 0) AS population,
    CASE
      WHEN tags->'place' IN ('city') THEN 1
      WHEN tags->'place' IN ('suburb') THEN 2
      WHEN tags->'place' IN('town') THEN 3
      WHEN tags->'place' IN ('neighbourhood') THEN 4
      WHEN tags->'place' IN ('village') THEN 5
      ELSE 10
    END AS priority
    FROM planet_osm_polygon
    WHERE tags ?& ARRAY['name', 'place']
      AND tags -> 'name' NOT LIKE '%Home%'
      AND tags -> 'name' NOT LIKE '%Trailer Court%'
      -- island is intentionally omitted
      AND tags -> 'place' IN ('city','town','village','suburb','neighbourhood','hamlet','islet','locale','locality')
  ) AS stuff
  ORDER BY name
;

CREATE INDEX places_index ON places USING GIST(way);
```
