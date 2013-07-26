# get distances from googz
import json
import csv
from time import sleep
from urllib import urlretrieve as get

url = "http://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&sensor=false&%s"
params = {"origins": [], "destinations":[]}

# test:
params["origins"] = ["+".join("16th and mission st san francisco ca".split(" "))]

with open("data/locations.csv") as infile:
	parks = []
	for row in csv.DictReader(infile):
		if row["type"] == "Park":
			location = ",".join([row["Y"], row["X"]])
			params["destinations"].append(location)

# construct the query
origins = "origins=" + "|".join(params["origins"])
destinations = "destinations=" + "|".join(params["destinations"])
query = "&".join([origins, destinations])
distances = url % query

# test:
# get(distances, filename="json/test.json")
with open("json/test-destinations.json","w") as outfile:
	outfile.write(json.dumps(params["destinations"]))