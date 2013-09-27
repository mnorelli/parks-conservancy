'use strict';

angular.module('plannerApp')
    .directive('ggnpcMap', [function () {

        return {
            template: '<div></div>',
            restrict: 'EA',
            replace: false,
            scope: {
                mapWidth: '@',
                mapHeight: '@'
            },

            link: function postLink(scope, element, attrs) {

                ggnpcMap.map(element[0]);
            }
        };
    }]);

var ggnpcMap = (function(){
    var gm = {};

    var mapOptions = {
        backgroundColor: '#fff',
        center: new google.maps.LatLng(37.7706, -122.3782),
        zoom: 12,
        mapTypeControlOptions: {
              mapTypeIds: ['parks']
            },
        scrollwheel: false,
        panControl: false,
        streetViewControl: false,
        scaleControl: false,
        mapTypeControl: false,
        minZoom: 10,
        maxZoom: 18
    };

    var map = null;

    var getNormalizedCoord = function(coord, zoom){
        var y = coord.y;
        var x = coord.x;

        // tile range in one direction range is dependent on zoom level
        // 0 = 1 tile, 1 = 2 tiles, 2 = 4 tiles, 3 = 8 tiles, etc
        var tileRange = 1 << zoom;

        // don't repeat across y-axis (vertically)
        if (y < 0 || y >= tileRange) {
            return null;
        }

        // repeat across x-axis
        if (x < 0 || x >= tileRange) {
            x = (x % tileRange + tileRange) % tileRange;
        }

        return {
            x: x,
            y: y
        };
    };

    var ggnpcMapTemplate = {
        getTileUrl: function(coord, zoom) {
            var normalizedCoord = getNormalizedCoord(coord, zoom);
            if (!normalizedCoord) {
                return null;
            }
            var subdomains = ['a','b','c','d'];
            var x = normalizedCoord.x,
                y = normalizedCoord.y,
                index = (zoom + x + y) % subdomains.length;
          return "http://{S}.map.parks.stamen.com/{Z}/{X}/{Y}.png"
              .replace("{S}", subdomains[index])
              .replace("{Z}", zoom)
              .replace("{X}", x)
              .replace("{Y}", y);
        },
        tileSize: new google.maps.Size(256, 256),
        maxZoom:  18,
        minZoom: 10,
        name: 'parks'
    };

    var parkMapType = new google.maps.ImageMapType(ggnpcMapTemplate);

    gm.map = function(elm){
        if(map){
            return map;
        }else{
            var m = new google.maps.Map(elm, mapOptions);
            console.log(m);
            m.mapTypes.set('parks', parkMapType);
            m.setMapTypeId('parks');
            return m;
        }
    };


    return gm;

})();