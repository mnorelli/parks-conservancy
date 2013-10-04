# read the new trail 3d points geojson and separate 
# trails into individual geojson files
import json
from collections import defaultdict

with open("trails.geojson") as infile:
    geojson = json.load(infile)

trails = {}
for feature in geojson["features"]:
    trail_id = feature["properties"]["ET_ID"]
    pt_order = feature["properties"]["ET_ORDER"]
    #coords   = feature["geometry"]["coordinates"]
    if trail_id not in trails:
        trails[trail_id] = {"type": "FeatureCollection", "features": []}
    trails[trail_id]["features"].append(feature)

for trail_id in trails:
    features = trails[trail_id]["features"]
    trails[trail_id]["features"] = sorted(features, key=lambda feat: feat["properties"]["ET_ORDER"])
    outfile = "trails/%d.geojson" % trail_id
    with open(outfile, "w") as out:
        out.write(json.dumps(trails[trail_id], indent=2))
        print "wrote", outfile