PGSQL ?= "host=geo.local user=ggnpc dbname=ggnpc"

all: locations.csv

locations.csv:
	ogr2ogr -F CSV -t_srs EPSG:4326 -lco GEOMETRY=AS_XY $@ PG:$(PGSQL) ggnpc_locations_20130417

clean:
	rm -f locations.csv
