var restify = require('restify');
var db = require("./lib/db.js")();
var urlLib = require('url');
var async = require('async');
var cheerio = require('cheerio');


// Handlers for API methods
// TODO: should we chunk out the responses
function getByName(req, res, next) {
    var kind = db.normalizeKind(req.params.kind);
    var where;
    var params;
    var needle = (req.params.name == 'all') ? "" : req.params.name;
    if(kind == '*'){
        where = "WHERE to_tsvector('english', attributes->'title')";
        where += " @@ to_tsquery('english', $1)";
        params = [needle];
    }else{
        where = "WHERE kind = $1 AND";
        where += " to_tsvector('english', attributes->'title')";
        where += " @@ to_tsquery('english', $2)";
        params = [kind, needle];
    }


    //(columns, where, order, limit, callback)
    db.baseQuery(['*'], where, params, '', '', function(err, out){
        if(err){
            res.json(200, err);
        }else{
            res.json(200, out);
        }
    });
}

function getByFilename(req, res, next) {
    var kind = db.normalizeKind(req.params.kind);
    var filename = db.normalizeFilename(req.params.file);
    var where;
    var params;

    if(kind == '*'){
        where = "WHERE attributes->'filename' = $1";
        params = [filename];
    }else{
        where = "WHERE kind = $1 AND attributes->'filename' = $2";
        params = [kind, filename];
    }

    //(columns, where, order, limit, callback)
    db.baseQuery(['*'], where, params, '', '', function(err, out){
        if(err){
            res.json(200, err);
        }else{
            res.json(200, out);
        }
    });
}

function parseQuery(req){
    var url_parts = urlLib.parse(req.url, true);
    var query = url_parts.query;

    return query;
}

// auto-expand?

var fieldsToExpand = ['location','locationmap'];

