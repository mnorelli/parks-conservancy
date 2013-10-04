var GGNPC = (function(exports){
    var maps = exports.maps = exports.maps || {};

    maps.base = function(options){
        options = GGNPC.utils.extend({}, maps.base.defaults, options);
        var base = {};
        var map;

        var initialize = function(){
            return new google.maps.Map(document.getElementById(options.root), options.mapOptions);
        }

        return initialize();
        //return base;
    }

    maps.base.defaults = {
        mapOptions: {
            center: new google.maps.LatLng(37.7706, -122.3782),
            zoom: 12,
            mapTypeId: google.maps.MapTypeId.TERRAIN
        },
        root: 'map'
    };

    return exports;
})(GGNPC || {});