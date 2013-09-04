(function(exports){
    "use strict";

    console.log("MAP APP LOADED");
    console.log("GGNPC_MAP OBJ: ", exports.GGNPC_MAP);
    exports.GGNPC_MAP = exports.GGNPC_MAP || {};
    exports.GGNPC_MAP.API_URL_BASE = exports.GGNPC_MAP.API_URL_BASE || 'http://stamen-parks-api-staging.herokuapp.com/';

    exports.GGNPC_MAP.API_URL_BASE = "http://0.0.0.0:5000/";

    // Add modules to the main app module
    angular.module("app", ['services', 'map', 'mapListings']);

    //
    angular.module('app').config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
        //$locationProvider.html5Mode(true);

        $routeProvider
            .when(
                '/map',
                {
                    action: 'map'
                }
            );

    }]);

    // controller for app
    // handles setting the context
    angular.module('app').controller('AppController', ['$scope', '$rootScope', '$location', '$route', '$routeParams', 'api', 'contextor', function($scope, $rootScope, $location, $route, $routeParams, api, contextor) {
        $rootScope.loadingData = false;

        // not using the $routeProvider for now
        $scope.routeParams = '';

        $scope.parkData = null;

        contextor.get($scope);

        $scope.$watch('parkContext', function(){
            api.handleContext($scope);
        });

    }]);


    /* MAP */
    // reacts to changes in $scope.parkData
    // TODO: this is more of a collection of code snippets for now, so want to wrap this into something more functional
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
                case 'events':
                    handleEventContext();
                break;
                case 'visit':
                    handleVisitContext();
                break;
            }
        }

        $scope.$watch('parkData', function(){
            if(!$scope.parkData) return;

            console.log('PARK DATA CHANGED: ', $scope.parkData);
            handleContextChange();
        });

        var map = maps.base();
        map.mapTypes.set('parks', parkMapType);
        map.setMapTypeId('parks');

    }])
    .directive('ggnpcMap', [function () {
      return {
        template: '',
        restrict: 'A',
        link: function postLink(scope, element, attrs) {
          element.text('this is the myDirective directive');
        }
      };
    }]);



    angular.module('mapListings', [])
    .controller('mapListCtrl', ['$scope','$rootScope', function($scope, $rootScope ){
        $scope.filteredResults = [];

        $scope.$watch('parkData', function(){
            if(!$scope.parkData) return;

            $scope.filteredResults.length = 0;
            var temp = [];
            $scope.parkData[0].data.results.forEach(function(item){

                if(item.kind == 'park' || item.kind == 'program' ){
                    temp.push(item);
                }

            });
            $scope.filteredResults = temp;
        });

    }])
    .directive('mapList', ['api', function (api) {

        return {
            template: '<div></div>',
            restrict: 'A',
            scope: {
                mapkind: '=',
                mapid: '=',
                maptitle: '='
            },
            link: function postLink(scope, element, attrs) {
                var root = angular.element(element.children()[0])[0] || null;
                if(root){
                    var map = new gMap({root:root}, 'small');

                    api.getById(scope.mapid, true, function(err, data){
                        var d = data[0].data;
                        if(d.attributes && d.attributes.location){
                            var loc = d.attributes.location;
                            if(typeof loc === 'string'){
                                var latlng = map.ggnpc.utils.makeLatLngFromLocation(loc);
                                var marker = map.ggnpc.createMarker(latlng, {}, 3000);
                                map.setCenter(latlng);
                            }
                        }
                    });
                }
            }
        };
    }]);



    var gMap = function(options, size){

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


        var mapDefaults = {
            mapOptions: {
                backgroundColor: '#fff',
                center: new google.maps.LatLng(37.7706, -122.3782),
                zoom: 12,
                mapTypeControlOptions: {
                      mapTypeIds: ['parks']
                    },
                scrollwheel: false
            },
            root: null
        };
        var smallMapOptions = {
                disableDefaultUI: true,
                disableDoubleClickZoom: true,
                draggable: false,
                keyboardShortcuts: false,
                panControl: false,
                streetViewControl: false,
                zoomControl: false
            };

        if(size == 'small'){
            mapDefaults.mapOptions = utils.extend({}, mapDefaults.mapOptions, smallMapOptions);

        }



        var methods = {};
        methods.map = null;
        methods.markerPool = [];
        methods.createMarker = function(latlng, data, zBase) {

                var marker = new google.maps.Marker({
                    map: methods.map,
                    position: latlng,
                    ggnpc_data: data,
                    vizible: true,
                    zIndex: zBase || 3000
                });

                methods.markerPool.push(marker);

                google.maps.event.addListener(marker, 'click', function() {
                    //markers.infowindow.setContent(markers.makeInfoContent(data));
                    //markers.infowindow.open(markers.map, this);
                });

                return marker;
            }

        methods.utils = {};
        methods.utils.makeLatLngFromLocation = function(str){
            var ll = str.split(",").map(function(l){return +l;});
            return new google.maps.LatLng(ll[0], ll[1]);
        }



        maps.init = function(options){
            options = utils.extend({}, mapDefaults, options);
            var initialize = function(){
                return new google.maps.Map(options.root, options.mapOptions);
            }

            var m = initialize();
            m.mapTypes.set('parks', parkMapType);
            m.setMapTypeId('parks');
            m.ggnpc = methods;
            m.ggnpc.map = m;

            return m;
            //return base;
        }

        return maps.init(options);
    }



    /* Services */
    angular.module('services', ['services.api','services.contextor']);

    angular.module('services.api',[]).factory('api', ['$http', '$q', '$rootScope', function($http, $q, $rootScope){
        var API_URL_BASE = exports.GGNPC_MAP.API_URL_BASE;

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
        };

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

        };

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
        };

        api.listKinds = function(callback){
            var requests = [];
            var url = API_URL_BASE + '/list/all';
            requests.push( request(url, 'list') );
            $q.all(requests).then(function(results){

                var rsp = [];
                if(results){
                    results.forEach(function(result){
                        var key = result.data.key;
                        rsp.push({'type': key, 'data': result.data});
                    });
                }

                callback(null, rsp);

                $rootScope.loadingData = false;
            });
        }

        api.getById = function(id, autoexpand, callback){
            var requests = [];
            var url = API_URL_BASE + 'all/id/' + id + '?autoexpand=1';
            requests.push( request(url, 'item') );

            $q.all(requests).then(function(results){

                var rsp = [];
                if(results){
                    results.forEach(function(result){
                        var key = result.data.key;
                        rsp.push({'type': key, 'data': result.data.results[0]});
                    });
                }

                callback(null, rsp);

                $rootScope.loadingData = false;
            });

        }

        api.get = function(name, callback){

            callback('deprecated');

        };

        api.handleContext = function(scope){
            $rootScope.loadingData = true;
            console.log(scope.parkContext)
            switch(scope.parkContext){
                case 'events':

                    api.getEventContext(scope.routeParams, function(error, data){
                        if(error){
                            console.log(error);
                            return false;
                        }
                        if(!data || !data.length)return;
                        console.log(data);

                        if( data[0].data.key == 'stuff' && data[0].data.parent){
                            scope.ggnpcPageName = data[0].data.ttributes.title;
                            console.log('scope.ggnpcPageName: ', scope.ggnpcPageName)
                        }

                        scope.parkData = data;
                    });

                break;
                case 'visit':

                    api.getVisitContext(scope.routeParams, function(error, data){
                        if(error){
                            console.log(error);
                            return false;
                        }
                        if(!data || !data.length) return;
                        console.log(data);
                        if( data[0].data.key == 'stuff' && data[0].data.parent){
                            scope.ggnpcPageName = data[0].data.parent.attributes.title;

                            console.log('$scope.ggnpcPageName: ', scope.ggnpcPageName);
                        }
                        scope.parkData = data;
                    });

                break;
                case 'list':
                    api.listKinds( function(error, data){
                        if(error){
                            console.log(error);
                            return false;
                        }
                        if(!data || !data.length) return;
                        console.log(data)
                        scope.parkData = data;
                    });
                break;
            }

        };

        return api;
    }])
    .config(['$httpProvider', function($httpProvider) {
        $httpProvider.defaults.useXDomain = true;
        delete $httpProvider.defaults.headers.common['X-Requested-With'];
    }]);


    angular.module('services.contextor',[]).factory('contextor', [function () {
        var contextor = {};

        // pass scope
        contextor.get = function(scope){
            var getParkContext = function(path){
                console.log("PATH: ",path)
                if(path == '/about'){
                    scope.linkToBigMap = environmentBaseUrl + "/map";
                    scope.ggnpcPageName = "About";
                    return 'list'
                }else if(path.indexOf('/visit/park-sites/') === 0){
                    scope.routeParams = path.split('/').pop();
                    scope.linkToBigMap = environmentBaseUrl + "/map/#" + path;
                    return 'visit';
                }else if(path.indexOf('/events/') === 0){
                    scope.routeParams = path.split('/').pop();
                    scope.linkToBigMap = environmentBaseUrl + "/map/#" + path;
                    return 'events';
                }else{
                    scope.linkToBigMap = environmentBaseUrl + "/map";
                    scope.ggnpcPageName = "Index"
                }

                return '';
            };

            var pathname = window.location.pathname;
            if(pathname.indexOf('/map') == 0) pathname = window.location.hash.substring(1);
            if(pathname.charAt(pathname.length-1) == "/")pathname = pathname.substring(0, pathname.length-1);
            scope.parkContext = getParkContext(pathname);
        }
        return contextor;
    }]);


    /* misc utilities */
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







