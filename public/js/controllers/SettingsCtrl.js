angular.module("SettingsCtrl", []).controller("SettingsController", [
	"$scope", "$location", "$timeout", "dataService", "messageService", function($scope, $location, $timeout, dataService, messageService) {
	
	
	var vm = {};
	var styles = {};
	
	vm.savestatustxt = "";
	vm.statusclass = messageService.getStatusClassArr(); 
	var newDLdir = false, newCronjob = false, newPort = false;
		
	
	//GET: fill setting form with existing config data
	dataService.getData().then( function(response) {
		if(response.status==200){
			var data = response.data.items;
			if(data){
				//console.log("getting settings data: "+Object.keys(data));
				vm.editDLdir 	= data.downloaddir;
				vm.editRunTime = data.timetorun;
				vm.editAppPort = data.port;
				dataService.dataObj = data;
			}
		}else{
			var msg = "No response from server: no network, or no node.js";
			messageService.displayNetError($scope.$parent.vm, msg);
		}	
	});

	//PUT: save settings on userclick save btn
	vm.saveSettings = function(){
		if(dataService.dataObj.downloaddir != vm.editDLdir){
			dataService.dataObj.downloaddir = vm.editDLdir;
			//only save dataObj
			newDLdir = true;
		}
		if(dataService.dataObj.timetorun != vm.editRunTime){
			dataService.dataObj.timetorun = vm.editRunTime;
			//set cronjob, then save dataObj
			newCronjob = true;
		}
		if(dataService.dataObj.port != vm.editAppPort){
			dataService.dataObj.port = vm.editAppPort;
			//change port, then save dataObj
			newPort = true;
		}
		//start the chain
		if(newCronjob){
			dataService.setCronJob(dataService.dataObj).then( function(response){ vm.onCronDone(response) })
		}
		if(newPort && !newCronjob){
			vm.setNewPort();		
		}
		if(newDLdir && !newPort && !newCronjob){
			vm.saveToDataFile();
		}		
	};
	
	vm.onCronDone = function(response){		
		//set vars
		if(response.data.timetorun) dataService.dataObj.cronstatus = "ok";
		else dataService.dataObj.cronstatus = "error"; 
		
		//set status msg in scope of HeadController (parent of view)
		var statusObj = messageService.updateStatus($scope.$parent, dataService.dataObj.timetorun, dataService.dataObj.cronstatus);	
		vm.savestatustxt = response.data.status + ", ";
		styles.savestatusicon = (response.data.timetorun)? vm.statusclass["check"] : vm.statusclass["error"];
		
		if(newPort) vm.setNewPort();
		else vm.saveToDataFile();
	};
	
	vm.setNewPort = function(){
		dataService.setNewPort(dataService.dataObj).then( function(response){ vm.onPortDone(response) })
	};
	vm.onPortDone = function(response){
		console.log("onPortDone, response: "+response.status ); //EADDRINUSE
		if(response.status == 200 && response.data.status == "port change complete"){
			vm.savestatustxt += response.data.status + ", "; //"port change complete ,"
			styles.savestatusicon = vm.statusclass["check"]; //ok
			vm.portChangeSuccess = true;
			vm.saveToDataFile();
		}else{
			vm.savestatustxt += "port "+vm.editAppPort+" already in use, try another.";
			styles.savestatusicon = vm.statusclass["error"];
			vm.editAppPort = "";
			//$scope.editAppPort.$setValidity("required",false);
			console.log("onPortDone, port "+vm.editAppPort+" already in use!");
		}
		vm.resetStatusMsg();
	};
	
	vm.saveToDataFile = function(){
		//save the new data
		dataService.saveData(dataService.dataObj).then( function(response){
			$scope.settingsform.$setUntouched();
			$scope.settingsform.$setPristine();
			vm.savestatustxt += response.data.status; //"port change complete , data saved"
			styles.savestatusicon = vm.statusclass["check"]; //ok
					
			if(vm.portChangeSuccess){
				console.log("portChangeSuccess, starting countdown to new location");
				vm.countdown = 7;
				var moveMsg = vm.savestatustxt;
				$scope.$watch("vm.countdown", function(newVal, oldVal) {
					//console.log("watch counting down: " +newVal + ", " + oldVal);
					$scope.vm.savestatustxt = moveMsg + ", moving in: " + newVal;
				});
				vm.doCountdownMsg(moveMsg);
				vm.moveToNewPort(vm.editAppPort);
			}
			vm.resetStatusMsg();
		});
	};
	
	vm.doCountdownMsg = function(str){	
		$timeout(function () {
			vm.savestatustxt = ""; //this txt needs to change to get countdown to work
			vm.countdown = vm.countdown-1;
			if(vm.countdown > 0) vm.doCountdownMsg(str);
		}, 1000);
	};
	vm.moveToNewPort = function(prt){
		vm.portChangeSuccess = undefined;
		var proto 	= $location.protocol();
		var host 	= $location.host();
		var port 	= dataService.dataObj.port;
		var newUrl 	= proto+"://"+host+":"+port+"/settings";	
		console.log("moveToNewPort, newUrl will be: "+newUrl);

		$timeout(function () {
			console.log("after 8 secs, moving location");
			window.location = newUrl;
		}, 8000);
	};
	
	vm.resetStatusMsg = function(){
		$timeout(function () {
			vm.savestatustxt = "";
			styles.savestatusicon = "";
			console.log("after a 7 sec wait, reset status msg");
		}, 7500);
	};

	//on userclick cancel btn
	vm.cancelChange = function(){
		//"undo changes" should retrieve and restore saved vals from store	
		vm.editDLdir 	= dataService.dataObj.downloaddir;
		vm.editRunTime = dataService.dataObj.timetorun;
		vm.editAppPort = dataService.dataObj.port;
		$scope.settingsform.$setUntouched(); //clear pending/touched state
		$scope.settingsform.$setPristine(); //clear dirty state
	};

	
	//expose the vm to the $scope
	$scope.styles = styles;
	$scope.vm = vm;
	
}]);