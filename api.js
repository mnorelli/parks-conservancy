var restify = require('restify');
var db = require("./lib/db.js")();
var urlLib = require('url');
var async = require('async');
var cheerio = require('cheerio');


// Handlers for API methods

var getBlankResponse = function(){
    return {
        context: '',
        parent:{},
        children:[],
        outlines:[]
    };
}

function parseQuery(req){
    var url_parts = urlLib.parse(req.url, true);
    var query = url_parts.query;

    return query;
}

function returnGeometry(req){
    var q = parseQuery(req);
    return (q && q.geometry) ? true : false;
}

function hasExtent(req){
    var q = parseQuery(req);
    return q.extent || null;
}

function getByName(req, res, next) {
    var kind = db.normalizeKind(req.params.kind);
    var where;
    var params;
    var needle = (req.params.name == 'all') ? "" : req.params.name;
    var geo = returnGeometry(req);
    if(kind == '*'){
        where = " AND to_tsvector('english', attributes->'title')";
        where += " @@ to_tsquery('english', $1)";
        params = [needle];
    }else{
        where = " AND kind = $1 AND";
        where += " to_tsvector('english', attributes->'title')";
        where += " @@ to_tsquery('english', $2)";
        params = [kind, needle];
    }


    var query = "select kind, attributes, ST_X(geom) as longitude, ST_Y(geom) as latitude from convio where geom is not null" + where;


    _getRecord(query, params, geo, function(err, data){
        if(err){
            res.json(200, err);
        }else{
            res.json(200, data);
        }
    });
}

function getByFilename(req, res, next) {
    var kind = db.normalizeKind(req.params.kind);
    var filename = db.normalizeFilename(req.params.file);
    var geo = returnGeometry(req);
    var where;
    var params;

    if(kind == '*'){
        where = " AND attributes->'filename' = $1";
        params = [filename];
    }else{
        where = " AND kind = $1 AND attributes->'filename' = $2";
        params = [kind, filename];
    }

    var query = "select kind, attributes, ST_X(geom) as longitude, ST_Y(geom) as latitude from convio where geom is not null" + where;

    _getRecord(query, params, geo, function(err, data){
        if(err){
            res.json(200, err);
        }else{
            res.json(200, data);
        }
    });
}

// auto-expand?


function getById(req, res, next) {
    if(!req.params.id){
        return res.json(200, {'error':'invalid parameters'});
    }
    var geo = returnGeometry(req);

    var params = [req.params.id];
    var query = "select kind, attributes, ST_X(geom) as longitude, ST_Y(geom) as latitude from convio where geom is not null and attributes->'id' = $1";


    _getRecord(query, params, geo, function(err, data){

        if(err){
            res.json(200, err);
        }else{
            res.json(200, data);
        }
    });

}

function getByKind(req, res, next){
    var kind = db.normalizeKind(req.params.kind);
    var geo = returnGeometry(req);
    var where = '';
    var params = [];

    if(kind == "*"){
        return res.json(200, {'error': 'invalid kind'});
    }else{
        where = " AND kind = $1";
        params = [kind];
    }

    var query = "select kind, attributes, ST_X(geom) as longitude, ST_Y(geom) as latitude from convio where geom is not null" + where;


    _getRecord(query, params, geo, function(err, data){
        if(err){
            res.json(200, err);
        }else{
            res.json(200, data);
        }
    });

}

// Check if needed
function getStuffForPark(req, res, next){
    var url_parts = urlLib.parse(req.url, true);
    var query = url_parts.query;

    var restrictDate = (query && query.restrictEvents) ? true : false;

    db.findStuffForPark(db.normalizeFilename(req.params.file), db.normalizeKind(req.params.kind), restrictDate, function(err, data){
        if(err){
            res.json(200, err);
        }else{
            res.json(200, data);
        }

    });
}

// similar to getByKind, only returns minimal amount of attributes
function listByKind(req, res, next){
    var kind = db.normalizeKind(req.params.kind);
    var geo = returnGeometry(req);
    var where = '';
    var params = [];


    if(kind == "*"){
        where = '';
    }else{
        where = " AND kind = $1";
        params = [kind];
    }

    var query = "select kind, attributes->'id' as id, attributes->'filename' as filename, attributes->'title' as title, ST_X(geom) as longitude, ST_Y(geom) as latitude from convio where geom is not null" + where;

    _getRecord(query, params, geo, function(err, data){
        if(err){
            res.json(200, err);
        }else{
            res.json(200, data);
        }
    });
}

