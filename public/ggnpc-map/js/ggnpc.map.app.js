(function(exports){
    "use strict";

    exports.GGNPC_MAP = exports.GGNPC_MAP || {};
    exports.GGNPC_MAP.API_URL_BASE = exports.GGNPC_MAP.API_URL_BASE || 'http://stamen-parks-api-staging.herokuapp.com/';

    //exports.GGNPC_MAP.API_URL_BASE = "http://0.0.0.0:5000/";

    // Add modules to the main app module
    angular.module("app", ['services', 'filters', 'map', '$strap.directives']);

    // app config
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
    angular.module('app').controller('AppController', ['$scope', '$rootScope', '$location', '$route', '$routeParams', 'api', 'contextor', function($scope, $rootScope, $location, $route, $routeParams, api, contextor) {
        $(exports.GGNPC_MAP.root).addClass('forceShow');

        $rootScope.isBigMap = GGNPC_MAP.mapSize == 'big' ? true : false;

        //when you add it to $rootScope, then it's accessible to all other $scope variables.
        $rootScope.$safeApply = function($scope, fn) {
            fn = fn || function() {};
            if($scope.$$phase) {
                //don't worry, the value gets set and AngularJS picks up on it...
                fn();
            }else {
                //this will fire to tell angularjs to notice that a change has happened
                //if it is outside of it's own behaviour...
                $scope.$apply(fn);
            }
        };

        // This pretty much starts the whole thing.
        // checks to see what page we are on
        // The map reacts to this change
        // then loads and renders the data
        function checkContext(){
            contextor.set();

            if(GGNPC_MAP.mapSize == 'small' && contextor.context.linkToBigMap){
                $rootScope.linkToBigMap = contextor.context.linkToBigMap;

                if(contextor.context.linkToPlanner){
                    $rootScope.linkToPlanner = contextor.context.linkToPlanner;
                }
            }

            $rootScope.contextChange = +new Date();

        }

        // Since we're not really changing "routes" probably won't need this
        // but it's here for not just in case
        var lastRoute = $route.current;
        $scope.$on(
            '$routeChangeSuccess',
            function($currentRoute, $previousRoute){
                $route.current = lastRoute;
                console.log("ROUte CHange")

                $scope.$safeApply($scope, function() {
                     console.log("..............Safe applying");
                });
            }
        );

        checkContext();

    }]);

    // resize a DOM element on window resize
    angular.module('app')
    .directive('resizer', ['$window', function ($window) {
        return function (scope, element, attrs) {
            var offsetX = +attrs.offsetx || 0;
            var offsetY = +attrs.offsety || 0;

            scope.winWidth = $window.innerWidth - offsetX;
            scope.winHeight = $window.innerHeight - offsetY;

            angular.element($window).bind('resize', function () {
                scope.$apply(function () {
                    scope.winWidth = $window.innerWidth - offsetX;
                    scope.winHeight = $window.innerHeight - offsetY;
                });
            });
        };
    }]);


    angular.module('filters', [])
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
    angular.module('services', ['services.api', 'services.contextor', 'services.debounce', 'services.hasher']);

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


            /*
                1. get place
                2. get children of place (outline & geometries)
            */

            /*
            var place = name.replace('.html','');
            place = place.split("?").shift();
            var url = API_URL_BASE + '/stuff/park/' + place + '/kind/all?restrictEvents=true';
            var outline = API_URL_BASE + 'geo/park/' + name;
            requests.push( request(url, 'stuff') );
            requests.push( request(outline, 'outline') );
            */

            //http://0.0.0.0:5000/context/alcatraz.html

            var url = API_URL_BASE + 'context/' + name;
            requests.push( request(url, 'stuff') );


            $q.all(requests).then(function(results){

                var rsp = [];
                if(results){
                    results.forEach(function(result){
                        var key = result.data.key;
                        rsp.push({'type': key, 'data': result.data});
                    });
                }
                api.currentData = rsp;
                console.log("RSP: ", rsp)
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

        };

        api.getUsingBBox = function(bbox, callback){
            var requests = [];
            var url = API_URL_BASE + 'bbox/' + encodeURIComponent(bbox);

            requests.push( request(url, 'stuff') );

            $q.all(requests).then(function(results){

                var rsp = [];
                if(results){

                    results.forEach(function(result){
                        //console.log("Result: ", result);
                        var key = result.data.key;
                        rsp.push({'type': key, 'data': result.data.results});
                    });
                }

                callback(null, rsp);

                $rootScope.loadingData = false;
            });
        };

        api.get = function(name, callback){

            callback('deprecated');

        };

        api.handleContext = function(context, callback){
            //$rootScope.loadingData = true;

            switch(context.section){
                case 'events':

                    api.getEventContext(context.fileName, function(error, data){
                        if(error)return callback(error, null);

                        if(!data || !data.length)return callback(null, []);

                        var r = {
                            children: data[0].data.children.results || [],
                            parent: data[0].data.parent.results[0].attributes || {},
                            geom: data[0].data.outlines.results || []
                        };

                        context.ggnpcPageName = r.parent.title;

                        return callback(null, r);
                    });

                break;
                case 'visit':

                    api.getVisitContext(context.fileName, function(error, data){
                        if(error) return callback(error, null);

                        if(!data || !data.length) return callback(null, []);

                        var r = {
                            children: data[0].data.children.results || [],
                            parent: data[0].data.parent.results[0].attributes || {},
                            geom: data[0].data.outlines.results || []
                        };

                        context.ggnpcPageName = r.parent.title;



                        return callback(null, r);
                    });

                break;
                case 'list':
                    api.listKinds(context.fileName, function(error, data){
                        if(error) return callback(error, null);

                        if(!data || !data.length) return callback(null, []);

                        return callback(null, data[0].data);
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

        // stores our context params
        contextor.context = {};

        // set our context params
        contextor.set = function(){
            var o = {};
            var getParkContext = function(path){
                if(path == '/about' || path == '/visit' || path == '/park-improvements' || path == '/learn' || path == '/conservation' || path == '/get-involved'){
                    o.fileName = path.split('/').pop();
                    o.linkToBigMap  = environmentBaseUrl + "/map";
                    o.linkToPlanner = environmentBaseUrl + "/planner";
                    o.ggnpcPageName = path.replace("/",'');
                    o.section = 'list';

                }else if(path == '/about/map' || path == '/visit/map' || path == '/park-improvements/map' || path == '/learn/map' || path == '/conservation/map' || path == '/get-involved/map'){
                    o.linkToBigMap = environmentBaseUrl + "/map";
                    o.linkToPlanner = environmentBaseUrl + "/planner";
                    o.ggnpcPageName = path.replace("/map",'').replace('/','');
                    o.section = 'list';

                }else if(path.indexOf('/visit/park-sites/') === 0){
                    o.fileName = path.split('/').pop();
                    o.linkToBigMap = environmentBaseUrl + "/map/#" + path;
                    o.linkToPlanner = environmentBaseUrl + "/planner/#" + path;
                    o.section = 'visit';

                }else if(path.indexOf('/events/') === 0){
                    o.fileName = path.split('/').pop();
                    o.linkToBigMap = environmentBaseUrl + "/map/#" + path;
                    o.linkToPlanner = environmentBaseUrl + "/planner/#" + path;
                    o.section =  'events';

                }else{
                    o.fileName = '';
                    o.linkToBigMap = environmentBaseUrl + "/map";
                    o.linkToPlanner = environmentBaseUrl + "/planner";
                    o.ggnpcPageName = "Index"
                    o.section = '';
                }

                return o;
            };

            var pathname = window.location.pathname;
            if(pathname.indexOf('/map') == 0) pathname = window.location.hash.substring(1);
            if(pathname.charAt(pathname.length-1) == "/")pathname = pathname.substring(0, pathname.length-1);

            contextor.context = getParkContext(pathname);
        }

        return contextor;
    }]);

    angular.module('services.utilites', []).factory('utils', [function(){
        var utils = {}

        utils.extend = function(o) {
          Array.prototype.slice.call(arguments, 1).forEach(function(other) {
            if (!other) return;
            d3.keys(other).forEach(function(k) {
              o[k] = other[k];
            });
          });
          return o;
        };

        return utils;
    }]);

    angular.module('services.hasher', []).factory('hasher', ['$location', function($location){
        var hasher = {};
        var currentHash = {};

        hasher.set = function(obj){
            //console.log("SET: ", obj, $location.search('a','b'));
            currentHash = angular.extend(currentHash, obj);
            $location.search(currentHash);

        }

        hasher.get = function(){
            return currentHash;
        }

        hasher.read = function(){
            return $location.search();
        }

        return hasher;
    }]);


    angular.module('services.debounce', [])
        .factory('debounce', ['$timeout','$q', function($timeout, $q){
            return function(func, wait, immediate) {
                var timeout;
                var deferred = $q.defer();
                return function() {
                    var context = this, args = arguments;
                    var later = function() {
                        timeout = null;
                        if(!immediate) {
                            deferred.resolve(func.apply(context, args));
                            deferred = $q.defer();
                        }
                    };
                    var callNow = immediate && !timeout;
                    if ( timeout ) {
                        $timeout.cancel(timeout);
                    }
                    timeout = $timeout(later, wait);
                    if (callNow) {
                        deferred.resolve(func.apply(context,args));
                        deferred = $q.defer();
                    }
                    return deferred.promise;
                };
            };
        }]);


    var floatEqual = function (f1, f2) {
        return (Math.abs(f1 - f2) < 0.000001);
    }

    /* MAP */
    angular.module('map', [])
    .controller('mapController', ['$scope', '$rootScope', 'contextor', 'api', 'hasher', function($scope, $rootScope, contextor, api, hasher){

        // map template object
        var ggnpcMapTemplate = {
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

            getTileUrl: function(coord, zoom) {
                var normalizedCoord = this.getNormalizedCoord(coord, zoom);
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

        $scope.currentBoundString = null;
        $scope.markers = [];
        $scope.geometries = [];



        var initialUrlParams = hasher.read();

        var initialZoom = 12,
            initialCenter = new google.maps.LatLng(37.7706, -122.3782);

        if(initialUrlParams && initialUrlParams.hasOwnProperty('c')){
            var parts = initialUrlParams.c.split(':');
            if(parts.length){
                initialZoom = parseInt(parts[0], 10);
                if(parts[1] && parts[2]){
                    initialCenter = new google.maps.LatLng(+parts[1], +parts[2]);

                    $scope.initialDefinedLocation = true;
                }
            }
        }

        var mapOptions = {
            center: initialCenter,
            zoom: initialZoom,
            draggable: true,
            options: {
                backgroundColor: '#fff',
                mapTypeControlOptions: {
                    mapTypeIds: ['parks']
                },

                mapTypeControl: false,
                scrollwheel: false,
                streetViewControl: false

            },
            tileTemplate: {
                name: 'parks',
                template: ggnpcMapTemplate,
            }
        }

        var smallMapOptions =  {
            draggable: false,
            options:{
                disableDefaultUI: true,
                disableDoubleClickZoom: true,
                keyboardShortcuts: false,
                panControl: false,
                streetViewControl: false,
                scaleControl: false,
                zoomControl: false
            }
        };


        var arc = d3.svg.arc()
            .innerRadius(0)
            .outerRadius(10)
            .startAngle(0)
            .endAngle(Math.PI * 2);

        var pointMarker = {
          path: arc(),
          fillColor: 'red',
          fillOpacity: .7,
          scale: 1,
          strokeColor: 'none',
          strokeWeight: 4,
          strokeOpacity: 0
        };

        var pointMarkerHover = {
          path: arc(),
          fillColor: 'white',
          fillOpacity: 0,
          scale: 1,
          strokeColor: 'black',
          strokeWeight: 4,
          strokeOpacity: 1
        };

        var geometryStyleSmallMap = {
            strokeColor: 'none',
            strokeOpacity: 1,
            strokeWeight: 0,
            fillColor: '#5AB95D',
            fillOpacity: .8,
            zIndex: 1000
        };

        var geometryStyleBigMap = {
            strokeColor: '#5AB95D',
            strokeOpacity: 1,
            strokeWeight: 4,
            fillColor: 'none',
            fillOpacity: 0,
            zIndex: 1000
        };

        $scope.mapOptions = (!$rootScope.isBigMap) ? angular.extend(mapOptions,smallMapOptions) : mapOptions;

        var makeLatLngFromLocation = function(str){
            var ll = str.split(",").map(function(l){return +l;});
            if(ll.length < 2) return null;
            return {latitude: ll[0], longitude: ll[1]};
        };

        var setInfoWindowContent = function(infowindow){
            var data = this.extras.data;
            if(infowindow ){

                var txt = '';
                txt += '<strong>Kind</strong>:' + data.kind + '<br\>';
                for(var k in data.attributes){
                    if(data.attributes[k].indexOf('http') === 0){
                        txt += '<strong>' + k + '</strong>' + ': <a href="' + data.attributes[k] + '" target="_blank">' + data.attributes[k] + '</a><br\>';
                    }else{
                        txt += '<strong>' + k + '</strong>' + ': ' + data.attributes[k] + '<br\>';
                    }
                }

                infowindow.setContent(txt);
            }
        };

        var collectMarkers = function(data){
            var arr = [];
            // check parent
            if(data && data.hasOwnProperty('parent')){
                var m = makeLatLngFromLocation(data.parent.location || '');
                //var m = {latitude: data.parent.latitude, longitude: data.parent.longitude};
                m.icon = null;
                m.infoWindow = data.parent.title;
                //if(m)arr.push(m); // skipping for now
            }

            if(GGNPC_MAP.mapSize != 'small'){
                if(data && data.hasOwnProperty('children')){
                    data.children.forEach(function(item){
                        var m = {latitude: item.latitude, longitude: item.longitude};
                        m.icon = pointMarker;
                        m.infoWindow = setInfoWindowContent;//item.attributes.title;
                        m.extras = {
                            marker_default: pointMarker,
                            marker_hover: pointMarkerHover,
                            marker_clicked: pointMarkerHover,
                            data: item
                        }
                        if(m)arr.push(m);
                    });
                }
            }

            $scope.markers = arr;
        };

        var collectGeometries = function(data){
            if(data.geom){
                var arr = [];
                data.geom.forEach(function(g){
                    if(g.geom) arr.push({
                        path: JSON.parse(g.geom),
                        style: GGNPC_MAP.mapSize == 'small' ? geometryStyleSmallMap : geometryStyleBigMap
                    })
                });
                $scope.geometries = arr;
            }
        };

        var initialContextLoaded = false;
        var pendingBoundsChange = null;

        // watch for a change in the contextChange flag
        // contextChange <timestamp>
        $scope.$watch('contextChange', function(newVal, oldVal){

            if(angular.isDefined(newVal)){
                console.log("contextChange", contextor.context);

                api.handleContext(contextor.context, function(err, data){

                    if(err) {
                        console.log("ERROR: ", err);
                        return;
                    }

                    //console.log("DATA: ", data);
                    collectGeometries(data);

                    // pretty much dancing around the clobbering markers
                    //console.log("INIT: ",initialContextLoaded,pendingBoundsChange )
                    if(!pendingBoundsChange){
                        collectMarkers(data);
                    }else if(!initialContextLoaded && pendingBoundsChange){
                        //loadMarkersOnExtentChange(pendingBoundsChange);
                        pendingBoundsChange = null;
                    }
                    //console.log("initialContextLoaded")
                    initialContextLoaded = true;

                });
            }

        });


        var loadMarkersOnExtentChange = function(extentString){
            api.getUsingBBox(extentString, function(err, data){
                if(err){
                    console.log("BBOX ERROR: ", err);
                    return;
                }

                if(angular.isDefined(data) && data.length){
                    var arr = [];

                    // TODO: align the data structure with the api call
                    data[0].data.forEach(function(item){
                        var m = {latitude: item.latitude, longitude: item.longitude};
                        m.icon = pointMarker;
                        m.infoWindow = setInfoWindowContent;//item.attributes.title;
                        m.extras = {
                            marker_default: pointMarker,
                            marker_hover: pointMarkerHover,
                            marker_clicked: pointMarkerHover,
                            data: item
                        }
                        if(m)arr.push(m);
                    });

                    $scope.markers = arr;
                    $scope.initialDefinedLocation = false;
                };

            });
        }


        // current bounds watcher
        $scope.$watch('currentBoundString', function(newVal, oldValue){

            if(GGNPC_MAP.mapSize == 'small') return;

            if(angular.isDefined(newVal) && newVal != oldValue){
                console.log('currentBoundChange: ', newVal);

                // update the hash
                if($scope.map){
                    hasher.set({
                        c: $scope.map.zoom + ":" + $scope.map.center.lat().toFixed(5) + ":" + $scope.map.center.lng().toFixed(5)
                    });
                }

                if(!initialContextLoaded){
                     pendingBoundsChange = newVal;
                     return;
                }

                loadMarkersOnExtentChange(newVal);
            }
        });

    }]).directive('ggnpcMap', ["$rootScope", "$timeout", "$filter", 'debounce', function ($rootScope, $timeout, $filter, debounce) {
        return {
            template: '<div class="ggnpc-map-content"></div><div ggnpc-map-legend class="ggnpc-map-legend" ng-class="{show: isBigMap}"></div><div ggnpc-map-date-picker class="ggnpc-map-datepicker"></div>',
            replace: false,
            restrict: 'EA',
            scope: {
                mapSize: '@',
                refresh: "&refresh" // optional
            },
            link: function postLink(scope, element, attrs) {
                console.log('$rootScope.isBigMap: ', $rootScope.isBigMap);
                var root = element[0],
                    mapElm = d3.select(root).select('.ggnpc-map-content').node(),
                    legend = d3.select(root).select('.ggnpc-map-legend').node();

                var center = new google.maps.LatLng(37.7706, -122.3782);
                var zoom = 12;
                var currentBounds;

                // Parse options
                var opts = (angular.isDefined(scope.mapOptions)) ? scope.mapOptions :
                    { options: {} };


                if (attrs.options) {
                    opts.options = angular.fromJson(attrs.options);
                }

                var _m = new MapModel(angular.extend(opts, {
                    container: mapElm
                }));


                // storing the  url value for bounds change
                var handleBoundsChanged = debounce(function(){
                    if(currentBounds != _m.bounds){
                        currentBounds = _m.bounds;
                        scope.currentBoundString = _m.bounds.toUrlValue();
                    }
                }, 200);

                _m.on('bounds_changed',handleBoundsChanged);


                // Put the map into the scope
                scope.map = _m;


                // Check if we need to refresh the map
                if (angular.isUndefined(scope.refresh())) {
                  // No refresh property given; draw the map immediately
                  _m.draw();
                }
                else {
                  scope.$watch("refresh()", function (newValue, oldValue) {
                    if (newValue && !oldValue) {
                      _m.draw();
                    }
                  });
                }


                // watch for new geometries to draws
                scope.$watch("geometries", function (newValue, oldValue) {
                    $timeout(function () {
                        angular.forEach(newValue, function (v, i) {
                            _m.addGeometries(v.path, v.style);
                        });

                        // TODO: write a clear orphan routine,
                        // based on markers method below

                        if(!scope.initialDefinedLocation)_m.fitGeometries();
                    });
                });


                // watch for new markers to place on the map
                scope.$watch("markers", function (newValue, oldValue) {

                  $timeout(function () {
                    //this.addMarker = function (lat, lng, icon, infoWindowContent, label, url, thumbnail, extras)
                    angular.forEach(newValue, function (v, i) {
                      if (!_m.hasMarker(v.latitude, v.longitude)) {

                        var icon = v.icon || null,
                            infoWindow = v.infoWindow || null,
                            label = v.label || null,
                            url = v.url || null,
                            thumb = v.thumbnail || null,
                            extras = v.extras || null;

                        _m.addMarker(v.latitude, v.longitude, icon, infoWindow, label, url, thumb, extras);
                      }
                    });

                    // Clear orphaned markers
                    var orphaned = [];

                    angular.forEach(_m.getMarkerInstances(), function (v, i) {
                      // Check our scope if a marker with equal latitude and longitude.
                      // If not found, then that marker has been removed form the scope.

                      var pos = v.getPosition(),
                        lat = pos.lat(),
                        lng = pos.lng(),
                        found = false;

                      // Test against each marker in the scope
                      for (var si = 0; si < scope.markers.length; si++) {

                        var sm = scope.markers[si];

                        if (floatEqual(sm.latitude, lat) && floatEqual(sm.longitude, lng)) {
                          // Map marker is present in scope too, don't remove
                          found = true;
                        }
                      }

                      // Marker in map has not been found in scope. Remove.
                      if (!found) {
                        orphaned.push(v);
                      }
                    });

                    orphaned.length && _m.removeMarkers(orphaned);

                    // Fit map when there are more than one marker.
                    // This will change the map center coordinates
                    if (attrs.fit == "true" && newValue && newValue.length > 1) {
                      _m.fit();
                    }
                  });

                }, true);


            } // end "link"
        }
    }]).directive('ggnpcMapLegend', [function(){
        return {
            template: '<div class="map-legend-wrapper">' +
                    '<a href="" class="map-legend-toggle">' +
                    '<span ng-hide="active">Map Key</span>' +
                    '<span ng-show="active">Hide x</span>' +
                    '</a>' +
                    '<div class="map-legend-info"></div></div>',
            replace: false,
            restrict: 'EA',

            link: function postLink(scope, element, attrs) {
                scope.active = false;
                var legend = d3.select(element[0]).select('.map-legend-info'),
                    wrapper = d3.select(element[0]).select('.map-legend-wrapper'),
                    toggleBtn = d3.select(element[0]).select('.map-legend-toggle')
                        .on('click', function(){
                            d3.event.preventDefault ? d3.event.preventDefault() : d3.event.returnValue = false;

                            scope.active = !scope.active;
                            wrapper.classed('active', scope.active);
                            scope.$apply();

                        });

            }
        }

    }]).directive('ggnpcMapDatePicker', [function(){

        return {
            template:
            '<form class="form-horizontal well">' +
            '<div class="control-group input-daterange">' +
                '<input type="text" ng-model="datepicker.date" data-date-format="mm/dd/yyyy" name="start" bs-datepicker>' +
                '<span class="add-on">to</span>' +
                '<input type="text" ng-model="datepicker.dateFrom" data-date-format="mm/dd/yyyy" name="end" bs-datepicker>' +
                '<button type="button" class="btn" data-toggle="datepicker">Pick</button>' +
            '</div>' +
            '</form>',
            replace: false,
            restrict: 'EA',

            link: function postLink(scope, element, attrs) {


            }
        }


    }])


var MapModel = (function () {

var _defaults = {
    zoom: 8,
    draggable: false,
    container: null
};

/**
 *
 */
function PrivateMapModel(opts) {

    var _instance = null,
        _markers = [],  // caches the instances of google.maps.Marker
        _geometries = [],
        _handlers = [], // event handlers
        _windows = [],  // InfoWindow objects
        o = angular.extend({}, _defaults, opts),
        that = this,
        currentInfoWindow = null;

    this.center = opts.center;
    this.bounds = null;
    this.zoom = o.zoom;
    this.draggable = o.draggable;
    this.dragging = false;
    this.selector = o.container;
    this.markers = [];
    this.options = o.options;
    this.tileTemplate = o.tileTemplate;

    this.draw = function () {

        if (that.center == null) {
            // TODO log error
            return;
        }

        if (_instance == null) {

        // Create a new map instance

        _instance = new google.maps.Map(that.selector, angular.extend(that.options, {
            center: that.center,
            zoom: that.zoom,
            draggable: that.draggable,
            mapTypeId : google.maps.MapTypeId.ROADMAP
        }));

        google.maps.event.addListener(_instance, "dragstart",

            function () {
                that.dragging = true;
            }
        );

        google.maps.event.addListener(_instance, "idle",

            function () {
                that.dragging = false;
            }
        );

        google.maps.event.addListener(_instance, "drag",

            function () {
                that.dragging = true;
            }
        );

        google.maps.event.addListener(_instance, "zoom_changed",

            function () {
                that.zoom = _instance.getZoom();
                that.center = _instance.getCenter();
            }
        );

        google.maps.event.addListener(_instance, "center_changed",

            function () {
                that.center = _instance.getCenter();
            }
        );

        google.maps.event.addListener(_instance, "bounds_changed",

            function () {
                that.bounds = _instance.getBounds();
            }
        );


        if(angular.isDefined(that.tileTemplate)){
            _instance.mapTypes.set(that.tileTemplate.name,  new google.maps.ImageMapType(that.tileTemplate.template));
            _instance.setMapTypeId(that.tileTemplate.name);
        }

        // Attach additional event listeners if needed
        if (_handlers.length) {

            angular.forEach(_handlers, function (h, i) {

                google.maps.event.addListener(_instance,
                    h.on, h.handler);
                });
            }
        }
        else {

            // Refresh the existing instance
            google.maps.event.trigger(_instance, "resize");

            var instanceCenter = _instance.getCenter();

            if (!floatEqual(instanceCenter.lat(), that.center.lat())
                || !floatEqual(instanceCenter.lng(), that.center.lng())) {

                _instance.setCenter(that.center);
            }

            if (_instance.getZoom() != that.zoom) {
                _instance.setZoom(that.zoom);
            }
        }
    };

    this.fit = function () {
        if (_instance && _markers.length) {

            var bounds = new google.maps.LatLngBounds();

            angular.forEach(_markers, function (m, i) {
                bounds.extend(m.getPosition());
            });

            _instance.fitBounds(bounds);
        }
    };

    this.on = function(event, handler) {
        _handlers.push({
          "on": event,
          "handler": handler
      });
    };

    this.clearGeometries = function(){
        _geometries.forEach(function(boundary){
            if(boundary instanceof Array){
                boundary.forEach(function(p){
                    p.setMap(null);
                });
            }else{
                boundary.setMap(null);
            }
        });
    }

    this.fitGeometries = function(){
        if (_instance && _geometries.length) {
            var bds = new google.maps.LatLngBounds();
            _geometries.forEach(function(boundary){
                if(boundary.geojsonBounds) bds.union( boundary.geojsonBounds );
            });
            _instance.fitBounds(bds);
        }
    }
    this.addGeometries = function(path, styles){
        var bounds = null;
        if(path && path.coordinates){

            styles = styles ||  {
                strokeColor: '#4afb05',
                strokeOpacity: .8,
                strokeWeight: 4,
                fillColor: 'none',
                fillOpacity: 1,
                zIndex: 1000
            };

            var boundary = new GeoJSON(path, styles, true);

            if (boundary.type == 'Error'){
                console.log("Error: no boundary for this park");

            }else{

                _geometries.push(boundary);

                if(boundary instanceof Array){
                    boundary.forEach(function(p){
                        p.setMap(_instance);
                    });
                }else{
                    boundary.setMap(_instance);
                }

                if(boundary.geojsonBounds) bounds = boundary.geojsonBounds;
            }

        }else{
            console.log("Geodata not ready!!!: ");
        }

        return {geom:boundary, bounds:bounds};
    }

    this.addMarker = function (lat, lng, icon, infoWindowContent, label, url, thumbnail, extras) {

        if (that.findMarker(lat, lng) != null) {
            return;
        }

        var marker = new google.maps.Marker({
            position: new google.maps.LatLng(lat, lng),
            map: _instance,
            icon: icon,
            anchorPoint: new google.maps.Point(-3,3)
        });

        marker.extras = extras || {};

        if (label) {}

        if (url) {}

        if (infoWindowContent != null) {
            var infoWindow;
            if(angular.isFunction(infoWindowContent)){
                infoWindow = new google.maps.InfoWindow();
                marker.setInfoWindowContent = infoWindowContent;
            }else{
                infoWindow = new google.maps.InfoWindow({
                    content: infoWindowContent
                });
            }

            infoWindow.marker = marker;

            google.maps.event.addListener(infoWindow, 'closeclick', function(){

                if(this.marker){
                    this.marker.isSelected = false;

                    if(this.marker.extras && this.marker.extras.hasOwnProperty('marker_default')){
                        this.marker.setIcon( this.marker.extras.marker_default );
                    }
                }

            });



            google.maps.event.addListener(marker, 'click', function() {
                if (currentInfoWindow != null) {
                    currentInfoWindow.close();
                }

                if(this.extras && this.extras.hasOwnProperty('marker_clicked')){
                    this.setIcon( this.extras.marker_clicked );
                }

                this.isSelected = true;

                infoWindow.open(_instance, marker);
                if(this.setInfoWindowContent && angular.isFunction(this.setInfoWindowContent)){
                    this.setInfoWindowContent(infoWindow);
                }
                currentInfoWindow = infoWindow;
            });



            google.maps.event.addListener(marker, 'mouseover', function() {
                if(this.extras && this.extras.hasOwnProperty('marker_hover')){
                    this.setIcon( this.extras.marker_hover );
                }
            });

            google.maps.event.addListener(marker, 'mouseout', function() {
                if(this.isSelected)return;

                if(this.extras && this.extras.hasOwnProperty('marker_default')){
                    this.setIcon( this.extras.marker_default );
                }
            });
        }

        // Cache marker
        _markers.unshift(marker);

        // Cache instance of our marker for scope purposes
        that.markers.unshift({
          "lat": lat,
          "lng": lng,
          "draggable": false,
          "icon": icon,
          "infoWindowContent": infoWindowContent,
          "label": label,
          "url": url,
          "thumbnail": thumbnail,
          "extras": extras
    });

        // Return marker instance
        return marker;
    };

    this.findMarker = function (lat, lng) {
        for (var i = 0; i < _markers.length; i++) {
            var pos = _markers[i].getPosition();

            if (floatEqual(pos.lat(), lat) && floatEqual(pos.lng(), lng)) {
                return _markers[i];
            }
        }

        return null;
    };

    this.findMarkerIndex = function (lat, lng) {
        for (var i = 0; i < _markers.length; i++) {
            var pos = _markers[i].getPosition();

            if (floatEqual(pos.lat(), lat) && floatEqual(pos.lng(), lng)) {
                return i;
            }
        }

        return -1;
    };

    this.addInfoWindow = function (lat, lng, html) {
        var win = new google.maps.InfoWindow({
            content: html,
            position: new google.maps.LatLng(lat, lng)
        });

        _windows.push(win);

        return win;
    };

    this.hasMarker = function (lat, lng) {
        return that.findMarker(lat, lng) !== null;
    };

    this.getMarkerInstances = function () {
        return _markers;
    };

    this.removeMarkers = function (markerInstances) {
        var s = this;

        angular.forEach(markerInstances, function (v, i) {
            var pos = v.getPosition(),
                lat = pos.lat(),
                lng = pos.lng(),
                index = s.findMarkerIndex(lat, lng);

            // Remove from local arrays
            _markers.splice(index, 1);
            s.markers.splice(index, 1);

            // Remove from map
            v.setMap(null);
        });
    };

}

// Done
return PrivateMapModel;
}()); // end Map



/**
  * Produce those little maps
  * ! remove controller & directive  before production
 */

angular.module('app')
.controller('mapListCtrl', ['$scope','$rootScope', 'api', 'contextor', function($scope, $rootScope, api, contextor ){
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

    $scope.$watch('contextChange', function(newVal, oldVal){
        if(angular.isDefined(newVal)){
            console.log("contextChange", contextor.context);

            api.handleContext(contextor.context, function(err, data){

                if(err) console.log("ERROR: ", err);
                console.log("DATA: ", data);

                $scope.filteredResults = data.results.slice(0,-1);
                $scope.groupToPages();
            });

        }
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

/*
    GOOGLE MAP STUFF
    This code is deprecated!
    Only being used to for map lists
    Remove when removing map lists
*/
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
        //mapDefaults.mapOptions = utils.extend({}, mapDefaults.mapOptions, smallMapOptions);
        angular.extend(mapDefaults.mapOptions,smallMapOptions);

    }

    var ggnpcMapTemplate = {

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
        getTileUrl: function(coord, zoom) {
            var normalizedCoord = this.getNormalizedCoord(coord, zoom);
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

    //options = utils.extend({}, mapDefaults, options);
    options = angular.extend(mapDefaults, options);

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



  angular.module('$strap.config', []).value('$strapConfig', {});
  angular.module('$strap.filters', ['$strap.config']);
  angular.module('$strap.directives', ['$strap.config']);
  angular.module('$strap', [
    '$strap.filters',
    '$strap.directives',
    '$strap.config'
  ]);

  angular.module('$strap.directives').directive('bsDatepicker', [
    '$timeout',
    '$strapConfig',
    function ($timeout, $strapConfig) {
      var isAppleTouch = /(iP(a|o)d|iPhone)/g.test(navigator.userAgent);
      var regexpMap = function regexpMapFn(language) {
        if (!($.fn.datepicker.dates[language] && language)) {
          language = 'en';
        }
        return {
          '/': '[\\/]',
          '-': '[-]',
          '.': '[.]',
          ' ': '[\\s]',
          'dd': '(?:(?:[0-2]?[0-9]{1})|(?:[3][01]{1}))',
          'd': '(?:(?:[0-2]?[0-9]{1})|(?:[3][01]{1}))',
          'mm': '(?:[0]?[1-9]|[1][012])',
          'm': '(?:[0]?[1-9]|[1][012])',
          'DD': '(?:' + $.fn.datepicker.dates[language].days.join('|') + ')',
          'D': '(?:' + $.fn.datepicker.dates[language].daysShort.join('|') + ')',
          'MM': '(?:' + $.fn.datepicker.dates[language].months.join('|') + ')',
          'M': '(?:' + $.fn.datepicker.dates[language].monthsShort.join('|') + ')',
          'yyyy': '(?:(?:[1]{1}[0-9]{1}[0-9]{1}[0-9]{1})|(?:[2]{1}[0-9]{3}))(?![[0-9]])',
          'yy': '(?:(?:[0-9]{1}[0-9]{1}))(?![[0-9]])'
        };
      };
      var regexpForDateFormat = function regexpForDateFormatFn(format, language) {
        var re = format, map = regexpMap(language), i;
        i = 0;
        angular.forEach(map, function (v, k) {
          re = re.split(k).join('${' + i + '}');
          i++;
        });
        i = 0;
        angular.forEach(map, function (v, k) {
          re = re.split('${' + i + '}').join(v);
          i++;
        });
        return new RegExp('^' + re + '$', ['i']);
      };
      var ISODateRegexp = /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/;
      return {
        restrict: 'A',
        require: '?ngModel',
        link: function postLink(scope, element, attrs, controller) {
          var options = angular.extend({ autoclose: true }, $strapConfig.datepicker || {});
          var type = attrs.dateType || options.type || 'date';
          var getFormattedModelValue = function (modelValue, format, language) {
            if (modelValue && type === 'iso' && ISODateRegexp.test(modelValue)) {
              return $.fn.datepicker.DPGlobal.parseDate(new Date(modelValue), $.fn.datepicker.DPGlobal.parseFormat(format), language);
            } else if (modelValue && type === 'date' && angular.isString(modelValue)) {
              return $.fn.datepicker.DPGlobal.parseDate(modelValue, $.fn.datepicker.DPGlobal.parseFormat(format), language);
            } else {
              return modelValue;
            }
          };
          var init = function () {
            options = angular.extend({ autoclose: true }, $strapConfig.datepicker || {});
            type = attrs.dateType || options.type || 'date';
            angular.forEach([
              'format',
              'weekStart',
              'calendarWeeks',
              'startDate',
              'endDate',
              'daysOfWeekDisabled',
              'autoclose',
              'startView',
              'minViewMode',
              'todayBtn',
              'todayHighlight',
              'keyboardNavigation',
              'language',
              'forceParse'
            ], function (key) {
              if (angular.isDefined(attrs[key]))
                options[key] = attrs[key];
            });
            var language = options.language || 'en', readFormat = attrs.dateFormat || options.format || $.fn.datepicker.dates[language] && $.fn.datepicker.dates[language].format || 'mm/dd/yyyy', format = isAppleTouch ? 'yyyy-mm-dd' : readFormat, dateFormatRegexp = regexpForDateFormat(format, language);
            if (controller) {
              controller.$formatters.unshift(function (modelValue) {
                return getFormattedModelValue(modelValue, readFormat, language);
              });
              controller.$parsers.unshift(function (viewValue) {
                if (!viewValue) {
                  controller.$setValidity('date', true);
                  return null;
                } else if ((type === 'date' || type === 'iso') && angular.isDate(viewValue)) {
                  controller.$setValidity('date', true);
                  return viewValue;
                } else if (angular.isString(viewValue) && dateFormatRegexp.test(viewValue)) {
                  controller.$setValidity('date', true);
                  if (isAppleTouch)
                    return new Date(viewValue);
                  return type === 'string' ? viewValue : $.fn.datepicker.DPGlobal.parseDate(viewValue, $.fn.datepicker.DPGlobal.parseFormat(format), language);
                } else {
                  controller.$setValidity('date', false);
                  return undefined;
                }
              });
              controller.$render = function ngModelRender() {
                if (isAppleTouch) {
                  var date = controller.$viewValue ? $.fn.datepicker.DPGlobal.formatDate(controller.$viewValue, $.fn.datepicker.DPGlobal.parseFormat(format), language) : '';
                  element.val(date);
                  return date;
                }
                if (!controller.$viewValue)
                  element.val('');
                return element.datepicker('update', controller.$viewValue);
              };
            }
            if (isAppleTouch) {
              element.prop('type', 'date').css('-webkit-appearance', 'textfield');
            } else {
              if (controller) {
                element.on('changeDate', function (ev) {
                  scope.$apply(function () {
                    controller.$setViewValue(type === 'string' ? element.val() : ev.date);
                  });
                });
              }
              element.datepicker(angular.extend(options, {
                format: format,
                language: language
              }));
              scope.$on('$destroy', function () {
                var datepicker = element.data('datepicker');
                if (datepicker) {
                  datepicker.picker.remove();
                  element.data('datepicker', null);
                }
              });
              attrs.$observe('startDate', function (value) {
                element.datepicker('setStartDate', value);
              });
              attrs.$observe('endDate', function (value) {
                element.datepicker('setEndDate', value);
              });
            }
            var component = element.siblings('[data-toggle="datepicker"]');
            if (component.length) {
              component.on('click', function () {
                if (!element.prop('disabled')) {
                  element.trigger('focus');
                }
              });
            }
          };
          init();
          scope.$watch(function () {
            return attrs.language;
          }, function (newValue, oldValue) {
            if (newValue !== oldValue) {
              var oldLanguage = $.fn.datepicker.dates[oldValue] ? oldValue : 'en';
              var oldFormat = attrs.dateFormat || options.format || $.fn.datepicker.dates[oldLanguage] && $.fn.datepicker.dates[oldLanguage].format || 'mm/dd/yyyy';
              var oldDate = $.fn.datepicker.DPGlobal.parseDate(element.val(), $.fn.datepicker.DPGlobal.parseFormat(oldFormat), oldLanguage);
              var newLanguage = $.fn.datepicker.dates[newValue] ? newValue : 'en';
              var newFormat = $.fn.datepicker.dates[newLanguage] && $.fn.datepicker.dates[newLanguage].format || 'mm/dd/yyyy';
              var newDateString = $.fn.datepicker.DPGlobal.formatDate(oldDate, $.fn.datepicker.DPGlobal.parseFormat(newFormat), newLanguage);
              element.datepicker('remove');
              element.val('');
              init();
              var mValue = getFormattedModelValue(newDateString, newFormat, newLanguage);
              controller.$modelValue = mValue;
              controller.$viewValue = newDateString;
            }
          });
        }
      };
    }
  ]);


})(window);

/* =========================================================
 * bootstrap-datepicker.js
 * Repo: https://github.com/eternicode/bootstrap-datepicker/
 * Demo: http://eternicode.github.io/bootstrap-datepicker/
 * Docs: http://bootstrap-datepicker.readthedocs.org/
 * Forked from http://www.eyecon.ro/bootstrap-datepicker
 * =========================================================
 * Started by Stefan Petre; improvements by Andrew Rowls + contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================= */

(function( $ ) {

    var $window = $(window);

    function UTCDate(){
        return new Date(Date.UTC.apply(Date, arguments));
    }
    function UTCToday(){
        var today = new Date();
        return UTCDate(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    }


    // Picker object

    var Datepicker = function(element, options) {
        var that = this;

        this._process_options(options);

        this.element = $(element);
        this.isInline = false;
        this.isInput = this.element.is('input');
        this.component = this.element.is('.date') ? this.element.find('.add-on, .btn') : false;
        this.hasInput = this.component && this.element.find('input').length;
        if(this.component && this.component.length === 0)
            this.component = false;

        this.picker = $(DPGlobal.template);
        this._buildEvents();
        this._attachEvents();

        if(this.isInline) {
            this.picker.addClass('datepicker-inline').appendTo(this.element);
        } else {
            this.picker.addClass('datepicker-dropdown dropdown-menu');
        }

        if (this.o.rtl){
            this.picker.addClass('datepicker-rtl');
            this.picker.find('.prev i, .next i')
                        .toggleClass('icon-arrow-left icon-arrow-right');
        }


        this.viewMode = this.o.startView;

        if (this.o.calendarWeeks)
            this.picker.find('tfoot th.today')
                        .attr('colspan', function(i, val){
                            return parseInt(val) + 1;
                        });

        this._allow_update = false;

        this.setStartDate(this._o.startDate);
        this.setEndDate(this._o.endDate);
        this.setDaysOfWeekDisabled(this.o.daysOfWeekDisabled);

        this.fillDow();
        this.fillMonths();

        this._allow_update = true;

        this.update();
        this.showMode();

        if(this.isInline) {
            this.show();
        }
    };

    Datepicker.prototype = {
        constructor: Datepicker,

        _process_options: function(opts){
            // Store raw options for reference
            this._o = $.extend({}, this._o, opts);
            // Processed options
            var o = this.o = $.extend({}, this._o);

            // Check if "de-DE" style date is available, if not language should
            // fallback to 2 letter code eg "de"
            var lang = o.language;
            if (!dates[lang]) {
                lang = lang.split('-')[0];
                if (!dates[lang])
                    lang = defaults.language;
            }
            o.language = lang;

            switch(o.startView){
                case 2:
                case 'decade':
                    o.startView = 2;
                    break;
                case 1:
                case 'year':
                    o.startView = 1;
                    break;
                default:
                    o.startView = 0;
            }

            switch (o.minViewMode) {
                case 1:
                case 'months':
                    o.minViewMode = 1;
                    break;
                case 2:
                case 'years':
                    o.minViewMode = 2;
                    break;
                default:
                    o.minViewMode = 0;
            }

            o.startView = Math.max(o.startView, o.minViewMode);

            o.weekStart %= 7;
            o.weekEnd = ((o.weekStart + 6) % 7);

            var format = DPGlobal.parseFormat(o.format);
            if (o.startDate !== -Infinity) {
                if (!!o.startDate) {
                    if (o.startDate instanceof Date)
                        o.startDate = this._local_to_utc(this._zero_time(o.startDate));
                    else
                        o.startDate = DPGlobal.parseDate(o.startDate, format, o.language);
                } else {
                    o.startDate = -Infinity;
                }
            }
            if (o.endDate !== Infinity) {
                if (!!o.endDate) {
                    if (o.endDate instanceof Date)
                        o.endDate = this._local_to_utc(this._zero_time(o.endDate));
                    else
                        o.endDate = DPGlobal.parseDate(o.endDate, format, o.language);
                } else {
                    o.endDate = Infinity;
                }
            }

            o.daysOfWeekDisabled = o.daysOfWeekDisabled||[];
            if (!$.isArray(o.daysOfWeekDisabled))
                o.daysOfWeekDisabled = o.daysOfWeekDisabled.split(/[,\s]*/);
            o.daysOfWeekDisabled = $.map(o.daysOfWeekDisabled, function (d) {
                return parseInt(d, 10);
            });

            var plc = String(o.orientation).toLowerCase().split(/\s+/g),
                _plc = o.orientation.toLowerCase();
            plc = $.grep(plc, function(word){
                return (/^auto|left|right|top|bottom$/).test(word);
            });
            o.orientation = {x: 'auto', y: 'auto'};
            if (!_plc || _plc === 'auto')
                ; // no action
            else if (plc.length === 1){
                switch(plc[0]){
                    case 'top':
                    case 'bottom':
                        o.orientation.y = plc[0];
                        break;
                    case 'left':
                    case 'right':
                        o.orientation.x = plc[0];
                        break;
                }
            }
            else {
                _plc = $.grep(plc, function(word){
                    return (/^left|right$/).test(word);
                });
                o.orientation.x = _plc[0] || 'auto';

                _plc = $.grep(plc, function(word){
                    return (/^top|bottom$/).test(word);
                });
                o.orientation.y = _plc[0] || 'auto';
            }
        },
        _events: [],
        _secondaryEvents: [],
        _applyEvents: function(evs){
            for (var i=0, el, ev; i<evs.length; i++){
                el = evs[i][0];
                ev = evs[i][1];
                el.on(ev);
            }
        },
        _unapplyEvents: function(evs){
            for (var i=0, el, ev; i<evs.length; i++){
                el = evs[i][0];
                ev = evs[i][1];
                el.off(ev);
            }
        },
        _buildEvents: function(){
            if (this.isInput) { // single input
                this._events = [
                    [this.element, {
                        focus: $.proxy(this.show, this),
                        keyup: $.proxy(this.update, this),
                        keydown: $.proxy(this.keydown, this)
                    }]
                ];
            }
            else if (this.component && this.hasInput){ // component: input + button
                this._events = [
                    // For components that are not readonly, allow keyboard nav
                    [this.element.find('input'), {
                        focus: $.proxy(this.show, this),
                        keyup: $.proxy(this.update, this),
                        keydown: $.proxy(this.keydown, this)
                    }],
                    [this.component, {
                        click: $.proxy(this.show, this)
                    }]
                ];
            }
            else if (this.element.is('div')) {  // inline datepicker
                this.isInline = true;
            }
            else {
                this._events = [
                    [this.element, {
                        click: $.proxy(this.show, this)
                    }]
                ];
            }

            this._secondaryEvents = [
                [this.picker, {
                    click: $.proxy(this.click, this)
                }],
                [$(window), {
                    resize: $.proxy(this.place, this)
                }],
                [$(document), {
                    'mousedown touchstart': $.proxy(function (e) {
                        // Clicked outside the datepicker, hide it
                        if (!(
                            this.element.is(e.target) ||
                            this.element.find(e.target).length ||
                            this.picker.is(e.target) ||
                            this.picker.find(e.target).length
                        )) {
                            this.hide();
                        }
                    }, this)
                }]
            ];
        },
        _attachEvents: function(){
            this._detachEvents();
            this._applyEvents(this._events);
        },
        _detachEvents: function(){
            this._unapplyEvents(this._events);
        },
        _attachSecondaryEvents: function(){
            this._detachSecondaryEvents();
            this._applyEvents(this._secondaryEvents);
        },
        _detachSecondaryEvents: function(){
            this._unapplyEvents(this._secondaryEvents);
        },
        _trigger: function(event, altdate){
            var date = altdate || this.date,
                local_date = this._utc_to_local(date);

            this.element.trigger({
                type: event,
                date: local_date,
                format: $.proxy(function(altformat){
                    var format = altformat || this.o.format;
                    return DPGlobal.formatDate(date, format, this.o.language);
                }, this)
            });
        },

        show: function(e) {
            if (!this.isInline)
                this.picker.appendTo('body');
            this.picker.show();
            this.height = this.component ? this.component.outerHeight() : this.element.outerHeight();
            this.place();
            this._attachSecondaryEvents();
            if (e) {
                e.preventDefault();
            }
            this._trigger('show');
        },

        hide: function(e){
            if(this.isInline) return;
            if (!this.picker.is(':visible')) return;
            this.picker.hide().detach();
            this._detachSecondaryEvents();
            this.viewMode = this.o.startView;
            this.showMode();

            if (
                this.o.forceParse &&
                (
                    this.isInput && this.element.val() ||
                    this.hasInput && this.element.find('input').val()
                )
            )
                this.setValue();
            this._trigger('hide');
        },

        remove: function() {
            this.hide();
            this._detachEvents();
            this._detachSecondaryEvents();
            this.picker.remove();
            delete this.element.data().datepicker;
            if (!this.isInput) {
                delete this.element.data().date;
            }
        },

        _utc_to_local: function(utc){
            return new Date(utc.getTime() + (utc.getTimezoneOffset()*60000));
        },
        _local_to_utc: function(local){
            return new Date(local.getTime() - (local.getTimezoneOffset()*60000));
        },
        _zero_time: function(local){
            return new Date(local.getFullYear(), local.getMonth(), local.getDate());
        },
        _zero_utc_time: function(utc){
            return new Date(Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate()));
        },

        getDate: function() {
            return this._utc_to_local(this.getUTCDate());
        },

        getUTCDate: function() {
            return this.date;
        },

        setDate: function(d) {
            this.setUTCDate(this._local_to_utc(d));
        },

        setUTCDate: function(d) {
            this.date = d;
            this.setValue();
        },

        setValue: function() {
            var formatted = this.getFormattedDate();
            if (!this.isInput) {
                if (this.component){
                    this.element.find('input').val(formatted).change();
                }
            } else {
                this.element.val(formatted).change();
            }
        },

        getFormattedDate: function(format) {
            if (format === undefined)
                format = this.o.format;
            return DPGlobal.formatDate(this.date, format, this.o.language);
        },

        setStartDate: function(startDate){
            this._process_options({startDate: startDate});
            this.update();
            this.updateNavArrows();
        },

        setEndDate: function(endDate){
            this._process_options({endDate: endDate});
            this.update();
            this.updateNavArrows();
        },

        setDaysOfWeekDisabled: function(daysOfWeekDisabled){
            this._process_options({daysOfWeekDisabled: daysOfWeekDisabled});
            this.update();
            this.updateNavArrows();
        },

        place: function(){
                        if(this.isInline) return;
            var calendarWidth = this.picker.outerWidth(),
                calendarHeight = this.picker.outerHeight(),
                visualPadding = 10,
                windowWidth = $window.width(),
                windowHeight = $window.height(),
                scrollTop = $window.scrollTop();

            var zIndex = parseInt(this.element.parents().filter(function() {
                            return $(this).css('z-index') != 'auto';
                        }).first().css('z-index'))+10;
            var offset = this.component ? this.component.parent().offset() : this.element.offset();
            var height = this.component ? this.component.outerHeight(true) : this.element.outerHeight(false);
            var width = this.component ? this.component.outerWidth(true) : this.element.outerWidth(false);
            var left = offset.left,
                top = offset.top;

            this.picker.removeClass(
                'datepicker-orient-top datepicker-orient-bottom '+
                'datepicker-orient-right datepicker-orient-left'
            );

            if (this.o.orientation.x !== 'auto') {
                this.picker.addClass('datepicker-orient-' + this.o.orientation.x);
                if (this.o.orientation.x === 'right')
                    left -= calendarWidth - width;
            }
            // auto x orientation is best-placement: if it crosses a window
            // edge, fudge it sideways
            else {
                // Default to left
                this.picker.addClass('datepicker-orient-left');
                if (offset.left < 0)
                    left -= offset.left - visualPadding;
                else if (offset.left + calendarWidth > windowWidth)
                    left = windowWidth - calendarWidth - visualPadding;
            }

            // auto y orientation is best-situation: top or bottom, no fudging,
            // decision based on which shows more of the calendar
            var yorient = this.o.orientation.y,
                top_overflow, bottom_overflow;
            if (yorient === 'auto') {
                top_overflow = -scrollTop + offset.top - calendarHeight;
                bottom_overflow = scrollTop + windowHeight - (offset.top + height + calendarHeight);
                if (Math.max(top_overflow, bottom_overflow) === bottom_overflow)
                    yorient = 'top';
                else
                    yorient = 'bottom';
            }
            this.picker.addClass('datepicker-orient-' + yorient);
            if (yorient === 'top')
                top += height;
            else
                top -= calendarHeight + parseInt(this.picker.css('padding-top'));

            this.picker.css({
                top: top,
                left: left,
                zIndex: zIndex
            });
        },

        _allow_update: true,
        update: function(){
            if (!this._allow_update) return;

            var oldDate = new Date(this.date),
                date, fromArgs = false;
            if(arguments && arguments.length && (typeof arguments[0] === 'string' || arguments[0] instanceof Date)) {
                date = arguments[0];
                if (date instanceof Date)
                    date = this._local_to_utc(date);
                fromArgs = true;
            } else {
                date = this.isInput ? this.element.val() : this.element.data('date') || this.element.find('input').val();
                delete this.element.data().date;
            }

            this.date = DPGlobal.parseDate(date, this.o.format, this.o.language);

            if (fromArgs) {
                // setting date by clicking
                this.setValue();
            } else if (date) {
                // setting date by typing
                if (oldDate.getTime() !== this.date.getTime())
                    this._trigger('changeDate');
            } else {
                // clearing date
                this._trigger('clearDate');
            }

            if (this.date < this.o.startDate) {
                this.viewDate = new Date(this.o.startDate);
                this.date = new Date(this.o.startDate);
            } else if (this.date > this.o.endDate) {
                this.viewDate = new Date(this.o.endDate);
                this.date = new Date(this.o.endDate);
            } else {
                this.viewDate = new Date(this.date);
                this.date = new Date(this.date);
            }
            this.fill();
        },

        fillDow: function(){
            var dowCnt = this.o.weekStart,
            html = '<tr>';
            if(this.o.calendarWeeks){
                var cell = '<th class="cw">&nbsp;</th>';
                html += cell;
                this.picker.find('.datepicker-days thead tr:first-child').prepend(cell);
            }
            while (dowCnt < this.o.weekStart + 7) {
                html += '<th class="dow">'+dates[this.o.language].daysMin[(dowCnt++)%7]+'</th>';
            }
            html += '</tr>';
            this.picker.find('.datepicker-days thead').append(html);
        },

        fillMonths: function(){
            var html = '',
            i = 0;
            while (i < 12) {
                html += '<span class="month">'+dates[this.o.language].monthsShort[i++]+'</span>';
            }
            this.picker.find('.datepicker-months td').html(html);
        },

        setRange: function(range){
            if (!range || !range.length)
                delete this.range;
            else
                this.range = $.map(range, function(d){ return d.valueOf(); });
            this.fill();
        },

        getClassNames: function(date){
            var cls = [],
                year = this.viewDate.getUTCFullYear(),
                month = this.viewDate.getUTCMonth(),
                currentDate = this.date.valueOf(),
                today = new Date();
            if (date.getUTCFullYear() < year || (date.getUTCFullYear() == year && date.getUTCMonth() < month)) {
                cls.push('old');
            } else if (date.getUTCFullYear() > year || (date.getUTCFullYear() == year && date.getUTCMonth() > month)) {
                cls.push('new');
            }
            // Compare internal UTC date with local today, not UTC today
            if (this.o.todayHighlight &&
                date.getUTCFullYear() == today.getFullYear() &&
                date.getUTCMonth() == today.getMonth() &&
                date.getUTCDate() == today.getDate()) {
                cls.push('today');
            }
            if (date.valueOf() == currentDate) {
                cls.push('active');
            }
            if (date.valueOf() < this.o.startDate || date.valueOf() > this.o.endDate ||
                $.inArray(date.getUTCDay(), this.o.daysOfWeekDisabled) !== -1) {
                cls.push('disabled');
            }
            if (this.range){
                if (date > this.range[0] && date < this.range[this.range.length-1]){
                    cls.push('range');
                }
                if ($.inArray(date.valueOf(), this.range) != -1){
                    cls.push('selected');
                }
            }
            return cls;
        },

        fill: function() {
            var d = new Date(this.viewDate),
                year = d.getUTCFullYear(),
                month = d.getUTCMonth(),
                startYear = this.o.startDate !== -Infinity ? this.o.startDate.getUTCFullYear() : -Infinity,
                startMonth = this.o.startDate !== -Infinity ? this.o.startDate.getUTCMonth() : -Infinity,
                endYear = this.o.endDate !== Infinity ? this.o.endDate.getUTCFullYear() : Infinity,
                endMonth = this.o.endDate !== Infinity ? this.o.endDate.getUTCMonth() : Infinity,
                currentDate = this.date && this.date.valueOf(),
                tooltip;
            this.picker.find('.datepicker-days thead th.datepicker-switch')
                        .text(dates[this.o.language].months[month]+' '+year);
            this.picker.find('tfoot th.today')
                        .text(dates[this.o.language].today)
                        .toggle(this.o.todayBtn !== false);
            this.picker.find('tfoot th.clear')
                        .text(dates[this.o.language].clear)
                        .toggle(this.o.clearBtn !== false);
            this.updateNavArrows();
            this.fillMonths();
            var prevMonth = UTCDate(year, month-1, 28,0,0,0,0),
                day = DPGlobal.getDaysInMonth(prevMonth.getUTCFullYear(), prevMonth.getUTCMonth());
            prevMonth.setUTCDate(day);
            prevMonth.setUTCDate(day - (prevMonth.getUTCDay() - this.o.weekStart + 7)%7);
            var nextMonth = new Date(prevMonth);
            nextMonth.setUTCDate(nextMonth.getUTCDate() + 42);
            nextMonth = nextMonth.valueOf();
            var html = [];
            var clsName;
            while(prevMonth.valueOf() < nextMonth) {
                if (prevMonth.getUTCDay() == this.o.weekStart) {
                    html.push('<tr>');
                    if(this.o.calendarWeeks){
                        // ISO 8601: First week contains first thursday.
                        // ISO also states week starts on Monday, but we can be more abstract here.
                        var
                            // Start of current week: based on weekstart/current date
                            ws = new Date(+prevMonth + (this.o.weekStart - prevMonth.getUTCDay() - 7) % 7 * 864e5),
                            // Thursday of this week
                            th = new Date(+ws + (7 + 4 - ws.getUTCDay()) % 7 * 864e5),
                            // First Thursday of year, year from thursday
                            yth = new Date(+(yth = UTCDate(th.getUTCFullYear(), 0, 1)) + (7 + 4 - yth.getUTCDay())%7*864e5),
                            // Calendar week: ms between thursdays, div ms per day, div 7 days
                            calWeek =  (th - yth) / 864e5 / 7 + 1;
                        html.push('<td class="cw">'+ calWeek +'</td>');

                    }
                }
                clsName = this.getClassNames(prevMonth);
                clsName.push('day');

                if (this.o.beforeShowDay !== $.noop){
                    var before = this.o.beforeShowDay(this._utc_to_local(prevMonth));
                    if (before === undefined)
                        before = {};
                    else if (typeof(before) === 'boolean')
                        before = {enabled: before};
                    else if (typeof(before) === 'string')
                        before = {classes: before};
                    if (before.enabled === false)
                        clsName.push('disabled');
                    if (before.classes)
                        clsName = clsName.concat(before.classes.split(/\s+/));
                    if (before.tooltip)
                        tooltip = before.tooltip;
                }

                clsName = $.unique(clsName);
                html.push('<td class="'+clsName.join(' ')+'"' + (tooltip ? ' title="'+tooltip+'"' : '') + '>'+prevMonth.getUTCDate() + '</td>');
                if (prevMonth.getUTCDay() == this.o.weekEnd) {
                    html.push('</tr>');
                }
                prevMonth.setUTCDate(prevMonth.getUTCDate()+1);
            }
            this.picker.find('.datepicker-days tbody').empty().append(html.join(''));
            var currentYear = this.date && this.date.getUTCFullYear();

            var months = this.picker.find('.datepicker-months')
                        .find('th:eq(1)')
                            .text(year)
                            .end()
                        .find('span').removeClass('active');
            if (currentYear && currentYear == year) {
                months.eq(this.date.getUTCMonth()).addClass('active');
            }
            if (year < startYear || year > endYear) {
                months.addClass('disabled');
            }
            if (year == startYear) {
                months.slice(0, startMonth).addClass('disabled');
            }
            if (year == endYear) {
                months.slice(endMonth+1).addClass('disabled');
            }

            html = '';
            year = parseInt(year/10, 10) * 10;
            var yearCont = this.picker.find('.datepicker-years')
                                .find('th:eq(1)')
                                    .text(year + '-' + (year + 9))
                                    .end()
                                .find('td');
            year -= 1;
            for (var i = -1; i < 11; i++) {
                html += '<span class="year'+(i == -1 ? ' old' : i == 10 ? ' new' : '')+(currentYear == year ? ' active' : '')+(year < startYear || year > endYear ? ' disabled' : '')+'">'+year+'</span>';
                year += 1;
            }
            yearCont.html(html);
        },

        updateNavArrows: function() {
            if (!this._allow_update) return;

            var d = new Date(this.viewDate),
                year = d.getUTCFullYear(),
                month = d.getUTCMonth();
            switch (this.viewMode) {
                case 0:
                    if (this.o.startDate !== -Infinity && year <= this.o.startDate.getUTCFullYear() && month <= this.o.startDate.getUTCMonth()) {
                        this.picker.find('.prev').css({visibility: 'hidden'});
                    } else {
                        this.picker.find('.prev').css({visibility: 'visible'});
                    }
                    if (this.o.endDate !== Infinity && year >= this.o.endDate.getUTCFullYear() && month >= this.o.endDate.getUTCMonth()) {
                        this.picker.find('.next').css({visibility: 'hidden'});
                    } else {
                        this.picker.find('.next').css({visibility: 'visible'});
                    }
                    break;
                case 1:
                case 2:
                    if (this.o.startDate !== -Infinity && year <= this.o.startDate.getUTCFullYear()) {
                        this.picker.find('.prev').css({visibility: 'hidden'});
                    } else {
                        this.picker.find('.prev').css({visibility: 'visible'});
                    }
                    if (this.o.endDate !== Infinity && year >= this.o.endDate.getUTCFullYear()) {
                        this.picker.find('.next').css({visibility: 'hidden'});
                    } else {
                        this.picker.find('.next').css({visibility: 'visible'});
                    }
                    break;
            }
        },

        click: function(e) {
            e.preventDefault();
            var target = $(e.target).closest('span, td, th');
            if (target.length == 1) {
                switch(target[0].nodeName.toLowerCase()) {
                    case 'th':
                        switch(target[0].className) {
                            case 'datepicker-switch':
                                this.showMode(1);
                                break;
                            case 'prev':
                            case 'next':
                                var dir = DPGlobal.modes[this.viewMode].navStep * (target[0].className == 'prev' ? -1 : 1);
                                switch(this.viewMode){
                                    case 0:
                                        this.viewDate = this.moveMonth(this.viewDate, dir);
                                        this._trigger('changeMonth', this.viewDate);
                                        break;
                                    case 1:
                                    case 2:
                                        this.viewDate = this.moveYear(this.viewDate, dir);
                                        if (this.viewMode === 1)
                                            this._trigger('changeYear', this.viewDate);
                                        break;
                                }
                                this.fill();
                                break;
                            case 'today':
                                var date = new Date();
                                date = UTCDate(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);

                                this.showMode(-2);
                                var which = this.o.todayBtn == 'linked' ? null : 'view';
                                this._setDate(date, which);
                                break;
                            case 'clear':
                                var element;
                                if (this.isInput)
                                    element = this.element;
                                else if (this.component)
                                    element = this.element.find('input');
                                if (element)
                                    element.val("").change();
                                this._trigger('changeDate');
                                this.update();
                                if (this.o.autoclose)
                                    this.hide();
                                break;
                        }
                        break;
                    case 'span':
                        if (!target.is('.disabled')) {
                            this.viewDate.setUTCDate(1);
                            if (target.is('.month')) {
                                var day = 1;
                                var month = target.parent().find('span').index(target);
                                var year = this.viewDate.getUTCFullYear();
                                this.viewDate.setUTCMonth(month);
                                this._trigger('changeMonth', this.viewDate);
                                if (this.o.minViewMode === 1) {
                                    this._setDate(UTCDate(year, month, day,0,0,0,0));
                                }
                            } else {
                                var year = parseInt(target.text(), 10)||0;
                                var day = 1;
                                var month = 0;
                                this.viewDate.setUTCFullYear(year);
                                this._trigger('changeYear', this.viewDate);
                                if (this.o.minViewMode === 2) {
                                    this._setDate(UTCDate(year, month, day,0,0,0,0));
                                }
                            }
                            this.showMode(-1);
                            this.fill();
                        }
                        break;
                    case 'td':
                        if (target.is('.day') && !target.is('.disabled')){
                            var day = parseInt(target.text(), 10)||1;
                            var year = this.viewDate.getUTCFullYear(),
                                month = this.viewDate.getUTCMonth();
                            if (target.is('.old')) {
                                if (month === 0) {
                                    month = 11;
                                    year -= 1;
                                } else {
                                    month -= 1;
                                }
                            } else if (target.is('.new')) {
                                if (month == 11) {
                                    month = 0;
                                    year += 1;
                                } else {
                                    month += 1;
                                }
                            }
                            this._setDate(UTCDate(year, month, day,0,0,0,0));
                        }
                        break;
                }
            }
        },

        _setDate: function(date, which){
            if (!which || which == 'date')
                this.date = new Date(date);
            if (!which || which  == 'view')
                this.viewDate = new Date(date);
            this.fill();
            this.setValue();
            this._trigger('changeDate');
            var element;
            if (this.isInput) {
                element = this.element;
            } else if (this.component){
                element = this.element.find('input');
            }
            if (element) {
                element.change();
            }
            if (this.o.autoclose && (!which || which == 'date')) {
                this.hide();
            }
        },

        moveMonth: function(date, dir){
            if (!dir) return date;
            var new_date = new Date(date.valueOf()),
                day = new_date.getUTCDate(),
                month = new_date.getUTCMonth(),
                mag = Math.abs(dir),
                new_month, test;
            dir = dir > 0 ? 1 : -1;
            if (mag == 1){
                test = dir == -1
                    // If going back one month, make sure month is not current month
                    // (eg, Mar 31 -> Feb 31 == Feb 28, not Mar 02)
                    ? function(){ return new_date.getUTCMonth() == month; }
                    // If going forward one month, make sure month is as expected
                    // (eg, Jan 31 -> Feb 31 == Feb 28, not Mar 02)
                    : function(){ return new_date.getUTCMonth() != new_month; };
                new_month = month + dir;
                new_date.setUTCMonth(new_month);
                // Dec -> Jan (12) or Jan -> Dec (-1) -- limit expected date to 0-11
                if (new_month < 0 || new_month > 11)
                    new_month = (new_month + 12) % 12;
            } else {
                // For magnitudes >1, move one month at a time...
                for (var i=0; i<mag; i++)
                    // ...which might decrease the day (eg, Jan 31 to Feb 28, etc)...
                    new_date = this.moveMonth(new_date, dir);
                // ...then reset the day, keeping it in the new month
                new_month = new_date.getUTCMonth();
                new_date.setUTCDate(day);
                test = function(){ return new_month != new_date.getUTCMonth(); };
            }
            // Common date-resetting loop -- if date is beyond end of month, make it
            // end of month
            while (test()){
                new_date.setUTCDate(--day);
                new_date.setUTCMonth(new_month);
            }
            return new_date;
        },

        moveYear: function(date, dir){
            return this.moveMonth(date, dir*12);
        },

        dateWithinRange: function(date){
            return date >= this.o.startDate && date <= this.o.endDate;
        },

        keydown: function(e){
            if (this.picker.is(':not(:visible)')){
                if (e.keyCode == 27) // allow escape to hide and re-show picker
                    this.show();
                return;
            }
            var dateChanged = false,
                dir, day, month,
                newDate, newViewDate;
            switch(e.keyCode){
                case 27: // escape
                    this.hide();
                    e.preventDefault();
                    break;
                case 37: // left
                case 39: // right
                    if (!this.o.keyboardNavigation) break;
                    dir = e.keyCode == 37 ? -1 : 1;
                    if (e.ctrlKey){
                        newDate = this.moveYear(this.date, dir);
                        newViewDate = this.moveYear(this.viewDate, dir);
                        this._trigger('changeYear', this.viewDate);
                    } else if (e.shiftKey){
                        newDate = this.moveMonth(this.date, dir);
                        newViewDate = this.moveMonth(this.viewDate, dir);
                        this._trigger('changeMonth', this.viewDate);
                    } else {
                        newDate = new Date(this.date);
                        newDate.setUTCDate(this.date.getUTCDate() + dir);
                        newViewDate = new Date(this.viewDate);
                        newViewDate.setUTCDate(this.viewDate.getUTCDate() + dir);
                    }
                    if (this.dateWithinRange(newDate)){
                        this.date = newDate;
                        this.viewDate = newViewDate;
                        this.setValue();
                        this.update();
                        e.preventDefault();
                        dateChanged = true;
                    }
                    break;
                case 38: // up
                case 40: // down
                    if (!this.o.keyboardNavigation) break;
                    dir = e.keyCode == 38 ? -1 : 1;
                    if (e.ctrlKey){
                        newDate = this.moveYear(this.date, dir);
                        newViewDate = this.moveYear(this.viewDate, dir);
                        this._trigger('changeYear', this.viewDate);
                    } else if (e.shiftKey){
                        newDate = this.moveMonth(this.date, dir);
                        newViewDate = this.moveMonth(this.viewDate, dir);
                        this._trigger('changeMonth', this.viewDate);
                    } else {
                        newDate = new Date(this.date);
                        newDate.setUTCDate(this.date.getUTCDate() + dir * 7);
                        newViewDate = new Date(this.viewDate);
                        newViewDate.setUTCDate(this.viewDate.getUTCDate() + dir * 7);
                    }
                    if (this.dateWithinRange(newDate)){
                        this.date = newDate;
                        this.viewDate = newViewDate;
                        this.setValue();
                        this.update();
                        e.preventDefault();
                        dateChanged = true;
                    }
                    break;
                case 13: // enter
                    this.hide();
                    e.preventDefault();
                    break;
                case 9: // tab
                    this.hide();
                    break;
            }
            if (dateChanged){
                this._trigger('changeDate');
                var element;
                if (this.isInput) {
                    element = this.element;
                } else if (this.component){
                    element = this.element.find('input');
                }
                if (element) {
                    element.change();
                }
            }
        },

        showMode: function(dir) {
            if (dir) {
                this.viewMode = Math.max(this.o.minViewMode, Math.min(2, this.viewMode + dir));
            }
            /*
                vitalets: fixing bug of very special conditions:
                jquery 1.7.1 + webkit + show inline datepicker in bootstrap popover.
                Method show() does not set display css correctly and datepicker is not shown.
                Changed to .css('display', 'block') solve the problem.
                See https://github.com/vitalets/x-editable/issues/37

                In jquery 1.7.2+ everything works fine.
            */
            //this.picker.find('>div').hide().filter('.datepicker-'+DPGlobal.modes[this.viewMode].clsName).show();
            this.picker.find('>div').hide().filter('.datepicker-'+DPGlobal.modes[this.viewMode].clsName).css('display', 'block');
            this.updateNavArrows();
        }
    };

    var DateRangePicker = function(element, options){
        this.element = $(element);
        this.inputs = $.map(options.inputs, function(i){ return i.jquery ? i[0] : i; });
        delete options.inputs;

        $(this.inputs)
            .datepicker(options)
            .bind('changeDate', $.proxy(this.dateUpdated, this));

        this.pickers = $.map(this.inputs, function(i){ return $(i).data('datepicker'); });
        this.updateDates();
    };
    DateRangePicker.prototype = {
        updateDates: function(){
            this.dates = $.map(this.pickers, function(i){ return i.date; });
            this.updateRanges();
        },
        updateRanges: function(){
            var range = $.map(this.dates, function(d){ return d.valueOf(); });
            $.each(this.pickers, function(i, p){
                p.setRange(range);
            });
        },
        dateUpdated: function(e){
            var dp = $(e.target).data('datepicker'),
                new_date = dp.getUTCDate(),
                i = $.inArray(e.target, this.inputs),
                l = this.inputs.length;
            if (i == -1) return;

            if (new_date < this.dates[i]){
                // Date being moved earlier/left
                while (i>=0 && new_date < this.dates[i]){
                    this.pickers[i--].setUTCDate(new_date);
                }
            }
            else if (new_date > this.dates[i]){
                // Date being moved later/right
                while (i<l && new_date > this.dates[i]){
                    this.pickers[i++].setUTCDate(new_date);
                }
            }
            this.updateDates();
        },
        remove: function(){
            $.map(this.pickers, function(p){ p.remove(); });
            delete this.element.data().datepicker;
        }
    };

    function opts_from_el(el, prefix){
        // Derive options from element data-attrs
        var data = $(el).data(),
            out = {}, inkey,
            replace = new RegExp('^' + prefix.toLowerCase() + '([A-Z])'),
            prefix = new RegExp('^' + prefix.toLowerCase());
        for (var key in data)
            if (prefix.test(key)){
                inkey = key.replace(replace, function(_,a){ return a.toLowerCase(); });
                out[inkey] = data[key];
            }
        return out;
    }

    function opts_from_locale(lang){
        // Derive options from locale plugins
        var out = {};
        // Check if "de-DE" style date is available, if not language should
        // fallback to 2 letter code eg "de"
        if (!dates[lang]) {
            lang = lang.split('-')[0]
            if (!dates[lang])
                return;
        }
        var d = dates[lang];
        $.each(locale_opts, function(i,k){
            if (k in d)
                out[k] = d[k];
        });
        return out;
    }

    var old = $.fn.datepicker;
    $.fn.datepicker = function ( option ) {
        var args = Array.apply(null, arguments);
        args.shift();
        var internal_return,
            this_return;
        this.each(function () {
            var $this = $(this),
                data = $this.data('datepicker'),
                options = typeof option == 'object' && option;
            if (!data) {
                var elopts = opts_from_el(this, 'date'),
                    // Preliminary otions
                    xopts = $.extend({}, defaults, elopts, options),
                    locopts = opts_from_locale(xopts.language),
                    // Options priority: js args, data-attrs, locales, defaults
                    opts = $.extend({}, defaults, locopts, elopts, options);
                if ($this.is('.input-daterange') || opts.inputs){
                    var ropts = {
                        inputs: opts.inputs || $this.find('input').toArray()
                    };
                    $this.data('datepicker', (data = new DateRangePicker(this, $.extend(opts, ropts))));
                }
                else{
                    $this.data('datepicker', (data = new Datepicker(this, opts)));
                }
            }
            if (typeof option == 'string' && typeof data[option] == 'function') {
                internal_return = data[option].apply(data, args);
                if (internal_return !== undefined)
                    return false;
            }
        });
        if (internal_return !== undefined)
            return internal_return;
        else
            return this;
    };

    var defaults = $.fn.datepicker.defaults = {
        autoclose: false,
        beforeShowDay: $.noop,
        calendarWeeks: false,
        clearBtn: false,
        daysOfWeekDisabled: [],
        endDate: Infinity,
        forceParse: true,
        format: 'mm/dd/yyyy',
        keyboardNavigation: true,
        language: 'en',
        minViewMode: 0,
        orientation: "auto",
        rtl: false,
        startDate: -Infinity,
        startView: 0,
        todayBtn: false,
        todayHighlight: false,
        weekStart: 0
    };
    var locale_opts = $.fn.datepicker.locale_opts = [
        'format',
        'rtl',
        'weekStart'
    ];
    $.fn.datepicker.Constructor = Datepicker;
    var dates = $.fn.datepicker.dates = {
        en: {
            days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            daysMin: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
            months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
            monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            today: "Today",
            clear: "Clear"
        }
    };

    var DPGlobal = {
        modes: [
            {
                clsName: 'days',
                navFnc: 'Month',
                navStep: 1
            },
            {
                clsName: 'months',
                navFnc: 'FullYear',
                navStep: 1
            },
            {
                clsName: 'years',
                navFnc: 'FullYear',
                navStep: 10
        }],
        isLeapYear: function (year) {
            return (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0));
        },
        getDaysInMonth: function (year, month) {
            return [31, (DPGlobal.isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
        },
        validParts: /dd?|DD?|mm?|MM?|yy(?:yy)?/g,
        nonpunctuation: /[^ -\/:-@\[\u3400-\u9fff-`{-~\t\n\r]+/g,
        parseFormat: function(format){
            // IE treats \0 as a string end in inputs (truncating the value),
            // so it's a bad format delimiter, anyway
            var separators = format.replace(this.validParts, '\0').split('\0'),
                parts = format.match(this.validParts);
            if (!separators || !separators.length || !parts || parts.length === 0){
                throw new Error("Invalid date format.");
            }
            return {separators: separators, parts: parts};
        },
        parseDate: function(date, format, language) {
            if (date instanceof Date) return date;
            if (typeof format === 'string')
                format = DPGlobal.parseFormat(format);
            if (/^[\-+]\d+[dmwy]([\s,]+[\-+]\d+[dmwy])*$/.test(date)) {
                var part_re = /([\-+]\d+)([dmwy])/,
                    parts = date.match(/([\-+]\d+)([dmwy])/g),
                    part, dir;
                date = new Date();
                for (var i=0; i<parts.length; i++) {
                    part = part_re.exec(parts[i]);
                    dir = parseInt(part[1]);
                    switch(part[2]){
                        case 'd':
                            date.setUTCDate(date.getUTCDate() + dir);
                            break;
                        case 'm':
                            date = Datepicker.prototype.moveMonth.call(Datepicker.prototype, date, dir);
                            break;
                        case 'w':
                            date.setUTCDate(date.getUTCDate() + dir * 7);
                            break;
                        case 'y':
                            date = Datepicker.prototype.moveYear.call(Datepicker.prototype, date, dir);
                            break;
                    }
                }
                return UTCDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0);
            }
            var parts = date && date.match(this.nonpunctuation) || [],
                date = new Date(),
                parsed = {},
                setters_order = ['yyyy', 'yy', 'M', 'MM', 'm', 'mm', 'd', 'dd'],
                setters_map = {
                    yyyy: function(d,v){ return d.setUTCFullYear(v); },
                    yy: function(d,v){ return d.setUTCFullYear(2000+v); },
                    m: function(d,v){
                        if (isNaN(d))
                            return d;
                        v -= 1;
                        while (v<0) v += 12;
                        v %= 12;
                        d.setUTCMonth(v);
                        while (d.getUTCMonth() != v)
                            d.setUTCDate(d.getUTCDate()-1);
                        return d;
                    },
                    d: function(d,v){ return d.setUTCDate(v); }
                },
                val, filtered, part;
            setters_map['M'] = setters_map['MM'] = setters_map['mm'] = setters_map['m'];
            setters_map['dd'] = setters_map['d'];
            date = UTCDate(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
            var fparts = format.parts.slice();
            // Remove noop parts
            if (parts.length != fparts.length) {
                fparts = $(fparts).filter(function(i,p){
                    return $.inArray(p, setters_order) !== -1;
                }).toArray();
            }
            // Process remainder
            if (parts.length == fparts.length) {
                for (var i=0, cnt = fparts.length; i < cnt; i++) {
                    val = parseInt(parts[i], 10);
                    part = fparts[i];
                    if (isNaN(val)) {
                        switch(part) {
                            case 'MM':
                                filtered = $(dates[language].months).filter(function(){
                                    var m = this.slice(0, parts[i].length),
                                        p = parts[i].slice(0, m.length);
                                    return m == p;
                                });
                                val = $.inArray(filtered[0], dates[language].months) + 1;
                                break;
                            case 'M':
                                filtered = $(dates[language].monthsShort).filter(function(){
                                    var m = this.slice(0, parts[i].length),
                                        p = parts[i].slice(0, m.length);
                                    return m == p;
                                });
                                val = $.inArray(filtered[0], dates[language].monthsShort) + 1;
                                break;
                        }
                    }
                    parsed[part] = val;
                }
                for (var i=0, _date, s; i<setters_order.length; i++){
                    s = setters_order[i];
                    if (s in parsed && !isNaN(parsed[s])){
                        _date = new Date(date);
                        setters_map[s](_date, parsed[s]);
                        if (!isNaN(_date))
                            date = _date;
                    }
                }
            }
            return date;
        },
        formatDate: function(date, format, language){
            if (typeof format === 'string')
                format = DPGlobal.parseFormat(format);
            var val = {
                d: date.getUTCDate(),
                D: dates[language].daysShort[date.getUTCDay()],
                DD: dates[language].days[date.getUTCDay()],
                m: date.getUTCMonth() + 1,
                M: dates[language].monthsShort[date.getUTCMonth()],
                MM: dates[language].months[date.getUTCMonth()],
                yy: date.getUTCFullYear().toString().substring(2),
                yyyy: date.getUTCFullYear()
            };
            val.dd = (val.d < 10 ? '0' : '') + val.d;
            val.mm = (val.m < 10 ? '0' : '') + val.m;
            var date = [],
                seps = $.extend([], format.separators);
            for (var i=0, cnt = format.parts.length; i <= cnt; i++) {
                if (seps.length)
                    date.push(seps.shift());
                date.push(val[format.parts[i]]);
            }
            return date.join('');
        },
        headTemplate: '<thead>'+
                            '<tr>'+
                                '<th class="prev">&laquo;</th>'+
                                '<th colspan="5" class="datepicker-switch"></th>'+
                                '<th class="next">&raquo;</th>'+
                            '</tr>'+
                        '</thead>',
        contTemplate: '<tbody><tr><td colspan="7"></td></tr></tbody>',
        footTemplate: '<tfoot><tr><th colspan="7" class="today"></th></tr><tr><th colspan="7" class="clear"></th></tr></tfoot>'
    };
    DPGlobal.template = '<div class="datepicker">'+
                            '<div class="datepicker-days">'+
                                '<table class=" table-condensed">'+
                                    DPGlobal.headTemplate+
                                    '<tbody></tbody>'+
                                    DPGlobal.footTemplate+
                                '</table>'+
                            '</div>'+
                            '<div class="datepicker-months">'+
                                '<table class="table-condensed">'+
                                    DPGlobal.headTemplate+
                                    DPGlobal.contTemplate+
                                    DPGlobal.footTemplate+
                                '</table>'+
                            '</div>'+
                            '<div class="datepicker-years">'+
                                '<table class="table-condensed">'+
                                    DPGlobal.headTemplate+
                                    DPGlobal.contTemplate+
                                    DPGlobal.footTemplate+
                                '</table>'+
                            '</div>'+
                        '</div>';

    $.fn.datepicker.DPGlobal = DPGlobal;


    /* DATEPICKER NO CONFLICT
    * =================== */

    $.fn.datepicker.noConflict = function(){
        $.fn.datepicker = old;
        return this;
    };


    /* DATEPICKER DATA-API
    * ================== */

    $(document).on(
        'focus.datepicker.data-api click.datepicker.data-api',
        '[data-provide="datepicker"]',
        function(e){
            var $this = $(this);
            if ($this.data('datepicker')) return;
            e.preventDefault();
            // component click requires us to explicitly show it
            $this.datepicker('show');
        }
    );
    $(function(){
        $('[data-provide="datepicker-inline"]').datepicker();
    });

}( window.jQuery ));






