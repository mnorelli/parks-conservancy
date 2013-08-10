angular.module('app', ['services', 'display', 'map', 'dropdown']); // [] = required modules

angular.module('app').config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
  //$locationProvider.html5Mode(true);

  $routeProvider
      .when(
          "/visit/park-sites/:park",
          {
              action: "park.request"
          }
      )
      .otherwise(
          {
              redirectTo: "/visit/park-sites/alcatraz.html"
          }
      );
}]);

angular.module('app').controller('AppController', ['$scope', '$location', '$route', '$routeParams', 'api', function($scope, $location, $route, $routeParams, api) {
    // Update the rendering of the page.

    // models
    $scope.currentData = null;
    $scope.kindsList = [];


    $scope.markerColors = {
        'event': '#E41A1C',
        'park': '#377EB8',
        'location': '#4DAF4A',
        'program': '#984EA3',
        'subprogram': '#FF7F00',
        'project': '#FFFF33',
        'specie': '#A65628'
    }

    var callApi = function(){
        api.get($routeParams.park, function(error, data){
            if(error){
                console.log(error);
                return false;
            }

            processData(data);

            $scope.$broadcast('update');
        });
    }

    var processData = function(data){

        $scope.currentData = data;
        console.log('$scope.currentData: ', $scope.currentData)
        $scope.kindsList = d3.nest().key(function(d){
            return d.kind;
        }).entries(data.children.results);

        console.log($scope.kindsList)
    }


    var render = function(){

        // Pull the "action" value out of the
        // currently selected route.
        var renderAction = $route.current.action;

        // Also, let's update the render path so that
        // we can start conditionally rendering parts
        // of the page.
        var renderPath = renderAction.split( "." );


        //$scope.renderAction = renderAction;

        callApi();

    };

    $scope.filterMarkerKind = '';
    $scope.filterStates = {};
    $scope.filterMarkers = function($event, obj){
        $event.preventDefault && $event.preventDefault();
        $event.returnValue = false;

        $scope.filterStates[obj.key] = obj.selected;

        var target = $event.target;
        var ct = 0;

        while (target && target.nodeName.toLowerCase() !== 'a' && ct < 3) {
          target = target.parentNode;
          ct++;
        }

        if(target){
            var kind = $(target).data('kind') || null;
            if(kind){
                $scope.filterMarkerKind = kind;
            }
        }

        $scope.$broadcast('filterMarkers');

        return false;
    }

    $scope.currentMarker = null;
    $scope.showMarker = function($event, id){
        $event.preventDefault && $event.preventDefault();
        $event.returnValue = false;

        if(id && id == $scope.currentMarker){
            $scope.currentMarker = null;
        }else{
            $scope.currentMarker = id;
        }
        return false;
    }



    // Listen for changes to the Route. When the route
    // changes, let's set the renderAction model value so
    // that it can render in the Strong element.
    $scope.$on(
        "$routeChangeSuccess",
        function( $currentRoute, $previousRoute ){

            // Update the rendering.
            render();

        }
    );
}]);


// display bar
angular.module('display', [])
.controller('displayController', ['$scope', '$routeParams', function($scope, $routeParams){
    /*
    $scope.selectedPark = '';

    $scope.$on(
        "$routeChangeSuccess",
        function( $currentRoute, $previousRoute ){
           $scope.selectedPark = ($routeParams.park || "");
        }
    );
    */
}]);


// dropdown
angular.module('dropdown', [])
.controller('ddController', ['$scope', '$http', '$routeParams', '$rootScope', function($scope, $http, $routeParams, $rootScope){
    var API_URL_BASE = "http://stamen-parks-api-staging.herokuapp.com/";
    var url = API_URL_BASE + 'kind/park'

    $http({
        method: 'GET',
        url: url,
        withCredentials: false
    }).
    success(function(data, status, headers, config) {
        console.log("parks: ", data);
        data = data.results.sort(function(a,b){
            return a.attributes.filename < b.attributes.filename ? -1 : a.attributes.filename > b.attributes.filename ? 1 : 0;
        });
        $scope.parksList = data;
    }).
    error(function(data, status, headers, config) {

    });


    $scope.selectedPark = '';



    $scope.$on(
        "$routeChangeSuccess",
        function( $currentRoute, $previousRoute ){
           var park = ($routeParams.park || "");
           $scope.selectedPark = park.replace(".html", "");
           $rootScope.thisPark = $scope.selectedPark;
        }
    );


}])
.config(['$httpProvider', function($httpProvider) {
    $httpProvider.defaults.useXDomain = true;
    delete $httpProvider.defaults.headers.common['X-Requested-With'];
}]);


