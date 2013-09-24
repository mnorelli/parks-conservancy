var db = require("./db.js")();
var d3 = require('d3');
var request = require('request');


var blockFindUrl = "http://data.fcc.gov/api/block/find";
var baseUrl = "http://maps.onebayarea.org/data/";


var blk2url = function(fips) {
    var n = 0,
        bits = [2, 3, 6, 4],
        url = [];
    for (var i = 0; i < bits.length; i++) {
        url.push(fips.substr(n, bits[i]));
        n += bits[i];
    }
    return [
        "blk2taz/", url.join("/"), ".txt"
    ].join("");
};

var blk2taz = function(fips, id, callback) {
    var url = baseUrl + blk2url(fips);

    request(url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            if(body){

                return callback(null, {id:+id, taz:+body});
            }
        }
        return callback('error');
    });

};
var location2fips = function(loc, callback) {
    if (typeof loc === "string") {
        loc = loc.split(/\s*,\s*/).reverse();
    }
    var url = [
      blockFindUrl, "?",
      "longitude=", loc[0], "&",
      "latitude=", loc[1], "&",
      "format=jsonp"
    ].join("");

    return request(request.get(url), function(error, response, body){
        if (!error && response.statusCode == 200) {
            if(body){
                var startPos = body.indexOf('({');
                var endPos = body.indexOf('})');
                var jsonString =body.substring(startPos+1, endPos+1);
                var json = JSON.parse(jsonString);
                var fips = json.Block.FIPS;

                return callback(null, fips);
            }
        }
        return callback('error');
    });

};

var location2taz = function(loc, id, callback) {
    return location2fips(loc, function(error, fips) {
        if (fips) {
            console.log("loc -> fips:", loc, "->", fips);
            return blk2taz(fips, id, callback);
        } else {
            console.warn("error:", error);
            return callback(error);
        }
    });
};

var insertData = function(data){
    console.log("DATA DONE: ", data);
}
function run(){
    db.getAllLatLngs(function(err, data){
        //console.log(err,data);
        if(data){
            var results = [];
            var len = data.results.length;


            data.results.forEach(function(item){
                location2taz(item.latlng, item.id, function(err, data){
                    //console.log(err, data);
                    len--;
                    console.log("REMAINING: ", len);
                    if(data){
                        results.push(data)
                    }
                    if(len <= 0){
                        db.insertTAZData(results);
                    }
                })
            });

        }
    });
}

run();




