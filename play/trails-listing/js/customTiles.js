// boilerplate for a custom basemap using google's api (gross)
// http://map.parks.stamen.com/13/1308/3164.png z/x/y

var mapTypeOptions = {
  getTileUrl: function(coord, zoom) {
      var bound = Math.pow(2, zoom);
      var url = [
        "http://sm.mapstack.stamen.com/",
        "((http%3A%2F%2Ftilefarm.stamen.com",
        "%2Fterrain-grey-hills%2F%7Bz%7D%2F%7Bx%7D%2F%7By%7D.png,",
        "$fff[@60],$fff[hsl-saturation])[@35],",
        "http%3A%2F%2Fggnpc-tp.herokuapp.com%2Fbackground",
        "%2F%7Bz%7D%2F%7Bx%7D%2F%7By%7D.png[multiply]),",
        "http%3A%2F%2Fggnpc-tp.herokuapp.com",
        "%2Ffeatures%2F%7Bz%7D%2F%7Bx%7D%2F%7By%7D.png,",
        "http%3A%2F%2Fggnpc-tp.herokuapp.com",
        "%2Flabels%2F%7Bz%7D%2F%7Bx%7D%2F%7By%7D.png",
        "/" + zoom + "/" + coord.x + "/" + coord.y + ".png"
      ].join("");
      // var url = "http://map.parks.stamen.com" +
      //     "/" + zoom + "/" + coord.x + "/" +
      //     coord.y + ".png";
      return url;
  },
  tileSize: new google.maps.Size(256, 256),
  maxZoom: 20,
  minZoom: 0,
  radius: 1738000,
  name: 'ggnra'
};

var mapType = new google.maps.ImageMapType(mapTypeOptions);