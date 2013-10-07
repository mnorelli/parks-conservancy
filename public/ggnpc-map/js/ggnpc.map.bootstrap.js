"use strict";
/**
 * Creates a google map for GGNPC
 *
 */

// NOTE: exports.environmentBaseUrl is set by the Node server
// Might be better to this via Javascript to get the base URI for the site.
// OR might not be even worth bothering with since once it's production mode
// it won't change
(function(exports){

    var bootstrap = function(){

        // global
        exports.GGNPC_MAP = exports.GGNPC_MAP || {};

        // determine the url for the main application file
        var APP_SRC = (exports.GGNPC_MAP.config && exports.GGNPC_MAP.config.GGNPC_MAP_APP_SRC)  ? exports.GGNPC_MAP.config.GGNPC_MAP_APP_SRC : exports.environmentBaseUrl + '/ggnpc-map/js/ggnpc.map.app.js';

        // TODO: concat & minify scripts where possible...
        var required = [
            {'name': 'google-maps',
            'src': 'https://maps.googleapis.com/maps/api/js?v=3&sensor=false&&libraries=weather&callback=gmaps_callback',
            'loaded': false,
            'version': '3',
            'exists': function(){
                return (exports.google && exports.google.maps && validVersion(this.version, exports.google.maps.version) );
            }},
            {'name': 'jquery',
            'src': 'https://ajax.googleapis.com/ajax/libs/jquery/2.0.3/jquery.min.js',
            'loaded': false,
            'version': '2.0',
            'exists': function(){
                return (exports.jQuery && validVersion(this.version, exports.jQuery.fn.jquery) );
            }},
            {'name': 'angular',
            'src': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.0.7/angular.min.js',
            'loaded': false,
            'version': '1.0.7',
            'exists': function(){
                return (exports.angular && validVersion(this.version, exports.angular.version) );
            }},
            {'name': 'd3',
            'src': 'http://d3js.org/d3.v3.min.js',
            'loaded': false,
            'version': '3.2',
            'exists': function(){
                return (exports.d3 && validVersion(this.version, exports.d3.version) );
            }},
            {'name': 'geojson',
            'src': exports.environmentBaseUrl + '/ggnpc-map/js/vendor/geojson.js',
            'loaded': false,
            'version': '3.2',
            'exists': function(){
                return (exports.GeoJSON);
            }}
        ];

        exports.gmaps_callback = function(){};

        var bootstrap = {};
        var complete = false;

        var validVersion = function(expected, actual){
            expected = expected || null;
            if(!expected || expected.length < 1){
                return true;
            }

            expected = expected.split('.').map(function(x){return +x;});
            actual = actual.split('.').map(function(x){return +x;});

            var valid = true;
            expected.forEach(function(a,i){
                if(actual[i]){
                    if(actual[i] < expected[i]){
                        valid = false;
                    }
                }
            });

            return valid;

        };

        var scriptsComplete = function(name){
            name = name || null;

            var done = true;
            required.forEach(function(r){
                if(name && r.name === name){
                    r.loaded = true;
                }

                if(!r.loaded){
                    done = false;
                }
            });

            return done;
        };

        // Load the app last
        // TODO: include this as part of the requirements
        // will then eliminate this altogther
        var finished = function(){
            loadCSS();

            // load app
            loadScripts({
                'name': 'app',
                'src': APP_SRC,
            });
        };

        // TODO: Put this CSS requirement into the requirements array
        var loadCSS = function(params){
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = exports.environmentBaseUrl + '/ggnpc-map/styles/ggnpc-map.css';

             // Try to find the head, otherwise default to the documentElement
            (document.getElementsByTagName('head')[0] || document.documentElement).appendChild(link);
        }

        var loadScripts = function(s){
            // create the script element
            var scriptTag = document.createElement('script');
            scriptTag.setAttribute('type', 'text/javascript');
            scriptTag.setAttribute('src', s.src);
            scriptTag.setAttribute('data-target', s.name);

            if (scriptTag.readyState) {
                scriptTag.onreadystatechange = function () { // For old versions of IE
                    if (this.readyState === 'complete' || this.readyState == 'loaded') {
                        bootstrap.loadHandler();
                    }
                };
            } else { // Other browsers
                scriptTag.onload = bootstrap.loadHandler;
            }

            // Try to find the head, otherwise default to the documentElement
            (document.getElementsByTagName('head')[0] || document.documentElement).appendChild(scriptTag);
        };

        // attach loadHandler to bootstrap object for scope reasons
        bootstrap.loadHandler = function(){
            var target = this.getAttribute('data-target');

            if(scriptsComplete(target)){
                if(complete) return;
                complete = true;
                finished();
            }
        };

        // checks by calling each requirements exists method
        // then loads script if needed
        var checkRequirements = function(){
            required.forEach(function(s){
                if(!s.exists()){
                    loadScripts(s);
                }else{
                    s.loaded = true;
                }
            });
        };

        var writeDOM = function(writeMapElements){
            // check if we are a big map or small map
            // biased towards #big-map, which is "big map"
            var rootElement = document.getElementById('big-map') || document.getElementById('sidebar-map');

            exports.GGNPC_MAP.root = rootElement; // store root element
            exports.GGNPC_MAP.mapSize = (rootElement.id === 'big-map') ? 'big' : 'small';

            // uh-oh
            if(!rootElement){
                console.error('No element named sidebar-map or big-map');
                return;
            }

            // set up the angularjs bits on the root element
            rootElement.setAttribute('ng-app', 'app')
            rootElement.setAttribute('ng-controller', 'AppController');

            // write DOM if needed
            // if we can add these bits to the template in Convio all the better
            if(writeMapElements){
                var content = '';

                if(exports.GGNPC_MAP.mapSize === 'big'){
                    content += '<h1 style="display:none;" ng-show="ggnpcPageName">{{ggnpcPageName}}</h1>';
                    content += '<div id="loading" ng-show="loadingData">loading....</div>';
                    content += '<div style="width:{{winWidth}}px; height:{{winHeight}}px;" resizer offsety="250">';
                    content += '<div id="ggnpc-map" ng-controller="mapController" ggnpc-map map-size="' + GGNPC_MAP.mapSize + '" map-data="mapData" park-context="parkContext" map-traffic="queryString.traffic" map-weather="queryString.weather"></div>';
                    content += '</div>';
                }else if(exports.GGNPC_MAP.mapSize === 'small'){
                    content += '<div id="ggnpc-map" ng-controller="mapController" ggnpc-map map-size="' + GGNPC_MAP.mapSize + '" map-data="mapData" park-context="parkContext"></div>';
                    content += '<a style="display:none;" ng-show="linkToBigMap" class="little-map-link pull-left" ng-href="{{linkToBigMap}}" id="ggnpc-link-big-map">See Larger Map</a>';
                    content += '<a style="display:none;" ng-show="linkToBigMap" class="little-map-link pull-right" ng-href="{{linkToPlanner}}" id="ggnpc-link-trip-planner">Get Directions</a>';
                }

                rootElement.innerHTML = content;
            }
        };

        // these are our two main bootstrapping functions
        // write necessary DOM elements
        writeDOM(true);

        // load required files (scripts & css)
        checkRequirements();

    };

    // kick things off
    bootstrap();

})(window);