// this is only being called from getById for now...
function autoExpand(resultsObj, callback){
    //var item = resultsObj.results[0];
    var tasks = [];
    var found = {};
    var parkboundaries = [];
    var trails = [];
    var geojson = [];
    resultsObj.results.forEach(function(item){

        if(item && item.hasOwnProperty('attributes')){
            fieldsToExpand.forEach(function(prop){
                if(item.attributes.hasOwnProperty(prop)){

                    if(prop == 'location'){ // need to get by filename
                        $ = cheerio.load(item.attributes.location);
                        if($('a').attr('href')){
                            var parts = url.parse($('a').attr('href'));
                            var filename = parts.path.split('/').pop();

                            var where = "WHERE kind = 'location' AND attributes->'filename' = $1";
                            var params = [filename];

                            var task = {
                                'expandKind': prop,
                                'prop': prop,
                                'attrs': item.attributes,
                                'query': function(attrs_, prop_, cb){
                                    db.baseQuery(['*'], where, params, '', '', function(err, data){
                                        if(err){
                                            cb();
                                        }else{
                                            attrs_[prop_] = data.results[0].attributes;
                                            cb();
                                        }
                                    });
                                }
                            }
                            tasks.push(task);
                        }
                    }else if(prop == 'locationmap'){
                        var parts = url.parse(item.attributes.locationmap);
                        var filename = parts.path.split('/').pop();

                        var where = "WHERE kind = 'location' AND attributes->'filename' = $1";
                        var params = [filename];

                        var task = {
                            'expandKind': prop,
                            'prop': prop,
                            'attrs': item.attributes,
                            'query': function(attrs_, prop_, cb){
                                db.baseQuery(['*'], where, params, '', '', function(err, data){
                                    if(err){
                                        cb();
                                    }else{
                                        attrs_[prop_] = data.results[0].attributes;
                                        cb();
                                    }
                                });
                            }
                        }
                        tasks.push(task);
                    }
                }
            });
            if(item.kind == 'park' && item.attributes.filename){
                if(!found[item.attributes.filename]){
                    found[item.attributes.filename] = 1;
                    parkboundaries.push(item.attributes.filename);
                }

            }
            if(item.kind == 'location' && item.attributes.parklocationtype && item.attributes.parklocationtype == 'Trailhead'){
                if(!found[item.attributes.title]){
                    trails.push(item.attributes.title);
                }
            }


            /*
            if(item.attributes && item.attributes.relatedpark){
                var parkid = item.attributes.relatedpark;
                if(!relatedparks[parkid]){
                    relatedparks[parkid] = 1;
                    var where = "where attributes->'id' = $1";
                    var params = [parkid];

                    var task = {

                    }
                    db.baseQuery(['*'], where, params, '', '', function(err, data){
                        if(err){
                            cb();
                        }else{
                            attrs_[prop_] = data.results[0].attributes;
                            cb();
                        }
                    });

                }
            }*/



        }
    });

    if(parkboundaries.length){
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

};



function getById(req, res, next) {
    var kind = db.normalizeKind(req.params.kind);

    var query = parseQuery(req);
    var autoexpand = (query.autoexpand) ? true : false;


    var where;
    var params;

    if(kind == '*'){
        where = "WHERE attributes->'id' = $1";
        params = [req.params.id];
    }else{
        where = "WHERE kind = $1 AND attributes->'id' = $2";
        params = [kind, req.params.id];
    }

    //(columns, where, order, limit, callback)
    db.baseQuery(['*'], where, params, '', '', function(err, out){
        if(err){
            res.json(200, err);
        }else{
            if(autoexpand){
                async.nextTick(function(){
                    autoExpand(out, function(err, data){
                        if(err){
                            res.json(200, {error: 'problem autoexpanding'});
                        }else{
                            res.json(200, data);
                        }
                    });
                });
            }else{
                res.json(200, out);
            }

        }
    });

}

function getByKind(req, res, next){
    var kind = db.normalizeKind(req.params.kind);
    var where = '';
    var params = [];

    if(kind == "*"){
        return res.json(200, {'error': 'invalid kind'});
    }else{
        where = "WHERE kind = $1";
        params = [kind];
    }

    db.baseQuery(['*'], where, params, '', '', function(err, out){
        if(err){
            res.json(200, err);
        }else{
            res.json(200, out);
        }
    });

}

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

function listByKind(req, res, next){
    var kind = db.normalizeKind(req.params.kind);
    var where = '';
    var params = [];


    if(kind == "*"){
        where = '';
    }else{
        where = "WHERE kind = $1";
        params = [kind];
    }

    db.baseQuery(["attributes->'id' as id", "attributes->'filename' as filename", "attributes->'title' as title", 'kind'], where, params, '', '', function(err, out){
        if(err){
            res.json(200, err);
        }else{
            res.json(200, out);
        }
    });
}

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

function getEventContext(req, res, next){
    var response = {}, // our queries will be stuffed in here
        filename = db.normalizeFilename(req.params.file),
        params,
        where;
        //select attributes, ST_X(geom) as longitude, ST_Y(geom) as latitude from convio where attributes->'redwood-creek-nursery.html' = $1 and kind = 'event'
    async.waterfall([
        // get parent
        function(callback){
            var query = "select attributes, ST_X(geom) as longitude, ST_Y(geom) as latitude from convio where attributes->'filename' = $1 and kind = 'event'"

            params = [filename];

            db.runQuery(query, params, function(err, data){
                if(err){
                    callback('error');
                }else{
                    var processed = db.processResult('', data);
                    response['parent'] = processed;
                    callback(null, processed);
                }
            });

        },

        // get related park
        function(stuff, callback){
            if(stuff && stuff.results){
                where = "WHERE kind='park' and attributes->'id' = $1";
                var f = stuff.results[0].attributes.relatedpark;

                params = [f];
                db.baseQuery(['*'], where, params, '', '', function(err, data){
                    if(err){
                        callback('error');
                    }else{
                        response['parent'].results[0].attributes.relatedpark = data.results[0].attributes;

                        callback(null, data.results[0].attributes.filename);
                    }
                });
            }else{
                callback('no relatedpark')
            }
        },

        // get children
        function(relatedpark, callback){
            params = [relatedpark];
            var query = "WITH geometry as (select ST_Transform(geom, 4326) as geom from park_units where convio_filename =$1)";
                query += " select g.attributes as attributes, ST_X(g.geom) as longitude, ST_Y(g.geom) as latitude from (select * from convio where geom is not null and st_contains((select geom from geometry), geom)) as g";

            db.runQuery(query, params, function(err, data){
                if(err){
                    callback('error');
                }else{
                    response['children'] = db.processResult('', data);
                    callback(null, relatedpark);
                }
            });
        },

        // get outlines
        function(relatedpark, callback){
            params = [relatedpark]
            var query = "WITH geometry as (select geom from park_units where convio_filename = $1)";
                query += " select ST_AsGeoJSON(ST_Transform(geom, 4326)) as geom from park_units where st_contains((select geom from geometry), geom);";

            db.runQuery(query, params, function(err, data){
                if(err){
                    callback('error');
                }else{
                    response['outlines'] = db.processResult('', data);
                    callback(null, 'done');
                }
            });
        }

    ], function(err, results){
        return res.json(200, response);
    });

    //select attributes->'title' from convio where kind='event' and attributes->'eventtypes' = 'Volunteer';
    // select attributes->'title', attributes->'startdate'  from convio where kind='event' and (CAST(attributes->'startdate' as timestamp), CAST(attributes->'startdate' as timestamp)) overlaps (now(), now() + interval '7 days') limit 10;
}

// so far this is only working for park types
var getContextByFilename = function(req, res, next){
    var response = {}, // our queries will be stuffed in here
        filename = db.normalizeFilename(req.params.file),
        params,
        where;
    async.waterfall([

        // get parent
        function(callback){
            var query = "select attributes, ST_X(geom) as longitude, ST_Y(geom) as latitude from convio where attributes->'filename' = $1 and kind = 'park'"

            params = [filename];

            db.runQuery(query, params, function(err, data){
                if(err){
                    callback('error');
                }else{
                    var processed = db.processResult('', data);
                    response['parent'] = processed;
                    callback(null, processed);
                }
            });

        },

        // get children
        function(stuff, callback){
            //lib.runQuery
            var query = "WITH geometry as (select ST_Transform(geom, 4326) as geom from park_units where convio_filename =$1)";
                query += " select g.attributes as attributes, ST_X(g.geom) as longitude, ST_Y(g.geom) as latitude from (select * from convio where st_contains((select geom from geometry), geom)) as g";
                query += " where attributes->'parklocationtype' = 'Site of Interest' or attributes->'parklocationtype' = 'Parking Lot' or g.kind = 'subprogram' or g.attributes->'parklocationtype' = 'Trailhead' or g.kind = 'park' or g.kind='program'";

            db.runQuery(query, params, function(err, data){
                if(err){
                    callback('error');
                }else{
                    response['children'] = db.processResult('', data);
                    callback(null, []);
                }
            });
        },

        // get outlines
        function(stuff, callback){
            var query = "WITH geometry as (select geom from park_units where convio_filename = $1)";
                query += " select ST_AsGeoJSON(ST_Transform(geom, 4326)) as geom from park_units where st_contains((select geom from geometry), geom);";

            db.runQuery(query, params, function(err, data){
                if(err){
                    callback('error');
                }else{
                    response['outlines'] = db.processResult('', data);
                    callback(null, 'done');
                }
            });
        }
        // get trails?



        ],
        function(err, results){
            return res.json(200, response);
        }
    );

    //from park_units where convio_filename ='alcatraz.html'

};





var getInitialContextList = function(req, res, next){
    var where, params;
    switch(req.params.context){
        case 'about':
            where = "where kind = 'park' or kind = 'program'";
            params = [];
        break;
        case 'visit':
            where = "where attributes->'parklocationtype' = 'Site of Interest' or attributes->'parklocationtype' = 'Trailhead' or kind = 'park' or kind='program'";
            params = [];
        break;
        case 'park-improvements':
            where = "where (kind = 'event' and CAST(attributes->'enddate' as timestamp) >= now() and CAST(attributes->'enddate' as timestamp) < now() + interval '1 month') or attributes->'parklocationtype' = 'Meeting Place';";
            params = [];
        break;
        case 'conservation':
            where = "where attributes->'volunteertype' = 'Plant Nurseries' or attributes->'volunteertype' = 'Beaches' or attributes->'volunteertype' = 'Trails' or attributes->'volunteertype' = 'Habitats' or (kind = 'event' and attributes->'eventtypes' = 'Volunteer' and CAST(attributes->'enddate' as timestamp) >= now() and CAST(attributes->'enddate' as timestamp) < now() + interval '1 month');";
            params = [];
        break;
        case 'learn':
            where = "where (kind = 'event' and CAST(attributes->'enddate' as timestamp) >= now() and CAST(attributes->'enddate' as timestamp) < now() + interval '1 month') or kind = 'program' or kind = 'subprogram';";
            params = [];
        break;
        case 'get-involved':
            where = "where (kind = 'event' and attributes->'eventtypes' = 'Volunteer' and CAST(attributes->'enddate' as timestamp) >= now() and CAST(attributes->'enddate' as timestamp) < now() + interval '1 month');";
            params = [];
        break;
    }

    if(where){
        db.baseQuery(['*'], where, params, '', '', function(err, out){
            if(err){
                res.json(200, {error: err});
            }else{
                async.nextTick(function(){
                    autoExpand(out, function(err, data){
                        if(err){
                            res.json(200, {error: 'problem autoexpanding'});
                        }else{
                            res.json(200, data);
                        }
                    });
                });
            }

        });
    }else{
        res.json(200, {error: 'sorry unsupported context type'});
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
     resultsObj.results.forEach(function(item){

         if(item && item.hasOwnProperty('attributes')){
             if(item.kind == 'park' && item.attributes.filename){
                 if(!found[item.attributes.filename]){
                     found[item.attributes.filename] = 1;
                     parkboundaries.push(item.attributes.filename);
                 }

             }
             if(item.kind == 'location' && item.attributes.parklocationtype && item.attributes.parklocationtype == 'Trailhead'){
                 if(!found[item.attributes.title]){
                     trails.push(item.attributes.title);
                 }
             }


             /*
             if(item.attributes && item.attributes.relatedpark){
                 var parkid = item.attributes.relatedpark;
                 if(!relatedparks[parkid]){
                     relatedparks[parkid] = 1;
                     var where = "where attributes->'id' = $1";
                     var params = [parkid];

                     var task = {

                     }
                     db.baseQuery(['*'], where, params, '', '', function(err, data){
                         if(err){
                             cb();
                         }else{
                             attrs_[prop_] = data.results[0].attributes;
                             cb();
                         }
                     });

                 }
             }*/

         }
     });

     if(parkboundaries.length){
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

 };


var resolveContext = function(url){
    var re =  new RegExp('^\/?([^\/]*)\/','gi');
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

var getBlankResponse = function(){
    return {
        context: '',
        parent:{},
        children:[],
        outlines:[]
    };
}

var _getRecordByUrl = function(url, geo, callback){
    if(url.charAt(0) == '#')url = url.slice(1);
    var queryUrl = '%' + url;
    var query = "select kind, attributes, ST_X(geom) as longitude, ST_Y(geom) as latitude from convio where geom is not null and attributes->'url' LIKE $1";
    var params = [queryUrl];

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
                callback(null, data);
            }

        }else{
            callback(err);
        }
    });
}

