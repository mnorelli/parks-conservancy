(function( ng, app ){

    "use strict";

    app.controller(
        "AppController",
        function( $scope, $route, $routeParams ){

            // Update the rendering of the page.
            var render = function(){

                // Pull the "action" value out of the
                // currently selected route.
                var renderAction = $route.current.action;

                // Also, let's update the render path so that
                // we can start conditionally rendering parts
                // of the page.
                var renderPath = renderAction.split( "." );


                $scope.renderAction = renderAction;
                $scope.selectedPark = ($routeParams.park || "");

            };

            // Listen for changes to the Route. When the route
            // changes, let's set the renderAction model value so
            // that it can render in the Strong element.
            $scope.$on(
                "$routeChangeSuccess",
                function( $currentRoute, $previousRoute ){

                    // Update the rendering.
                    render();

                }
            );

        }
    );

})( angular, Demo );