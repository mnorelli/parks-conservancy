# TNT_API_KEY, MAPQUEST_API_KEY, and DATABASE_URL are expected to be set

import-trips: elevations.json
	# import trips.json into postgres
	geojson2pgsql elevations.json tnt_trips
	touch $@

ggnpc.json:
	# Fetch trips belonging to GGNPC
	tnt trips -u 2280 -g > ggnpc.json

selected.json:
	# Fetch whitelisted trips
	tnt trip 1424,1431,89,45,216,1338,1446,1295,140,1333,63,1448,1449,263 -g > selected.json

trips.json: ggnpc.json selected.json
	# Merge trip data
	merge-geojson-features ggnpc.json selected.json > trips.json

elevations.json: trips.json
	# Enrich trips with elevation and distance
	elevate trips.json > elevations.json
