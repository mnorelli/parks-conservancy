PGDATABASE?=ggnpc
PGHOST?=localhost
PGPORT?=5432
PGUSER?=ggnpc
PGPASSWORD?=

clean:
	rm -rf tmp/

distclean:
	rm -rf data/

data: postgis hstore \
      data-cpad data-osm \
      data-nhd data-water-fill \
      data-ggnpc-locations data-ggnra-trails data-ggnra-boundary \
      data-ggnra-legislative data-restoration-areas \
      data-pt-parking-areas data-ggnra-parking-areas \
      data-ggnra-park-units data-ggnra-restrooms \
      data-offshore-boundaries data-ggnra-buildings \
      data-trailheads

postgis:
	echo "create extension postgis;" | \
	PGDATABASE=${PGDATABASE} PGHOST=${PGHOST} PGPORT=${PGPORT} PGUSER=${PGUSER} psql -q
	touch $@

hstore:
	echo "create extension hstore;" | \
	PGDATABASE=${PGDATABASE} PGHOST=${PGHOST} PGPORT=${PGPORT} PGUSER=${PGUSER} psql -q
	touch $@

data-nhd: data/nhdh1801.7z data/nhdh1802.7z data/nhdh1804.7z data/nhdh1805.7z data/nhdh1806.7z tmp/.placeholder
	7z -otmp/ -y x data/nhdh1801.7z > /dev/null
	ogr2ogr --config PG_USE_COPY YES \
		-s_srs EPSG:4326 \
		-t_srs EPSG:900913 \
		-nlt PROMOTE_TO_MULTI \
		-lco GEOMETRY_NAME=geom \
		-lco SRID=900913 \
		-lco DIM=2 \
		-f PGDump /vsistdout/ \
		tmp/NHDH1801.gdb nhdarea nhdfcode nhdline nhdpoint nhdwaterbody | \
		PGDATABASE=${PGDATABASE} PGHOST=${PGHOST} PGPORT=${PGPORT} PGUSER=${PGUSER} PGPASSWORD=${PGPASSWORD} psql -q
	ogr2ogr --config PG_USE_COPY YES \
		-s_srs EPSG:4326 \
		-t_srs EPSG:900913 \
		-nlt PROMOTE_TO_MULTI \
		-lco GEOMETRY_NAME=geom \
		-lco SRID=900913 \
		-lco DIM=2 \
		-f PGDump /vsistdout/ \
		-sql "SELECT * FROM nhdflowline WHERE fcode IN (33600, 46000, 46006)" \
		tmp/NHDH1801.gdb | \
		PGDATABASE=${PGDATABASE} PGHOST=${PGHOST} PGPORT=${PGPORT} PGUSER=${PGUSER} PGPASSWORD=${PGPASSWORD} psql -q
	rm -rf tmp/NHDH1801_101v210.gdb
	
	7z -otmp/ -y x data/nhdh1802.7z > /dev/null
	ogr2ogr --config PG_USE_COPY YES \
	        -s_srs EPSG:4326 \
		-t_srs EPSG:900913 \
		-nlt PROMOTE_TO_MULTI \
		-lco GEOMETRY_NAME=geom \
		-lco SRID=900913 \
		-lco DIM=2 \
		-lco CREATE_TABLE=OFF \
		-f PGDump /vsistdout/ \
		tmp/NHDH1802.gdb nhdarea nhdfcode nhdline nhdpoint nhdwaterbody | \
		PGDATABASE=${PGDATABASE} PGHOST=${PGHOST} PGPORT=${PGPORT} PGUSER=${PGUSER} PGPASSWORD=${PGPASSWORD} psql -q
	ogr2ogr --config PG_USE_COPY YES \
	        -s_srs EPSG:4326 \
		-t_srs EPSG:900913 \
		-nlt PROMOTE_TO_MULTI \
		-lco GEOMETRY_NAME=geom \
		-lco SRID=900913 \
		-lco DIM=2 \
		-lco CREATE_TABLE=OFF \
		-f PGDump /vsistdout/ \
		-sql "SELECT * FROM nhdflowline WHERE fcode IN (33600, 46000, 46006)" \
		tmp/NHDH1802.gdb | \
		PGDATABASE=${PGDATABASE} PGHOST=${PGHOST} PGPORT=${PGPORT} PGUSER=${PGUSER} PGPASSWORD=${PGPASSWORD} psql -q
	rm -rf tmp/NHDH1802_101v210.gdb
	
	7z -otmp/ -y x data/nhdh1804.7z > /dev/null
	ogr2ogr --config PG_USE_COPY YES \
	        -s_srs EPSG:4326 \
		-t_srs EPSG:900913 \
		-nlt PROMOTE_TO_MULTI \
		-lco GEOMETRY_NAME=geom \
		-lco SRID=900913 \
		-lco DIM=2 \
		-lco CREATE_TABLE=OFF \
		-f PGDump /vsistdout/ \
		tmp/NHDH1804.gdb nhdarea nhdfcode nhdline nhdpoint nhdwaterbody | \
		PGDATABASE=${PGDATABASE} PGHOST=${PGHOST} PGPORT=${PGPORT} PGUSER=${PGUSER} PGPASSWORD=${PGPASSWORD} psql -q
	ogr2ogr --config PG_USE_COPY YES \
	        -s_srs EPSG:4326 \
		-t_srs EPSG:900913 \
		-nlt PROMOTE_TO_MULTI \
		-lco GEOMETRY_NAME=geom \
		-lco SRID=900913 \
		-lco DIM=2 \
		-lco CREATE_TABLE=OFF \
		-f PGDump /vsistdout/ \
		-sql "SELECT * FROM nhdflowline WHERE fcode IN (33600, 46000, 46006)" \
		tmp/NHDH1804.gdb | \
		PGDATABASE=${PGDATABASE} PGHOST=${PGHOST} PGPORT=${PGPORT} PGUSER=${PGUSER} PGPASSWORD=${PGPASSWORD} psql -q
	rm -rf tmp/NHDH1804_101v210.gdb
	
	7z -otmp/ -y x data/nhdh1805.7z > /dev/null
	ogr2ogr --config PG_USE_COPY YES \
	        -s_srs EPSG:4326 \
		-t_srs EPSG:900913 \
		-nlt PROMOTE_TO_MULTI \
		-lco GEOMETRY_NAME=geom \
		-lco SRID=900913 \
		-lco DIM=2 \
		-lco CREATE_TABLE=OFF \
		-f PGDump /vsistdout/ \
		tmp/NHDH1805.gdb nhdarea nhdfcode nhdline nhdpoint nhdwaterbody | \
		PGDATABASE=${PGDATABASE} PGHOST=${PGHOST} PGPORT=${PGPORT} PGUSER=${PGUSER} PGPASSWORD=${PGPASSWORD} psql -q
	ogr2ogr --config PG_USE_COPY YES \
	        -s_srs EPSG:4326 \
		-t_srs EPSG:900913 \
		-nlt PROMOTE_TO_MULTI \
		-lco GEOMETRY_NAME=geom \
		-lco SRID=900913 \
		-lco DIM=2 \
		-lco CREATE_TABLE=OFF \
		-f PGDump /vsistdout/ \
		-sql "SELECT * FROM nhdflowline WHERE fcode IN (33600, 46000, 46006)" \
		tmp/NHDH1805.gdb | \
		PGDATABASE=${PGDATABASE} PGHOST=${PGHOST} PGPORT=${PGPORT} PGUSER=${PGUSER} PGPASSWORD=${PGPASSWORD} psql -q
	rm -rf tmp/NHDH1805_101v210.gdb
	
	7z -otmp/ -y x data/nhdh1806.7z > /dev/null
	ogr2ogr --config PG_USE_COPY YES \
	        -s_srs EPSG:4326 \
		-t_srs EPSG:900913 \
		-nlt PROMOTE_TO_MULTI \
		-lco GEOMETRY_NAME=geom \
		-lco SRID=900913 \
		-lco DIM=2 \
		-lco CREATE_TABLE=OFF \
		-f PGDump /vsistdout/ \
		tmp/NHDH1806.gdb nhdarea nhdfcode nhdline nhdpoint nhdwaterbody | \
		PGDATABASE=${PGDATABASE} PGHOST=${PGHOST} PGPORT=${PGPORT} PGUSER=${PGUSER} PGPASSWORD=${PGPASSWORD} psql -q
	ogr2ogr --config PG_USE_COPY YES \
	        -s_srs EPSG:4326 \
		-t_srs EPSG:900913 \
		-nlt PROMOTE_TO_MULTI \
		-lco GEOMETRY_NAME=geom \
		-lco SRID=900913 \
		-lco DIM=2 \
		-lco CREATE_TABLE=OFF \
		-f PGDump /vsistdout/ \
		-sql "SELECT * FROM nhdflowline WHERE fcode IN (33600, 46000, 46006)" \
		tmp/NHDH1806.gdb | \
		PGDATABASE=${PGDATABASE} PGHOST=${PGHOST} PGPORT=${PGPORT} PGUSER=${PGUSER} PGPASSWORD=${PGPASSWORD} psql -q
	rm -rf tmp/NHDH1806_101v210.gdb
	
	touch $@