// Check if needed
function getParkBoundary(req, res, next){
    var park = req.params.park || null;
    var params = []
    if(park){
        var where = "WHERE convio_filename = $1";
        params = [park];
        if(park == 'all'){
            where = "WHERE convio_filename is not null";
            params = [];
        }

        db.baseGeoQuery(['ST_AsGeoJSON(ST_Transform(geom, 4326)) as geom', 'unit_name'], where, params, '', '', function(err, out){
            if(err){
                res.json(200, err);
            }else{
                res.json(200, out);
            }
        });

    }
}



var _getItemsFromBBox = function(bbox, ctx, callback){
    bbox = bbox || '';
    bbox = bbox.split(',');


    if(bbox.length < 4) return callback({error: 'not valid bbox!'});

    var params = [bbox[1],bbox[0],bbox[3],bbox[2]];
    var geo = true;

    ctx = ctx || 'default';
    var where = whereForContext(ctx);

    //select kind, attributes, ST_X(geom) as longitude, ST_Y(geom) as latitude from convio where geom && ST_MakeEnvelope(-122.434587,37.821513,-122.41549,37.834242, 4326) and (attributes->'parklocationtype' = 'Site of Interest' or kind = 'park' or kind = 'subprogram' or (kind = 'event' and CAST(attributes->'enddate' as date) >= current_date));

    var query = "select kind, attributes, ST_X(geom) as longitude, ST_Y(geom) as latitude from convio where geom && ST_MakeEnvelope($1, $2, $3, $4, 4326) " + where ;
    //console.log(query, bbox[1],bbox[0],bbox[3],bbox[2]);

    db.runQuery(query, params, function(err, data){
        if(err){
            return callback({error: 'query error'});
        }

        var processed = db.processResult('', data);
        //console.log(processed)
        if(processed.results && processed.results.length){
            processed.results = processParkLocationTypes(processed.results);
        }
        if(geo){
            getGeojsonForRecord(processed, function(err, data){
                if(err){
                    callback(err);
                }else{
                    callback(null, data);
                }
            });
        }else{
            callback(null, processed);
        }

    });
}


// bbox ex: 37.673652,-122.604621,37.867421,-122.151779
var getItemsFromBBox = function(req, res, next){
    var bbox = req.params.bbox;

    //var url_parts = urlLib.parse(req.url, true);
    //var query = url_parts.query;
    //var ctx = query.ctx || '';

    // extract context
    var url_parts = urlLib.parse(req.url, true);
    var query = url_parts.query;
    var ctx = (query && query.ctx) ? query.ctx : '';

    // run
    _getItemsFromBBox(bbox, ctx, function(err, data){
        if(err){
            return res.json(200, err);
        }

        res.json(200, data);
    });
};



