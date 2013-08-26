var restify = require('restify');
var db = require("./lib/db.js")();
var url = require('url');
var async = require('async');


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

function getById(req, res, next) {
    var kind = db.normalizeKind(req.params.kind);
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
            res.json(200, out);
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
    var url_parts = url.parse(req.url, true);
    var query = url_parts.query;

    var restrictDate = (query && query.restrictEvents) ? true : false;

    db.findStuffForPark(db.normalizeFilename(req.params.file), db.normalizeKind(req.params.kind), restrictDate, function(err, out){
        if(err){
            res.json(200, err);
        }else{
            res.json(200, out);
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

    db.baseQuery(["attributes->'filename' as filename", "attributes->'title' as title", 'kind'], where, params, '', '', function(err, out){
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
        filename,
        params,
        where;

    async.waterfall([

        // get event
        function(callback){
            filename = db.normalizeFilename(req.params.file);
            params = [filename];
            where = "where kind='event' and attributes->'filename' = $1";

            db.baseQuery(['*'], where, params, '', '', function(err, data){
                if(err){
                    callback('error')
                }else{
                    response['event'] = data.results[0];
                    callback(null, data.results[0]);
                }
            });
        },

        // get event location from locationmap field
        function(stuff, callback){
            if(stuff && stuff.attributes.locationmap){
                filename = stuff.attributes.locationmap.split("/").pop();
                params = [filename];
                where = "where kind='location' and attributes->'filename' = $1";

                db.baseQuery(['*'], where, params, '', '', function(err, data){
                if(err){
                    callback('error');
                }else{
                    response['event'].attributes.locationmap= data.results[0].attributes;
                    callback(null, stuff);
                }
            });
            }
        },

        // get related park
        function(stuff, callback){
            if(stuff && stuff.attributes.relatedpark){
                where = "WHERE kind='park' and attributes->'id' = $1";
                params = [stuff.attributes.relatedpark];
                db.baseQuery(['*'], where, params, '', '', function(err, data){
                    if(err){
                        callback('error');
                    }else{
                        response['event'].attributes.relatedpark = data.results[0].attributes;
                        callback(null, data.results[0]);
                    }
                });
            }else{
                callback('no relatedpark')
            }
        },

        // get park outline
        function(stuff, callback){
            where = 'WHERE convio_filename = $1';
            params = [stuff.attributes.filename];
            db.baseGeoQuery(['ST_AsGeoJSON(ST_Transform(geom, 4326)) as geom', 'unit_name'], where, params, '', '', function(err, data){
                if(err){
                    callback('error');
                }else{
                    response['event'].attributes.relatedpark.geom = JSON.parse(data.results[0].geom);
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


// server setup
var server = restify.createServer();
server.use(restify.CORS());
server.use(restify.fullResponse());
server.use(restify.gzipResponse());

// API Methods
server.get('/kind/:kind', getByKind);
server.get('/:kind/name/:name', getByName);
server.get('/:kind/file/:file', getByFilename);
server.get('/:kind/id/:id', getById);

server.get('/list/:kind', listByKind); // return title,kind

server.get('/stuff/park/:file/kind/:kind', getStuffForPark);

server.get('/geo/park/:park', getParkBoundary);

server.get('/context/event/:file', getEventContext);


// start server
server.listen( process.env.PORT || 5555, function() {
    console.log('%s listening at %s', server.name, server.url);
});