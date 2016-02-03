angular.module("appRoutes", [])
	.config(["$routeProvider", "$locationProvider", "$httpProvider", 
	function($routeProvider, $locationProvider, $httpProvider) {

	$routeProvider
		//home page
		.when("/", {
			templateUrl: "views/home.html",
			controller: "HomeController"
		})
		//comics overview
		.when("/webcomics", {
			templateUrl: "views/comics.html",
			controller: "ComicsController"
		})
		//archive overview
		.when("/archivedcomics", {
			templateUrl: "views/archiveds.html",
			controller: "ArchivedsController"
		})
		//settings page
		.when("/settings", {
			templateUrl: "views/settings.html",
			controller: "SettingsController"
		})
		//view logs
		.when("/logs", {
			templateUrl: "views/logs.html",
			controller: "LogsController"	
		})
		.otherwise({
			redirectTo: '/'
		});

	$locationProvider.html5Mode(true);
	
	//try to show a response.status when server is down
	$httpProvider.interceptors.push(function($q) {
        return {
          responseError: function(rejection) {
                if(rejection.status == 0) {
                    //window.location = "views/noresponse.html";
					var response = { "status":"404" };
                    return response;
                }
                return $q.reject(rejection);
            }
        };
    });

}]);