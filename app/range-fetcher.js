var request 	= require("request");
var cheerio 	= require("cheerio");
var fs      	= require("fs");
var url     	= require("url");

var getComic		= require("./comic-getter");
var getPageUrls	= require("./pageurl-getter");
var logwriter		= require("./log-writer");
var tool				= require("./utilities");


//internal vars
var rf = [];	//range-fetcher var obj

//reset vars after a run
initRangeVars = function(){
	rf.doneArr = [];	//keep track of fetch results
	rf.pagesArr = [];	//storing all page urls from an archive page
	rf.obj = []; 		//see incomingObj @ bottom of script
	rf.fetchStopped = false;
	rf.counter = 0;
	rf.dlcount = 0;
	rf.retry = 0;
	rf.waitcount = 0;
};

//event emitter
var fetchEvtEmitter = require("events").EventEmitter;
var fetchEvt;
//make sure there's only ONE eventEmitter per request
initEventEmitter = function(){	
	fetchEvt = new fetchEvtEmitter();
	exports.fetchEvt = fetchEvt;
	console.log("rangeFetcher inited new eventEmitter");
};


//start with initing vars
initRange = function(obj){
	rf.obj.testrun = (obj.testrun)? true : false;

	//get incoming vars parsed into static obj
	var slash = (obj.downloaddir.slice(-1)=="/")? "" : "/"; 	//check for slash
	rf.obj.dldir = obj.downloaddir + slash + obj.name;

	//only for page url fetch:
	rf.obj.imgdir = obj.imgdir;
	rf.obj.imgsel = obj.imgselector;
	//only for img url:
	if(obj.imgdir=="" && obj.imgselector==""){ 
		rf.obj.imgurl = obj.comicpage;
	}	
	rf.obj.method = obj.method;
	if(obj.method=="number"){
		//console.log("initing range, found min: "+obj.min+", max: "+obj.max+", page: "+obj.comicpage);
		if(rf.obj.imgurl==undefined) rf.obj.baseurl = tool.findUrlBeforeNumber(obj.comicpage);
		rf.obj.min = parseInt(obj.min);
		rf.obj.max = parseInt(obj.max);
	}else{
		//console.log("initing range, found dateformat: "+obj.dateformat);
		var regex = tool.setRegexByFormat(obj.dateformat);
		rf.obj.baseurl = tool.findUrlBeforeDate(obj.comicpage, regex);
		if(rf.obj.baseurl=="error"){ 
			fetchComplete(0,0, "date format does not match given url"); 
			return;
		}else{
			rf.obj.dateformat = obj.dateformat;	
			rf.obj.min = Date.parse(obj.min);
			rf.obj.max = Date.parse(obj.max);
		}
	}
	//reset client info
	fetchEvt.emit("FETCH_INITED");
	console.log("inited rangefetch (as test: "+rf.obj.testrun+") from min: "+rf.obj.min+" to max: "+rf.obj.max);

	if(obj.linkselector != undefined && obj.linkselector != ""){
		//only for archive list: create pagesArr
		console.log("inited rangefetch with a linkselector: "+obj.linkselector);
		rf.obj.linkslct = obj.linkselector;
		rf.obj.listurl = obj.comicpage;
		rf.pagesArr = getPageUrls.fromLinkEls(rf.obj.testrun, rf.obj.listurl, rf.obj.linkslct, rf.obj.min, rf.obj.max, onPagesArrayDone);
	}else{
		rf.doneArr = initDoneArr(rf.obj.testrun, rf.obj.method, rf.obj.min, rf.obj.max);	
		
		//start series of downloads
		fetchNext(0,0);
	}
};

//callback from getPageUrls.fromLinkEls
onPagesArrayDone = function(error, pagesArr){
	rf.pagesArr = pagesArr;
	console.log("range-fetcher getting rf.pagesArr: "+rf.pagesArr );
	if(rf.pagesArr){
		var rangeLength = (rf.obj.testrun)? 1 : rf.pagesArr.length;
		console.log("range-fetcher, rangeLength: "+rangeLength);
		for(var i=0; i<rangeLength; i++){
			rf.doneArr[i] = false;
		}
		//start series of downloads
		fetchNext(0,0);
	}else if(error) {
		//exit, some error
		sendDoneEventMsg(rf.counter, rf.dlcount, error);
	}	
};

initDoneArr = function(test, method, min, max){
	var rangeLength = 0;
	var doneArr = [];
	if(test) rangeLength = 1; 
	else if(method=="number") rangeLength = max - min;		
	else if(method=="date") rangeLength = Math.floor((max - min)/86400000); //get nr of days within range

	for(var i=0; i<rangeLength; i++){
		doneArr[i] = false;
	}
	return doneArr;
};