data-water-fill:
	ogr2ogr --config PG_USE_COPY YES \
		-nln water_fill \
		-nlt PROMOTE_TO_MULTI \
		-lco GEOMETRY_NAME=geom \
		-lco SRID=900913 \
		-f PGDump /vsistdout/ \
		water-fill.shp | \
		PGDATABASE=${PGDATABASE} PGHOST=${PGHOST} PGPORT=${PGPORT} PGUSER=${PGUSER} psql -q
	PGDATABASE=${PGDATABASE} PGHOST=${PGHOST} PGPORT=${PGPORT} PGUSER=${PGUSER} psql -c "UPDATE water_fill SET geom=ST_Multi(ST_Buffer(geom, 20));"
	touch $@

data-osm: data/sf-bay-area.osm.pbf
	PGPASSWORD=${PGPASSWORD} osm2pgsql -d ${PGDATABASE} \
		      -U ${PGUSER} \
			  -H ${PGHOST} \
			  -P ${PGPORT} \
			  -c \
			  -C2000 \
			  --number-processes=4 \
			  -s \
			  -S osm2pgsql.style \
			  -j \
			  -G \
			  data/sf-bay-area.osm.pbf
	touch $@

data-cpad: data/cpad.zip
	ogr2ogr --config PG_USE_COPY YES \
		    -t_srs EPSG:900913 \
			-nln cpad_units \
			-nlt PROMOTE_TO_MULTI \
			-lco GEOMETRY_NAME=geom \
			-lco SRID=900913 \
			-f PGDump /vsistdout/ \
			/vsizip/data/cpad.zip/CPAD19_Units.shp | \
			PGDATABASE=${PGDATABASE} PGHOST=${PGHOST} PGPORT=${PGPORT} PGUSER=${PGUSER} psql -q
	ogr2ogr --config PG_USE_COPY YES \
		    -t_srs EPSG:900913 \
			-nln cpad_superunits \
			-nlt PROMOTE_TO_MULTI \
			-lco GEOMETRY_NAME=geom \
			-lco SRID=900913 \
			-f PGDump /vsistdout/ \
			/vsizip/data/cpad.zip/CPAD19_SuperUnits.shp | \
			PGDATABASE=${PGDATABASE} PGHOST=${PGHOST} PGPORT=${PGPORT} PGUSER=${PGUSER} psql -q
	ogr2ogr --config PG_USE_COPY YES \
		    -t_srs EPSG:900913 \
			-nln cpad_holdings \
			-nlt PROMOTE_TO_MULTI \
			-lco GEOMETRY_NAME=geom \
			-lco SRID=900913 \
			-f PGDump /vsistdout/ \
			/vsizip/data/cpad.zip/CPAD19_Holdings.shp | \
			PGDATABASE=${PGDATABASE} PGHOST=${PGHOST} PGPORT=${PGPORT} PGUSER=${PGUSER} psql -q
	touch $@

