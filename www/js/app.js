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
        $scope.kindsList = d3.nest().key(function(d){
            return d.kind;
        }).entries(data.children.results);

    }


    var render = function(){

        // Pull the "action" value out of the
        // currently selected route.
        //var renderAction = $route.current.action;

        // Also, let's update the render path so that
        // we can start conditionally rendering parts
        // of the page.
        //var renderPath = renderAction.split( "." );


        //$scope.renderAction = renderAction;

        callApi();

    };

    $scope.filterMarkerKind = '';
    $scope.filterStates = {};
    $scope.filterMarkers = function($event, obj){
        //$event.preventDefault && $event.preventDefault();
        //$event.returnValue = false;
        if($event.target.type !== 'checkbox')return;
        $scope.filterStates[obj.key] = obj.selected;

        var target = $event.target;
        var ct = 0;

        while (target && target.nodeName.toLowerCase() !== 'div' && ct < 3) {
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
    var url = API_URL_BASE + 'kind/park';



    $http({
        method: 'GET',
        url: url,
        withCredentials: false
    }).
    success(function(data, status, headers, config) {
        data = data.results.sort(function(a,b){
            return a.attributes.filename < b.attributes.filename ? -1 : a.attributes.filename > b.attributes.filename ? 1 : 0;
        });
        $scope.parksList = data;
        $scope.ddOptions = [];
        $scope.parksList.forEach(function(p){
            $scope.ddOptions.push({
                'title': p.attributes.title,
                'value': p.attributes.filename
            });
        });
        setDropDown();

    }).
    error(function(data, status, headers, config) {

    });


    $scope.selectedPark = '';

    $scope.change = function(){
        console.log("CHANGE", this)
        //$scope.ddSelection = this;
        location.hash = '#/visit/park-sites/' + this.ddSelection.value;
    }

    function setDropDown(){
        if(!$scope.selectParkValue)return;
        if(!$scope.ddOptions)return;
        $scope.ddOptions.forEach(function(opt, idx){
            if(opt.value == $scope.selectParkValue)return $scope.ddSelection = $scope.ddOptions[idx];
        })

    }

    $scope.$on(
        "$routeChangeSuccess",
        function( $currentRoute, $previousRoute ){
           var park = ($routeParams.park || "");

           $scope.selectParkValue = park;
           setDropDown();
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
    var infowindow;

    maps.base = function(options){
        options = GGNPC.utils.extend({}, maps.base.defaults, options);
        var initialize = function(){
            return new google.maps.Map(document.getElementById(options.root), options.mapOptions);
        }

        return initialize();
        //return base;
    }

    $scope.map = new GGNPC.maps.Map("ggnpc-map");
    mapsMarkers.map = $scope.map;

    infowindow = mapsMarkers.infowindow = new google.maps.InfoWindow();


    var selectedParkOutline = null;
    var selectedTrails = [];
    var otherPolys = [];

    var drawTrails = function(features){
        selectedTrails.length = 0;
        var zBase = 2000;
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
                    strokeColor: "#f222aa",
                    strokeOpacity: 1.0,
                    strokeWeight: 2,
                    zIndex: zBase
                  });


                polyline.setMap($scope.map);
                selectedTrails.push(polyline);
                zBase ++;
            }

        });

    }

    var drawPolygon = function(feature){
        feature = feature[0] || null;
        if(!feature)return;
        var bounds = new google.maps.LatLngBounds();
        var coords = feature.geometry.coordinates;
        var paths = _.map(coords, function(entry) {
            return _.reduce(entry, function(list, polygon) {
                // This map() only transforms the data.
                _.each(_.map(polygon, function(point) {
                    // Important: the lat/lng are vice-versa in GeoJSON
                    var pt = new google.maps.LatLng(point[1], point[0]);
                    bounds.extend(pt);
                    return pt;
                }), function(point) {
                    list.push(point);
                });

                return list;
            }, []);
        });
        if(!paths)paths = [];
        return [paths, bounds]
    }

    var showTrails = function(){
        if(!$scope.currentData)return;
        var poly = geodata.getOutline($scope.currentData.parent.attributes.title, 'trails');

        if(poly){
            drawTrails(poly);
        }else{
            console.log("Geodata not ready!!!: ");
        }
    }
    var showBoundary = function(){
        if(!$scope.currentData)return;
        var poly = geodata.getOutline($scope.currentData.parent.attributes.title, 'boundary');

        if(poly && poly.length){

            var featureStyles = {
                strokeColor: '#333',
                strokeOpacity: .4,
                strokeWeight: 1,
                fillColor: "#4afb05",
                fillOpacity: 0.55,
                zIndex: 1000
              };

            selectedParkOutline = new GeoJSON(poly[0], featureStyles, true);

            if (selectedParkOutline.error){
                console.log("Error: no boundary for this park")
            }else{

                if(selectedParkOutline instanceof Array){
                    selectedParkOutline.forEach(function(p){
                        p.setMap($scope.map);
                    });
                }else{
                    selectedParkOutline.setMap($scope.map);
                }

                if(selectedParkOutline.geojsonBounds)$scope.map.fitBounds(selectedParkOutline.geojsonBounds);
            }

        }else{
            console.log("Geodata not ready!!!: ");
        }
    }

    var showParking = function(type){
        if(!$scope.currentData)return;
        var poly = geodata.getOutline($scope.currentData.parent.attributes.title, type);
        if(poly){
            poly.forEach(function(p){
                var pathAndBounds = drawPolygon(poly);
                if(!pathAndBounds){
                    var paths = pathAndBounds[0] || null,
                        bounds = pathAndBounds[1] || null;
                    if(!paths) return;
                    var polygon = new google.maps.Polygon({
                        paths: paths,
                        strokeWeight: 0,
                        fillColor: "#000",
                        fillOpacity: 0.9,
                        zIndex: 1500
                      });
                    polygon.setMap($scope.map);
                    otherPolys.push(polygon);
                }
            })
        }else{
            console.log("Geodata not ready!!!: ");
        }
    }

    var getGeoData = function(){
        showBoundary();
        //showTrails();
        showParking('parkingOne');
        showParking('parkingTwo');
    }

    var loadDataChange = function(){
        clearGeodata();
        getGeoData();
    }

    $rootScope.$watch('loadingData', function(){
        console.log("$rootScope.loadingData: ",$rootScope.loadingData)
        if(!$rootScope.loadingData)loadDataChange();
    });

    var clearGeodata = function(){
        if(selectedParkOutline){
            if(selectedParkOutline instanceof Array){
                selectedParkOutline.forEach(function(p){
                    p.setMap(null);
                });
                selectedParkOutline.length = 0;
            }else{
                selectedParkOutline.setMap(null);
            }
            selectedParkOutline = null;
        }

        if(selectedTrails){
            selectedTrails.forEach(function(trail){
                trail.setMap(null);
            });
        }
        if(otherPolys){
            otherPolys.forEach(function(p){
                p.setMap(null);
            });
        }

        selectedParkOutline = null;
        selectedTrails.length = 0;
        otherPolys.length = 0;
    }

    $scope.$on('update', function(){
        clearGeodata();
        mapsMarkers.update($scope.currentData);
        if(!$rootScope.loadingData)getGeoData();

    });


    $scope.$on('filterMarkers', function(){
        mapsMarkers.filter($scope.filterMarkerKind);
        console.log($scope.filterMarkerKind);
    });

    $scope.$watch('currentMarker', function(){
        mapsMarkers.showInfo($scope.currentMarker)
    });
}]);