//loop de loop
fetchNext = function(count, dlcount){
	//set previous/done item to done, don't add out-of-range nrs to array
	if(rf.counter < rf.doneArr.length) {		
		rf.doneArr[rf.counter] = true;
	}	
	//do +1 on count where fetchNext is called
	rf.counter = count;
	console.log("fetchNext on count: "+count+", dl: "+dlcount+", range: "+rf.doneArr.length);
	
	//if count > rf.doneArr.length, page==done
	if(rf.fetchStopped || (count >= rf.doneArr.length) ){
		//max reached, done!
		console.log("fetchNext calls fetchComplete on count: "+count+", dl: "+dlcount);
		fetchComplete(count, dlcount, ""); 
	}else{
		var page = "";
		//fetch from pagesArr
		if(rf.pagesArr.length>0){
			var arrUrl = rf.pagesArr[count];
			var rootUrl = tool.findUrlBeforePage(rf.obj.listurl);
			page = (arrUrl.indexOf("http://")!=-1)? arrUrl : rootUrl + arrUrl;
		}else{
			page = getUrlInRange(count);
		}
		if(page!="" && page!=undefined && page!="done"){
			//page is valid and in range, go get image
			console.log("fetchNext page url: "+page);		
			//get img as direct img url / or from archive page url
			if(rf.obj.imgurl) getComicByFileName(count, dlcount, rf.obj.dldir, page);
			else getComicByPageUrl(count, dlcount, rf.obj.dldir, page, rf.obj.imgdir, rf.obj.imgsel);
		}else{
			console.log("fetchNext calls fetchComplete on page=done, count: "+count+", dl: "+dlcount);
			fetchComplete(count, dlcount, ""); 
		}
	}
};

//increment pageUrl by method (number or date), return page url or status:done on max
getUrlInRange = function(count){
	var inRange = isInRange(rf.obj.method, rf.obj.min, rf.obj.max, count);
	//console.log("in range: "+inRange+", min: "+rf.obj.min+" + count: "+count+ ", max: "+rf.obj.max);
	if(inRange){
		//construct new pageurl to go to
		var incr = getIncrByMethod(rf.obj.method, count);
		var newpage = "";
		if(rf.obj.imgurl) newpage = tool.getNextFileUrlByNumber(rf.obj.imgurl, count);
		else newpage = rf.obj.baseurl + incr;
		
		console.log("getUrlInRange, incr: " + incr + ", page: "+newpage);
		return newpage;
	}else{
		//max reached
		return "done";
	}
};
isInRange = function(method, min, max, count){
	if(method=="number"){
		var nr = parseInt(count+min);
		console.log("isInRange, nr: "+nr+" < "+max+", count: "+count);
		return (nr <= max)? true:false;
	}else{
		//compare dates 
		var day = 86400000; //milliseconds
		var pageDate = count*day + min;
		var diff = max - pageDate; 
		console.log("isInRange for  min: "+min+", max: "+max+", pageDate: "+pageDate+" days diff: "+diff);
      return (diff > 0)? true:false; 
	}
};
getIncrByMethod = function(method, count){
	if(method=="number"){
		return rf.obj.min+count;
	}else{
		//increment date
		var day = 86400000; //milliseconds
		var pageDate = (count*day) + rf.obj.min;
		return tool.getUrlDateStr(pageDate, rf.obj.dateformat);
	}
};
//prepend filename with 0-padded dl count numbers: 01_1.jpg 
padZero = function(nr){
	if(rf.obj.method=="number"){
		var n = rf.obj.min + nr;
		var s = "000" + n;
		var x = "0" + rf.obj.max;
		return s.substr(s.length - x.length);
	}else{
		return ("00" + nr).slice(-2);
	}
};

tryAgain = function(count, dlcount, msg){
	//retry 5 times before calling it a day
	//reset rf.retry in onSavedImageInRange and all vars in fetchComplete
	rf.retry += 1;
	console.log("rf.retry "+rf.retry+" on count: "+count+", msg: "+ msg);
	if(rf.fetchStopped || rf.retry==4){
		fetchComplete(count, dlcount, msg);
		return;
	}else{
		fetchNext(count+1, dlcount);
		return;
	}
};


//----nodeScraper----
//either download image from a direct img-file url...
getComicByFileName = function(count, dlcount, comicDir, imgUrl){
	var fileVarObj = [];
	fileVarObj.count		= count;
	fileVarObj.dlcount	= dlcount;
	fileVarObj.comicDir 	= comicDir;
	fileVarObj.imgEl		= imgEl;
	fileVarObj.retry 		= rf.obj.retry;

	getComic.byFileName(fileVarObj, tryAgain, fetchNext, onRangeError, onRangeSuccess);
};
//...or on the current comic page, find img src element and img to be downloaded 
getComicByPageUrl = function(count, dlcount, comicDir, pageUrl, imgDir, imgEl){
	var pageVarObj = [];
	pageVarObj.count		= count;
	pageVarObj.dlcount	= dlcount;
	pageVarObj.comicDir 	= comicDir;
	pageVarObj.pageUrl	= pageUrl;
	pageVarObj.imgDir		= imgDir;
	pageVarObj.imgEl		= imgEl;
	pageVarObj.min			= rf.obj.min;
	pageVarObj.retry 		= rf.obj.retry;

	getComic.byPageUrl(pageVarObj, tryAgain, fetchNext, fetchComplete, onRangeError, onRangeSuccess);
}


