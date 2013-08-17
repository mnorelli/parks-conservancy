(function(exports){
    "use strict";

    console.log("APP LOADED");
    console.log(exports.GGNPC_MAP);

    angular.module("app", ['services', 'map']);
    angular.module('app').controller('AppController', ['$scope', '$location', '$route', '$routeParams', 'api', function($scope, $location, $route, $routeParams, api) {
        // Update the rendering of the page.
    }]);

    angular.module('map', [])
    .controller('mapController', ['$scope','$rootScope', function($scope, $rootScope ){

        var maps = {};

        maps.base = function(options){
            options = utils.extend({}, maps.base.defaults, options);
            var initialize = function(){
                return new google.maps.Map(document.getElementById(options.root), options.mapOptions);
            }

            return initialize();
            //return base;
        }

        maps.base.defaults = {
            mapOptions: {
                backgroundColor: '#fff',
                center: new google.maps.LatLng(37.7706, -122.3782),
                zoom: 12,
                mapTypeId: google.maps.MapTypeId.TERRAIN
            },
            root: 'ggnpc-map'
        };

        if(exports.GGNPC_MAP.mapSize == 'small'){
            var smallMapOptions = {
                disableDefaultUI: true,
                disableDoubleClickZoom: true,
                draggable: false,
                keyboardShortcuts: false,
                panControl: false,
                streetViewControl: false,
                zoomControl: false
            };

            maps.base.defaults.mapOptions = utils.extend({}, maps.base.defaults.mapOptions, smallMapOptions);

        }



        var map = maps.base();
    }]);


    /* Services */
    angular.module('services', ['services.api']);
    angular.module('services.api',[]).factory('api', ['$http', function($http){
        var API_URL_BASE = "http://stamen-parks-api-staging.herokuapp.com/";

        var api = {};

        api.currentData = null;

        api.get = function(name, callback){
            if(!name) return;
            var place = name.replace('.html','');
            var url = API_URL_BASE + '/stuff/park/' + place + '/kind/all?restrictEvents=true';

            $http({
                method: 'GET',
                url: url,
                withCredentials: false
            }).
            success(function(data, status, headers, config) {
                api.currentData = data;
                callback(null, api.currentData);
            }).
            error(function(data, status, headers, config) {
                callback('Error: loading data from API server!');
            });

        }

        return api;
    }])
    .config(['$httpProvider', function($httpProvider) {
        $httpProvider.defaults.useXDomain = true;
        delete $httpProvider.defaults.headers.common['X-Requested-With'];
    }]);






    var utils = {};

    utils.extend = function(o) {
      Array.prototype.slice.call(arguments, 1).forEach(function(other) {
        if (!other) return;
        d3.keys(other).forEach(function(k) {
          o[k] = other[k];
        });
      });
      return o;
    };





})(window);







