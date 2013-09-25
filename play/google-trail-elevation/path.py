# get an elevation profile from a bunch of trail points
import json
from urllib import urlretrieve as get
from math import ceil

with open("sample-route.json") as infile:
    route = json.load(infile)["route"]
    route = json.loads(route)

print route[0]

locs_per_query = 500
route_length = len(route)
if route_length > locs_per_query:
    num_queries = ceil(route_length / locs_per_query)
    for i in range(int(num_queries)):
        start = i * locs_per_query 
	end = (i + 1) * locs_per_query 
	locations = "|".join(",".join(str(c) for c in coords) for coords in route[start:end])
        print locations
        url = "http://maps.googleapis.com/maps/api/elevation/json?sensor=false&path=%s" % locations
	get(url, filename="elevation-profile%d.json" % i)
	print i, start, end
else:        
    locations = "|".join(",".join(str(c) for c in coords) for coords in route)
    url = "http://maps.googleapis.com/maps/api/elevation/json?sensor=false&path=%s" % locations

#get(url, filename="elevation-profile.json")
#print "got elevation profile"