// callbacks in imgDownloader.saveImg
onRangeError = function(nr,dl,msg){
	console.log("onError, error on nr: "+nr+", msg: "+msg);
	fetchComplete(nr, dl, msg);
};
onRangeSuccess = function(nr,name,dir){
	console.log("onSuccess, saved img nr: "+nr+", name: "+name+", dir: "+dir);
	
	rf.doneArr[nr] = true;
	fetchEvt.emit("FETCH_SAVED_IMG", rf.dlcount);
	
	//fetch next if not testrun
	if(!rf.obj.testrun){	
		rf.dlcount +=1;	//on dl success
		rf.retry = 0;
		fetchNext(nr+1, rf.dlcount);
	}else{
		fetchComplete(nr, rf.dlcount, "");
	}
};


// endpoint for each in range
fetchComplete = function(count, dlcount, error){
	if(count < rf.doneArr.length) rf.doneArr[count] = true;
	//console.log("== range-fetcher: fetchComplete, on count "+count+", doneArr: "+rf.doneArr.toString() );
	if(rf.fetchStopped){
		console.log("== range-fetcher: fetchComplete with STOPPED flag");
		sendDoneEventMsg(count, dlcount, error); 
	}else{	
		for(var i=0; i<rf.doneArr.length; i++){
			if(rf.doneArr[i]==false){
				console.log("== range-fetcher: fetchComplete on count "+count+", but waiting on: "+i);
				//on any not done, start waiter and try again
				if(rf.waitcount<3) {
					rf.waiterId = setTimeout( function(){
							rf.waitcount +=1;
							fetchComplete(count, dlcount, error);
							}, 2000 );
				}else{
					sendDoneEventMsg(count, dlcount, error);
				}	
				break;
			}else if( i==(rf.doneArr.length-1) ){
				sendDoneEventMsg(count, dlcount, error);
			}
		}
	}
};
// endpoint for whole fetch
sendDoneEventMsg = function(count, dlcount, error){
	//not skipped out on a false: done, kill waiter
	if(rf.waiterId) clearTimeout(rf.waiterId);
	
	console.log("== range-fetcher: sendDoneEventMsg, result: " +dlcount+ " downloads in "+count+" tries, error: "+error+" =="+'\n');
	
	//go trigger sse listeners in client: ArchivedsCtrl
	rf.msgObj = { 'err':error, 'count':count, 'nr':dlcount, 'stopped':rf.fetchStopped };
		
	if(rf.obj.testrun){
		logwriter.logResults("--- fetch completed testrun, result: " +dlcount+ " download, error: "+error+" ---", " ");			
		fetchEvt.emit("FETCH_TEST_DONE", rf.msgObj);
	}else{
		var extraInfoTxt = (error==undefined || error=="")? " to "+rf.obj.dldir : ", with error: "+error;
		logwriter.logResults("--- fetch downloaded " +dlcount+ " images" +extraInfoTxt+" ---", " ");
		fetchEvt.emit("FETCH_DONE", rf.msgObj);
	}
	if(rf.fetchStopped){ logwriter.logResults("--- fetch was stopped ---", " "); }
	
	//trigger callback to end connection
	fetchEvt.emit("FETCH_COMPLETE");

};


//----public exports----
//see incomingObj below
fetchRange = function(obj, callback){
	//init, get first image, on success increment and try next, finally fire fetchEvt to return results	
	try{
		initRangeVars();
		initEventEmitter();
		initRange(obj);
		
		fetchEvt.on("FETCH_COMPLETE", function(err) {
			console.log("== range-fetcher: fetchEvt.on FETCH_COMPLETE, got " + rf.msgObj.nr + " images, STOPPED: "+rf.msgObj.stopped);
					
			var result = rf.msgObj; //keys: [err,count,nr,stopped]
			callback(null, result);
			
			//now close the other connection
			if(rf.fetchStopped) fetchEvt.emit("FETCH_STOPPED");
			return;
		});
	}
	catch(err){
		return callback(err);
	}		
};
exports.fetchRange = fetchRange;


//stop any running fetch
stopFetch = function(obj, callback){
	try{
		rf.fetchStopped = true;
		
		fetchEvt.on("FETCH_STOPPED", function(err) {
			console.log("== range-fetcher: fetchEvt.on FETCH_STOPPED");
			callback(null, "stopped");
			return;
		});
	}
	catch(err){
		return callback(err);
	}	
};
exports.stopFetch = stopFetch;



/* == test obj == */
/* node /volume1/development/ComicSquirrel/server.js
//test:  node /volume1/development/ComicSquirrel/app/range-fetcher.js
//more obj in "_protos/test range-fetcher incomingObj.txt"

var incomingObj = {
		"testrun": true,
		"downloaddir": "/volume1/Media/Comics/",
		"name": "test dir",
		"comicpage": "http://lackadaisycats.com/archive.php",
		"linkselector": "dd a",
		"imgdir": "",
		"imgselector": "#content > img",
		"method": "number",
		"min": "5",
		"max": "10"
		};

initRangeVars();
initEventEmitter();
initRange(incomingObj);
*/
