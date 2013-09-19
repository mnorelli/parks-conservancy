CREATE OR REPLACE FUNCTION PC_OrderSegments(segments geometry[], start geometry)
RETURNS geometry
AS $$
DECLARE
  segment geometry;
  used_segments geometry[] = ARRAY[]::geometry[];
  ordered_segments geometry[] = ARRAY[]::geometry[];
  L geometry;
  R geometry;
  l_dist float;
  r_dist float;
  prev_dist float;
  idx integer = 0;
  prepend boolean = false;
BEGIN
  RAISE NOTICE '% segments under consideration', array_length(segments, 1);

  segment := (SELECT geom
            FROM unnest(segments) geom
            WHERE NOT used_segments @> ARRAY[geom]
            ORDER BY ST_Distance(geom, start) ASC
            LIMIT 1);

  WHILE segment IS NOT NULL
  LOOP
    RAISE NOTICE 'Start: % (%)', ST_AsText(ST_Transform(start, 4326)), idx;
    idx := (SELECT idx + ST_NumPoints(segment));

    L := ST_PointN(segment, 1);
    R := ST_PointN(segment, ST_NumPoints(segment));
    l_dist := ST_Distance(start, L);
    r_dist := ST_Distance(start, R);

    raise notice 'distance to left node: %', l_dist;
    raise notice 'distance to right node: %', r_dist;

    IF least(r_dist, l_dist) > prev_dist THEN
      RAISE NOTICE 'Switching ends';
      prepend := true;
    END IF;

    IF r_dist > l_dist THEN
      IF prepend THEN
        segment := ST_Reverse(segment);
      END IF;

      start := R;
      prev_dist := r_dist;
      RAISE NOTICE 'Starting from RIGHT';
    ELSE
      IF NOT prepend THEN
        segment := ST_Reverse(segment);
      END IF;

      start := L;
      prev_dist := l_dist;
      RAISE NOTICE 'Starting from LEFT';
    END IF;

    IF prepend THEN
      ordered_segments := segment || ordered_segments;
    ELSE
      ordered_segments := ordered_segments || segment;
    END IF;

    used_segments := used_segments || segment;

    segment := (SELECT geom
              FROM unnest(segments) geom
              WHERE NOT used_segments @> ARRAY[geom]
              ORDER BY ST_Distance(geom, start) ASC
              LIMIT 1);
  END LOOP;

  RAISE NOTICE 'Assembled % segments', array_length(ordered_segments, 1);

  RETURN ST_Collect(ordered_segments);
END
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION PC_OrderSegments(segments geometry[])
RETURNS geometry
AS $$
DECLARE
  start geometry;
BEGIN
  start := (SELECT ST_PointN(geom, 1)
            FROM unnest(segments) geom
            LIMIT 1);

  RETURN PC_OrderSegments(segments, start);
END
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION PC_GatherSegments(name varchar)
RETURNS geometry[]
AS $$
DECLARE
  segments geometry[];
BEGIN
  segments := (
    WITH points AS (
      SELECT array_agg(points.geom) points
      FROM trails_20130830_3d points
      WHERE points.trail_name = name
    )
    SELECT array_agg(segments.geom) segments
    FROM trails3d segments,
      points
    WHERE points.points @> ARRAY[ST_PointN(segments.geom, 1)]
      -- points don't exist for connector trails
      AND (segments.connect='Y' OR points.points @> ARRAY[ST_PointN(segments.geom, div(ST_NumPoints(segments.geom), 2)::integer)])
      AND points.points @> ARRAY[ST_PointN(segments.geom, ST_NumPoints(segments.geom))]
  ); 

  RETURN segments;
END
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION PC_ElevationProfile(line geometry)
RETURNS geometry
AS $$
DECLARE
  points geometry[];
BEGIN
  points := (SELECT array_agg(geom) FROM (
              SELECT ST_MakePoint(sum(dx) OVER (ORDER BY idx) * 3.28, z * 3.28) geom
              FROM (
                SELECT row_number() OVER () idx,
                ST_Distance(first_value(geom) OVER (ROWS BETWEEN 1 PRECEDING AND CURRENT ROW), geom) dx,
                ST_Z(geom) z
                FROM (
                  SELECT (ST_DumpPoints(line)).*
                ) AS _
              ) AS _
            ) AS _);

  RETURN ST_MakeLine(points);
