# use the mapquest api to get elevation profiles for a sample Parks trail 
# (using the geojson version pulled by transitandtrails-cli)
import requests
import json
from os import listdir

# MAPQUEST_API_KEY = "Fmjtd%7Cluub2h08ng%2Cbl%3Do5-9utalu"
MAPQUEST_API_KEY = "Fmjtd%7Cluub2q61n5%2Crx%3Do5-9610g6"
BASE_URL = "http://open.mapquestapi.com/elevation/v1/profile?key=%s&unit=f" % MAPQUEST_API_KEY

tnt_dir = "tnt-geojson/"
output_dir = "trips-elevation/"
for tnt_trip in listdir(tnt_dir):
    tnt_file = tnt_dir + tnt_trip
    with open(tnt_file) as infile:
        route = json.load(infile)["features"][0]
        # route = json.loads(route)

    for (i, c) in enumerate(route["geometry"]["coordinates"]):
        coord = c
        coord.reverse()
        route["geometry"]["coordinates"][i] = coord

    payload = {"latLngCollection": ",".join("%f,%f" % tuple(coords) for coords in route["geometry"]["coordinates"])}
    r = requests.post(BASE_URL, data=payload)
    elevation = r.json()["elevationProfile"]

    for (i, el) in enumerate(elevation):
        elevation[i]["coordinates"] = route["geometry"]["coordinates"][i]

    profile = {"elevation": elevation, "metadata": route["properties"]}
    output_filename = output_dir + tnt_trip.replace("geojson", "json")
    with open(output_filename, "w") as outfile:
        outfile.write(json.dumps(profile, indent=2))