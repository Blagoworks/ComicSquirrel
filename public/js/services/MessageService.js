angular.module("MessageService", []).factory("messageService", ["$http", function($http) {

		
	var statusClassArr = { 
		"pointright":"fa-arrow-right",
		"waiting":"fa-clock-o", 
		"loading":"fa-circle-o-notch fa-spin", 
		"ok":"fa-check-circle",
		"check":"fa-check",
		"pause":"fa-pause", 
		"error":"fa-times-circle" };
	
	//var root = "/msgservice";

	
	return {
		getStatusClassArr: function(){
			return statusClassArr;
		},
		//on network err_connection_refused error
		displayAppError: function(svm, msg){
			var vm = svm;
			vm.appstatustxt = msg;
			vm.appstatusicon = statusClassArr["error"];
			return;
		},
		//general app status
		updateStatus: function(svm, time, cronstat){
			//svm ($scope.vm) can be just $scope.vm (in HeadCtrl), or $scope.$parent.vm (in SettingsCtrl)
			var vm = svm;
			var obj = {};
			console.log("updateStatus, cronstat: "+cronstat);
			if(cronstat=="ok"){
				obj = { txt:"squirrel is set to run at "+time, key: statusClassArr["ok"] };
				vm.appstatustxt = obj.txt;
				vm.appstatusicon = obj.key;
			}else{
				obj = { txt:"squirrel cronjob is not running", key: statusClassArr["error"] };
				vm.appstatustxt = obj.txt;
				vm.appstatusicon = obj.key;
			}			
			return obj;
		}
	}
	
}]);