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

    angular.module('app').controller('AppController', ['$scope', '$rootScope', '$location', '$route', '$routeParams', 'api', function($scope, $rootScope, $location, $route, $routeParams, api) {
        $rootScope.loadingData = false;

        // not using the $routeProvider for now
        $scope.routeParams = ''

        var getParkContext = function(path){

            if(path.indexOf('/visit/park-sites/') === 0){
                $scope.routeParams = path.split('/').pop();
                $scope.linkToBigMap = environmentBaseUrl + "/map/#" + path;
                return 'visit';
            }else if(path.indexOf('/events/') === 0){
                $scope.routeParams = path.split('/').pop();
                $scope.linkToBigMap = environmentBaseUrl + "/map/#" + path;
                return 'events';
            }else{
                $scope.linkToBigMap = environmentBaseUrl + "/map";
                $scope.ggnpcPageName = "Index"
            }

            return '';
        }

        var pathname = window.location.pathname;
        if(pathname.indexOf('/map') == 0) pathname = window.location.hash.substring(1);


        $scope.parkContext = getParkContext( pathname );
        $scope.parkData = null;



        var callApi = function(){
            $rootScope.loadingData = true;

            switch($scope.parkContext){
                case 'events':
                    api.getEventContext($scope.routeParams, function(error, data){
                        if(error){
                            console.log(error);
                            return false;
                        }
                        if(!data || !data.length)return;
                        console.log(data)
                        if( data[0].data.key == 'stuff' && data[0].data.parent){
                            $scope.ggnpcPageName = data[0].data.ttributes.title;

                            console.log('$scope.ggnpcPageName: ',$scope.ggnpcPageName)
                        }
                        $scope.parkData = data;
                    });
                break;
                case 'visit':
                    api.getVisitContext($scope.routeParams, function(error, data){
                        if(error){
                            console.log(error);
                            return false;
                        }
                        if(!data || !data.length) return;
                        console.log(data);
                        if( data[0].data.key == 'stuff' && data[0].data.parent){
                            $scope.ggnpcPageName = data[0].data.parent.attributes.title;

                            console.log('$scope.ggnpcPageName: ',$scope.ggnpcPageName);
                        }
                        $scope.parkData = data;
                    });
                break;

            }

        }

        $scope.$watch('parkContext', function(){
            callApi();
        });

    }]);

    angular.module('map', [])
    .controller('mapController', ['$scope','$rootScope', function($scope, $rootScope ){

        // Normalizes the coords that tiles repeat across the x axis (horizontally)
        // like the standard Google map tiles.
        function getNormalizedCoord(coord, zoom) {
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
        }

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

        var maps = {};

        //http://stamen-parks-map.herokuapp.com/17/20942/50637.png
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
                mapTypeControlOptions: {
                      mapTypeIds: ['parks']
                    }
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



        var selectedParkOutline = [];
        //obj.data.results[0].geom
        var showBoundary = function(path){
            console.log('')
            if(!$scope.parkData)return;

            var bounds = null;
            if(path && path.coordinates){

                var featureStyles = {
                    strokeColor: '#333',
                    strokeOpacity: .4,
                    strokeWeight: 1,
                    fillColor: "#4afb05",
                    fillOpacity: 0.55,
                    zIndex: 1000
                };

                var boundary = new GeoJSON(path, featureStyles, true);


                if (boundary.type == 'Error'){
                    console.log("Error: no boundary for this park")
                }else{

                    if(boundary instanceof Array){
                        boundary.forEach(function(p){
                            p.setMap(map);
                        });
                    }else{
                        boundary.setMap(map);
                    }

                    selectedParkOutline.push(boundary);

                    //if(boundary.geojsonBounds)map.fitBounds(boundary.geojsonBounds);
                    if(boundary.geojsonBounds) bounds = boundary.geojsonBounds;
                }

            }else{
                console.log("Geodata not ready!!!: ");
            }

            return bounds;
        }

        var markerPool = [];

        var createMarker = function(latlng, data, zBase) {
            var marker = new google.maps.Marker({
                map: map,
                position: latlng,
                ggnpc_data: data,
                vizible: true,
                zIndex: zBase || 3000
            });

            markerPool.push(marker);

            google.maps.event.addListener(marker, 'click', function() {
                //markers.infowindow.setContent(markers.makeInfoContent(data));
                //markers.infowindow.open(markers.map, this);
            });

            return marker;
        }

        function handleEventContext(){
            console.log($scope.parkData[0].data.event.attributes);
            var data = $scope.parkData[0].data.event.attributes;
            if(data && data.relatedpark && data.relatedpark.geom){
                var extent = new google.maps.LatLngBounds();
                var bounds = showBoundary(data.relatedpark.geom);
                if(bounds){
                    extent.extend(bounds.getNorthEast());
                    extent.extend(bounds.getSouthWest());
                }

                map.fitBounds(extent);
            }
            if( data && data.locationmap ){
                var ll = data.locationmap.location.split(",").map(function(l){return +l;});
                createMarker( new google.maps.LatLng(ll[0], ll[1]), data, 3000);
            }
        }

        function handleVisitContext(){
            var extent = new google.maps.LatLngBounds();
            $scope.parkData[1].data.results.forEach(function(result){
                var p = JSON.parse(result.geom);
                var bounds = showBoundary(p);
                if(bounds){
                    extent.extend(bounds.getNorthEast());
                    extent.extend(bounds.getSouthWest());
                }
            });
            map.fitBounds(extent);
        }

        function handleContextChange(){
            switch($scope.parkContext){
                case  'events':
                    handleEventContext();
                break;
                case 'visit':
                    handleVisitContext();
                break;
            }

        }

        $scope.$watch('parkData', function(){
            if(!$scope.parkData) return;

            console.log("CHANGED: ", $scope.parkData);
            handleContextChange();
        })



        var map = maps.base();
        map.mapTypes.set('parks', parkMapType);
        map.setMapTypeId('parks');

    }]);

    //http://stamen-parks-api-staging.herokuapp.com/geo/park/Montara
    /* Services */
    angular.module('services', ['services.api']);
    angular.module('services.api',[]).factory('api', ['$http', '$q', '$rootScope', function($http, $q, $rootScope){
        var API_URL_BASE = "http://stamen-parks-api-staging.herokuapp.com/";
        //var API_URL_BASE = 'http://0.0.0.0:5000/';

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

        api.getEventContext = function(name, callback){
            if(!name)return callback('error', null);
            var requests = [];

            name = name.replace('.html','');
            var url = API_URL_BASE + 'context/event/' + name;
            requests.push( request(url, 'stuff') );
            //requests.push( request(outline, 'outline') );


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

                $rootScope.loadingData = false;
            });

        }

        api.getVisitContext = function(name, callback){
            var requests = [];

            if(!name) name = 'all';

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

                $rootScope.loadingData = false;
            });
        }

        api.get = function(name, callback){

            callback('deprecated');

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