/**
 * Adds geojson for any record with:
 * kind = 'park'
 * parklocationtype = 'Trailhead'
 */

 function getGeojsonForRecord(resultsObj, callback){
     //var item = resultsObj.results[0];
     var tasks = [];
     var found = {};
     var parkboundaries = [];
     var trails = [];
     var geojson = [];

     var relatedparks = {};
     var relatedparksTasks = [];
     var points = [];

     async.each(resultsObj.results, function(item,next){

        if(item && item.hasOwnProperty('attributes')){
            if(item.kind == 'park' && item.attributes.filename){

                if(!found[item.attributes.filename]){
                    found[item.attributes.filename] = 1;
                    parkboundaries.push(item.attributes.filename);
                }
                return next();

            }else if(item.kind == 'location' && item.attributes.parklocationtype && item.attributes.parklocationtype == 'Trailhead'){
                if(!found[item.attributes.title]){
                    trails.push(item.attributes.title);
                }
                return next()

            }else if(item.attributes && item.attributes.relatedpark){
                var query = "select attributes->'filename' as filename from convio where attributes->'id'=$1";
                var params = [item.attributes.relatedpark];

                db.runQuery(query, params, function(err, data){
                    if(err)
                        return next(err);
                    var filename;
                    // XXX: not sure if it will be there all the time...
                    try{
                        filename = data.rows[0].filename;
                    }catch(e){}

                    if(filename && !found[filename]){
                        found[filename] = 1;
                        parkboundaries.push(filename);
                    }
                    next();
                });

            }else{
                next();
            }
        }else{
            next();
        }



     }, function(err){
        if(parkboundaries.length ){
           var arr = [];
           for(var i = 1; i <= parkboundaries.length; i++) {
               arr.push('$'+i);
           }
           var where = "WHERE convio_filename IN (" + arr.join(',') + ")";
           var params = parkboundaries;

            var task = {
                prop: geojson,
                attrs:'',
                query: function(attrs_, prop_, cb){
                    db.baseGeoQuery(['ST_AsGeoJSON(ST_Transform(geom, 4326)) as geom', 'unit_name'], where, params, '', '', function(err, out){
                        if(err){
                            cb();
                        }else{
                            prop_.push(out);
                            cb();
                        }
                    });
                }
            }
            tasks.push(task);
        }
        if(tasks.length){
            var q = async.queue(function (task, qcallback) {

                task.query(task.attrs, task.prop, function(err){
                    qcallback();
                });

            }, 2);

            q.drain = function() {

                resultsObj.geojson = geojson;
                callback(null, resultsObj);
            };

            q.push(tasks, function (err, data) {});

        }else{
            resultsObj.geojson = geojson;
            callback(null, resultsObj);
        }
     });

 };


var resolveContext = function(url){
    var re =  new RegExp('^\/?([^\/]*)\/?','gi');
    var found = re.exec(url);
    return (found) ? found[1] : null;
}

/*
-kinds-
subprogram
location
park
specie
project
program
event


attributes->'parklocationtype'
Site of Interest
Overlook
Cafe
Meeting Location
Visitor Center
Access
Parking Lot
Restoration Site
Meeting Place
Trailhead
Building
Bike Rack
Park
Landmark
Campground
Beach
Restroom
Water Fountain


attributes->'volunteertype'
Plant Nurseries
Beaches
Trails
Habitats
Landscapes & Historic Sites


attributes->'eventtypes'
Park Academy
Exhibit/Installation, History, Member Event, Seasonal/Holiday
Tours/Walk/Recreation
Exhibit/Installation, Film/Art/Media, Food, History, Member Event, Seasonal/Holiday, Tours/Walk/Recreation
Birds/Wildlife, History, Tours/Walk/Recreation
Exhibit/Installation, Film/Art/Media, History, Seasonal/Holiday, Tours/Walk/Recreation
Film/Art/Media, Food, History, Seasonal/Holiday, en Espanol
Partner Event
Birds/Wildlife, Environment/Science, History, Tours/Walk/Recreation
Film/Art/Media, Food, History, Seasonal/Holiday
Environment/Science, Birds/Wildlife, History, Tours/Walk/Recreation
Birds/Wildlife, Environment/Science, Food, History, Member Event
Exhibit/Installation, History, Tours/Walk/Recreation
History, Tours/Walk/Recreation
Birds/Wildlife, Exhibit/Installation, History, Tours/Walk/Recreation
Volunteer
Exhibit/Installation, Music, Environment/Science, Food, Birds/Wildlife, History, Seasonal/Holiday, Self-Guided
Music, Partner Event, Food, Seasonal/Holiday
Birds/Wildlife, Class/Workshop, Environment/Science, Raptor Observatory, Seasonal/Holiday
Exhibit/Installation, Music, Environment/Science, Food, Birds/Wildlife, History, Seasonal/Holiday, Self-Guided, Volunteer

*/

var bakedTypes = ['Visitor Center','Trailhead','Site of Interest','Parking Lot','Restroom','Overlook','Campground','Cafe']
var locationTypesByContext = {
    'about': ['Visitor Center'],
    'visit': ['Visitor Center','Landmark','Overlook'],
    'park-improvements': ['Restoration Site'],
    'conservation': ['Restoration Site','Site of Interest'],
    'learn': [],
    'get-involved': [],
    'default': [],
    'all':[]
}
var processParkLocationTypes = function(children){
    var cleaned = [];
    children.forEach(function(child){
        var locationType = (child.attributes.hasOwnProperty('parklocationtype')) ? child.attributes.parklocationtype : '';
        if(locationType != 'Park'){
            child.baked = (bakedTypes.indexOf(locationType) > -1) ? 1 : 0;
            cleaned.push(child);
        }

    });
    return cleaned;
}

