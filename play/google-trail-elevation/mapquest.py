# use the mapquest api to get elevation profiles for a sample Parks trail
import requests
import json

# MAPQUEST_API_KEY = "Fmjtd%7Cluub2h08ng%2Cbl%3Do5-9utalu"
MAPQUEST_API_KEY = "Fmjtd%7Cluub2q61n5%2Crx%3Do5-9610g6"
BASE_URL = "http://open.mapquestapi.com/elevation/v1/profile?key=%s&unit=f" % MAPQUEST_API_KEY

with open("sample-route.json") as infile:
    route = json.load(infile)["route"]
    route = json.loads(route)

payload = {"latLngCollection": ",".join("%f,%f" % tuple(coords) for coords in route)}
r = requests.post(BASE_URL, data=payload)
elevation = r.json()["elevationProfile"]

for (i, el) in enumerate(elevation):
    elevation[i]["coordinates"] = route[i]

with open("elevation-profile.json", "w") as outfile:
    outfile.write(json.dumps(elevation, indent=2))