// map
angular.module('map', ['maps.markers'])
.controller('mapController', ['$scope','$rootScope', 'mapsMarkers', 'geodata', function($scope,$rootScope, mapsMarkers, geodata){
    geodata.init();

    var maps = {};

    maps.base = function(options){
        options = GGNPC.utils.extend({}, maps.base.defaults, options);
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
        root: 'ggnpc-map'
    };

    $scope.map = maps.base();
    mapsMarkers.map = $scope.map;

    var selectedParkOutline = null;
    var selectedTrails = [];
    var drawTrails = function(features){
        selectedTrails.length = 0;
        features.forEach(function(f){
            var geojsonGeometry = f.geometry;

            var googleObj = [];
            for (var i = 0; i < geojsonGeometry.coordinates.length; i++){
                var path = [];
                for (var j = 0; j < geojsonGeometry.coordinates[i].length; j++){
                    var coord = geojsonGeometry.coordinates[i][j];
                    var ll = new google.maps.LatLng(coord[1], coord[0]);
                    path.push(ll);
                }
                var polyline = new google.maps.Polyline({
                    path: path,
                    strokeColor: "#FF0000",
                    strokeOpacity: 1.0,
                    strokeWeight: 2
                  });


                polyline.setMap($scope.map);
                selectedTrails.push(polyline);
            }

        });




    }

    var drawPolygon = function(feature){
        feature = feature[0] || null;
        if(!feature)return;
        var coords = feature.geometry.coordinates;
        var paths = _.map(coords, function(entry) {
            return _.reduce(entry, function(list, polygon) {
                // This map() only transforms the data.
                _.each(_.map(polygon, function(point) {
                    // Important: the lat/lng are vice-versa in GeoJSON
                    return new google.maps.LatLng(point[1], point[0]);
                }), function(point) {
                    list.push(point);
                });

                return list;
            }, []);
        });

        selectedParkOutline = new google.maps.Polygon({
            paths: paths,
            strokeColor: "#FF0000",
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: "#FF0000",
            fillOpacity: 0.35
          });

        selectedParkOutline.setMap($scope.map);
    }

    var getGeoData = function(){
        console.log($scope.currentData.parent.attributes.title);
        var poly = geodata.getOutline($scope.currentData.parent.attributes.title);

        if(!poly){
            setTimeout(getGeoData, 500);
        }else{
            console.log("POLY: ", poly)
            //drawPolygon(poly);
            drawTrails(poly);
        }
    }

    var clearGeodata = function(){
        if(selectedParkOutline)selectedParkOutline.setMap(null);
        if(selectedTrails){
            selectedTrails.forEach(function(trail){
                trail.setMap(null);
            });
        }
    }

    $scope.$on('update', function(){
        clearGeodata();
        mapsMarkers.update($scope.currentData);
        getGeoData();

    });


    $scope.$on('filterMarkers', function(){
        mapsMarkers.filter($scope.filterMarkerKind);
        console.log($scope.filterMarkerKind);
    });

    $scope.$watch('currentMarker', function(){
        console.log("CURRENT MARKER: ", $scope.currentMarker);
    })

}]);


