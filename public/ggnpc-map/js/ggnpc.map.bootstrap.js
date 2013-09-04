/**
 * Creates a google map for GGNPC
 *
 */
//<img src="http://placehold.it/220x300">
//#sidebar-map

(function(exports){

    var bootstrap = function(){

        exports.GGNPC_MAP = exports.GGNPC_MAP || {};

        var APP_SRC = (exports.GGNPC_MAP.config && exports.GGNPC_MAP.config.GGNPC_MAP_APP_SRC)  ? exports.GGNPC_MAP.config.GGNPC_MAP_APP_SRC : exports.environmentBaseUrl + '/ggnpc-map/js/ggnpc.map.app.js';

        // TODO: concat & minify scripts where possible...
        var required = [
            {'name': 'google-maps',
            'src': 'https://maps.googleapis.com/maps/api/js?v=3&sensor=false&callback=gmaps_callback',
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
        exports.gmaps_callback = function(){}

        var validVersion = function(expected, actual){
            expected = expected || null;
            if(!expected || expected.length < 1)return true;

            expected = expected.split('.').map(function(x){return +x;})
            actual = actual.split('.').map(function(x){return +x;})

            var valid = true;
            expected.forEach(function(a,i){
                if(actual[i]){
                    if(actual[i] < expected[i]) valid = false;
                }
            });

            return valid;

        }

        var scriptsComplete = function(name){
            name = name || null;

            var done = true;
            required.forEach(function(r){
                if(name && r.name == name) r.loaded = true;

                if(!r.loaded) done = false;
            });

            return done;
        }

        var finished = function(){

            var link = document.createElement('link');
            link.rel = "stylesheet";
            link.type = "text/css";
            link.href = exports.environmentBaseUrl + '/ggnpc-map/styles/ggnpc-map.css';

            // Try to find the head, otherwise default to the documentElement
            (document.getElementsByTagName("head")[0] || document.documentElement).appendChild(link);

            // load app
            loadScripts({
                'name': 'app',
                'src': APP_SRC,
            });
        }

        var bootstrap = {};
        var complete = false;
        var loadScripts = function(s){

            var script_tag = document.createElement('script');
                script_tag.setAttribute("type","text/javascript");
                script_tag.setAttribute("src", s.src);
                script_tag.setAttribute("data-target", s.name)
                if (script_tag.readyState) {
                  script_tag.onreadystatechange = function () { // For old versions of IE
                      if (this.readyState == 'complete' || this.readyState == 'loaded') {
                          bootstrap.loadHandler();
                      }
                  };
                } else { // Other browsers
                  script_tag.onload = bootstrap.loadHandler;
                }
                // Try to find the head, otherwise default to the documentElement
                (document.getElementsByTagName("head")[0] || document.documentElement).appendChild(script_tag);
        }

        // attach loadHandler to bootstrap object for scope reasons
        bootstrap.loadHandler = function(){
            var target = this.getAttribute('data-target');

            if(scriptsComplete(target)){
                if(complete)return;
                complete = true;
                finished();
            }
        }

        var checkRequirements = function(){
            required.forEach(function(s){
                if(!s.exists()){
                    loadScripts(s);
                }else{
                    s.loaded = true;
                }
            });
        }


        var writeDOM = function(writeMapElements){
            console.log('writing dom');

            var rootElement = document.getElementById('main-map') || document.getElementById('sidebar-map');

            exports.GGNPC_MAP.root = rootElement;
            exports.GGNPC_MAP.mapSize = (rootElement.id == 'main-map') ? 'big' : 'small';

            if(!rootElement){
                alert("No element named sidebar-map or main-map");
                return
            }
            // TOOD: fragments
            rootElement.setAttribute('ng-app', 'app')
            rootElement.setAttribute('ng-controller', 'AppController');
            if(writeMapElements){
                var content = '';
                //console.log(rootElement.firstChild)
                // TODO: remove this when done testing

                if(exports.GGNPC_MAP.mapSize == 'big'){
                    content += '<h1 style="display:none;" ng-show="ggnpcPageName">{{ggnpcPageName}}</h1>';
                }

                content += '<div id="ggnpc-map" ng-controller="mapController"></div>';
                //content += '<div ggnpc-map></div>'

                if(exports.GGNPC_MAP.mapSize == 'small'){
                    content += '<a style="display:none;" ng-show="linkToBigMap" ng-href="{{linkToBigMap}}" id="ggnpc-link-big-map">Open Map &raquo; </a>';
                }

                rootElement.innerHTML = content;
            }
        }

        writeDOM();
        checkRequirements();
    }
    bootstrap();



})(window);