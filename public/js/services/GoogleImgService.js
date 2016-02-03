angular.module("GoogleImgService", []).factory("googleImgService", ["$http", function($http) {
	console.log("googleImgService called");
	
	var root = "/imagecache";
	
	return {
		getThumb: function(name){
			//console.log("in googleImgServ, getThumb");
			var apikey = "AIzaSyBMCDJDT9gXoDTIt-vIiv67dIR0-N4NzD8";
			var cxkey = "009966180427230242672:ioksmrxcvps";
			var req = "https://www.googleapis.com/customsearch/v1?key=" +apikey+ "&cx=" +cxkey+ "&q='" +name+ " first page cover'&searchType=image";
			return $http.get(req);
		},
		//POST: Add a new item in the collection
		saveToCache: function(name, url){
			var cacheObj = { "imgFileName":name, "tmbLink":url };
			//console.log("in googleImgServ, saveToCache: "+cacheObj.imgFileName);
			return $http.post(root, cacheObj);
		}
	}
}]);