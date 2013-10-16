for trip in trips/*-elevation.json 
do
  trip=${trip%-elevation.json}
  trip=${trip#trips/}
  echo $trip
  node d3-to-png/index.js --trip $trip ../svg_trail_paths.js > svg/$trip.svg
  convert -background none svg/$trip.svg png/$trip.png
done