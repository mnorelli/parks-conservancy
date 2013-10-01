angular.module('plannerApp')
.service('geocoder', [, function() {
    var geocoder = {};

    var geocoder = new google.maps.Geocoder();

    var runGeocoder = function(place, callback){
        geocoder.geocode( { 'address': address}, function(results, status) {
            var latlng = null;
            if (status == google.maps.GeocoderStatus.OK) {
                return callback(null, results[0].geometry.location);
            } else {
                return callback(google.maps.GeocoderStatus);
            }

        });
    }
    geocoder.geocode = function(place, callback){
        if(place && place.length){
            return runGeocoder(place, callback);
        }else{
            return callback('error');
        }
    }

    return geocoder;

}]);