"use strict";

var restify = require("restify"),
    parseWKT = require("wellknown");
var db = require("./db")();

var buildFeatureCollection = function(rows) {
    var features = rows.map(function(row) {
        return {
            type: "Feature",
            id: row.id,
            properties: row.properties,
            geometry: parseWKT(row.geom)
        };
    });

    return {
        type: "FeatureCollection",
        features: features
    };
};

module.exports.getTrips = function(req, res, next) {
    var query = "SELECT id, properties, ST_AsEWKT(geom) geom FROM tnt_trips";

    return db.runQuery(query, null, function(err, data) {
        if (err) {
            return next(err);
        }

        return res.send(buildFeatureCollection(data.rows));
    });
};

module.exports.getTripById = function(req, res, next) {
    var query = "SELECT id, properties, ST_AsEWKT(geom) geom FROM tnt_trips WHERE id=$1";

    return db.runQuery(query, [req.params.id], function(err, data) {
        if (err) {
            return next(err);
        }

        return res.send(buildFeatureCollection(data.rows));
    });
};
