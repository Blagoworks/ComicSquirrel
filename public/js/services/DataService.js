angular.module("DataService", []).factory("dataService", ["$http", function($http) {

		
	var dataObj = [];	//local copy
	var dataroot 	= "/dataservice";
	var cronroot 	= "/cronservice";
	var portroot 	= "/portsetting";
	var testroot	= "/testservice";
	var fetchroot 	= "/fetchservice";
	var logroot 	= "/logservice";
	
	return {
		getData: function() {
			console.log("dataService getData called");
			return $http.get(dataroot);
		},
		saveData: function(obj){
			return $http.put(dataroot, obj);
		},
		//cron
		getCronJob: function(){
			return $http.get(cronroot);
		},
		setCronJob: function(obj){
			//put expects json obj, not str
			return $http.put(cronroot, obj);
		},
		setNewPort: function(obj){
			return $http.put(portroot, obj);
		},
		//test input for squirrel fetch
		testRun:function(obj){
			return $http.put(testroot, obj);
		},
		//no cron, run squirrel fetch on demand
		fetchComics: function(){
			return $http.get(fetchroot);
		},
		fetchArchiveds:function(obj){
			return $http.put(fetchroot, obj);
		},
		//log data
		getLogs:function(){
			return $http.get(logroot);
		},
		clearLogs:function(obj){
			return $http.put(logroot, obj);
		},
		//helpers
		formatDateStr: function(d){
			//date str with timezoneoffset
			d = d - (d.getTimezoneOffset() * 60000);
			d = new Date(d);
			var str = d.toISOString().substr(0,16).replace(/T/, " "); //2015-03-02 12:28
			//console.log("formatted date str before regex: "+str);  
			var objRegExp = /(\d+)-(\d+)-(\d+)\s(\d+):(\d+)/;
			var strRegged = str.replace(objRegExp, "$2-$3-$1 $4:$5"); //03-02-2015 12:28
			return strRegged;
		},
		whiteListStr: function(str){
			var sanitized = str.replace(/([^a-z0-9 '\/]+)/gi, ""); //allowed: letters, numbers, space, ' and / 
			//console.log("dataService sanitized str: " +sanitized);
			return sanitized;
		}		
	}
}]);


/*
		addItem: function(item) {
			return $http.post(root, item);
		},
		removeItem: function(item) {
			return $http.delete(root + '/' + item._id);
		},
*/