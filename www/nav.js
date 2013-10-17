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

      // the "Your Visit" menu is the second "upper" bit,
      // and ul.level1 is where links get attached
      var menu = d3.select("#main_menu .upper:nth-child(2) ul.level1");

      // add the Trip Planner link
      menu.insert("li", "li:first-child")
        .append("a")
          .attr("href", "/map/planner/")
          .text("Plan a Trip");

      // add the Map link
      menu.insert("li", "li:first-child")
        .attr("class", "map")
        .append("a")
          .attr("href", "/map/")
          .text("Map");
    }
  }

})(this);
