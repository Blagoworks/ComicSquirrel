angular.module("LogsCtrl", []).controller("LogsController", [
	"$scope", "dataService", "messageService", function($scope, dataService, messageService) {
	
	var vm = {};
	
	vm.logtext = "Log is empty";
	vm.helptext = "Note: the Squirrel's cronjob is set to run *on workdays* only.";
	
	
	dataService.getLogs().then( function(response) {
		if(response.status==200 && response.data.items){
			console.log("on getting log, status: "+response.data.status);
			vm.logtext = response.data.items;
		}else{
			var msg = "No response from server: no network, or no node.js";
			messageService.displayAppError($scope.$parent, msg);
		}
	});
	
	vm.clearLogs = function(){
		var obj = { txt: "cleared log" };
		dataService.clearLogs(obj).then( function(response) {
			if(response.status==200 && response.data.items){
				console.log("clearlog response: "+ response.data.items);
				vm.logtext = response.data.items;
			}else{
				var msg = "No response from server: no network, or no node.js";
				messageService.displayAppError($scope.$parent, msg);
			}
		});
	};
	
	$scope.vm = vm;
}]);