# create an index/meta file so we don't have to load all elevation profiles
# at the same time
# NOTE: this should eventually live in the same script that pulls the profile data
# from TnT (and also pulls elevation data, converts to SVG and stores as PNG)
# NOTE 2: this will probably be pulling from postgres instead of building index json
import json
from os import listdir

output = []
data_dir = "data/"
for filename in [f for f in listdir(data_dir) if f != "index.json"]:
    fname = data_dir + filename
    with open(fname) as infile:
        profile = json.load(infile)
    metadata = profile["metadata"]
    del metadata["description"] # huge and unnecessary for the basic view
    output.append(metadata)

print json.dumps(output, indent=2)