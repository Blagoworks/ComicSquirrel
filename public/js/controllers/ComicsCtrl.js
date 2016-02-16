var ctrl = angular.module("ComicsCtrl", []);
ctrl.controller("ComicsController", [
	"$scope", "$location", "guidService", "dataService", "googleImgService", "messageService",
	function($scope, $location, guidService, dataService, googleImgService, messageService) {


	var vm = {};
	var styles = {};
	var cronDoneEvent = false;
	
	vm.comicsList = [];	
	//set icon class by this arr[key] to manage icons in one place
	vm.statusclass = messageService.getStatusClassArr(); 
	
	
	vm.initComicsData = function(){
		vm.savestatustxt = "";
		//fill vm.comicsList with comicsObj from server-side datafile
		dataService.getData().then( function(response){
			if(response.status==200 && response.data.items){
				console.log("comicsCtrl inited - on getting data, status: "+response.data.status);
				dataService.dataObj = response.data.items;
				if(dataService.dataObj.comics){
					vm.comicsList = dataService.dataObj.comics;
					if(vm.comicsList.length) vm.addToolTip();
				}
				vm.initCronListener();
			}else{
				var msg = "No response from server: no network, or no node.js";
				messageService.displayAppError($scope.$parent, msg);
			}
		});
	};
	
	vm.onCronDone = function(event){
		console.log("comicsCtrl: onCronDone called, cronDoneEvent: "+cronDoneEvent);
		if(cronDoneEvent){
			cronDoneEvent = false;			
			vm.cronEvents.removeEventListener("CRON_DONE", vm.onCronDone);
			vm.cronEvents.close();
			vm.cronEvents = undefined;
			console.log("comicsCtrl: onCronDone called; cron listener stopped, go init data");
			vm.initComicsData();
		}
	}
	vm.initCronListener = function(){
		cronDoneEvent = true;
		if(!vm.cronEvents){
			console.log("comicsCtrl starting cron eventlisteners"); 
			vm.cronEvents = new EventSource("/cronservice/events");
			vm.cronEvents.addEventListener("CRON_DONE", vm.onCronDone, false); //after squirrel is done as callback of cron-tick 
			vm.cronEvents.onerror = function(){
				console.log("comicsCtrl: cronEvents fired error event");
				vm.cronEvents.close();
			};
		}	
	};
	

	/* -------- on userclick Test, check if new item values will download an image --------- */
	vm.testrunItem = function(context){
		var testObj = {};
		if(context=="addForm"){
			 testObj = {
				name: dataService.whiteListStr(vm.newComicName),
				comicpage: vm.newComicUrl,
				imgdir: vm.newComicSourceDir,
				imgselector: vm.newComicSelector
			};
		}else if(context=="editForm"){
			testObj = {
				name: dataService.whiteListStr(vm.editComicName),
				comicpage: vm.editComicUrl,
				imgdir: vm.editComicSourceDir,
				imgselector: vm.editComicSelector
			};
		}
		testObj.downloaddir = dataService.dataObj.downloaddir;
		testObj.testrun = true;
		console.log("ComicsCtrl testrun, name dl dir: " + testObj.name);
		
		dataService.testRun(testObj).then( function(response){
			if(response.status==200){
				var statusmsg = response.data.status;
				switch(context){
					case "editForm":
						vm.editstatustxt = "test result: " + statusmsg;
						styles.editstatusicon = (response.data.done)? vm.statusclass["check"] : vm.statusclass["error"];
						setTimeout(function () { vm.editstatustxt = ""; }, 6000);
						break;
					case "addForm":
						vm.addstatustxt = "test result: " + statusmsg;
						styles.addstatusicon = (response.data.done)? vm.statusclass["check"] : vm.statusclass["error"];
						setTimeout(function () { vm.addstatustxt = ""; }, 6000);
						break;
				}
				console.log("test result is in, status: "+response.data.status);
			}
		});		
	};
	
	/* --------- run squirrel manually, without cron ------------*/
	vm.runComicsFetch = function(){
		$scope.$parent.vm.appstatustxt = "...fetching";
		$scope.$parent.styles.appstatusicon = vm.statusclass["loading"];
		vm.savestatustxt = "...fetching";
		styles.savestatusicon = vm.statusclass["loading"];
		console.log("started manual fetch");
		
		dataService.fetchComics().then( function(response) {
			console.log("fetchComics response: "+response.data);
			
			if(response.data){
				console.log("res data: "+ response.data.done);
				if(!response.data.done){
					vm.savestatustxt = "Squirrel manual fetch error";
					styles.savestatusicon = vm.statusclass["error"];
					var msg = "Squirrel manual fetch error "+response.data.status;
					messageService.displayAppError($scope.$parent, msg);
				}else{
					vm.savestatustxt = "Squirrel manual fetch was successful";
					styles.savestatusicon = vm.statusclass["check"];
					messageService.updateStatus($scope.$parent, dataService.dataObj.timetorun, dataService.dataObj.cronstatus);
					//refresh list dl-data from server-side-saved dataObj: statusicon
					vm.discardChange();
				}
				console.log("runComicsFetch result, status: "+response.data.status+", done: "+response.data.done);
			}
			vm.fadeStatusMsg();			
		});
	};
	
	
	/* -----------------------ADD item---------------------------*/
	//on userclick Add, add to .overview
	vm.addItem = function() {	
		var guid = guidService.createGuid();
		var thismoment = dataService.formatDateStr( new Date() ); 
		//update view: show the new item as first item of the .overview list
		vm.comicsList.unshift({
			_id: guid,
			name: dataService.whiteListStr(vm.newComicName),
			comicpage: vm.newComicUrl,
			imgdir: vm.newComicSourceDir,
			imgselector: vm.newComicSelector,
			dateadded: thismoment,
			runstatusicon: vm.statusclass["waiting"],
			changed: true
		});
		vm.addToolTip();
		vm.changed = true;
		
		//look for a cover image with googleImgService 
		var newComicName = vm.newComicName; //vm form value will be cleared
		googleImgService.getThumb(newComicName).then( function(response) {
			if(response.data.items){
				var tmbData = response.data.items[0];
				var tmbLink = tmbData.image.thumbnailLink;
				//then save img to cache
				var imgFileName = newComicName.toLowerCase().replace(/\s+/g, '') + ".jpg"; 
				googleImgService.saveToCache(imgFileName, tmbLink).then( function(response){
					var imgSrc = response.data.cachepath;
					vm.comicsList[0].coverthumb = imgSrc;
					console.log("== ComicsCtrl done saving img to cache: "+imgSrc+'\n');
				});
			}else{
				vm.comicsList[0].coverthumb = "img/not_found.jpg";
				console.log("== img not found, googleImgServ response keys: "+Object.keys(response) );
			}
		});
		
		//clear the UI
		vm.clearAddForm(); //clear form inputs
	};
	
	//toggle ADD form visibility with jQuery animation and a min-height css property
	//bacause height needs to be "auto" to enable room for the error-messages
	vm.showAddBox = function(bool){
		if(bool){
			$("#box-add-items").animate({ height:255 }, 260, "easeInCubic", function() {
				$(this).css({ minHeight:"255", height:"auto" });
			});
		}else{
			$("#box-add-items").animate({ height:1 }, 260, "easeInBack", function() {
				$(this).css({ height:1 });
			});
		}
		vm.addboxVisible = bool;
	};
	
	vm.addToolTip = function(){
		setTimeout(function () {
			$('[data-toggle="tooltip"]').tooltip();
			//console.log("after a 1 sec wait, inited tooltips");
		}, 1000);		
	};
	
	//clear the values from ADD form UI
	vm.clearAddForm = function(){
		vm.newComicName = "";
		vm.newComicUrl = "";
		vm.newComicSourceDir = "";
		vm.newComicSelector = "";
		//$scope.mainform.$setPristine(); <==will not work with template, put it in html ng-click
	};
	
	//on userclick close btn
	vm.closeAddPanel = function(){
		vm.clearAddForm(); 		//remove input
		vm.showAddBox(false); 	//hide addForm and editForm
	};
	
	
	/* -----------------------EDIT item---------------------------*/
	//on userclick edit icon: show data in edit UI
	vm.editItem = function(itemToEdit){
		vm.showAddBox(false); 	//hide addForm
		for(i=0; i<vm.comicsList.length; i++){
			vm.comicsList[i].beingEdited = undefined; 
			vm.comicsList[i].editTemplate = undefined;
		}
		itemToEdit.beingEdited = true;
		//placement editpanel via ng-template, animation via css
		itemToEdit.editTemplate = "/templates/tpl_editItems.html";
		vm.fillEditForm(itemToEdit.name, itemToEdit.comicpage, itemToEdit.imgdir, itemToEdit.imgselector);
	};
		
	//populate EDIT form UI from listed values
	vm.fillEditForm = function(name,page,dir,sel){
		vm.editComicName = name;
		vm.editComicUrl = page;
		vm.editComicSourceDir = dir;
		vm.editComicSelector = sel;
	};
	vm.cancelEdit = function(itemToEdit){
		itemToEdit.beingEdited = undefined;
		itemToEdit.editTemplate = undefined;
	};
	
	//on userclick edit-done btn: update list
	vm.updateItem = function(){
		console.log("updating item");
		for(var i=0; i<vm.comicsList.length; i++){
			if(vm.comicsList[i].beingEdited == true){
				vm.comicsList[i].name = dataService.whiteListStr(vm.editComicName);
				vm.comicsList[i].comicpage = vm.editComicUrl;
				vm.comicsList[i].imgdir = vm.editComicSourceDir;
				vm.comicsList[i].imgselector = vm.editComicSelector;
				vm.comicsList[i].changed = true;
				vm.comicsList[i].beingEdited = undefined;
				vm.comicsList[i].editTemplate = undefined;
				console.log("found the item, updated name: "+vm.comicsList[i].name);
			}
		}
		vm.changed = true;
	};
	
		
	/* -----------------------DELETE item---------------------------*/
	//on userclick delete icon: delete from .overview
	vm.removeItem = function(itemToRemove) {
		vm.comicsList = vm.comicsList.filter( function(item) { return item._id !== itemToRemove._id; });
		console.log("removing item from view: "+itemToRemove._id);
		vm.changed = true;
	};
	
	
	/* -----------------------SAVE item---------------------------*/
	//on userclick save via PUT
	vm.saveList = function(){
		vm.resetItemChanged();
		dataService.dataObj.comics = vm.comicsList;
		dataService.saveData(dataService.dataObj).then( function(response){
			vm.changed = undefined;
			vm.showAddBox(false);
			vm.savestatustxt = response.data.status;
			styles.savestatusicon = vm.statusclass["check"];
			vm.fadeStatusMsg();
			console.log("on saving the comics list, resp status: "+response.data.status);
		});
	};
	
	vm.fadeStatusMsg = function(){
		setTimeout(function () {
			vm.savestatustxt = "";
			console.log("after a 7 sec wait, cleared status msg");
		}, 7000);
	}
	
	vm.resetItemChanged = function(){
		if(vm.comicsList.length){
			for(var i=0; i<vm.comicsList.length; i++){
				vm.comicsList[i].changed = undefined;
			}
		}
	};	
	
	//on userclick discard changes
	vm.discardChange = function(){
		dataService.getData().then( function(response) {
			if(response.status==200 && response.data.items){
				console.log("on getting data, list: "+response.data.items);
				dataService.dataObj = response.data.items;
				if(dataService.dataObj.comics){
					vm.comicsList = dataService.dataObj.comics;
					if(vm.comicsList.length) vm.addToolTip();
					vm.changed = undefined;
				}
			}else{
				var msg = "No response from server: no network, or no node.js";
				messageService.displayAppError($scope.$parent, msg);
			}
		});		
	};
	
		
	/* -----------------------init ctrl---------------------------*/
	//onload, start with a closed addForm
	vm.initComicsData();
	vm.showAddBox(false);
	
	
	//expose the vm to the $scope
	$scope.styles = styles;
	$scope.vm = vm;

}]);


