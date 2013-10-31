"use strict";

var qs = require("querystring");

var parseWKT = require("wellknown");

var db = require("./db")();

var buildFeatureCollection = function(rows) {
    var features = rows.map(function(row) {
        var geometry = parseWKT(row.geom.split(";").pop()); // EWKT includes SRID=4326;...

        return {
            type: "Feature",
            id: row.id,
            properties: {
                id: row.id,
                description: row.description,
                author_id: row.author_id,
                park_name: row.park_name
            },
            geometry: geometry
        };
    });

    return {
        type: "FeatureCollection",
        features: features
    };
};

module.exports.getTrailheads = function(req, res, next) {
    var options = qs.parse(req.query());

    var query = "SELECT id, name, descriptio description, author_id, park_name, ST_AsEWKT(geom) geom FROM trailheads";

    return db.runQuery(query, null, function(err, data) {
        if (err) {
            return next(err);
        }

        if (data.rows.length === 0) {
            return res.send(404);
        }

        var collection = buildFeatureCollection(data.rows);

        if (options.minimal) {
            collection.features.forEach(function(f) {
                delete f.geometry;
            });
        }

        return res.json(collection);
    });
};

module.exports.getTrailheadById = function(req, res, next) {
    var options = qs.parse(req.query());

    var query = "SELECT id, name, descriptio description, author_id, park_name, ST_AsEWKT(geom) geom FROM trailheads WHERE id=$1";

    return db.runQuery(query, [req.params[0]], function(err, data) {
        if (err) {
            return next(err);
        }

        if (data.rows.length === 0) {
            return res.send(404);
        }

        var collection = buildFeatureCollection(data.rows);

        if (options.minimal) {
            collection.features.forEach(function(f) {
                delete f.geometry;
            });
        }

        return res.json(collection);
    });
};