angular.module('maps.markers',[]).factory('mapsMarkers', [function(){
    var markers = {};
    markers.infowindow = null;
    markers.map = null;

    var markerPool = [];

    var createMarker = function(latlng, data, zBase) {
        var marker = new google.maps.Marker({
            map: markers.map,
            position: latlng,
            ggnpc_data: data,
            icon: getCircle(data),
            vizible: true,
            zIndex: zBase || 3000
        });

        markerPool.push(marker);

        google.maps.event.addListener(marker, 'click', function() {
            markers.infowindow.setContent(markers.makeInfoContent(data));
            markers.infowindow.open(markers.map, this);
        });

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
        if(markers.infowindow)markers.infowindow.close();

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
            var zBase = 3000;
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

                            var marker = createMarker(latlng, d, zBase);
                            bounds.extend(latlng);

                            d.marker = marker;
                            withLocations.push(d);
                        }else{
                            var marker = createMarker(parentLocation, d, zBase);
                            bounds.extend(parentLocation);

                            d.marker = marker;
                            //withLocations.push(d);
                            noLocations.push(d);
                        }
                    }
                }else{
                    //d.marker = null;
                    //d.parentLocation = parentLocation;

                    var marker = createMarker(parentLocation, d, zBase);
                    bounds.extend(parentLocation);

                    d.marker = marker;
                    //withLocations.push(d);
                    noLocations.push(d);
                }

                zBase++;
            });
            markers.map.fitBounds(bounds);

        }else{

            alert("No stuff for " + place);
        }
    }

    markers.update = function(data){
        update(data);
    }

    markers.showInfo = function(id){
        if(!id)return;
        if(!markerPool)return;

        var marker = markerPool.filter(function(m){
            return m.ggnpc_data.attributes.id == id;
        });

        if(marker && marker.length){
            var m = marker[0];
            markers.infowindow.setContent(markers.makeInfoContent(m.ggnpc_data));
            markers.infowindow.open(markers.map, m);
        }
    }

    markers.makeInfoContent = function(place){
        var text = "<ul class='infolist'>";
        for(var key in place){
            var value = place[key];
            if(key == 'kind'){
                text += '<li><strong>' + key + '</strong>: ' + value + '</li>';
            }else if(key == 'attributes'){
                for(var val in value){
                    var attrValue = value[val];
                    text += '<li><strong>' + val + '</strong>: ' + attrValue + '</li>';
                };
            }
        }
        text += "</ul>";
        return text;
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


//
angular.module('services.geodata',[]).factory('geodata', ['$http', '$q', '$rootScope', function($http, $q, $rootScope){
    var geodata = {};
    $rootScope.loadingData = true;

    geodata.lib = {

        'boundary': {
            'data': null,
            'file': 'geodata/park_units.json'
        },

        'trails': {
            'data': null,
            'file': 'geodata/trails.json'
        },

        'parkingOne': {
            'data': null,
            'file': 'geodata/parking1.json'
        },

        'parkingTwo': {
            'data': null,
            'file': 'geodata/parking2.json'
        }
    };

    var load = function(url, key){
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

    geodata.init = function(){
        var requests = [];
        for(var k in geodata.lib){
            if(geodata.lib[k].data === null){
                requests.push( load(geodata.lib[k].file, k) );
            }
        }
        $q.all(requests).then(function(results){

            if(results){
                results.forEach(function(result){
                    var key = result.data.key;
                    if(key == 'trails'){
                        var temp = d3.nest().key(function(d){
                            return d.properties.park;
                        }).entries(result.data.features);

                        geodata.lib[key].data = temp;
                    }else{
                        geodata.lib[key].data = result.data.features;
                    }
                });
            }

            $rootScope.loadingData = false;
        });
    }

    geodata.getOutline = function(parkName, type){
        if(type == 'trails' && geodata.lib.trails && geodata.lib.trails.data){
            var features = geodata.lib.trails.data;

            var f = features.filter(function(item){
                return item.key.toLowerCase() == parkName.toLowerCase();
            });
            return (f && f[0]) ? f[0].values : null;
        }else if(type == 'boundary' && geodata.lib.boundary && geodata.lib.boundary.data){
            var features = geodata.lib.boundary.data;

            return features.filter(function(item){
                var boundary_name = '';

                try{
                    boundary_name = item.properties['Unit_name'].trim().toLowerCase();
                }catch(e){}
                //console.log(boundary_name,parkName.toLowerCase())
                return boundary_name == parkName.toLowerCase();
            })
        }else if(geodata.lib.hasOwnProperty(type) && geodata.lib[type].data){
            var features = geodata.lib[type].data;

            return features.filter(function(item){
                return item.properties.park.toLowerCase() == parkName.toLowerCase();
            })
        }

        return null;
    }



    return geodata;
}])
.config(['$httpProvider', function($httpProvider) {
    $httpProvider.defaults.useXDomain = true;
    delete $httpProvider.defaults.headers.common['X-Requested-With'];
}]);