var addLocationsToWhereClause = function(ctx){
    var where = "";

    bakedTypes.forEach(function(t){
        where += " or attributes->'parklocationtype' = '" + t + "'";
    });

    var ctxSpecific = locationTypesByContext[ctx] || [];
    ctxSpecific.forEach(function(t){

        if(bakedTypes.indexOf(t) < 0){
            where += " or attributes->'parklocationtype' = '" + t + "'";
        }

    });

    return where;

}

var whereForContext = function(ctx){
    ctx = ctx || '';
    // XXX: trying to remove attributes->'parklocationtype' = 'Park' from result set
    // but this is not working
    // removing in processParkLocationTypes fn
    var where = " and attributes->'parklocationtype' != 'Park' and (";

    // begin where creation
    // XXX: if above problem is resolved, remove this
    where = " and (";
    switch(ctx){
        case 'about':
            where += "kind = 'park' or kind = 'program'" + addLocationsToWhereClause(ctx);
        break;

        case 'visit':
            where += "kind = 'park'" + addLocationsToWhereClause(ctx);
        break;

        case 'park-improvements':
            where += "kind = 'park'" + addLocationsToWhereClause(ctx);
            //where = "(kind = 'event' and CAST(attributes->'enddate' as date) >= current_date) or attributes->'parklocationtype' = 'Meeting Place'";
        break;

        case 'conservation':
            where += "kind = 'park'" + addLocationsToWhereClause(ctx);
            //where = "attributes->'volunteertype' = 'Plant Nurseries' or attributes->'volunteertype' = 'Beaches' or attributes->'volunteertype' = 'Trails' or attributes->'volunteertype' = 'Habitats' or (kind = 'event' and attributes->'eventtypes' = 'Volunteer' and CAST(attributes->'enddate' as date) >= current_date)";
        break;

        case 'learn':
            where += "(kind = 'event' and CAST(attributes->'enddate' as date) >= current_date) or kind = 'park' or kind = 'subprogram'" + addLocationsToWhereClause(ctx);
            //where = "(kind = 'event' and CAST(attributes->'enddate' as date) >= current_date) or kind = 'program' or kind = 'subprogram'";
            //where = "where (kind = 'event' and CAST(attributes->'enddate' as date) >= current_date and CAST(attributes->'enddate' as timestamp) < n + interval '1 month') or kind = 'program' or kind = 'subprogram';";
        break;

        case 'get-involved':
            where += "(kind = 'event' and CAST(attributes->'enddate' as date) >= current_date) or kind = 'park' or kind = 'subprogram'" + addLocationsToWhereClause(ctx);
            //where = "(kind = 'event' and attributes->'eventtypes' = 'Volunteer' and CAST(attributes->'enddate' as date) >= current_date)";
        break;

        case 'all':
            where += "kind = 'park'" + addLocationsToWhereClause('all');
        break;

        default:
            where += "kind = 'park'" + addLocationsToWhereClause('default');
        break;
    }
    return where += ")";
}


var _getRecord = function(query, params, geo, callback){
    db.runQuery(query, params, function(err, data){
        if(data){
            var results = db.processResult('',data);
            if(geo){
                getGeojsonForRecord(results, function(err, data){

                    if(err){
                        callback(err);
                    }else{
                        callback(null, data);
                    }
                });
            }else{
                callback(null, results);
            }

        }else{
            callback(err);
        }
    });

}

