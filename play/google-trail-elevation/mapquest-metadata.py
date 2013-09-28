# use the mapquest api to get elevation profiles for a sample Parks trail 
# (using the geojson version pulled by transitandtrails-cli)
import requests
import json

# MAPQUEST_API_KEY = "Fmjtd%7Cluub2h08ng%2Cbl%3Do5-9utalu"
MAPQUEST_API_KEY = "Fmjtd%7Cluub2q61n5%2Crx%3Do5-9610g6"
BASE_URL = "http://open.mapquestapi.com/elevation/v1/profile?key=%s&unit=f" % MAPQUEST_API_KEY

with open("sample-route-metadata.geojson") as infile:
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
with open("elevation-profile-metadata.json", "w") as outfile:
    outfile.write(json.dumps(profile, indent=2))