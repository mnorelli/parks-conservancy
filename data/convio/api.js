var restify = require('restify');
var db = require("./lib/db.js")();
var url = require('url');


// Handlers for API methods
// TODO: should we chunk out the responses
function getByName(req, res, next) {
    var kind = db.normalizeKind(req.params.kind);
    var where;
    var params;

    if(kind == '*'){
        where = "WHERE to_tsvector('english', attributes->'title')";
        where += " @@ to_tsquery('english', $1)";
        params = [req.params.name];
    }else{
        where = "WHERE kind = $1 AND";
        where += " to_tsvector('english', attributes->'title')";
        where += " @@ to_tsquery('english', $2)";
        params = [kind, req.params.name];
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

function getParkStuff(req, res, next){
    var url_parts = url.parse(req.url, true);
    var query = url_parts.query;
    console.log(query)

    //if(query && query.enddate)
    db.findStuffForPark(db.normalizeFilename(req.params.file), db.normalizeKind(req.params.kind), function(err, out){
        if(err){
            res.json(200, err);
        }else{
            res.json(200, out);
        }

    });
}

// server setup
var server = restify.createServer();
server.use(restify.CORS());
server.use(restify.fullResponse());
server.use(restify.gzipResponse());

// API Methods
server.get('/:kind/name/:name', getByName);
server.get('/:kind/file/:file', getByFilename);
server.get('/:kind/id/:id', getById);

server.get('/park/:file/kind/:kind', getParkStuff);

// start server
server.listen(8080, function() {
    console.log('%s listening at %s', server.name, server.url);
});