//
var base = "http://www.parksconservancy.org/";
var getRecordByUrl = function(req, res, next){
    var url = req.params.url || null;

    var url_parts = urlLib.parse(req.url, true);
    var query = url_parts.query;
    var extent = hasExtent(req);
    var withExtent = (extent) ? true : false;

    var out = getBlankResponse();
    var ctx = resolveContext(url);
    out.context = ctx;



    if(!url){
        res.json(200, {error: 'invalid parameters'});
    }else{
        // process url
        if(url.charAt(0) == '#')url = url.slice(1);
        if(url.charAt(0) == '/')url = url.slice(1);


        var queryUrl = (url.indexOf('http') === 0) ? url : base + url;

        var query = "select kind, attributes, ST_X(geom) as longitude, ST_Y(geom) as latitude from convio where geom is not null and attributes->'url' = $1";
        var params = [queryUrl];

        var queries = [];

        queries.push(
            function(callback){
                _getRecord(query, params, !withExtent, function(err, data){
                    if(err){
                        callback(err);
                    }else{
                        if(data.results && data.results[0]){
                            out.parent = data.results[0];
                            out.outlines = data.geojson || [];
                        }

                        callback(null, data);
                    }
                });
            }
        );
        // bbox ex: 37.673652,-122.604621,37.867421,-122.151779
        if(withExtent){
            queries.push(
                function(stuff, callback){

                    _getItemsFromBBox(extent, ctx, function(err, data){

                        if(err){
                            callback(err);
                        }else{

                            if(data.results && data.results.length){
                                out.children = data.results;
                                if(data.geojson){
                                    out.outlines = data.geojson;
                                }
                            }


                            callback(null, data);
                        }
                    });

                }
            );
        }

        async.waterfall(queries,function(err, data){
            res.json(200,out);
        });

    }
};

var getRecordByAttribute = function(req, res, next){
    var attr = req.params.attribute || null;
    var value = req.params.value || null;

    if(!attr){
        res.json(200, {error: 'invalid parameters'});
    }else{
        var query,
            params;
        if(value){
            params = [attr,value];
            query = "select kind, attributes, ST_X(geom) as longitude, ST_Y(geom) as latitude from convio where geom is not null and attributes->$1=$2";
        }else{
            params = [attr];
            query = "select kind, attributes, ST_X(geom) as longitude, ST_Y(geom) as latitude from convio where geom is not null and attributes ? $1";
        }

        db.runQuery(query, params, function(err, data){
            if(data){

                var results = db.processResult('',data);
                getGeojsonForRecord(results, function(err, data){
                    // this should only return data
                    if(err){
                        res.json(200, err);
                    }else{
                        res.json(200, data);
                    }

                });

            }else{
                res.json(200, err);
            }
        });
    }
}

/*

\copy (select kind as kind, attributes->'id' as id, attributes->'title' as title, attributes->'url' as url, attributes->'location' as location, attributes->'locationmap' as locationmap from convio where geom is null) To '~/Desktop/convio-no-locations.csv' With CSV HEADER;
*/


// server setup
var server = restify.createServer({
    formatters: {
        'image/png; q=0.1': function formatPNG(req, res, body) {
            return body;
        },
        'image/svg+xml; q=0.1': function formatSVG(req, res, body) {
            return body;
        }
    }
});

server.use(restify.CORS());
server.use(restify.fullResponse());
server.use(restify.gzipResponse());

// API Methods
//server.get('/record/id/:id', getById);
server.get('/record/attribute/:attribute', getRecordByAttribute); // no value expected
server.get('/record/attribute/:attribute/:value', getRecordByAttribute); // w/ value expected
server.get('/record/url/:url', getRecordByUrl) // get a record by the url property, similar to attribute method but uses LIKE matching
server.get('/kind/:kind', getByKind);
server.get('/:kind/name/:name', getByName);
server.get('/:kind/file/:file', getByFilename);
server.get('/:kind/id/:id', getById);

server.get('/list/:kind', listByKind); // return title,kind

server.get('/stuff/park/:file/kind/:kind', getStuffForPark);

server.get('/geo/park/:park', getParkBoundary);

server.get('/bbox/:bbox', getItemsFromBBox);

var trips = require("./lib/trips");

server.get('/trips.json', trips.getTrips);
server.get(/\/trips\/(\d+)\.json/, trips.getTripById);
server.get('/trips/:id/elevation-profile.svg', trips.getElevationProfileForTrip);
server.get('/trips/:id/elevation-profile.png', trips.getElevationProfileForTripAsPNG);

var trailheads = require("./lib/trailheads");

server.get('/trailheads.json', trailheads.getTrailheads);
server.get(/\/trailheads\/(\d+)\.json/, trailheads.getTrailheadById);

// start server
//process.env.PORT || 5555
server.listen(process.env.PORT || 5555, function() {
    console.log('%s listening at %s', server.name, server.url);
});
