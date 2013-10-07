(function(exports){
    "use strict";

    console.log("MAP APP LOADED");
    console.log("GGNPC_MAP OBJ: ", exports.GGNPC_MAP);
    exports.GGNPC_MAP = exports.GGNPC_MAP || {};
    exports.GGNPC_MAP.API_URL_BASE = exports.GGNPC_MAP.API_URL_BASE || 'http://stamen-parks-api-staging.herokuapp.com/';

    //exports.GGNPC_MAP.API_URL_BASE = "http://0.0.0.0:5000/";

    // Add modules to the main app module
    angular.module("app", ['services', 'filters', 'map']);

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
    // handles setting the context
    angular.module('app').controller('AppController', ['$scope', '$rootScope', '$location', '$route', '$routeParams', 'api', 'contextor', function($scope, $rootScope, $location, $route, $routeParams, api, contextor) {
        $(exports.GGNPC_MAP.root).addClass('forceShow');


        //when you add it to the $rootScope variable, then it's accessible to all other $scope variables.
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
    angular.module('services', ['services.api', 'services.contextor', 'services.debounce']);

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
                    o.linkToBigMap = environmentBaseUrl + "/map";
                    o.ggnpcPageName = path.replace("/",'');
                    o.section = 'list';

                }else if(path == '/about/map' || path == '/visit/map' || path == '/park-improvements/map' || path == '/learn/map' || path == '/conservation/map' || path == '/get-involved/map'){
                    o.linkToBigMap = environmentBaseUrl + "/map";
                    o.ggnpcPageName = path.replace("/map",'').replace('/','');
                    o.section = 'list';

                }else if(path.indexOf('/visit/park-sites/') === 0){
                    o.fileName = path.split('/').pop();
                    o.linkToBigMap = environmentBaseUrl + "/map/#" + path;
                    o.section = 'visit';

                }else if(path.indexOf('/events/') === 0){
                    o.fileName = path.split('/').pop();
                    o.linkToBigMap = environmentBaseUrl + "/map/#" + path;
                    o.section =  'events';

                }else{
                    o.fileName = '';
                    o.linkToBigMap = environmentBaseUrl + "/map";
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
    .controller('mapController', ['$scope', '$rootScope', 'contextor', 'api', function($scope, $rootScope, contextor, api){

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

        var mapOptions = {
            options: {
                backgroundColor: '#fff',
                center: new google.maps.LatLng(37.7706, -122.3782),
                zoom: 12,
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

        var smallMapOptions = smallMapOptions = {
            options:{
                disableDefaultUI: true,
                disableDoubleClickZoom: true,
                draggable: false,
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

        //"M0,10A10,10 0 1,1 0,-10A10,10 0 1,1 0,10Z"
        var pointMarker = {
          path: arc(),
          fillColor: 'red',
          fillOpacity: .5,
          scale: 1,
          strokeColor: 'black',
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

        $scope.mapOptions = (GGNPC_MAP.mapSize == 'small')  ? angular.extend(mapOptions,smallMapOptions) : mapOptions;

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
                };

            });
        }


        // current bounds watcher
        $scope.$watch('currentBoundString', function(newVal, oldValue){
            if(GGNPC_MAP.mapSize == 'small') return;

            if(angular.isDefined(newVal) && newVal != oldValue){
                console.log('currentBoundChange: ', newVal);
                if(!initialContextLoaded){
                     pendingBoundsChange = newVal;
                     return;
                }
                loadMarkersOnExtentChange(newVal);
            }
        });

    }]).directive('ggnpcMap', ["$timeout", "$filter", 'debounce', function ($timeout, $filter, debounce) {
        return {
            template: '',
            restrict: 'A',
            scope: {
                mapSize: '@',
                refresh: "&refresh" // optional
            },
            link: function postLink(scope, element, attrs) {
                var root = element[0] || null;
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
                    container: element[0],
                    center: center,
                    draggable: true,
                    zoom: zoom
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

                        _m.fitGeometries();
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
    }]);


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


})(window);







