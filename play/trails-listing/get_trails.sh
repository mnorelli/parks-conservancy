tripids=$*

node process_trips.js $tripids
node create_index.js
mkdir -p svg png

for id in $tripids; do
  echo $id
  node d3-to-png/index.js --trip $id ../svg_trail_paths.js > svg/$id.svg
  convert -background none svg/$id.svg png/$id.png
done