data-ggnpc-locations: data/ggnpc_locations.zip
	ogr2ogr --config PG_USE_COPY YES \
		    -t_srs EPSG:900913 \
			-nln locations \
			-nlt PROMOTE_TO_MULTI \
			-lco GEOMETRY_NAME=geom \
			-lco SRID=900913 \
			-f PGDump /vsistdout/ \
			/vsizip/data/ggnpc_locations.zip/GGNPC_locations_20130417.shp | \
			PGDATABASE=${PGDATABASE} PGHOST=${PGHOST} PGPORT=${PGPORT} PGUSER=${PGUSER} psql -q
	touch $@

data-ggnra-trails: data/ggnra_trails.zip
	ogr2ogr --config PG_USE_COPY YES \
			-t_srs EPSG:900913 \
			-nln trails \
			-nlt PROMOTE_TO_MULTI \
			-lco GEOMETRY_NAME=geom \
			-lco SRID=900913 \
			-f PGDump /vsistdout/ \
			/vsizip/data/ggnra_trails.zip/trails_goga_20130816.shp | \
			PGDATABASE=${PGDATABASE} PGHOST=${PGHOST} PGPORT=${PGPORT} PGUSER=${PGUSER} psql -q
	touch $@

data-ggnra-boundary: data/ggnra_boundary.zip
	ogr2ogr --config PG_USE_COPY YES \
		    -t_srs EPSG:900913 \
			-nln ggnra_boundary \
			-nlt PROMOTE_TO_MULTI \
			-lco GEOMETRY_NAME=geom \
			-lco SRID=900913 \
			-f PGDump /vsistdout/ \
			/vsizip/data/ggnra_boundary.zip/GGNRA_boundary_2012_v2/GGNRA_boundary_2012_v2.shp | \
			PGDATABASE=${PGDATABASE} PGHOST=${PGHOST} PGPORT=${PGPORT} PGUSER=${PGUSER} psql -q
	touch $@

