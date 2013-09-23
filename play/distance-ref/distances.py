# create lookup table for every location within one mile of each other loc
import json
import csv

from math import radians, cos, sin, asin, sqrt

def haversine(lon1, lat1, lon2, lat2):
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    """
    # convert decimal degrees to radians 
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    # haversine formula 
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a)) 
    mi = 3959 * c
    return mi
    # km = 6367 * c
    # return km

locations = []
with open("data/locations.csv") as infile:
    for row in csv.DictReader(infile):
        locations.append(row)

for src in locations:
    src["nearby"] = []
    for dest in locations:
        if src == dest: continue
        coords = {
            "lon1": float(src["X"]),
            "lat1": float(src["Y"]),
            "lon2": float(dest["X"]),
            "lat2": float(dest["Y"])
        }
        distance = haversine(**coords)
        if distance <= 1:
            print "%s -> %s = %.2fmi" % (src["name"], dest["name"], distance)
            src["nearby"].append({"id": dest["cms_link"], "dist": distance, "name": dest["name"]})

# for loc in locations:
#     loc["nearby"] = ",".join(loc["nearby"])

with open("nearby.json", "w") as outfile:
    outfile.write(json.dumps(locations, indent=2))
    # writer = csv.DictWriter(outfile, fieldnames=locations[0].keys())
    # writer.writeheader()
    # writer.writerows(locations)


