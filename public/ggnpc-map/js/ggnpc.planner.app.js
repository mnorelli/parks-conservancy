'use strict';
angular.module('plannerApp',[])
.controller('plannerCtrl',[function(){

}]);




angular.module('plannerApp')
.controller('toFromCtrl', ['$scope', 'geocoder', function ($scope, geocoder) {

    $scope.fromText = '';
    $scope.toText = '';
    $scope.travelMode = '';

    $scope.updateDirections = function(evt){
        (evt.preventDefault) ? evt.preventDefault() : evt.returnValue = false;

        geocoder.geocode($scope.fromText, function(err, data){
            console.log(err, data);
        });
    };
}]);



angular.module('plannerApp')
.service('geocoder', [ function() {
    var gc = {};

    var geocoder = new google.maps.Geocoder();

    var runGeocoder = function(place, callback){
        if(!geocoder) return;
        geocoder.geocode( { 'address': place}, function(results, status) {
            var latlng = null;
            if (status == google.maps.GeocoderStatus.OK) {
                return callback(null, results[0].geometry.location);
            } else {
                return callback(google.maps.GeocoderStatus);
            }

        });
    };

    gc.geocode = function(place, callback){
        if(place && place.length){
            return runGeocoder(place, callback);
        }else{
            return callback('error');
        }
    };

    return gc;

}]);