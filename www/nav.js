(function(exports) {

  var i = setInterval(function() {
    if (typeof GGNPC === "object" && GGNPC.injector) {
      initialize();
      clearInterval(i);
    }
  }, 200);

  function initialize() {
    if (typeof d3 === "object") {
      cleanup();
    } else {
      GGNPC.injector.preload("/map/js/vendor/d3.v3.min.js", cleanup);
    }

    function cleanup() {
      // strip the parksconservancy.org domains from all links
      var pattern = new RegExp("^http://(www\.)?parksconservancy\.org");
      d3.selectAll("a[href]")
        .attr("href", function() {
          return this.href.replace(pattern, "");
        });

      var prefix = ["http://", location.hostname, ":", location.port].join("");
      var menus = d3.selectAll("#main_menu .upper")
        .datum(function() {
          var href = d3.select(this)
            .select("a")
              .attr("href")
              .replace(prefix, "");
          return {
            href: href
          }
        });
        /*
        .filter(function(d) {
          return !d.href.match(/about/);
        });
        */

      // Trip Planner
      menus.filter(function(d) {
        return d.href.match(/visit/);
      })
      .select(".content ul.level1:last-child")
        .append("li")
          .attr("class", "stamen")
          .append("a")
            .text("Plan a Trip")
            .attr("href", "/mapping/trip-planner.html");

      var mapUrl = "/mapping/big-map.html";
      menus.select(".content ul.level1:last-child")
        .append("li")
          .attr("class", "stamen")
          .append("a")
            .text("Map")
            .attr("href", function(d) {
              return [mapUrl, d.href].join("#");
            });
    }
  }

})(this);