angular.module('maps.markers',[]).factory('mapsMarkers', [function(){
    var markers = {};

    var markerPool = [];

    var createMarker = function(latlng, data) {
        var marker = new google.maps.Marker({
            map: markers.map,
            position: latlng,
            ggnpc_data: data,
            icon: getCircle(data),
            vizible: true
        });

        google.maps.event.addListener(marker, 'click', function() {
            //infowindow.setContent(makeInfoContent(data));
            //infowindow.open(map, this);
        });

        markerPool.push(marker);

        return marker;
    }

    var markerColors = {
        'event': '#E41A1C',
        'park': '#377EB8',
        'location': '#4DAF4A',
        'program': '#984EA3',
        'subprogram': '#FF7F00',
        'project': '#FFFF33',
        'specie': '#A65628'
    };

    function getCircle(data) {
        var magnitude = 2;

      return {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: markerColors[data.kind] || '#000000',
        fillOpacity: .8,
        scale: 8,
        strokeColor: '#333',
        strokeWeight: 2
      };
    }

    var clearMarkers = function(){
        //if(infowindow)infowindow.close();

        if(!markerPool)return;

        markerPool.forEach(function(marker){
            marker.setMap(null);
        });
        markerPool.length = 0;
    }

    var update = function(data){
        clearMarkers();
        var bounds = new google.maps.LatLngBounds();
        var now = +new Date();

        var withLocations = [];
        var noLocations = [];

        var parentLocation = null,
            loc;
        if(data && data.parent){
            loc = data.parent.attributes.location.split(',');
            if(loc.length == 2 && !isNaN(loc[0]) && !isNaN(loc[1])){

                parentLocation = new google.maps.LatLng(loc[0], loc[1]);
            }
        }
        if(data && data.children && data.children.results.length){
            data.children.results.forEach(function(d){

                if(d.attributes.location){
                    var skip = (d.kind == 'event' && (+new Date(d.attributes.enddate) < now)) ? true : false;
                    if(d.kind != 'event')skip = false;
                    skip = false;
                    if(!skip){
                        //console.log(d.kind)
                        loc = d.attributes.location.split(',');
                        if(loc.length == 2 && !isNaN(loc[0]) && !isNaN(loc[1])){

                            var latlng = new google.maps.LatLng(loc[0], loc[1]);

                            var marker = createMarker(latlng, d);
                            bounds.extend(latlng);

                            d.marker = marker;
                            withLocations.push(d);
                        }else{
                            var marker = createMarker(parentLocation, d);
                            bounds.extend(parentLocation);

                            d.marker = marker;
                            //withLocations.push(d);
                            noLocations.push(d);
                        }
                    }
                }else{
                    //d.marker = null;
                    //d.parentLocation = parentLocation;

                    var marker = createMarker(parentLocation, d);
                    bounds.extend(parentLocation);

                    d.marker = marker;
                    //withLocations.push(d);
                    noLocations.push(d);
                }

            });

            markers.map.setCenter(bounds.getCenter());

        }else{

            alert("No stuff for " + place);
        }
    }


    markers.map = null;

    markers.update = function(data){
        update(data);
    }

    var currentFilter = null;
    markers.filter = function(kind){
        if(kind && markerPool){
            currentFilter = kind;
            markerPool.forEach(function(marker){

                if(marker.ggnpc_data.kind == currentFilter){
                    marker.setMap(null);
                    if(marker.vizible){
                        marker.vizible = false;
                        marker.setMap(null);
                    }else{

                        marker.vizible = true;
                        marker.setMap(markers.map);
                    }
                }
            });
        }
    }


    return markers;
}]);



/* Services */
angular.module('services', ['services.api', 'services.geodata']);
angular.module('services.api',[]).factory('api', ['$http', function($http){
    var API_URL_BASE = "http://stamen-parks-api-staging.herokuapp.com/";

    var api = {};

    api.currentData = null;

    api.get = function(name, callback){
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


//
angular.module('services.geodata',[]).factory('geodata', ['$http', '$rootScope', function($http, $rootScope){
    var geodata = {};
    $rootScope.loadingData = true;

    geodata.lib = {
        /*
        'boundary': {
            'data': null,
            'file': 'geodata/park_boundaries.json'
        },
        */
        'trails': {
            'data': null,
            'file': 'geodata/trails.json'
        }
    };

    var load = function(url, callback){
        $http({
            method: 'GET',
            url: url,
            withCredentials: false
        }).
        success(function(data, status, headers, config) {
            callback(null, data);
        }).
        error(function(data, status, headers, config) {
            callback('err');
        });
    }

    geodata.init = function(){

        for(var k in geodata.lib){
            if(geodata.lib[k].data === null){
                load(geodata.lib[k].file, function(err, data){
                    console.log(k)
                    if(!err){

                        if(k == 'trails'){

                            var temp = d3.nest().key(function(d){
                                return d.properties.park;
                            }).entries(data.features);

                            geodata.lib[k].data = temp;
                        }else{
                            geodata.lib[k].data = data;
                        }

                        console.log("GEO: ", geodata.lib[k].data );
                        $rootScope.loadingData = false;
                    }
                });
            }
        }
    }

    geodata.getOutline = function(parkName){
        if(geodata.lib.trails && geodata.lib.trails.data){
            var features = geodata.lib.trails.data;

            var f = features.filter(function(item){
                return item.key.toLowerCase() == parkName.toLowerCase();
            });
            return (f && f[0]) ? f[0].values : null;
        }
        /*
        if(geodata.lib.boundary && geodata.lib.boundary.data){
            var features = geodata.lib.boundary.data.features;
            console.log("P: ", parkName)
            return features.filter(function(item){
                return item.properties.name.toLowerCase() == parkName.toLowerCase();
            })
        }
        */
        return null;
    }



    return geodata;
}])
.config(['$httpProvider', function($httpProvider) {
    $httpProvider.defaults.useXDomain = true;
    delete $httpProvider.defaults.headers.common['X-Requested-With'];
}]);