//
var getRecordByUrl = function(req, res, next){
    var url = req.params.url || null;

    var url_parts = urlLib.parse(req.url, true);
    var query = url_parts.query;
    var withExtent = (query && query.extent) ? true : false; // assuming get me other things around the 'parent'

    var ctx = resolveContext(url);
    var out = getBlankResponse();

    out.context = ctx;

    if(!url){
        res.json(200, {error: 'invalid parameters'});
    }else{

        var queries = [];

        queries.push(
            function(callback){
                _getRecordByUrl(url, !withExtent, function(err, data){
                    if(err){
                        callback(err);
                    }else{
                        if(data.rows && data.rows[0])
                            out.parent = data.rows[0];

                        callback(null, data);
                    }
                });
            }
        );
        // bbox ex: 37.673652,-122.604621,37.867421,-122.151779
        if(withExtent){
            queries.push(
                function(stuff, callback){

                    _getItemsFromBBox(query.extent, ctx, function(err, data){

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
            res.json(200, out);
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
var server = restify.createServer();
server.use(restify.CORS());
server.use(restify.fullResponse());
server.use(restify.gzipResponse());

// API Methods

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

server.get('/context/event/:file', getEventContext);

server.get('/context/:file', getContextByFilename);

server.get('/list/context/:context', getInitialContextList);


server.get('/bbox/:bbox', getItemsFromBBox);



// start server
server.listen( process.env.PORT || 5555, function() {
    console.log('%s listening at %s', server.name, server.url);
});