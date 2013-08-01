var restify = require('restify');
var db = require("./lib/db.js")();


// Handlers for API methods
// TODO: should we chunk out the responses
function getByName(req, res, next) {
    var where = {
        kind: req.params.kind,
        textsearch: {
            attribute: 'title',
            needle: req.params.name
        }
    };

    //(columns, where, order, limit, callback)
    db.baseQuery(['*'], where, '', '', function(err, out){
        if(err){
            res.json(200, err);
        }else{
            res.json(200, out);
        }
    });
}

function getByFilename(req, res, next) {
    var where = {
        kind: req.params.kind,
        attributes: {
            filename: req.params.name
        }
    };

    //(columns, where, order, limit, callback)
    db.baseQuery(['*'], where, '', '', function(err, out){
        if(err){
            res.json(200, err);
        }else{
            res.json(200, out);
        }
    });
}

function getById(req, res, next) {
    var where = {
        kind: req.params.kind,
        attributes: {
            id: req.params.id
        }
    };

    //(columns, where, order, limit, callback)
    db.baseQuery(['*'], where, '', '', function(err, out){
        if(err){
            res.json(200, err);
        }else{
            res.json(200, out);
        }
    });

}

function getParkStuff(req, res, next){
    db.findStuffForPark(req.params.file, db.normalizeKind(req.params.kind), function(err, out){
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
server.get('/:kind/file/:name', getByFilename);
server.get('/:kind/id/:id', getById);

server.get('/park/:file/kind/:kind', getParkStuff);

// start server
server.listen(8080, function() {
    console.log('%s listening at %s', server.name, server.url);
});