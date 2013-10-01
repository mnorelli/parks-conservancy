// boilerplate for a custom basemap using google's api (gross)
// http://map.parks.stamen.com/13/1308/3164.png z/x/y

var mapTypeOptions = {
  getTileUrl: function(coord, zoom) {
      var bound = Math.pow(2, zoom);
      var url = "http://map.parks.stamen.com" +
          "/" + zoom + "/" + coord.x + "/" +
          coord.y + ".png";
      // console.log("tile url:", url);
      return url;
  },
  tileSize: new google.maps.Size(256, 256),
  maxZoom: 20,
  minZoom: 0,
  radius: 1738000,
  name: 'ggnra'
};

var mapType = new google.maps.ImageMapType(mapTypeOptions);