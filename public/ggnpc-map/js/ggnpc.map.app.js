(function(exports){
    "use strict";

    console.log("MAP APP LOADED");
    console.log("GGNPC_MAP OBJ: ", exports.GGNPC_MAP);
    exports.GGNPC_MAP = exports.GGNPC_MAP || {};
    exports.GGNPC_MAP.API_URL_BASE = exports.GGNPC_MAP.API_URL_BASE || 'http://stamen-parks-api-staging.herokuapp.com/';

    //exports.GGNPC_MAP.API_URL_BASE = "http://0.0.0.0:5000/";

    // Add modules to the main app module
    angular.module("app", ['services', 'myFilters', 'map', 'mapListings']);

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
        $(exports.GGNPC_MAP.root).addClass('forceShow')
        $rootScope.loadingData = false;

        // not using the $routeProvider for now
        $scope.routeParams = '';

        $scope.parkData = null;

        contextor.get($scope);

        $scope.$watch('parkContext', function(){
            api.handleContext($scope);
        });

        $scope.queryString = $location.search();

    }]);

    'use strict';

    angular.module('app')
    .directive('resizer', ['$window', function ($window) {
        return function (scope, element, attrs) {
            var offsetX = +attrs.offsetx || 0;
            var offsetY = +attrs.offsety || 0;

            scope.winWidth = $window.innerWidth - offsetX;
            scope.winHeight = $window.innerHeight - offsetY;

            console.log(scope.winWidth)

            angular.element($window).bind('resize', function () {
                scope.$apply(function () {
                    scope.winWidth = $window.innerWidth - offsetX;
                    scope.winHeight = $window.innerHeight - offsetY;
                });
            });
        };
    }]);


    /* MAP */
    // reacts to changes in $scope.parkData
    // TODO: this is more of a collection of code snippets for now, so want to wrap this into something more functional
    angular.module('map', [])
    .controller('mapController', ['$scope', '$rootScope', function($scope, $rootScope ){
        $scope.mapData = null;

        // if we need to process the data in anyway
        function process(){
            $scope.mapData = $scope.parkData;
        }

        $scope.$watch('parkData', function(){
            if(!$scope.parkData) return;

            process();
        });

    }])
    .directive('ggnpcMap', [function () {
        return {
            template: '',
            restrict: 'A',
            scope: {
                mapSize: '@',
                mapData: '=',
                parkContext: '=',
                mapTraffic: '=',
                mapWeather: '='
            },
            link: function postLink(scope, element, attrs) {
                var root = element[0] || null;
                var map;

                function handleEventContext(){
                    console.log(scope.mapData[0].data.event.attributes);
                    var data = scope.mapData[0].data.event.attributes;
                    if(data && data.relatedpark && data.relatedpark.geom){
                        var extent = new google.maps.LatLngBounds();
                        var obj = map.parks.shapes.drawGeom(data.relatedpark.geom);
                        var bounds = obj.bounds;

                        if(bounds){
                            extent.extend(bounds.getNorthEast());
                            extent.extend(bounds.getSouthWest());
                        }

                        map.fitBounds(extent);
                    }
                    if( data && data.locationmap ){
                        var ll = data.locationmap.location.split(",").map(function(l){return +l;});
                        map.parks.markers.createMarker( new google.maps.LatLng(ll[0], ll[1]), data, 3000);
                    }
                }

                function handleVisitContext(){
                    var extent = new google.maps.LatLngBounds();
                    scope.mapData[1].data.results.forEach(function(result){
                        var p = JSON.parse(result.geom);
                        var obj = map.parks.shapes.drawGeom(p);
                        var bounds = obj.bounds;
                        if(bounds){
                            extent.extend(bounds.getNorthEast());
                            extent.extend(bounds.getSouthWest());
                        }
                    });
                    map.fitBounds(extent);
                }

                function handleList(){
                    var extent = new google.maps.LatLngBounds();

                    var geojson;
                    try{
                        geojson = scope.mapData[0].data.geojson[0].results;
                    }catch(e){}

                    if(geojson)extent = drawShapes(geojson, extent);

                    var items = scope.mapData[0].data.results;
                    extent = drawMarkers(items, extent);

                    map.fitBounds(extent);
                }

                var polygonStyles = {
                    strokeColor: '#333',
                    strokeOpacity: .4,
                    strokeWeight: 2,
                    fillColor: "#4afb05",
                    fillOpacity: .2,
                    zIndex: 1000
                };
                function drawShapes(features, extent){
                    features.forEach(function(feature){
                        var obj = map.parks.shapes.drawGeom(JSON.parse(feature.geom), polygonStyles);
                        var bounds = obj.bounds;
                        if(bounds){
                            extent.extend(bounds.getNorthEast());
                            extent.extend(bounds.getSouthWest());
                        }
                        var googleVector = obj.geom;

                        if(googleVector instanceof Array){
                            googleVector.forEach(function(p){
                                google.maps.event.addListener(p, 'click', function(evt) {
                                    map.parks.infoWindow.setContent(feature.unit_name);
                                    map.parks.infoWindow.setPosition(evt.latLng);
                                    map.parks.infoWindow.open(map);
                                });
                            })
                        }

                    });

                   return extent;
                }

                function drawMarkers(items, extent){

                    items.forEach(function(item){
                        var data = item || null;

                        if (data && data.attributes){
                            var latlng;
                            var loc;

                            if(data.attributes.locationmap){
                                loc = data.attributes.locationmap;
                            }else if(data.attributes.location){
                                loc = data.attributes.location;
                            }

                            if(typeof loc === 'string'){
                                latlng = ggnpcMap.utils.makeLatLngFromLocation(loc);
                            }else if(typeof loc === 'object' && loc.location){
                                latlng = ggnpcMap.utils.makeLatLngFromLocation(loc.location);
                            }

                            if(latlng && (isNaN(latlng.lat()) || isNaN(latlng.lng()) )){
                                latlng = null;
                            }

                            if(latlng){
                                data.attributes.kind = data.kind;
                                var marker = map.parks.markers.createMarker(latlng, data.attributes, 3000);
                                extent.extend(latlng);

                                google.maps.event.addListener(marker, 'click', function() {
                                    map.parks.infoWindow.setContent(marker.data_.title + " : " + marker.data_.kind);
                                    map.parks.infoWindow.open(map,marker);
                                });

                            }else{
                                console.log("NO LOCATION: ", data);
                                //handleNoLocation(root);
                            }
                        }else{
                            console.log("NO LOCATION: ", data);
                            //handleNoLocation(root);
                        }
                    });

                    return extent;
                }

                function handleContextChange(){

                    switch(scope.parkContext){
                        case 'events':
                            handleEventContext();
                        break;
                        case 'visit':
                            handleVisitContext();
                        break;
                        case 'list':
                            handleList();
                        break;
                    }
                }

                scope.$watch('mapData', function(newVal, oldVal){
                    if(newVal){
                        if(!map){
                            map = new ggnpcMap.base({root:root}, scope.mapSize, ['markers','shapes','infoWindow']);

                            if(scope.mapTraffic) map.parks.layers.setLayer('traffic');
                            if(scope.mapWeather) map.parks.layers.setLayer('weather');

                            handleContextChange();
                        }
                    }
                });
            }
        };
    }]);


    angular.module('mapListings', [])
    .controller('mapListCtrl', ['$scope','$rootScope', function($scope, $rootScope ){
        $scope.filteredResults = [];
        $scope.itemsPerPage = 25;
        $scope.currentPage = 0;
        $scope.groupedItems = [];

        $scope.range = function (start, end) {
            var ret = [];
            if (!end) {
                end = start;
                start = 0;
            }
            for (var i = start; i < end; i++) {
                ret.push(i);
            }
            return ret;
        };

        $scope.groupToPages = function () {
            $scope.pagedItems = [];

            for (var i = 0; i < $scope.filteredResults.length; i++) {
                if (i % $scope.itemsPerPage === 0) {
                    $scope.pagedItems[Math.floor(i / $scope.itemsPerPage)] = [ $scope.filteredResults[i] ];
                } else {
                    $scope.pagedItems[Math.floor(i / $scope.itemsPerPage)].push($scope.filteredResults[i]);
                }
            }
        };

        $scope.prevPage = function () {
            if ($scope.currentPage > 0) {
                $scope.currentPage--;
            }
        };

        $scope.nextPage = function () {
            if ($scope.currentPage < $scope.pagedItems.length - 1) {
                $scope.currentPage++;
            }
        };

        $scope.setPage = function () {
            $scope.currentPage = this.n;
        };

        $scope.$watch('parkData', function(){
            if(!$scope.parkData) return;

            /*
            $scope.filteredResults.length = 0;
            var temp = [];
            $scope.parkData[0].data.results.forEach(function(item){
                switch($scope.ggnpcPageName){
                    case 'about':
                        if(item.kind == 'park' || item.kind == 'program' ){
                            temp.push(item);
                        }
                    break;
                    case 'visit':
                        if(item.kind == 'park' || item.kind == 'program' ){
                            temp.push(item);
                        }
                    break;
                }


            });
            */
            $scope.filteredResults = $scope.parkData[0].data.results.slice(0,-1);
            $scope.groupToPages();
        });

    }])
    .directive('mapList', ['api', function (api) {
        var handleNoLocation = function(elm){
            $(elm.parentNode.parentNode).addClass('no-location-found');
        }
        return {
            template: '<div></div>',
            restrict: 'A',
            scope: {
                mapkind: '=',
                mapid: '=',
                maptitle: '=',
                mapItem: '='
            },
            link: function postLink(scope, element, attrs) {
                var root = angular.element(element.children()[0])[0] || null;
                var map;
                if(root){
                    map = new ggnpcMap.base({root:root}, 'small', ['markers']);
                    var data = scope.mapItem || null;

                    if (data && data.attributes){
                        var latlng;
                        var loc;

                        if(data.attributes.locationmap){
                            loc = data.attributes.locationmap;
                        }else if(data.attributes.location){
                            loc = data.attributes.location;
                        }

                        if(typeof loc === 'string'){
                            latlng = ggnpcMap.utils.makeLatLngFromLocation(loc);
                            console.log(loc, latlng.lat(), latlng.lng())
                        }else if(typeof loc === 'object' && loc.location){
                            latlng = ggnpcMap.utils.makeLatLngFromLocation(loc.location);
                        }

                        if(latlng && (isNaN(latlng.lat()) || isNaN(latlng.lng()) )){
                            latlng = null;
                        }

                        if(latlng){

                            var marker = map.parks.markers.createMarker(latlng, {}, 3000);
                            map.setCenter(latlng);
                        }else{
                            console.log("NO LOCATION: ", scope.mapItem);
                            handleNoLocation(root);
                        }
                    }else{
                        console.log("NO LOCATION: ", scope.mapItem);
                        handleNoLocation(root);
                    }


                    /*
                    api.getById(scope.mapid, true, function(err, data){
                        var d = data[0].data;
                        if(d.attributes && d.attributes.location){

                            var loc = d.attributes.location;
                            var latlng;
                            if(typeof loc === 'string'){
                                latlng = ggnpcMap.utils.makeLatLngFromLocation(loc);

                            }else if(typeof loc === 'object' && loc.location){
                                latlng = ggnpcMap.utils.makeLatLngFromLocation(loc.location);
                            }

                            if(latlng){
                                var marker = map.parks.markers.createMarker(latlng, {}, 3000);
                                map.setCenter(latlng);
                            }else{
                                console.log("NO LOCATION: ", d.attributes);
                                handleNoLocation(root);
                            }

                        }else{
                            console.log("NO LOCATION: ", d.attributes);
                            handleNoLocation(root);
                        }
                    });
                    */

                }
            }
        };
    }]);

    angular.module('myFilters', [])
    .filter('makeUrlForKind', [function () {
        var urlSchemas = {
            'park': '/visit/park-sites/',
            'event': '/events/',
            'location': '/location/',
            'program': '/learn/',
            'subprogram': '/learn/community-programs/',
            'specie': '/conservation/plants-animals/endangered-species/',
            'project': '/park-improvements/current-projects/'
        };


        return function(input, kind){

            var link = "";
            if(!angular.isDefined(kind)) kind = 'park';
            if(angular.isDefined(urlSchemas[kind])){
                link =  environmentBaseUrl + urlSchemas[kind] + input;
            }

            return link;
        };
    }]);
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
            name = name.split("?").shift();
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
            place = place.split("?").shift();
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

        api.listKinds = function(contextType, callback){

            var requests = [];
            var url = API_URL_BASE + '/list/context/' + contextType;
            console.log(url)
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

                        if( data[0].data.key == 'stuff' && data[0].data.parent){
                            scope.ggnpcPageName = data[0].data.parent.attributes.title;
                        }
                        scope.parkData = data;
                    });

                break;
                case 'list':
                    api.listKinds( scope.ggnpcPageName, function(error, data){
                        if(error){
                            console.log(error);
                            return false;
                        }
                        if(!data || !data.length) return;
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

    // this will need to be updated to the links used inside parks environment
    angular.module('services.contextor',[]).factory('contextor', [function () {
        var contextor = {};

        // pass scope
        contextor.get = function(scope){
            var getParkContext = function(path){
                if(path == '/about' || path == '/visit' || path == '/park-improvements' || path == '/learn' || path == '/conservation' || path == '/get-involved'){
                    scope.linkToBigMap = environmentBaseUrl + "/map";
                    var p = path.replace("/",'');
                    scope.ggnpcPageName = p;
                    return 'list';
                }else if(path == '/about/map' || path == '/visit/map' || path == '/park-improvements/map' || path == '/learn/map' || path == '/conservation/map' || path == '/get-involved/map'){
                    scope.linkToBigMap = environmentBaseUrl + "/map";
                    var p = path.replace("/map",'').replace('/','');

                    scope.ggnpcPageName = p;
                    return 'list';

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

            console.log("parkContext: ",scope.parkContext, scope.ggnpcPageName)
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


    /* GOOGLE MAP STUFF */
    var ggnpcMap = {};
    ggnpcMap.base = function(options, size, optionals){
        size = size || 'big';
        options = options || {};

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

        var ggnpcMapTemplate = {
            getTileUrl: function(coord, zoom) {
                var normalizedCoord = ggnpcMap.utils.getNormalizedCoord(coord, zoom);
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

        options = utils.extend({}, mapDefaults, options);

        var map = new google.maps.Map(options.root, options.mapOptions);

        map.mapTypes.set('parks', parkMapType);
        map.setMapTypeId('parks');

        var infowindow = new google.maps.InfoWindow({});


        // Add optional helper methods
        // helpers will be in map.parks object
        map.parks = {};
        map.parks.layers = ggnpcMap.layers(map);
        if(optionals && optionals.length){
            optionals.forEach(function(opt){
                if(ggnpcMap.hasOwnProperty(opt)){
                    map.parks[opt] = ggnpcMap[opt].apply(null, [map]);
                }
            });
        }

        return map;
    }



    ggnpcMap.layers = function(map){
        return (function(map){
            var layers = {};
            var currentLayers = [];

            var availableLayers = {};

            availableLayers.weather = new google.maps.ImageMapType({
               getTileUrl: function(coord, zoom) {
                  var X = coord.x % (1 << zoom);
                  return "https://mts0.googleapis.com/mapslt?hl=en-US&lyrs=weather_0cloud,weather_f_ms|invert:1&x="+coord.x+"&y="+coord.y+"&z="+zoom+"&w=256&h=256&source=apiv3";
               },
               tileSize: new google.maps.Size(256, 256),
               isPng: true
            });

            availableLayers.traffic = new google.maps.ImageMapType({
               getTileUrl: function(coord, zoom) {
                  var X = coord.x % (1 << zoom);
                  return "http://mt3.google.com/mapstt?zoom=" + zoom + "&x=" + X + "&y=" + coord.y + "&client=api";
               },
               tileSize: new google.maps.Size(256, 256),
               isPng: true
            });

            layers.setLayer = function(lyrName){
                if(availableLayers[lyrName]){
                    currentLayers.push(lyrName);
                    map.overlayMapTypes.setAt(currentLayers.length, availableLayers[lyrName]);
                }
            };


            map.overlayMapTypes.push(null);

            return layers;

        })(map);
    }

    ggnpcMap.infoWindow = function(map){
        return (function(map){
            return new google.maps.InfoWindow({});
        })(map);
    }

    ggnpcMap.markers = function(map) {

        return (function(map){

            var markers = {};
            markers.markerPool = [];

            markers.checkMap =  function(){
                return (map) ? true : false;
            }

            markers.clearAll = function(){
                if(!this.markerPool)return;
                this.markerPool.forEach(function(m){
                    m.setMap(null);
                });
                this.markerPool.length = 0;
            }

            markers.clearOne = function(id){

            }

            markers.createMarker = function(latlng, data, zBase) {

                var marker = new google.maps.Marker({
                    map: map,
                    position: latlng,
                    data_: data,
                    vizible: true,
                    zIndex: zBase || 3000
                });

                markers.markerPool.push(marker);

                google.maps.event.addListener(marker, 'click', function() {
                    //markers.infowindow.setContent(markers.makeInfoContent(data));
                    //markers.infowindow.open(markers.map, this);
                });

                return marker;
            }

            return markers;

        })(map);

    }

    ggnpcMap.shapes = function(map){

        return (function(map){
            var shapes = {};

            shapes.drawGeom = function(path, styles){
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

                    styles = styles || featureStyles;

                    var boundary = new GeoJSON(path, styles, true);

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

                        //selectedParkOutline.push(boundary);

                        //if(boundary.geojsonBounds)map.fitBounds(boundary.geojsonBounds);
                        if(boundary.geojsonBounds) bounds = boundary.geojsonBounds;
                    }

                }else{
                    console.log("Geodata not ready!!!: ");
                }

                return {geom:boundary, bounds:bounds};
            }

            return shapes;

        })(map);

    }

    ggnpcMap.utils = {
        getNormalizedCoord: function(coord, zoom){
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
        },
        makeLatLngFromLocation: function(str){
            var ll = str.split(",").map(function(l){return +l;});
            if(ll.length < 2) return null;
            return new google.maps.LatLng(ll[0], ll[1]);
        }
    };





})(window);







