angular.module("HeadCtrl", []).controller("HeadController", [
	"$scope", "dataService", "messageService", function($scope, dataService, messageService) {
	
	
	var vm = {};
	var styles = {};
	//set class by arr[key]
	vm.statusclass = messageService.getStatusClassArr();
	vm.emptySettings = false;
	
	
	vm.showSettingsWarning = function(){
		vm.appstatustxt = "First, define your library directory in Settings";
		styles.appstatusicon = vm.statusclass["pointright"];
		vm.emptySettings = true;
	};
	vm.showCronStatus = function(obj){
		var timetorun = obj.timetorun;
		var cronstatus = obj.cronstatus;
		dataService.getCronJob().then( function(response){
			//console.log("onstart, headctl getCronJob, response: "+response.data.status+", timetorun: "+response.data.timetorun );	
			if(response.data.timetorun){
				timetorun = response.data.timetorun; //cronTimeStr
				cronstatus = "ok";
			}else{
				//start cron with saved timetorun time
				dataService.setCronJob(obj).then( function(response){
					if(response.data.timetorun) cronstatus = "ok";
					else cronstatus = "error";
				});
			}
			messageService.updateStatus($scope, timetorun, cronstatus);
		});
	};
	
	//set status msg/icon in view
	vm.showAppStatus = function(){
		console.log("showAppStatus called");
		vm.appstatustxt = "";
		//get data to see if cronjob was set
		dataService.getData().then( function(response) {
			//console.log("HeadCtrl - on getting data, status: "+response.data.status);
			if(response.status==200 && response.data.items){
				dataService.dataObj = response.data.items;
				vm.appstatustxt = "loading status...";
				styles.appstatusicon = undefined;
				
				//show warning if no dl dir is defined in Settings 
				if(dataService.dataObj.downloaddir==""){
					vm.showSettingsWarning();
				}
				//else, go check saved cron status
				else if(dataService.dataObj.cronstatus){
					vm.showCronStatus(dataService.dataObj);
				}else{
					vm.appstatustxt = "no job running yet; check your settings";
					styles.appstatusicon = vm.statusclass["waiting"];
				}
			}else{
				var msg = "No response from server: no network, or no node.js";
				messageService.displayAppError($scope, msg);
			}	
		});
		
	};
	

	//expose the view using the $scope
	$scope.styles = styles;
	$scope.vm = vm;
	
	vm.showAppStatus();
		
}]);