END
$$ LANGUAGE plpgsql IMMUTABLE;


-- SELECT assemble_trail_segments('Dipsea Trail', 'SRID=900913;POINT(-13651906.87 4565007.034)'::geometry);


-- SELECT row_number() over (), ST_Distance(first_value(geom) OVER (ROWS BETWEEN 1 PRECEDING AND CURRENT ROW), geom) dx, ST_Z(geom) z FROM (SELECT (ST_DumpPoints(assemble_trail_segments('Dipsea Trail', 'SRID=900913;POINT(-13651906.87 4565007.034)'::geometry))).*) AS _;
-- 
-- SELECT idx, dx, sum(dx) OVER (ORDER BY idx) x, z FROM (SELECT row_number() OVER () idx, ST_Distance(first_value(geom) OVER (ROWS BETWEEN 1 PRECEDING AND CURRENT ROW), geom) dx, ST_Z(geom) z FROM (SELECT (ST_DumpPoints(assemble_trail_segments('Dipsea Trail', 'SRID=900913;POINT(-13651906.87 4565007.034)'::geometry))).*) AS _) AS _;
-- 

-- (
--   SELECT row_number() over () idx,
--   geom
--   FROM (
--     SELECT (ST_DumpPoints(
--         assemble_trail_segments('Dipsea Trail', 'SRID=900913;POINT(-13651906.87 4565007.034)'::geometry
--     ))).*
--   ) AS _
-- ) AS _
-- 
-- 
-- (
--   SELECT assemble_trail_segments('Dipsea Trail', 'SRID=900913;POINT(-13651906.87 4565007.034)'::geometry) geom
-- ) AS _
-- 
-- (
--   SELECT PC_OrderSegments(array_agg(geom), 'SRID=900913;POINT(-13651906.87 4565007.034)'::geometry) geom
--   FROM (
--     SELECT (PC_GatherSegments('Dipsea Trail')).geom
--   ) AS _
-- ) AS _

-- Elevation Profile
-- (
--   SELECT ST_MakeLine(geom) geom
--   FROM (
--     SELECT ST_Translate(
--       ST_Scale(
--         ST_SetSRID(
--           ST_MakePoint(sum(dx) OVER (ORDER BY idx), z)
--           , 900913)
--         , 0.7, 10),
--       ST_X('SRID=900913;POINT(-13651906.87 4565007.034)'::geometry),
--       ST_Y('SRID=900913;POINT(-13651906.87 4565007.034)'::geometry)) geom
--     FROM (
--       SELECT row_number() OVER () idx,
--       ST_Distance(first_value(geom) OVER (ROWS BETWEEN 1 PRECEDING AND CURRENT ROW), geom) dx,
--       ST_Z(geom) z
--       FROM (
--         SELECT (ST_DumpPoints(PC_OrderSegments(PC_GatherSegments('Dipsea Trail')))).*
--       ) AS _
--     ) AS _
--   ) AS _
-- ) AS _

-- select geom from (select trail_name, ST_MakeLine(last_value(geom) OVER (ROWS
      -- BETWEEN CURRENT ROW AND 1 FOLLOWING), geom) geom from
  -- trails_20130830_3d points where trail_name = 'Dipsea Trail' ORDER BY
  -- et_order) as _ where st_length(geom) < 100 and st_length(geom) > 0;

-- WITH points AS (
--   SELECT array_agg(geom) points
--   FROM trails_20130830_3d points
--   WHERE trail_name = 'Dipsea Trail'
-- )
-- SELECT segments.geom
-- FROM trails3d segments,
--   points
-- WHERE points.points @> ARRAY[ST_PointN(segments.geom, 1)]
--   AND points.points @> ARRAY[ST_PointN(segments.geom, ST_NumPoints(segments.geom))]
-- ;