data-ggnra-park-units: data/park_units.zip
	ogr2ogr --config PG_USE_COPY YES \
		    -t_srs EPSG:900913 \
			-nln park_units \
			-nlt PROMOTE_TO_MULTI \
			-lco GEOMETRY_NAME=geom \
			-lco SRID=900913 \
			-f PGDump /vsistdout/ \
			/vsizip/data/park_units.zip/GGNRA_web_boundaries_20130916.shp | \
			PGDATABASE=${PGDATABASE} PGHOST=${PGHOST} PGPORT=${PGPORT} PGUSER=${PGUSER} psql -q
	touch $@

data-ggnra-legislative: data/ggnra_legislative.zip
	ogr2ogr --config PG_USE_COPY YES \
		    -t_srs EPSG:900913 \
			-nln ggnra_legislative \
			-nlt PROMOTE_TO_MULTI \
			-lco GEOMETRY_NAME=geom \
			-lco SRID=900913 \
			-f PGDump /vsistdout/ \
			/vsizip/data/ggnra_legislative.zip/GOGA_legislative_2013.shp | \
			PGDATABASE=${PGDATABASE} PGHOST=${PGHOST} PGPORT=${PGPORT} PGUSER=${PGUSER} psql -q
	touch $@

data-restoration-areas: data/restoration_areas.zip
	ogr2ogr --config PG_USE_COPY YES \
		    -t_srs EPSG:900913 \
			-nln restoration_areas \
			-nlt PROMOTE_TO_MULTI \
			-lco GEOMETRY_NAME=geom \
			-lco SRID=900913 \
			-f PGDump /vsistdout/ \
			/vsizip/data/restoration_areas.zip/RestorationAreas_20120216.shp | \
			PGDATABASE=${PGDATABASE} PGHOST=${PGHOST} PGPORT=${PGPORT} PGUSER=${PGUSER} psql -q
	touch $@

