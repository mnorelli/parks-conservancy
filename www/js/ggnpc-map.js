(function(exports) {

    // turn on the Google Maps "visual refresh"
    // <https://developers.google.com/maps/documentation/javascript/basics#VisualRefresh>
    google.maps.visualRefresh = true;

    var GGNPC = exports.GGNPC || (exports.GGNPC = {}),
        utils = GGNPC.utils,
        maps = GGNPC.maps = {};

    // TODO: replace these with the actual bounds
    maps.BOUNDS = new google.maps.LatLngBounds(
      new google.maps.LatLng(37.558072, -122.681354),
      new google.maps.LatLng(37.992260, -122.276233)
    );

    // technique lifted from:
    // <http://www.portlandwebworks.com/blog/extending-googlemapsmap-object>
    google.maps.Map = (function(constructor) {
      var f = function() {
        if (!arguments.length) return;
        constructor.apply(this, arguments);
      };
      f.prototype = constructor.prototype;
      return f;
    })(google.maps.Map);

    /*
     * create a new extensible class. Note that the
     * "initialize" method of your prototype will become the
     * class constructor.
     *
     * var MyClass = new maps.Class(google.maps.Map, {
     *  initialize: function(root, options) {
     *    google.maps.Map.apply(this, arguments);
     *    // ...
     *  }
     * });
     */
    maps.Class = function(parent, proto) {
      var klass = function() {
        if (typeof klass.prototype.initialize === "function") {
          klass.prototype.initialize.apply(this, arguments);
        }
      };
      klass.prototype = utils.extend(new parent(), proto);
      klass.extend = function(methods) {
        return new maps.Class(klass, methods);
      };
      if (proto && typeof proto.defaults === "object") {
        klass.defaults = utils.extend({}, parent.defaults, proto.defaults);
      }
      return klass;
    };

    // collapse options
    maps.collapseOptions = function(root, options, defaults) {
      if (arguments.length === 1) {
        if (typeof root === "string") {
          options = utils.extend({}, defaults);
        } else {
          options = utils.extend({}, defaults, arguments[1]);
          root = null;
        }
      } else {
        options = utils.extend({}, defaults, options);
      }
      options.root = utils.coerceElement(root || options.root);
      return options;
    };

    /*
     * GGNPC.maps.Map extends google.maps.Map
     * and sets the default map type to our ParkMapType (to show our tiles)
     */
    var Map = maps.Map = new maps.Class(
      google.maps.Map,
    {
      defaults: {
        root: "map",
        backgroundColor: '#fff',
        center: new google.maps.LatLng(37.7706, -122.3782),
        zoom: 12,
        mapTypeControlOptions: {
          mapTypeIds: ['parks']
        },
        scrollwheel: false,
        panControl: false,
        streetViewControl: false,
        scaleControl: false,
        mapTypeControl: false,
        apiUrl: "http://stamen-parks-api-staging.herokuapp.com/"
      },

      initialize: function(root, options) {
        options = this.options = maps.collapseOptions(root, options, Map.defaults);
        google.maps.Map.call(this, options.root || document.createElement("div"), options);

        this.mapTypes.set(maps.ParkMapType.name, maps.ParkMapType);
        this.setMapTypeId(maps.ParkMapType.name);
      },

      resize: function() {
        google.maps.event.trigger(this, "resize");
      }
    });

    // default gray tiles
    var DefaultMapType = new google.maps.StyledMapType([
      {
        "stylers": [
           {"saturation": -100}
        ]
      }
    ]);

    maps.ParkMapType = new google.maps.ImageMapType({
      // TODO: define bounds in coordinate space
      name: "parks",
      urlTemplate: "http://{S}.map.parks.stamen.com/{Z}/{X}/{Y}.png",
      subdomains: "a b c d".split(" "),
      minZoom: 8,
      maxZoom: 20,
      tileSize: new google.maps.Size(256, 256),
      getTileUrl: function(coord, zoom) {
        // TODO:
        // if (coord out of bounds) {
        //   return DefaultMapType.getTileUrl(coord, zoom)
        // }
        coord = this.getNormalizedCoord(coord, zoom);
        if (!coord) return null;
        var x = coord.x,
            y = coord.y,
            i = (zoom + x + y) % this.subdomains.length;
        return this.urlTemplate
          .replace("{S}", this.subdomains[i])
          .replace("{Z}", zoom)
          .replace("{X}", x)
          .replace("{Y}", y);
      },

      getNormalizedCoord: function(coord, zoom) {
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
        return {x: x, y: y};
      }
    });


    /*
     * Tilejson manager
     * Loads tiled json that is used to create markers on the map
     * dispatches ['tileJsonLoaded']
    */

    // XXX - process options
    maps.GridMapType = function(options){
      this.tileSize =  new google.maps.Size(256, 256);

      options = options || {};

      this.name = "grid";
      this.urlTemplate = "http://{S}.map.parks.stamen.com/labels/{Z}/{X}/{Y}.json";
      this.subdomains = "";
      this.maxZoom = 20;
      this.minZoom = 14;

      this.tiles = {};
      this.queue = [];
      this.opacity = 0;
      this.queueHash = {};
      this.processing = [];
      this.markerIdsInView = [];
      this.cache = {};
      this.blankImage = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

      this.fakeTiles = {};
      this.subdomains = "a b c d".split(" ");

    };



    maps.GridMapType.prototype.getMarkers = function(){
      return this.markerIdsInView;
    };

    maps.GridMapType.prototype.checkTilesLoaded = function(){
      var that = this;
      console.log("Queue-> ", this.queue.length);
      if(this.queue.length <= 0){
        //console.log("Queue Done!");
        //console.log('Tiles-> ', this.tiles);
        this.resolveMarkersInView();
        //console.log("Markers-> ", this.markerIdsInView);

        // firing in 'this' context failed
        google.maps.event.trigger(window, 'tileJsonLoaded');
      }
    };

    maps.GridMapType.prototype.resolveMarkersInView = function(){
      var that = this;
      this.markerIdsInView = [];
      for(var k in this.tiles){
        var t = this.tiles[k];
        var data = t.data.data;
        for(var obj in data){
          data[obj].baked = true;
          var filename = data[obj].filename || null;
          if(filename && filename.length) {
            data[obj].kind = 'location';
            that.markerIdsInView.push(data[obj]);
          }else if(data[obj].type == 'Trailhead'){
            var trail = data[obj].type || null;
            if(trail){
              data[obj].kind = 'trailhead';
              that.markerIdsInView.push(data[obj]);
            }
          }


        }
      }
    };

    maps.GridMapType.prototype.removeTileFromQueue = function(tile){
      delete this.queueHash[tile.cacheKey];

      var idx = -1;
      this.queue.forEach(function(t,i){
        if(t.cacheKey === tile.cacheKey) idx = i;
      });
      if(idx >= 0) this.queue.splice(idx,1);
    };

    maps.GridMapType.prototype.tileLoaded =function(tile){
      tile.status = 'loaded';
      if(!this.tiles.hasOwnProperty(tile.cacheKey)) this.tiles[tile.cacheKey] = tile;
      this.removeTileFromQueue(tile);
      this.checkTilesLoaded();


    };
    maps.GridMapType.prototype.tileFailed = function(tile){
      tile.status = 'error';
      this.removeTileFromQueue(tile);
      this.checkTilesLoaded();
    };
    maps.GridMapType.prototype.loadjson = function(tile){

      if(tile.cacheKey == 'null'){
        this.tileFailed(tile);
        return;
      }
      if(this.tiles[tile.cacheKey]){
        this.tileLoaded( this.tiles[tile.cacheKey] );
        return;
      }

      tile.status = 'loading';

      var that = this;
      (function(tile, that){
        d3.json(tile.url, function(data){
          if(!data){
            tile.attempts ++;
            if(tile.attempts < 2){
              window.setTimeout(function(){
                that.loadjson(tile);
              }, 200);

            }else{
              that.tileFailed(tile);
            }
          }else{
            tile.data = data;
            that.tileLoaded(tile);
          }
        });
      })(tile, that);

    };


    maps.GridMapType.prototype.getTile = function(coord, zoom, ownerDocument){

      var t = this.getTileUrl(coord,zoom),
          tile;
      if(t) {

        if(this.queueHash.hasOwnProperty(t.cacheKey)) return null;
        this.queueHash[t.cacheKey] = 1;

        tile = {
          cacheKey: t.cacheKey,
          url: t.tileUrl,
          data: null,
          x:t.normalizedCoord.x,
          y:t.normalizedCoord.y,
          z:zoom,
          attempts: 0,
          status: 'waiting'
        };
        this.queue.push(tile);
      }else{
        tile = {cacheKey: 'null'};
        this.queue.push(tile);
      }

        this.loadjson(tile);

        var img = new Image(256, 256);
        img.src = this.blankImage;
        img.style.display = 'none';
        //img.onerror = function() { img.style.display = 'none'; };


      return img;

    };

    // XXX See: https://github.com/mapbox/wax/blob/master/dist/wax.g.js#L3491
    maps.GridMapType.prototype.releaseTile = function(tile){
      //...
    };

    maps.GridMapType.prototype.getTileUrl = function(coord, zoom) {
      coord = this.getNormalizedCoord(coord, zoom);
      if (!coord || zoom < this.minZoom || zoom > this.maxZoom) return null;
      var x = coord.x,
          y = coord.y,
          i = (zoom + x + y) % this.subdomains.length,
          t = this.urlTemplate
        .replace("{S}", this.subdomains[i])
        .replace("{Z}", zoom)
        .replace("{X}", x)
        .replace("{Y}", y);

      var cacheKey = zoom + '/' + coord.x + '/' + coord.y;

      return {
        tileUrl: t,
        cacheKey: cacheKey,
        normalizedCoord: coord
      };

    };

    maps.GridMapType.prototype.getNormalizedCoord = function(coord, zoom) {
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
      return {x: x, y: y};
    };




    var MiniMap = maps.MiniMap = Map.extend({
      defaults: {
        bounds: maps.BOUNDS,
        center: new google.maps.LatLng(37.7706, -122.3782),
        zoom: 12,
        zoomControl: false,
        draggable: false,
        disableDefaultUI: true,
        disableDoubleClickZoom: true,
        keyboardShortcuts: false,
        panControl: false,
        streetViewControl: false,
        scaleControl: false,
        links: [
          {type: "big-map", href: "/map/", text: "See Larger Map"},
          {type: "directions", href: "/map/trip-planner.html", text: "Get Directions"}
        ],
        outline: {
          fitBounds: true,
          strokeColor: 'none',
          strokeOpacity: 1,
          strokeWeight: 0,
          fillColor: '#5AB95D',
          fillOpacity: .8,
          zIndex: 1000
        },
        markers: {
          fitBounds: true // outline.fitBounds takes precedence
        },
        paths: [
          /*
          {
            //pattern: new RegExp("/visit/park-sites/(.+)$"),
            pattern: new RegExp(".*"),
            run: function(str, file) {
              this._setContext(file);
            }
          }
          */
        ]
      },

      initialize: function(root, options) {
        // include drawing tools
        GGNPC.utils.extend(this, GGNPC.overlayTools);

        /*
        var linkRoot = d3.select(root)
            .html('')
            .append('a');

        root = linkRoot.node();
        */

        var options = maps.collapseOptions(root, options, MiniMap.defaults);

        Map.call(this, options.root, options);

        var root = this.root;
        root.style.width = '235px';
        root.style.height = '400px';
        root.classList.add("mini-map");
        this._setupExtras(root);
        this.resize();

        this.setCenter(this.options.center);
        this.setZoom(this.options.zoom);


        if (this.options.bounds) this.fitBounds(this.options.bounds);

        // XXX this happens automatically if it's called setPath()
        //if (this.options.path) this._setPath(this.options.path);
        if(this.options.path) this._setContext(this.options.path);
      },

      initFitMapToBounds: function(bounds) {
        var that = this;
        this.fitBounds(this._bufferBounds(bounds, .003));   // does the job asynchronously
        google.maps.event.addListenerOnce(this, 'bounds_changed', function(event) {
          var newSpan = this.getBounds().toSpan();              // the span of the map set by Google fitBounds (always larger by what we ask)
          var askedSpan = bounds.toSpan();                     // the span of what we asked for
          var latRatio = (newSpan.lat()/askedSpan.lat()) - 1;  // the % of increase on the latitude
          var lngRatio = (newSpan.lng()/askedSpan.lng()) - 1;  // the % of increase on the longitude
          // if the % of increase is too big (> to a threshold) we zoom in
          if (Math.min(latRatio, lngRatio) > 0.46) {
            // 0.46 is the threshold value for zoming in. It has been established empirically by trying different values.
            this.setZoom(this.getZoom() + 1);
          }

        });
      },

      _setupExtras: function(root) {
        var extras = this._extras = document.createElement("div");
        extras.className = "mini-map-extras";
        root.parentNode.insertBefore(extras, root.nextSibling);

        var p = d3.select(extras)
              .append("p")
                .attr("class", "links"),
            links = p.selectAll("a")
              .data(this.options.links)
              .enter()
              .append("a")
                .attr("class", function(d) { return d.type; })
                .attr("href", function(d) { return d.href; })
                .text(function(d) { return d.text; });
      },

      // not using in little map space
      _setPath: function(rawPath) {
        if (this._path === rawPath) return this;

        if (rawPath) {
          var found = false;
          this.options.paths.forEach(function(path) {
            if (found) return;
            var match = rawPath.match(path.pattern);
            if (match) {
              path.match = match;
              found = path;
            }
          });
          if (found) {
            found.run.apply(this, found.match);
          }
        } else {
          console.warn("mini-map: no path specified");
        }

        this._path = rawPath;

        d3.select(this._extras)
          .select("a.big-map")
            .attr("href", function(d) {
              return [d.href, rawPath].join("#");
            });

        return this;
      },

      _setContext: function(file) {
        if (this._contextRequest) this._contextRequest.abort();

        var that = this;
        d3.select(this._extras)
          .select("a.big-map")
            .attr("href", function(d) {
              return [d.href, file].join("#");
            });
        d3.select(this.root)
          .on('click', function(){
            window.location = [that.options.links[0].href, file].join("#");
          })
          .style('cursor','pointer');
          /*
          .attr('href', function(){
            return [that.options.links[0].href, file].join("#");
          });
          */

        if(file.charAt(0) == "/") file = file.slice(1);
        if(file.length < 1)return;
        // XXX abstract this in GGNPC.API?
        var url = [this.options.apiUrl, "record", "url", encodeURIComponent(file)].join("/"),
            that = this;
        console.log('mini-map url -> ', url);
        this._contextRequest = d3.json(url, function(error, data) {
          if (error) {
            console.warn("mini-map: no such context:", file, error);
            return;
          }

          // XXX: normalizing data until I fix this in api

          data.outlines = (data.outlines && data.outlines.length) ? data.outlines[0].results : [];

          if(data.outlines.length)data.parent.hide = true;


          that._updateContext(data);
          that._drawOverlays(data);
          that._contextRequest = null;
        });
      },

      _updateContext: function(data) {
        console.log("mini-map update context:", data);
        var that = this;
        // update directions link
        if(data.parent.hasOwnProperty('attributes')){
          var parent = data.parent.attributes;
          d3.select(this._extras)
            .select("a.directions")
              .attr("href", function(d) {
                return [d.href, utils.qs.format({
                  from: null, // "2017 Mission St, SF CA",
                  to: [parent.title, parent.id].join(":")
                })].join("?");
              });
        }
      },
      _drawOverlays: function(){}

    });

    MiniMap.inject = function(options, callback) {
      if (options.mini) {
        var root = utils.coerceElement(options.mini);
        if (root) {
          var map = new MiniMap(root, {
            path: location.pathname
          });

          if (callback) callback(null, map);

          MiniMap.instance = map;
        }
      }
    };




    MenuOverlay.prototype = new google.maps.OverlayView();

    /** @constructor */
    function MenuOverlay(map) {

      // Initialize all properties.
      this.map_ = map;

      // Define a property to hold the image's div. We'll
      // actually create this div upon receipt of the onAdd()
      // method so we'll leave it null for now.
      this.div_ = null;

      // Explicitly call setMap on this overlay.
      this.setMap(map);
    }

    /**
     * onAdd is called when the map's panes are ready and the overlay has been
     * added to the map.
     */
    MenuOverlay.prototype.onAdd = function() {

      var div = document.createElement('div');
      div.style.borderStyle = 'none';
      div.style.borderWidth = '0px';
      div.style.left = '0px';
      div.style.top = '0px';
      div.style.position = 'fixed';


      var innerdiv = document.createElement('div');
      innerdiv.id = 'hdr';
      innerdiv.style.width = '100%';
      innerdiv.style.height = 'auto';
      innerdiv.style.display = 'block';
      innerdiv.style.position = 'relative';

      div.appendChild(innerdiv);





      var that = this;
      var menuOn = false;
      var header = d3.select('#header'),
          nav = d3.select('#nav'),
          logo = d3.select('#logo'),
          content = d3.select(innerdiv);


      function leaveMenu(){
        if(menuOn)return;
        menuOn = false;
        content.classed('menu-active', false);
      }

      var delayLeave = GGNPC.utils.debounce(leaveMenu, 400);
      var elm = content.append('div');
      elm.classed('faux-header', true);

      elm.node().appendChild(header.node());
      elm.node().appendChild(nav.node());

      //div.appendChild(elm.node());

      elm
        .on('mouseenter', function(){
          if(that.dragging)return;
          menuOn = true;
          content.classed('menu-active', true);
        });
      elm
        .on('mouseleave', function(){
          menuOn = false;
          delayLeave();
        });


      this.div_ = div;
      // Add the element to the "overlayLayer" pane.
      var panes = this.getPanes();
      panes.floatPane.appendChild(div);


    };

    MenuOverlay.prototype.draw = function() {

      // We use the south-west and north-east
      // coordinates of the overlay to peg it to the correct position and size.
      // To do this, we need to retrieve the projection from the overlay.
      var overlayProjection = this.getProjection();

      // Retrieve the south-west and north-east coordinates of this overlay
      // in LatLngs and convert them to pixel coordinates.
      // We'll use these coordinates to resize the div.
      var sw = overlayProjection.fromLatLngToDivPixel(this.map_.getBounds().getSouthWest());
      var ne = overlayProjection.fromLatLngToDivPixel(this.map_.getBounds().getNorthEast());

      // Resize the image's div to fit the indicated dimensions.
      var div = this.div_;
      //div.style.left = sw.x + 'px';
      //div.style.top = ne.y + 'px';

    };

    // The onRemove() method will be called automatically from the API if
    // we ever set the overlay's map property to 'null'.
    MenuOverlay.prototype.onRemove = function() {
      this.div_.parentNode.removeChild(this.div_);
      this.div_ = null;
    };


    // Big Map
    var BigMap = maps.BigMap = Map.extend({
      defaults: {
        bounds: maps.BOUNDS,
        mapTypeControl: false,
        scrollwheel: false,
        directionsLinkText: "Get Directions",
        directionsTripLinkFormat: "/map/trip-planner.html?to=trip:{id}",
        tripsLinkFormat: "/map/trips-excursions.html#trail-{id}",

        outline: {
          fitBounds: true,
          strokeColor: '#a9bf8c',
          strokeOpacity: 1,
          strokeWeight: 2,
          fillColor: 'none',
          fillOpacity: 0,
          zIndex: 10
        },
        outlineDefaultStyle: {
          strokeColor: '#a9bf8c',
          strokeOpacity: 1,
          strokeWeight: 2,
          fillColor: 'none',
          fillOpacity: 0
        },
        outlineHover: {
          strokeColor: '#336633',
          strokeOpacity: 1
        },
        markers: {
          fitBounds: true // outlines takes precedence over markers
        },
        padding: {top: 0, right: 0, bottom: 0, left: 0}, //used for adjusting map size on window resize
        paths: [
          /*
          {
            //pattern: new RegExp("/visit/park-sites/(.+)$"),
            pattern: new RegExp(".*"),
            run: function(str, file) {
              this._setContext(file);
            }
          }
          */
        ],
        contentTemplate: {
          'default':[
          '<h4 class="title">{title}</h4>',
          '<p class="description">{description}</p>',
          '<a class="directions" href="/map/trip-planner.html">Get Directions</a>'
          ].join("\n")
        },
        templatePattern: /\{(.*?)\}/g,
        formatters:{
          'commas': d3.format(","),
          'decimalCommas': d3.format(".1f,")
        },
        trailStyles: {
          strokeColor: '#91785b',
          strokeOpacity: .4,
          strokeWeight: 4,
          fillColor: 'none',
          fillOpacity: 0,
        },
        trailStylesHover:{
          strokeOpacity: 1,
          strokeWeight: 6,
        },
      },

      /*
      line-color: #91785b;
      [use_type='Hiking'] {
          line-color: #58a618;
        }

        [use_type='Multi-Use'] {
          line-color: #999999;
        }

        [use_type='Hiking and Horses'] {
          line-color: #cb724a;
        }

        [use_type='Hiking and Bikes'] {
          line-color: #008542;
        }
      */


      initialize: function(root, options) {
        // include drawing tools
        GGNPC.utils.extend(this, GGNPC.overlayTools);

        var that = this;
        var options = maps.collapseOptions(root, options, BigMap.defaults);

        // parse options out of hash params
        options = this._parseHashParams(options);

        // initialize Map
        Map.call(this, options.root, options);

        var root = this.root;
        root.classList.add("big-map");

        // tile json set up
        var tilejsonLayer = new maps.GridMapType();
        this.overlayMapTypes.insertAt(0, tilejsonLayer);

        this._setupExtras(root);


        // set up resize handler on 'window' to resize our map container
        this.rootOffsetTop = 0;//d3.select(root).node().offsetTop;

        // sorry, best way I came up with dealing with scope issues
        // when using debounce method
        function handleWindowResizeProxy(){
          that._handleWindowResize();
        }

        d3.select(window).on('resize.big-map', GGNPC.utils.debounce(handleWindowResizeProxy, 200));
        google.maps.event.addListener(this, 'resize', function(){
          console.log("Map Resize happened");
        });

        function handleBoundsChangeProxy(){
          that._handleBoundsChange();
        }
        google.maps.event.addListener(that, 'bounds_changed', GGNPC.utils.debounce(handleBoundsChangeProxy, 250));

        handleWindowResizeProxy(); // call resize to set the map container height
        this.resize();


        this.initFitBounds = false;
        // apply coords from hash or call fitBounds
        if(this.options.hashParams && this.options.hashParams.hasOwnProperty('coords')){
          this.setCenter(this.options.hashParams.coords.latlng);
          this.setZoom(this.options.hashParams.coords.zoom);
          this.initFitBounds = true;
        }else if (this.options.bounds){
          this.fitBounds(this.options.bounds);
        }


        this.markerTypes = {
          'parent':null,
          'markers':[],
          'outlines':[]
        };
        this.outlinesOnly = ['park'];
        this.notClickable = ['Restroom'];
        this.currentData ={
          contextSet:false,
          parent:{},
          markers:[],
          outlines:[],
          baked:[]
        }

        // load content from api
        if(this.options.path) this._setContext(this.options.path);


        // listen for tile json loaded event
        // XXX: draw invisible markers that match filenames
        var initTilesLoadedCall = false;
        google.maps.event.addListener(window, 'tileJsonLoaded', function(){

          that.currentData.baked = tilejsonLayer.getMarkers().filter(function(m){
            return that.notClickable.indexOf(m.type) < 0;
          });

          if(!initTilesLoadedCall){
            that.renconcileMarkers();
            initTilesLoadedCall = true;
          }else{
            that._loadContentOnBoundsChange();
          }
        });


        this.dragging = false;
        google.maps.event.addListener(this, 'dragstart', function(){
          that.dragging = true;
        });
        google.maps.event.addListener(this, 'dragstart', function(){
          that.dragging = false;
        });

        this.tooltip = new InfoBox({
          boxClass: 'ggnpc-tooltip',
          disableAutoPan: true,
          closeBoxURL: "",
          pixelOffset: new google.maps.Size(0, -50)

        });

        // XXX: browsers that don't support hashchange
        window.onhashchange = function(evt){
          // parse hash for path & params
          var hash = location.hash.replace('#','');
          var hashParts = hash.split('?');
          var path = hashParts.shift();
          path = path || '/';

          var params = {};
          hashParts.forEach(function(part){
            var kv = part.split('=');
            if(kv.length === 2)params[kv[0]] = kv[1];
          });

          //console.log(path, that.options.path);
          //console.log(params)

          if(path !== that.options.path){
            console.log("!!!!! Path has changed (%s,%s)", path, that.options.path)
            that.options.path = path;
            that.currentData.contextSet = false;

            that._wipeOverlays();
            that.currentData.parent = {};
            that.currentData.markers = [];
            that.currentData.outlines = [];
            that.markersNeedRenconciled = true;

            that._setContext(that.options.path);
            that._updateHash();
          }
        };

        this.adjustMainMenu();
        //
      },

      adjustMainMenu: function(){
        var menu = new MenuOverlay(this);
        /*
        var that = this;
        var menuOn = false;
        var header = d3.select('#header'),
            nav = d3.select('#nav'),
            logo = d3.select('#logo'),
            content = d3.select('#content');

        function leaveMenu(){
          if(menuOn)return;
          menuOn = false;
          content.classed('menu-active', false);
        }

        var delayLeave = GGNPC.utils.debounce(leaveMenu, 400);
        var elm = content.insert("div", ":first-child");
        elm.classed('faux-header', true);

        elm.node().appendChild(header.node());
        elm.node().appendChild(nav.node());

        elm
          .on('mouseenter', function(){
            if(that.dragging)return;
            menuOn = true;
            content.classed('menu-active', true);
          });
        elm
          .on('mouseleave', function(){
            menuOn = false;
            delayLeave();
          });
        */
      },

      initFitMapToBounds: function(bounds) {
        if(this.initFitBounds) return;
        this.initFitBounds = true;

        var that = this;

        this.fitBounds(bounds);
        google.maps.event.addListenerOnce(this, 'bounds_changed', function(event) {
          var newSpan = this.getBounds().toSpan();              // the span of the map set by Google fitBounds (always larger by what we ask)
          var askedSpan = bounds.toSpan();                     // the span of what we asked for
          var latRatio = (newSpan.lat()/askedSpan.lat()) - 1;  // the % of increase on the latitude
          var lngRatio = (newSpan.lng()/askedSpan.lng()) - 1;  // the % of increase on the longitude
          // if the % of increase is too big (> to a threshold) we zoom in
          if (Math.min(latRatio, lngRatio) > 0.46) {
            // 0.46 is the threshold value for zoming in. It has been established empirically by trying different values.
            this.setZoom(this.getZoom() + 1);
          }

        });
      },



      renconcileMarkers: function(){
        if(!this.currentData.contextSet){
          this.markersNeedRenconciled  = true;
          return;
        }

        this.prevDataTimestamp = this.currentData.ts;
        this.markersNeedRenconciled = false;
        var that = this,
            bm = this.bakedMarkers || [],
            counts = {
              'transparent': 0,
              'pins': 0,
              'types': {}
            };


        this.currentData.children.forEach(function(m){
          var kind = that._getMarkerType(m); // returns a normalized kind, more of a type

          if(!counts.types.hasOwnProperty(kind))counts.types[kind] = 0;
          counts.types[kind] ++;

          if(that.outlinesOnly.indexOf(kind) > -1){ // filter out markers that should only be outlines
            m._markerKind = null;
            that.currentData.outlines.forEach(function(outline){
              if(outline.unit_name == m.attributes.title)outline.data = utils.extend({}, m);

            });

          }/*else if(m.baked && bm.indexOf(m.attributes.filename) > -1 && that.notClickable.indexOf(kind) < 0){ // is there a baked marker
            m._markerKind = 'transparent';
            counts['transparent'] ++;
          }*/else if(!m.baked && !that.parentMarker){ // else if not baked, display as pin
            m._markerKind = 'pin';
            counts['pins'] ++;
          }else{
            m._markerKind = null;
          }
        });

        this.currentData.outlines.forEach(function(f){
          if(!f.data){
            f.hide = true;
            return;
          }
          if(that.parentMarker
            && that.parentMarker.attributes.id != f.data.attributes.id){
            f.hide = true;
            return;
          }

        });


        that.currentData.children = that.currentData.children.filter(function(m){
          return m._markerKind;
        });

        console.log('Marker Counts -> ', counts);

        that._drawOverlays(that.currentData, this.initFitBounds);
        that._updateFilters();
      },

      _loadContentOnBoundsChange: function(){

        if(!this.currentData.contextSet)return; // wait for initial context to be set
        if (this._boundsRequest) this._boundsRequest.abort();
        // XXX abstract this in GGNPC.API?
        var bounds = this.getBounds().toUrlValue();

        var url  = [this.options.apiUrl, "bbox", encodeURIComponent(bounds)].join("/"),
            that = this,
            ctx  = (this.currentData) ? this.currentData.context || 'default' : 'default';

        url += '?ctx=' + ctx;

        //console.log("Bounds url -> ", url);
        this._boundsRequest = d3.json(url, function(error, data) {
          if(error){
            console.warn("big-map: failed to load data on bounds change", url, error);
            return;
          }

          //console.log("Bounds Data ->", data);
          that.currentData.outlines = (data.geojson && data.geojson.length) ? data.geojson[0].results : [];

          that.currentData.children = data.results || [];
          that.currentData.ts = +new Date();

          that.renconcileMarkers();
        });
      },

      _parseHashParams: function(options){
        if(options.hashParams){
          var params = options.hashParams;

          for(var k in params){
            if(k === 'coords'){
              var valid = true;
              var parts = params[k].split(':');

              if(parts.length === 3){
                params.coords = {
                  zoom: +parts[0],
                  latitude: +parts[1],
                  longitude: +parts[2]
                }

                if(isNaN(params.coords.zoom) || isNaN(params.coords.latitude) || isNaN(params.coords.longitude)){
                  valid = false;
                }else{
                  params.coords.zoom = Math.max(maps.ParkMapType.minZoom, Math.min(params.coords.zoom, maps.ParkMapType.maxZoom));
                  params.coords.latlng = new google.maps.LatLng(params.coords.latitude, params.coords.longitude);
                }

              }else{
                valid = false;
              }

              if(!valid) delete params[k]; // invalid coords properties delete
            }
          }

          options.hashParams = params;
        }
        return options;
      },

      _updateHash: function(){

          var c = this.getCenter(),
              z = this.getZoom(),
              s = z + ":" + c.lat().toFixed(5) + ":" + c.lng().toFixed(5);

          var h = '#' + this.options.path + '?' + 'coords=' + s;

          location.replace(h);
      },

      _handleBoundsChange: function(){
        // tilejson is in charge of this now
        //this._loadContentOnBoundsChange();

        // update coords in the hash
        this._updateHash();
      },

      _handleWindowResize: function(){
        var h = window.innerHeight,
            w = window.innerWidth,
            mapH = h - (this.rootOffsetTop + this.options.padding.bottom);

        this.root.style.height =  mapH + "px";
        this.root.style.width = w + "px"; // for some reason root with css property 'width: 100%' isn't working
      },

      // this should only fire on initial load
      // further updates happen on bounds change
      _setContext: function(file) {
        if (this._contextRequest) this._contextRequest.abort();

        // XXX abstract this in GGNPC.API?
        var url = [this.options.apiUrl, "record", "url", encodeURIComponent(file)].join("/"),
            bounds = this.getBounds().toUrlValue()
            that = this;

        if(bounds) url += "?extent=" + bounds;

        //console.log("Context url-> ", url);

        this._contextRequest = d3.json(url, function(error, data) {
          if (error) {
            console.warn("big-map: no such context:", file, error);
            this.currentData.contextSet = true;
            return;
          }

          that._updateContext(data);
        });
      },

      // create additional UI elements
      _setupExtras: function(root){
        exports.GGNPC.ui.mapKey(root);
        //console.log("ROOT: ", root)
        this.filterPanel = d3.select(root).append('div')
          .attr('class', 'panel filter-panel');

        this.filterPanel.append('h4')
          .attr('class', 'title')
          .text("Current Markers");

        this.filterPanel.append('ul')
          .attr('class', 'list-links');

        // cal
        this.calendar = calendar(root);

      },

      // filter panel UI
      _updateFilters: function(){
        if(!this._markersByType) return;
        var that = this;
        var data = [];
        for(var k in this._markersByType){
          data.push({
            key: k,
            data: this._markersByType[k]
          });
        }

        data.sort(function(a,b){
          return d3.descending(a.data.length, b.data.length);
        });

        var items = this.filterPanel.select('ul').selectAll('li')
          .data(data);
        var itemsEnter = items.enter()
          .append('li');

        itemsEnter.append('p');

        items.exit().remove();

        items.select('p')
          .text(function(d){
            return d.key + " - " + d.data.length;
          });
        /*
        items.select('a')
          .attr('href','#')
          .classed('active', function(d){
            return !that._filtered[d.key];
          })
          .text(function(d){
            return d.key + " - " + d.data.length;
          }).on('click', function(d){
            d3.event.preventDefault();

            //d3.event.preventDefault ? d3.event.preventDefault() : d3.event.returnValue = false;
            that._toggleMarkersByType(d.key);
            var active = d3.select(this).classed('active');
            d3.select(this).classed('active', !active);
        });
        */
      },

      _processCurrentData: function(data){
        // XXX: normalizing data until I fix this in API (seanc)
        this.currentData.outlines = (data.outlines && data.outlines.length) ? data.outlines[0].results : [];
        this.currentData.children = data.results || data.children || [];
        this.currentData.ts = +new Date();
        this.currentData.parent = data.parent || this.currentData.parent || {};
      },

      _updateContext: function(data){
        this._processCurrentData(data);

        if(this.currentData.parent && this.currentData.parent.kind){
          this.parentMarker = this.currentData.parent;
        }else{
          this.parentMarker = null;
        }
        this.currentData.context = data.context;
        this.currentData.contextSet = true;

        console.log("_updateContext--> ", this.currentData)
        this._contextRequest = null;
        if(this.markersNeedRenconciled)this.renconcileMarkers();


      },
      _drawOverlays: function(data){},

      //http://0.0.0.0:5000/map/#visit/park-sites/baker-beach.html?coords=15:37.85730:-122.53863
      _setInfoWindowContent: function(infowindow, data, tripsData){
        //templatePattern
        //utils.template(this.options.directionsLinkFormat)
        if (infowindow) {
          var that = this,
            attrs = data.attributes || data,
            type = data.kind || 'default',
            html = this.options.contentTemplate[type],
            tags = html.match(this.options.templatePattern),
            id = data._id || attrs.id;


          var hide = [];
          tags.forEach(function(tag){
            var prop = tag.replace("{","").replace("}","");
            var content = attrs[prop] || null;
            if(!content){
              hide.push(prop);
            }else{
              html = html.replace(tag, attrs[prop] || "")
            }

          });

          var elm = d3.select(document.createElement("div"))
            .html(html);

          hide.forEach(function(prop){
            elm.select('.'+prop).style('display', 'none');
          });

          elm.select('a.directions')
            .attr("href", function(){
              return [
                this.href,
                utils.qs.format({
                  to: [attrs.title || attrs.name, id].join(":")
                })
              ].join("?");
            });

            tripsData = tripsData || [];
            if(tripsData && tripsData.length){

              elm.select('.trips-section').classed('active', true);

              var trips = elm.select('.trips')
                .selectAll('.trip')
                .data(tripsData);

              var tripsEnter = trips.enter()
                .append('div')
                .attr('class', function(d){
                  return 'trip trip-' + d.properties.id;
                });

              trips
                .on('mouseenter', function(d){
                  d3.select(this).classed('hover', true);
                  that._togglehighlightTrail(d.properties.id);
                })
                .on('mouseleave', function(d){
                  d3.select(this).classed('hover', false);
                  that._togglehighlightTrail(d.properties.id);
                });

              var tripTitle = trips.append('h3')
                .attr('class', 'title');
              tripTitle.append('span')
                .attr('class', 'text')
                .text(function(d){
                  return d.properties.name;
                });
              tripTitle.append('span')
                .attr('class', 'duration')
                .text(function(d){
                  return d.properties.duration;
                });

              var tripMeta = trips.append('div')
                .attr('class', 'trip-meta');

              var tripDetails = tripMeta.append('div')
                .attr('class', 'details');
              tripDetails.append('span')
                .attr('class', 'distance')
                .text(function(d){
                  return that.options.formatters['decimalCommas'](d.properties.length_miles) + " miles";
                });
              tripDetails.append('span')
                .attr('class', 'elevation')
                .attr('title', 'elevation gain')
                .text(function(d){
                  var gain = Math.round(d.properties.elevation_gain);
                  return that.options.formatters['commas'](gain) + "ft";
                });
              tripDetails.append('span')
                .attr('class', 'intensity')
                .text(function(d){
                  return d.properties.intensity;
                });

                var tripLinks = trips.append('div')
                  .attr('class', 'links');

                  //directionsTripLinkFormat: "/map/trip-planner.html?to=trip:{id}",
                  //tripsLinkFormat: "/map/trips-excursions.html#trail-{id}",
                tripLinks.append('a')
                  .attr('class', 'directions')
                  .attr('href', function(d){
                    return that.options.tripsLinkFormat.replace('{id}', d.id);
                  })
                  .text('View Details & Map');
                tripLinks.append('a')
                  .attr('class', 'directions')
                  .attr('href', function(d){
                    return that.options.directionsTripLinkFormat.replace('{id}', d.id);
                  })
                  .text('Get Directions');


            }

            infowindow.setContent(elm.node());
        }
      }

    });

    maps.BigMap.contentTemplate = {
      'event':[
          '<h4 class="title"><a href="{url}">{title}<img src="{thumbnail}" class="thumbnail pull-right"></a></h4>',
          '<p class="displaydate">{displaydate}</p>',
          '<p class="description">{description}</p>',
          '<p class="cost">{cost}</p>',
          '<a class="directions" href="/map/trip-planner.html">Get Directions</a>'
        ].join("\n"),
      'park':[
          '<h4 class="title"><a href="{url}">{title}<img src="{thumbnail}" class="thumbnail pull-right"></a></h4>',
          '<p class="address">{address}</p>',
          '<p class="description">{description}</p>',
          '<p class="hours">Open: {hours}</p>',
          '<a class="directions" href="/map/trip-planner.html">Get Directions</a>'
        ].join("\n"),
      'location':[
          '<h4 class="title">{title}</h4>',
          '<p class="address">{address}</p>',
          '<p class="description">{description}</p>',
          '<p class="hours">Open: {hours}</p>',
          '<a class="directions" href="/map/trip-planner.html">Get Directions</a>'
        ].join("\n"),
      'program':[
          '<h4 class="title"><a href="{url}">{title}</a></h4>',
          '<p class="description">{description}</p>',
          '<p class="contactinfo">Contact: {contactinfo}</p>',
          '<a href="donationurl">Make a donation to this program</a>',
          '<a class="directions" href="/map/trip-planner.html">Get Directions</a>'
        ].join("\n"),
      'subprogram':[
          '<h4 class="title"><a href="{url}">{title}<img src="{thumbnail}" class="thumbnail pull-right"></a></h4>',
          '<p class="date">{date}</p>',
          '<p class="agegroup">{agegroup}, <span class="volunteertype">{volunteertype}</span></p>',
          '<p class="description">{description}</p>',
          '<p class="contactinfo">Contact: {contactinfo}</p>',
          '<a class="directions" href="/map/trip-planner.html">Get Directions</a>'
        ].join("\n"),
      'project':[
          '<h4 class="title"><a href="{url}">{title}<img src="{thumbnail}" class="thumbnail pull-right"></a></h4>',
          '<p class="startdate">{startdate}<span class="enddate"> - {enddate}</span></p>',
          '<p class="description">{description}</p>',
          '<p class="contactinfo">Contact: {contactinfo}</p>',
          '<a class="directions" href="/map/trip-planner.html">Get Directions</a>'
        ].join("\n"),
      'trailhead':[
          '<h4 class="title name"><a href="{url}">{name}</a></h4>',
          '<p class="address">{address}</p>',
          '<p class="description">{description}</p>',
          '<p class="hours">Open: {hours}</p>',
          '<a class="directions" href="/map/trip-planner.html">Get Directions</a>',
          '<div class="trips-section"><h4>Excursions</h4><div class="trips"></div></div>',
        ].join("\n"),
      'default':[
          '<h4 class="title">{title}</h4>',
          '<p class="description">{description}</p>',
          '<a class="directions" href="/map/trip-planner.html">Get Directions</a>'
        ].join("\n"),

    }

    BigMap.inject = function(options, callback) {
      if (options.root) {
        var root = utils.coerceElement(options.root);
        if (root) {

          // parse hash for path & params
          var hash = location.hash.replace('#','');
          var hashParts = hash.split('?');
          var path = hashParts.shift();
          var params = {};
          hashParts.forEach(function(part){
            var kv = part.split('=');
            if(kv.length === 2)params[kv[0]] = kv[1];
          });

          var map = new BigMap(root, {
            contentTemplate: maps.BigMap.contentTemplate,
            path: path || '/',
            hashParams: params
          });

          if (callback) callback(null, map);

          BigMap.instance = map;
        }
      }
    };

    var calendar = function(selection){
      var now = new Date(),
        active = false;

      var panel = d3.select(selection).append('div')
          .attr('class', 'panel date-picker');

      var container = panel.append('div')
        .attr('class', 'panel-container');

      var datePicker = GGNPC.ui.datePicker()
        .on("month", function(month) {
          // console.log("month:", month);
          table
            .call(datePicker.month(month))
            .call(updateDays, getDate());
        })
        .on("day", function(day) {
          //dater.close();
          //setDay(day);
        }),
      table = d3.select(container.node())
        .append("table")
          .attr("class", "calendar")
          .call(datePicker)
          .call(updateDays, now);

      var btn = panel.append('button')
        .attr('class', 'map-btn')
        .on('click', function(){
          active = !active
          panel.classed('active', active);
        })

      btn.append('span')
        .attr('class', 'default')
        .text('Event Calendar');

      btn.append('span')
        .attr('class', 'close')
        .html('Hide <i>x</i>');

      function updateDays(){

      }

      function getDate() {
        return new Date(this._date.getTime());
      }

      return {}

    };




    // handles drawing shapes and markers on a map
    // overrides the _drawOverlays method in Big & Little Maps
    // call this in map initialize fn:
    // GGNPC.utils.extend(this, GGNPC.overlayTools);
    GGNPC.overlayTools = {
      _markersByType:{},  // {type:[<marker>,...],...}
      _filtered:{},       // keeps track of what's being filtered
      _markers:[],        // [<marker>,...]
      _shapes:[],         // [<overlay>,...]
      _trailData:{},
      _bakedData:{},
      _trails:[],

      // toggles a marker by assigned type
      _toggleMarkersByType: function(kind){
        var that = this;
        this._markers.forEach(function(m){
          if(m._kind == kind){
            m.visible = !m.visible;
          }

          that._filtered[kind] = m.visible;
          m.setMap( (m.visible) ? that : null );

        });
      },

      // utility function to return a type of marker
      _getMarkerType: function(props){

        if(!props && (!props.kind || !props.type))return null;
        if(props.type) return props.type;

        return (props.kind.toLowerCase() === 'location') ?
                props.attributes.parklocationtype : props.kind;
      },

      // find marker in _markers
      _findMarker: function(id){
        for(var i = 0; i < this._markers.length; i++){
          if(this._markers[i].id_ === id) return this._markers[i];
        }
        return null;
      },

      _addPinMarker: function(data, idx, parent){
        idx = idx || 1;
        var marker = this._findMarker(data.attributes.id);
        if(marker != null){
          marker.attached = true;
          return marker;
        }

        if(!data.hasOwnProperty('latitude')
            || !data.hasOwnProperty('longitude')
            || data.hide) return null;

        marker = new google.maps.Marker({
            position: new google.maps.LatLng(data.latitude, data.longitude),
            map: this,
            optimized: false,
            zIndex: (google.maps.Marker.MAX_ZINDEX - 500) + idx,
        });

        marker._data = data;
        marker.id_ = data.attributes.id;
        marker.attached = true;
        if(parent) marker.isParent = true;

        marker.setMap( (marker.visible) ? this : null );
        this._markers.push(marker);


        return marker;
      },
      _addBakedMarker: function(data, idx){
        idx = idx || 1;

        var marker = that._findMarker(data._id);
        if(marker != null){
          marker.attached = true;
          return marker;
        }

        marker = new google.maps.Marker({
            position: new google.maps.LatLng(data.lat, data.lng),
            anchorPoint: new google.maps.Point(-1,0),
            map: this,
            optimized: false,
            zIndex: (google.maps.Marker.MAX_ZINDEX - 1000) + idx,
            icon: {
              anchor: new google.maps.Point(0,0),
              path: 'M -12,-12 12,-12 12,12 -12,12 z',
              fillColor: 'none',
              fillOpacity: 0,
              scale: 1,
              strokeColor: 'none'

            }
        });
        marker._data = data;

        marker.id_ = data._id;
        marker.attached = true;
        marker.isBaked = true;
        marker.setMap( (marker.visible) ? this : null );
        this._markers.push(marker);

        return marker
      },

      _closeCurrentInfoWindow: function(){
        if(this.locationMarkerRequest) this.locationMarkerRequest.abort();
        if(this.trailRequest) this.trailRequest.abort();
        if (this._currentInfoWindow != null) {
            this._currentInfoWindow.close();
            this._removeTrails();
        }
        if(that._currentMarker != null){
          that._currentMarker = null;
        }
        this.tooltip.close();
      },

      _addInfoWindowHandler: function(marker, infoWindow){
        var that = this;


        google.maps.event.addListener(marker, 'click', function() {
          that._closeCurrentInfoWindow();
          that._currentMarker = marker;

          infoWindow.open(that, marker);
          that._setInfoWindowContent(infoWindow, marker._data);
          that._currentInfoWindow = infoWindow;
        });

        if(marker.isParent && !marker.initialWindowCalled){
          marker.initialWindowCalled = true;
          infoWindow.open(that, marker);
          that._setInfoWindowContent(infoWindow, marker._data);
          that._currentInfoWindow = infoWindow;
        }
      },
      _addAsyncInfoWindowHandler: function(marker, infoWindow){
        var that = this;
        google.maps.event.addListener(marker, 'click', function() {

          that._closeCurrentInfoWindow();
          that._currentMarker = marker;

          if(that._bakedData[marker.id_]){

            infoWindow.open(that, marker);
            that._setInfoWindowContent(infoWindow, that._bakedData[marker.id_]);
            that._currentInfoWindow = infoWindow;

          }else{
            var url = that.apiUrl + "location/file/" + encodeURIComponent(marker._data.filename);
            console.log("url-> ", url);
            that.locationMarkerRequest = d3.json(url, function(err, data){
              if(data){
                that._bakedData[marker.id_] = data.results[0];
                infoWindow.open(that, marker);
                that._setInfoWindowContent(infoWindow, that._bakedData[marker.id_]);
                that._currentInfoWindow = infoWindow;
              }

            });
          }

        });
      },
      _locationRequest: function(){

      },

      _addTrailInfoWindowHandler: function(marker, infoWindow){
        var that = this;


        google.maps.event.addListener(infoWindow,'closeclick',function(){
           that._removeTrails();
        });

        google.maps.event.addListener(marker, 'click', function() {
          that._closeCurrentInfoWindow();
          that._currentMarker = marker;
          if(that._trailData[marker.id_]){

            that._trailData[marker.id_].features.forEach(function(d){
              that._addTrail(d);
            });

            infoWindow.open(that, marker);
            that._setInfoWindowContent(infoWindow, marker._data, that._trailData[marker.id_].features);
            that._currentInfoWindow = infoWindow;

          }else{

            var url = that.apiUrl + "trips.json?trailhead=" + marker.id_;
            console.log("url-> ", url);

            that.trailRequest = d3.json(url, function(err, data){
              console.log('Trail data-> ', data);

              if(data){
                console.log('data: ', data)
                if(data.features.length){

                  var elevations = [];
                  data.features.forEach(function(d) {
                    var points = d.geometry.coordinates,
                        changes = [];

                    points.forEach(function(c, i) {
                      elevations.push(c[2]);
                      if (i === 0) return;
                      var change = c[2] - points[i - 1][2];
                      if (change > 0) changes.push(change);
                    });
                    d.properties.elevation_gain = d3.sum(changes);
                  });

                  marker._data.hasTrip = true;

                  data.features.forEach(function(d){
                    that._addTrail(d);
                  })
                  //that._addTrail(data);
                }else{
                  marker._data.hasTrip = false;
                }

                that._trailData[marker.id_] = data;
                infoWindow.open(that, marker);
                that._setInfoWindowContent(infoWindow, marker._data, data.features);
                that._currentInfoWindow = infoWindow;

              }
            });
          }
        });
      },

      _addMarkers: function(data, skipFitBounds){
        var marker;
        var that = this;

        // set markers as unattached
        // this only works if you update all markers at one time
        if(this._markers){
          this._markers.forEach(function(marker){
            marker.attached = false;
          });
        }

        // Children
        if(data.children){
          data.children.forEach(function(item, i){
            if(item.attributes)
              marker = that._addPinMarker(item, i);
          });
        }

        // Baked in types
        if(data.baked && data.baked.length){
          data.baked.forEach(function(item,i){
            marker = that._addBakedMarker(item, i);
          });
        }

        // Parent
        if(data.parent && data.parent.attributes){
          marker = that._addPinMarker(data.parent, 500, true);
        }


        // filter out un-attached markers,
        // removing from map in the process
        this._markers = this._markers.filter(function(marker){
          if(!marker.attached)marker.setMap(null);
          return marker.attached;
        });


        // adjust map bounds only if fitBounds hasn't been called
        if(!skipFitBounds && this.options.markers.fitBounds){
          if(this._markers.length){
            var bounds = new google.maps.LatLngBounds();

            this._markers.forEach(function (m, i) {
                bounds.extend(m.getPosition());
            });

            this.fitBounds(this._bufferBounds(bounds, .003));
          }else{
            this.fitBounds(this.options.bounds);
          }
        }


        // group by type
        // can remove this if
        // not using the filter bar
        this._markersByType = {};
        this._markers.forEach(function(m){
          var kind = m._kind = that._getMarkerType(m._data);

          var visible = (that._filtered.hasOwnProperty(kind) && that._filtered[kind]) ? true : false;
          m.visible = visible;

          if(m || m.isParent){
            visible = true;
            m.visible = true;
          }

          that._filtered[kind] = visible;

          if(!that._markersByType.hasOwnProperty(kind)){
            that._markersByType[kind] = [];
          }

          that._markersByType[kind].push(marker);
        });


        // assign infoWindows
        // needs a _setInfoWindowContent fn in parent
        // XXX: remove dependency on parent fn
        if(!this._setInfoWindowContent) return;

        this._markers.forEach(function(marker){
          if(marker.hasInfoWindow) return; // marker has an infoWindow already

          // initialize a infowWindow
          // XXX: use one global window
          var infoWindow = new google.maps.InfoWindow({
            title: "",
            maxWidth: 320,
            disableAutoPan: true
          });

          marker.hasInfoWindow = true;

          // should need this but just in case
          marker._data = marker._data || {};

          // tooltip
          google.maps.event.addListener(marker, 'mouseover', function() {
            if(marker == that._currentMarker) return;
            var content = marker._data.name || marker._data.attributes.title || "";
            that.tooltip.open(that, marker);
            that.tooltip.setContent("<p>" + content + "</p>");

          });

          google.maps.event.addListener(marker, 'mouseout', function() {
            that.tooltip.close();
            that.tooltip.setContent("");
          });

          // click handlers
          if(marker.isBaked && marker._data.kind === 'trailhead'){
            that._addTrailInfoWindowHandler(marker, infoWindow);
          }else if(marker.isBaked){
            that._addAsyncInfoWindowHandler(marker, infoWindow);
          }else{
            that._addInfoWindowHandler(marker, infoWindow);
          }

        });
      },

      _wipeOverlays: function(){
        that._removeTrails();
        if (this._shapes) {
          this._clearGeometries(this._shapes);
        }
        this._shapes = [];
        if(this._markers){
          this._markers = this._markers.filter(function(marker){
            marker.setMap(null);
            marker = null;
          });
        }
        this._markers = [];
      },

      // clear geojson geometries
      _clearGeometries: function(arr){
        arr.forEach(function(boundary){
          var geojson = boundary.geojson;
          if(geojson instanceof Array){
            geojson.forEach(function(p){
              p.setMap(null);
              p = null;
            });
          }else{
            geojson.setMap(null);
            geojson = null;
          }
        });
      },

      _addTrail: function(feature){
        var opts = utils.extend({}, this.options.trailStyles);
        opts.zIndex = 1;
        var trail = new GeoJSON(feature, opts, true);
        if(trail.type != 'Error'){
          var obj = {};
          obj.geojson = trail;
          obj.bounds = (trail.geojsonBounds) ? trail.geojsonBounds : null;
          obj.id_ = feature.properties.id;
          that._trails.push(obj);

          if(trail instanceof Array){
              trail.forEach(function(p){
                  p.setMap(that);
              });
          }else{
              trail.setMap(that);

              google.maps.event.addListener(trail, 'click', function() {
                // do we want to link to trips page?
                // might be a UI nightmare
                //that.options.tripsLinkFormat.replace('{id}', d.id);
              });
              google.maps.event.addListener(trail, 'mouseover', function() {
                var klass= '.trip-' + obj.id_;
                d3.select(klass).classed('hover', true);
                that._togglehighlightTrail(obj.id_);
              });
              google.maps.event.addListener(trail, 'mouseout', function() {
                var klass= '.trip-' + obj.id_;
                d3.select(klass).classed('hover', false);
                that._togglehighlightTrail(obj.id_);
              });
          }
        }
      },
      _removeTrails: function(){
        if(!this._trails) return;
        this._clearGeometries(this._trails);
        this._trails = [];
      },
      _togglehighlightTrail: function(id){
        var trail = this._findTrail(id);

        if(!trail && !trail.geojson)return;
        trail = trail.geojson;
        var active = trail.isActive || false;


        if(!active){
          trail.isActive = true;
          trail.setOptions(this.options.trailStylesHover);
        }else{
          trail.isActive = false;
          trail.setOptions(this.options.trailStyles);
        }
      },
      _findTrail: function(id){
        if(!this._trails) return null;

        for(var i = 0; i < this._trails.length; i++){
          if(this._trails[i].id_ === id) return this._trails[i];
        }

        return null;
      },

      _highlightOutlines: function(name){
        this._shapes.forEach(function(shapes){
          if(shapes.name != name){
            shapes.geojson.forEach(function(shape){
              shape.setOptions({"strokeOpacity": .3});
            });
          }else{
            shapes.geojson.forEach(function(shape){
              shape.setOptions({"strokeOpacity": 1});
            });
          }
        });
      },
      _resetOutlines: function(){
        this._shapes.forEach(function(shapes){
          shapes.geojson.forEach(function(shape){
              shape.setOptions({"strokeOpacity": 1});
          });
        });
      },

      // draw overlays
      // geojson types are drawn first
      // markers are drawn last
      _drawOverlays: function(data, skipFitBounds) {

        var that = this;
        var fitBoundsCalled = skipFitBounds || false;


        if (data.outlines.length) {
          if (this._shapes) {
            this._clearGeometries(this._shapes);
            this._shapes = [];
          }

          // XXX will this data structure ever *not* exist?
          // XXX: to polygons need to be simplified,
          //  ie: st_asgeojson(transform(simplify(the_geom,1),4326))
          if(data.outlines){
            var bounds = new google.maps.LatLngBounds();

            data.outlines = data.outlines.sort(function(a,b){
              return d3.descending(a.acres, b.acres);
            });

            data.outlines.forEach(function(f,i){
              if(f.hide)return;
              var opts = utils.extend({}, that.options.outline);
              opts.zIndex = (google.maps.Marker.MAX_ZINDEX - 1200) + i;
              if(opts.zIndex < 1 )opts.zIndex = 1;

              var feature = JSON.parse(f.geom),
                  shapes = new GeoJSON(feature, that.options.outline, true);


              if(shapes.type != 'Error'){
                var obj = {};
                obj.geojson = shapes;
                obj.bounds = (shapes.geojsonBounds) ? shapes.geojsonBounds : null;
                obj.data = f.data;
                obj.zIndex = opts.zIndex;
                obj.name = f.unit_name;

                that._shapes.push(obj);

                shapes.forEach(function(shape){
                  shape.setMap(that);
                });

                if (shapes.geojsonBounds){
                  bounds.union(shapes.geojsonBounds)
                }
              }

            });

            if (bounds && this.options.outline.fitBounds && !fitBoundsCalled) {
              fitBoundsCalled = true;

              if(that.initFitBounds){
                that.fitBounds(bounds);
              }else{
                that.initFitMapToBounds(bounds)
              }
            }

            this._shapes.forEach(function(shape){
              if(!shape.data)return;
              shape.geojson.forEach(function(s) {
                  var infoWindow = new google.maps.InfoWindow({
                    title:  null,
                    maxWidth: 320,
                    disableAutoPan: true
                  });

                  google.maps.event.addListener(s, 'mouseover', function() {
                    s.setOptions(that.options.outlineHover);
                    that._highlightOutlines(shape.name);
                    //s.setOptions({'zIndex': shape.zIndex + 2});
                  });
                  google.maps.event.addListener(s, 'mouseout', function() {
                    s.setOptions(that.options.outlineDefaultStyle);
                    that._resetOutlines();
                    //s.setOptions({'zIndex': shape.zIndex});
                  });
                  google.maps.event.addListener(s, 'click', function(evt) {
                    console.log(evt)
                    that._closeCurrentInfoWindow();
                    infoWindow.open(that);
                    var latlng = evt.latLng || shape.bounds.getCenter();
                    infoWindow.setPosition(latlng);
                    that._setInfoWindowContent(infoWindow, shape.data);
                    that._currentInfoWindow = infoWindow;
                    that.fitBounds(shape.bounds)

                  });
              });


            });

          }
        }

        this._addMarkers(data, fitBoundsCalled);

      },
      // is this even the best approach to buffering a Google LatLngBounds object
      _bufferBounds: function(bounds, amount){
        var ne = bounds.getNorthEast(),
          sw = bounds.getSouthWest(),
          n = ne.lat() + amount,
          e = ne.lng() + amount,
          s = sw.lat() - amount,
          w = sw.lng() - amount;

        return new google.maps.LatLngBounds(new google.maps.LatLng(s,w), new google.maps.LatLng(n,e));
      }
    };

})(this);
