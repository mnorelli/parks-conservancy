(function(exports){
    "use strict";


    console.log("APP LOADED");
    console.log(exports.GGNPC_MAP);

    angular.module("app", ['services', 'map']);

    angular.module('app').config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
      //$locationProvider.html5Mode(true);

      $routeProvider
          .when(
              "/map",
              {
                  action: "map"
              }
          );
    }]);

    angular.module('app').controller('AppController', ['$scope', '$location', '$route', '$routeParams', 'api', function($scope, $location, $route, $routeParams, api) {

        // not using the $routeProvider for now
        $scope.routeParams = ''

        var getParkContext = function(path){

            if(path.indexOf('/visit/park-sites/') === 0){
                $scope.routeParams = path.split('/').pop();
                $scope.linkToBigMap = environmentBaseUrl + "/map/#" + path;
                return 'visit';
            }

            return '';
        }

        var pathname = window.location.pathname;
        if(pathname.indexOf('/map') == 0) pathname = window.location.hash.substring(1);
        $scope.parkContext = getParkContext( pathname );
        $scope.parkData = null;



        var callApi = function(){
            api.get($scope.routeParams, function(error, data){
                if(error){
                    console.log(error);
                    return false;
                }
                if(!data || !data.length)return;

                if( data[0].data.key == 'stuff'){
                    $scope.ggnpcPageName = data[0].data.parent.attributes.title;

                    console.log('$scope.ggnpcPageName: ',$scope.ggnpcPageName)
                }
                $scope.parkData = data;
            });
        }

        $scope.$watch('parkContext', function(){
            callApi();
        });

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



        var selectedParkOutline = null;
        //obj.data.results[0].geom
        var showBoundary = function(path){
            if(!$scope.parkData)return;

            path = JSON.parse(path);
            console.log( path );
            if(path && path.coordinates){

                var featureStyles = {
                    strokeColor: '#333',
                    strokeOpacity: .4,
                    strokeWeight: 1,
                    fillColor: "#4afb05",
                    fillOpacity: 0.55,
                    zIndex: 1000
                  };


                selectedParkOutline = new GeoJSON(path, featureStyles, true);

                console.log('selectedParkOutline: ', selectedParkOutline)

                if (selectedParkOutline.type == 'Error'){
                    console.log("Error: no boundary for this park")
                }else{

                    if(selectedParkOutline instanceof Array){
                        selectedParkOutline.forEach(function(p){
                            p.setMap(map);
                        });
                    }else{
                        selectedParkOutline.setMap(map);
                    }

                    if(selectedParkOutline.geojsonBounds)map.fitBounds(selectedParkOutline.geojsonBounds);
                }

            }else{
                console.log("Geodata not ready!!!: ");
            }
        }

        function handleContextChange(){
            var p = $scope.parkData[1].data.results[0].geom;
            showBoundary(p)
        }

        $scope.$watch('parkData', function(){
            if(!$scope.parkData) return;

            console.log("CHANGED: ", $scope.parkData);
            handleContextChange();
        })



        var map = maps.base();
    }]);

    //http://stamen-parks-api-staging.herokuapp.com/geo/park/Montara
    /* Services */
    angular.module('services', ['services.api']);
    angular.module('services.api',[]).factory('api', ['$http', '$q', function($http, $q){
        var API_URL_BASE = "http://stamen-parks-api-staging.herokuapp.com/";


        var request = function(url, key){
            return $http({
                method: 'GET',
                url: url,
                withCredentials: false
            }).
            success(function(data, status, headers, config) {
                data = data || {};
                data.key = key;
            }).
            error(function(data, status, headers, config) {
                data = data || {};
                data.key = key;
            });
        }

        var api = {};

        api.currentData = null;

        api.get = function(name, callback){

            var requests = [];

            if(!name) return [];

            var place = name.replace('.html','');
            var url = API_URL_BASE + '/stuff/park/' + place + '/kind/all?restrictEvents=true';
            var outline = API_URL_BASE + 'geo/park/' + name;
            requests.push( request(url, 'stuff') );
            requests.push( request(outline, 'outline') );


            $q.all(requests).then(function(results){

                var rsp = [];
                if(results){
                    results.forEach(function(result){
                        var key = result.data.key;
                        rsp.push({'type': key, 'data': result.data});
                    });
                }
                api.currentData = rsp;
                callback(null, rsp);

                //$rootScope.loadingData = false;
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







