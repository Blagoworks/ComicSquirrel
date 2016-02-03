var archivectrl = angular.module("ArchivedsCtrl", []).controller("ArchivedsController", [
	"$scope", "dataService", "messageService", function($scope, dataService, messageService) {
	

	var vm = {};

	//set icon class by this arr[key] to manage icons in one place
	vm.statusclass = messageService.getStatusClassArr();
	vm.fetchTestResult = false;
	
	//copy initial form state to reset form
	var archiveFormData = {
		name: "",
		firstUrl: "",
		sourceDir: "",
		selector: "",
		method: "number",		
		minRange: "",
		maxRange: "",
		dateFormat: "",
		minDate: "",
		maxDate: ""
	};
	var imgFormData = {
		name: "",
		firstUrl: "",
		sourceDir: "",
		selector: "",
		method: "number",
		minRange: "",
		maxRange: "",
		dateFormat: "",
		minDate: "",
		maxDate: ""
	};
	var emptyArchiveFormData = angular.copy(archiveFormData);
	var emptyImgFormData = angular.copy(imgFormData);
		
	
	//vars for fetch status msg
	vm.oldcount = 0;
	vm.newcount = 0;
	vm.countchanged = false;
		
	vm.reset = function(){
		setTimeout(function() {
			$scope.$apply(function(){
				vm.oldcount = vm.newcount;
				vm.countchanged = false;
			});	
		}, 410);
	};
	
	vm.clearMsg = function(){
		setTimeout(function() {
			$scope.$apply(function(){
				vm.oldcount = 0;
				vm.newcount = 0;
				vm.fetchingDone = false;
			});	
		}, 7000);		
	}
	
	//---event listening callbacks
	vm.onFetchInited = function(event){
		console.log("onFetchInited event listener, reset counter"); 
		$scope.$apply(function(){
			vm.countchanged = true;
			vm.oldcount = vm.newcount;
			vm.newcount = 0;
			vm.reset();
		});
	};	
	vm.onTestDone = function(event){
		//console.log("onTestDone, getting data: "+evt.data);
		if(event.data){
			//parse stringified data back into obj!
			var obj = JSON.parse(event.data);
			var err = obj.err;
			var count = obj.count;
			var dlcount = obj.nr;
			console.log("onTestDone, getting data in obj keys: "+Object.keys(obj)); 
		}else{
			console.log("onTestDone, NO data"); 
		}
		//vm.clearMsg();
	};
	vm.onSavedImg = function(event){
		console.log("onSavedImg event listener, getting doneCount: "+event.data); 
		//event.data = dlcount nr as string
		var doneCount = event.data;
		$scope.$apply(function(){
			vm.countchanged = true;
			vm.oldcount = vm.newcount;
			vm.newcount +=1;
			vm.reset();
		});
	};
	vm.onDone = function(event){
		if(event.data){
			//parse stringified data back into obj!
			var obj = JSON.parse(event.data);
			console.log("onDone event listener, getting obj: "+Object.keys(obj));
		}else{
			console.log("onDone, NO data"); 
		}
		//if(event.data.error) var err = event.data.error;	
	};
	
	vm.startEventListening = function(){
		vm.fetchingError = vm.fetchingDone = false;
		//show fetch msg
		vm.fetchingInProgress = true;
		vm.fetchstatus = "fetching";
		
		vm.fetchEvents = new EventSource("/fetchservice/events");
		
		console.log("starting fetch eventlisteners "); 
			//+Object.keys(vm.fetchEvents) = onerror,onmessage,onopen,readyState,withCredentials,url,URL
		
		vm.fetchEvents.addEventListener("FETCH_INITED", vm.onFetchInited, false); //one time on initCounters
		vm.fetchEvents.addEventListener("FETCH_TEST_DONE", vm.onTestDone, false); //one time on Test
		vm.fetchEvents.addEventListener("FETCH_SAVED_IMG", vm.onSavedImg, false); //multiple times during Fetch
		vm.fetchEvents.addEventListener("FETCH_DONE", vm.onDone, false); //one time on Fetch, no test
		
		//errors
		vm.fetchEvents.onerror = function(e) {
			console.log("caught an error on fetch eventSource, data: "+e.status); 
			vm.stopEventListening(); 
		};		
	};
	vm.stopEventListening = function(){
		//hide fetch msg
		vm.fetchingInProgress = false;
		vm.fetchstatus = "";
		//remove listeners
		if(vm.fetchEvents){
			vm.fetchEvents.removeEventListener("FETCH_INITED", vm.onFetchInited, false);
			vm.fetchEvents.removeEventListener("FETCH_TEST_DONE", vm.onTestDone);
			vm.fetchEvents.removeEventListener("FETCH_SAVED_IMG", vm.onSavedImg);
			vm.fetchEvents.removeEventListener("FETCH_DONE", vm.onFinalDone);
			vm.fetchEvents.close();
			vm.fetchEvents = undefined;
			console.log("removed fetch eventlistener");
		}else{
			console.log("no eventListener, did not remove fetch eventlistener");
		}		
		//vm.clearMsg();
	};
	 

	//---on userclick Fetch btn:
	vm.fetchArchiveds = function(formDataObj,runtype){
		//formDataObj: archiveFormData || imgFormData / runtype: "testrun" || "full"
		//console.log("fetchArchiveds started for "+formDataObj.name+", type: "+runtype);
		vm.countchanged = true;
		vm.oldcount = vm.newcount;
		vm.newcount = 0;
		vm.reset();
		//create server-sent-events EventSource obj plus event listeners
		vm.startEventListening();
		
		//create object to send to server
		var archvObj = {
			downloaddir: dataService.dataObj.downloaddir,
			name: dataService.whiteListStr(formDataObj.name),
			comicpage: formDataObj.firstUrl,
			method: formDataObj.method
			};
		//fill only for archiveFormData:
		archvObj.imgdir = (formDataObj.sourceDir)? formDataObj.sourceDir : "";
		archvObj.imgselector = (formDataObj.selector)? formDataObj.selector : "";
		//set test-flag
		if(runtype=="testrun") archvObj.testrun = true;	
		console.log("archivedsCtrl, runtype: "+runtype+", imgdir: "+archvObj.imgdir);
		//set increment method: number or date
		if(formDataObj.method=="number"){
			archvObj.min = formDataObj.minRange? formDataObj.minRange : 1;
			if(runtype=="testrun"){
				archvObj.max = archvObj.min+1;
			}else{
				archvObj.max = formDataObj.maxRange? formDataObj.maxRange : 999;
			}
		}else{
			archvObj.dateformat = formDataObj.dateFormat;
			archvObj.min = formDataObj.minDate;
			archvObj.max = formDataObj.maxDate;
		}
		//console.log("fetchArchiveds archvObj sanitazed name: "+archvObj.name);
		
		//send requset to server, then parse response --		
		dataService.fetchArchiveds(archvObj).then( function(response) {
			console.log("fetchArchiveds: on response from server, parsing response");
		
			vm.stopEventListening();
			//response.data: keys: [result, status]
			if(response.data){
				//console.log("--there is data");
				if(!response.data.result){
					console.log("-- --there is no result");
					vm.fetchstatusicon = vm.statusclass["error"];
					vm.fetchingError = true;
					vm.fetchstatus = "error";
					vm.errormsg = response.data.status; //Range fetch error, Cannot read property '0' of null
				}else{
					console.log("-- --there is a result obj, keys: "+Object.keys(response.data));
					var resObj = response.data.result; //=rf.msgObj in range-fetcher, keys: [err,count,nr]
					vm.fetchTestResult = (runtype=="testrun")? true : false;
					
					vm.errormsg = (resObj.err!=undefined)? resObj.err : undefined;
					vm.teststatustxt = (!vm.errormsg)? "Testrun finished without errors" : "Test returned error";
					
					vm.skipped 	= (resObj.count!=resObj.nr)? ", tried "+(resObj.count) + " pages" : "";
					vm.imgstr 	= (resObj.nr!=1)? " images" : " image";
					vm.dlcount 	= resObj.nr;
					
					vm.fetchstatusicon = (!vm.errormsg)? vm.statusclass["check"] : vm.statusclass["error"];
					vm.fetchstatus = (!vm.errormsg)? "success" : "error";
					vm.fetchingDone = true;
					console.log("fetchArchiveds end result, status: "+response.data.status+", dlcount: "+resObj.nr);
				}
				//console.log("fetchArchiveds, status: "+response.data.status);
			}
		});
	};
	

	//reset ng validation values
	vm.resetForm = function(formId){
		//reset
		archiveFormData = angular.copy(emptyArchiveFormData);
		imgFormData = angular.copy(emptyImgFormData);
		//bind to view
		$scope.archiveFormData = archiveFormData;
		$scope.imgFormData = imgFormData;

		vm.resetActiveClassnames();
		
		//restore initial validation
		$scope[formId].$setUntouched();		
		$scope[formId].$setPristine();
		
		//reset msgs
		vm.fetchstatus = "";
		vm.fetchingInProgress = vm.fetchingError = vm.fetchingDone = false;
	};
	//set first btn class to active after switching tabs or clearing form
	vm.resetActiveClassnames = function(){
		//= bootstrap btn-toggle override 
		var activeBtn = $("#methodToggle").find('.active');
		var firstBtn = $("#methodToggle").find('label').filter(':first');
		var activeBtn2 = $("#methodToggleTab2").find('.active');
		var firstBtn2 = $("#methodToggleTab2").find('label').filter(':first');
			
		if(activeBtn){ activeBtn.removeClass("active"); }
		if(activeBtn2){ activeBtn2.removeClass("active"); }
		if(firstBtn){ firstBtn.addClass("active"); }
		if(firstBtn2){ firstBtn2.addClass("active"); }
	};
	
	//toggle date or number method UI visible
	vm.updateMethodToggle = function(model,method){
		if(model=="archiveFormData"){
			//needs $scope to properly update view!
			$scope.archiveFormData.method = method;
		}else if(model=="imgFormData"){
			$scope.imgFormData.method = method;
		}
		//console.log("updating method toggle for "+model+" to active method: "+method);		
	};
	//set initial active
	archiveFormData.method=="number";

	
	/*with angular, bootstrap tabs need initing*/
	$("#tabs").click(function (e) {
		e.preventDefault();
		$(this).tab("show");
	})
	
	
	/* https://angular-ui.github.io/bootstrap */
	/* == uib dropdown == */
	vm.archiveDropdown = { opened: false };
	vm.imgDropdown = { opened: false };

	/* == uib datepicker == */	
	vm.dateOptions = {
		formatYear: 'yyyy',
		startingDay: 1,
		showWeeks: 'false'
	};
	//set the date format, link it to the format-select
	vm.dateFormats = ['Select a format', 'yyyyMMdd', 'yyyy-MM-dd', 'yyyy/MM/dd'];
	//disable weekend selection
	vm.isDisabled = function(date, mode) {
		return mode === 'day' && (date.getDay() === 0 || date.getDay() === 6);
	};
	//set style for min- and max dates
	vm.getDayClass = function(formDataObj, date, mode) {
		if (mode === 'day') {
			var dayToCheck = new Date(date).setHours(0, 0, 0, 0);
			var maxDay = new Date(formDataObj.maxDate).setHours(0, 0, 0, 0);
			var minDay = new Date(formDataObj.minDate).setHours(0, 0, 0, 0);
			if (dayToCheck === maxDay) {
				return "maxdate";
			}else if (dayToCheck === minDay) {
				return "mindate";
			}else if (dayToCheck < maxDay && dayToCheck > minDay) {
				return "range";
			}
		}
		return '';
	};
	//init and set opened state
	vm.showCalendar = function(id){
		vm["calendar"+id].opened = true;
	};
	vm.initCalendarOpenState = function(){
		for(var i=0; i<4; i++){
			vm["calendar"+i] = { opened: false };
		}
	};
	vm.initCalendarOpenState();

	//init today as static max available date (!= maxdate in range)
	vm.todayDate = new Date();


	
	//expose objects to html scope
	$scope.archiveFormData = archiveFormData;
	$scope.imgFormData = imgFormData;
	$scope.vm = vm;

}]);