data-pt-parking-areas: data/pt_parking_areas.zip
	ogr2ogr --config PG_USE_COPY YES \
		    -t_srs EPSG:900913 \
			-nln pt_parking_areas \
			-nlt PROMOTE_TO_MULTI \
			-lco GEOMETRY_NAME=geom \
			-lco SRID=900913 \
			-f PGDump /vsistdout/ \
			/vsizip/data/pt_parking_areas.zip/Parking_2010.shp | \
			PGDATABASE=${PGDATABASE} PGHOST=${PGHOST} PGPORT=${PGPORT} PGUSER=${PGUSER} psql -q
	touch $@

data-ggnra-parking-areas: data/ggnra_parking_areas.zip
	ogr2ogr --config PG_USE_COPY YES \
		    -t_srs EPSG:900913 \
			-nln ggnra_parking_areas \
			-nlt PROMOTE_TO_MULTI \
			-lco GEOMETRY_NAME=geom \
			-lco SRID=900913 \
			-f PGDump /vsistdout/ \
			/vsizip/data/ggnra_parking_areas.zip/ggnra_parkingareas.shp | \
			PGDATABASE=${PGDATABASE} PGHOST=${PGHOST} PGPORT=${PGPORT} PGUSER=${PGUSER} psql -q
	touch $@

data-ggnra-restrooms: data/ggnra_restrooms.zip
	ogr2ogr --config PG_USE_COPY YES \
		    -t_srs EPSG:900913 \
			-nln ggnra_restrooms \
			-nlt PROMOTE_TO_MULTI \
			-lco GEOMETRY_NAME=geom \
			-lco SRID=900913 \
			-f PGDump /vsistdout/ \
			/vsizip/data/ggnra_restrooms.zip/GGNPC_locations_20130816_restrooms3.shp | \
			PGDATABASE=${PGDATABASE} PGHOST=${PGHOST} PGPORT=${PGPORT} PGUSER=${PGUSER} psql -q
	touch $@

data-offshore-boundaries: data/ggnra_offshore_boundaries.zip
	ogr2ogr --config PG_USE_COPY YES \
		    -t_srs EPSG:900913 \
			-nln ggnra_offshore_boundaries \
			-nlt PROMOTE_TO_MULTI \
			-lco GEOMETRY_NAME=geom \
			-lco SRID=900913 \
			-f PGDump /vsistdout/ \
			/vsizip/data/ggnra_offshore_boundaries.zip/GGNRA_boundary_2013_offshoreline.shp | \
			PGDATABASE=${PGDATABASE} PGHOST=${PGHOST} PGPORT=${PGPORT} PGUSER=${PGUSER} psql -q
	touch $@

data-ggnra-buildings: data/ggnra_buildings.zip
	ogr2ogr --config PG_USE_COPY YES \
		    -t_srs EPSG:900913 \
			-nln ggnra_buildings \
			-nlt PROMOTE_TO_MULTI \
			-lco GEOMETRY_NAME=geom \
			-lco SRID=900913 \
			-f PGDump /vsistdout/ \
			/vsizip/data/ggnra_buildings.zip/ggnra_buildings_2013.shp | \
			PGDATABASE=${PGDATABASE} PGHOST=${PGHOST} PGPORT=${PGPORT} PGUSER=${PGUSER} psql -q
	touch $@

