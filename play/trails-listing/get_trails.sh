#!/bin/sh

PATH=node_modules/.bin:$PATH

# 1287 1424 1431 89 45 1297 216 1338 1446 1295 140 1333 63 1448 1449 263 1433
tripids=$*

mkdir -p trips svg png
node process_trips.js $tripids
node create_index.js

for id in $tripids; do
  echo $id
  d3-png --trip $id svg_trail_paths.js > svg/$id.svg
  convert -verbose -debug all -background none svg/$id.svg png/$id.png
done
