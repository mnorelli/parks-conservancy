var restify = require('restify');
var db = require("./lib/db.js")();


// Handlers for API methods
// TODO: should we chunk out the responses
function getByName(req, res, next) {
    db.searchByTitle(req.params.kind, req.params.name, function(out){
        res.json(200, out);
    });
}

function getByFilename(req, res, next) {
    db.findByFilename(req.params.kind, req.params.name, function(out){
        res.json(200, out);
    });
}

function getById(req, res, next) {
    db.findById(req.params.kind, req.params.name, function(out){
        res.json(200, out);
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
server.get('/:kind/id/:name', getById);

// start server
server.listen(8080, function() {
    console.log('%s listening at %s', server.name, server.url);
});