data-trailheads:
	PGDATABASE=${PGDATABASE} PGHOST=${PGHOST} PGPORT=${PGPORT} PGUSER=${PGUSER} psql -q -f trailheads.sql
	touch $@

data/cpad.zip: data/.placeholder
	curl -sL http://maps.gis.ca.gov/Downloads/Data/Government/CPAD19_ALL.zip -o $@

data/sf-bay-area.osm.pbf: data/.placeholder
	curl -sL http://osm-extracted-metros.s3.amazonaws.com/sf-bay-area.osm.pbf -o $@

data/nhdh1801.7z: data/.placeholder
	curl -sL http://nhd.stamen.com.s3.amazonaws.com/SubRegions/FileGDB/HighResolution/NHDH1801_101v210.7z -o $@

data/nhdh1802.7z: data/.placeholder
	curl -sL http://nhd.stamen.com.s3.amazonaws.com/SubRegions/FileGDB/HighResolution/NHDH1802_101v210.7z -o $@

data/nhdh1804.7z: data/.placeholder
	curl -sL http://nhd.stamen.com.s3.amazonaws.com/SubRegions/FileGDB/HighResolution/NHDH1804_101v210.7z -o $@

data/nhdh1805.7z: data/.placeholder
	curl -sL http://nhd.stamen.com.s3.amazonaws.com/SubRegions/FileGDB/HighResolution/NHDH1805_101v210.7z -o $@

data/nhdh1806.7z: data/.placeholder
	curl -sL http://nhd.stamen.com.s3.amazonaws.com/SubRegions/FileGDB/HighResolution/NHDH1806_101v210.7z -o $@

data/ggnpc_locations.zip: data/.placeholder
	curl -sL http://data.stamen.com.s3.amazonaws.com/parks-conservancy/03_GGNPC_locations_20130417.zip -o $@

data/ggnra_trails.zip: data/.placeholder
	curl -sL http://data.stamen.com.s3.amazonaws.com/parks-conservancy/trails_goga_20130816.zip -o $@

data/ggnra_boundary.zip: data/.placeholder
	curl -sL http://data.stamen.com.s3.amazonaws.com/parks-conservancy/05_GGNRA_boundary_2012_v2.zip -o $@

data/ggnra_legislative.zip: data/.placeholder
	curl -sL http://data.stamen.com.s3.amazonaws.com/parks-conservancy/06_GGNRA_legislative_2013.zip -o $@

data/park_units.zip: data/.placeholder
	curl -sL http://data.stamen.com.s3.amazonaws.com/parks-conservancy/GGNRA_web_boundaries_20130916.zip -o $@

data/restoration_areas.zip: data/.placeholder
	curl -sL http://data.stamen.com.s3.amazonaws.com/parks-conservancy/07_RestorationAreas_20120216.zip -o $@

data/pt_parking_areas.zip: data/.placeholder
	curl -sL http://data.stamen.com.s3.amazonaws.com/parks-conservancy/08a_PT_parking_areas_2010.zip -o $@

data/ggnra_parking_areas.zip: data/.placeholder
	curl -sL http://data.stamen.com.s3.amazonaws.com/parks-conservancy/08b_GGNRA_parking_areas_20120417.zip -o $@

data/ggnra_restrooms.zip: data/.placeholder
	curl -sL http://data.stamen.com.s3.amazonaws.com/parks-conservancy/restrooms_20130816.zip -o $@

data/ggnra_offshore_boundaries.zip: data/.placeholder
	curl -sL http://data.stamen.com.s3.amazonaws.com/parks-conservancy/GGNRA_boundary_2013_offshoreline.zip -o $@

data/ggnra_buildings.zip: data/.placeholder
	curl -sL http://data.stamen.com.s3.amazonaws.com/parks-conservancy/ggnra_buildings_2013.zip -o $@

%/.placeholder:
	mkdir -p ${@D}
	touch $@
