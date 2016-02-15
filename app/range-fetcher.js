var request 	= require("request");
var cheerio 	= require("cheerio");
var fs      	= require("fs");
var url     	= require("url");

var imgDownloader = require("./img-downloader");
var logwriter	= require("./log-writer");
var tool			= require("./utilities");


//internal vars
var rf = [];	//range-fetcher var obj
//statics
rf.prevName	= "";

//reset vars after a run
initCounters = function(){
	rf.doneArr = [];	//keep track of fetch results
	rf.obj = []; 		//see incomingObj @ bottom of script
	rf.counter = 0;
	rf.dlcount = 0;
	rf.retry = 0;
	rf.waitcount = 0;
};

//event emitter
var eventEmitter = require("events").EventEmitter;
var fetchEvt;
//make sure there's only ONE eventEmitter per request
initEventEmitter = function(){	
	fetchEvt = new eventEmitter();
	exports.fetchEvt = fetchEvt;
	console.log("rangeFetcher inited new eventEmitter");
};

//start with initing vars
initRange = function(obj){
	rf.obj.testrun = (obj.testrun)? true : false;

	//get incoming vars parsed into static obj
	var slash 	= (obj.downloaddir.slice(-1)=="/")? "" : "/"; 	//check for slash
	rf.obj.dldir 	= obj.downloaddir + slash + obj.name;
	//only for archive list
	rf.obj.linksel = obj.linkselector;
	if(obj.linkselector != undefined){
		//pseudo-code for testing
		rf.doneArr[0] = true;
		fetchComplete(1,1, "fetcher got a linkselector"); 
		return;
	}
	//only for archive pages:
	rf.obj.imgdir = obj.imgdir;
	rf.obj.imgsel = obj.imgselector;
	//only for img archives:
	if(obj.imgdir=="" && obj.imgselector==""){ 
		rf.obj.imgurl = obj.comicpage;
	}
	rf.obj.method = obj.method;
	if(obj.method=="number"){
		if(rf.obj.imgurl==undefined) rf.obj.baseurl = tool.findUrlBeforeNumber(obj.comicpage);
		rf.obj.min = parseInt(obj.min);
		rf.obj.max = parseInt(obj.max);
	}else{
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
	console.log("initing rangefetch [by direct url?: "+rf.obj.imgurl+"], rf.obj.min: "+rf.obj.min+", obj.min: "+obj.min);
	
	fetchEvt.emit("FETCH_INITED");
	
	initDoneArr(rf.obj.testrun, rf.obj.method, rf.obj.min, rf.obj.max);
	//start series of downloads
	fetchNext(0,0);	
};


initDoneArr = function(test, method, min, max){
	var rangeLength = 0;
	if(test) rangeLength = 1; 
	else if(method=="number") rangeLength = max - min;		
	else if(method=="date") rangeLength = Math.floor((max - min)/86400000); //get nr of days within range

	for(var i=0; i<rangeLength; i++){
		rf.doneArr[i] = false;
	}	
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
	if(count > rf.doneArr.length){
		//max reached, done!
		console.log("fetchNext calls fetchComplete on count: "+count+", dl: "+dlcount);
		fetchComplete(count-1, dlcount, ""); 
	}else{
		var page = getUrlInRange(count);
		if(page!="" && page!=undefined && page!="done"){
			//page is valid and in range, go get image
			console.log("fetchNext page url: "+page);		
			//get img as direct img url  / or from archive page url
			if(rf.obj.imgurl) getComicByFileName(count, dlcount, rf.obj.dldir, page);
			else getComicByCount(count, dlcount, rf.obj.dldir, page, rf.obj.imgdir, rf.obj.imgsel);
		}else{
			console.log("fetchNext calls fetchComplete on count: "+count+", dl: "+dlcount);
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
	if(rf.retry==4){
		fetchComplete(count, dlcount, msg);
		return;
	}else{
		fetchNext(count+1, dlcount);
		return;
	}
};


//----nodeScraper----
//either download image from a direct url...
getComicByFileName = function(count, dlcount, comicDir, imgUrl){
	var imgName = url.parse(imgUrl).pathname.split("/").pop(); //ch1-001.jpg					
	if(imgName==""){
		tryAgain(count, dlcount, "image file has no name or does not exist, tried "+(rf.retry+1)+"x");
	}else if(imgName==rf.prevName) {
		console.log(count+ "already downloaded "+imgName);
		fetchNext(count+1, dlcount);
	}else{
		var savePath = comicDir + "/" + imgName;
		imgDownloader.saveImg(count, dlcount, imgName, comicDir, imgUrl, savePath, onRangeError, onRangeSuccess);
	}
};

//...or on the current comic page, find img src element and img to be downloaded 
getComicByCount = function(count, dlcount, comicDir, pageUrl, baseUrl, imgEl) {
	//console.log("getComic is getting img from: "+imgEl);	
	//get the page
	request(pageUrl, ( function(imgEl) {
		return function(err, resp, body) {
			if (err) return tryAgain(count, dlcount, "cannot find page "+ parseInt(count+rf.obj.min) +", tried "+(rf.retry+1)+"x");
			
			$ = cheerio.load(body);
			if($(imgEl)=="") return tryAgain(count, dlcount, "page "+ parseInt(count+rf.obj.min) +" has no image element, tried "+(rf.retry+1)+"x");
			
			// find img in dom elements
			$(imgEl).each(function() {
				var src = $(this).attr("src");
				if (src){
					var origName = url.parse(src).pathname.split("/").pop(); //1.jpg or adc9caa05cde012ee3bd00163e41dd5b		
					if(origName=="") return tryAgain(count, dlcount, "image file has no name or does not exist, tried "+(rf.retry+1)+"x");
					if(origName==rf.prevName) {
						console.log(count+ "already downloaded");
						fetchNext(count+1, dlcount);
						return;
					}
					var imgName = "";
					if( origName.indexOf(".")==-1 ) imgName = padZero(dlcount) + "_img.jpg"; //extension is just a wild guess
					else imgName = padZero(dlcount) + "_" + origName;	 //01_1.jpg or 01_img.jpg
					//slash?
					var slash = (baseUrl.slice(-1)=="/")? "" : "/";
					var getPath = (src.indexOf("http://")!=-1)? src : baseUrl + slash + origName;
					var savePath = comicDir + "/" + imgName;
					//check for existing file before downloading it again
					fs.stat(savePath, function(err, stats) {
						if(err == null && stats.isFile()) {
							console.log("img "+count+ " already downloaded");
							fetchNext(count+1, dlcount);
							return;
						}
						else if(err.code == "ENOENT") {
							//file not downloaded before, go get it!
							rf.prevName = origName;
							
							return imgDownloader.saveImg(count, dlcount, imgName, comicDir, getPath, savePath, onRangeError, onRangeSuccess);
						}
						else {
							fetchComplete(count, dlcount, "fs.stat error trying to save the image: "+err.code);
							return false;
						}
					});
				}else{ 
					fetchComplete(count, dlcount, "cannot find img src element on page "+ parseInt(count+rf.obj.min) );
					return false;
				}
			});
		}		
	} )(imgEl));	
};

// callbacks in imgDownloader.saveImg
onRangeError = function(nr,dl,msg){
	console.log("onError, error on nr: "+nr+", msg: "+msg);
	fetchComplete(nr, dl, msg);
};
onRangeSuccess = function(nr,name,dir){
	console.log("onSuccess, saved img nr: "+nr+", name: "+name+", dir: "+dir);
	onSavedImageInRange(nr, name, dir);
};
onSavedImageInRange = function(nr, file, comicDir){
	console.log("onSavedImageInRange, on count: "+nr+", saved img: "+file+" to: "+comicDir+'\n');
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


fetchComplete = function(count, dlcount, error){
	if(count < rf.doneArr.length) rf.doneArr[count] = true;
	
	console.log("== range-fetcher: fetchComplete, on count "+count+", doneArr: "+rf.doneArr.toString() );
	
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
};
sendDoneEventMsg = function(count, dlcount, error){
	//not skipped out on a false: done, kill waiter
	if(rf.waiterId) clearTimeout(rf.waiterId);
	
	console.log("== range-fetcher: fetchComplete, result: " +dlcount+ " downloads in "+count+" tries, error: "+error+" =="+'\n');
	
	//go trigger sse listeners in client: ArchivedsCtrl
	rf.msgObj = { 'err':error, 'count':count, 'nr':dlcount };
	if(rf.obj.testrun){
		logwriter.logResults("--- fetch --- completed testrun, result: " +dlcount+ " download, error: "+error+" ---", " ");			
		fetchEvt.emit("FETCH_TEST_DONE", rf.msgObj);
	}else{
		var extraInfoTxt = (error==undefined || error=="")? " to "+rf.obj.dldir : ", with error: "+error;
		logwriter.logResults("--- fetch --- downloaded " +dlcount+ " images" +extraInfoTxt, " ");
		fetchEvt.emit("FETCH_DONE", rf.msgObj);
	}

	//trigger callback in fetchRange
	fetchEvt.emit("FETCH_COMPLETE");
};


//----public export----
//called via router
fetchRange = function(obj, callback){
	//init, get first image, on success increment and try next, finally fire fetchEvt to return results	
	try{
		initCounters();
		initEventEmitter();
		initRange(obj);
		
		fetchEvt.on("FETCH_COMPLETE", function(err) {
			console.log("== range-fetcher: fetchEvt.on FETCH_COMPLETE, got " + rf.msgObj.nr + " images, with error: "+err);
			var result = rf.msgObj; //keys: [err,count,nr]
			callback(null, result);
			return;
		});
	}
	catch(err){
		return callback(err);
	}		
}
exports.fetchRange = fetchRange;



/* == test obj == */
/* 
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
		"min": "1",
		"max": "10"
		};

initCounters();
initEventEmitter();
initRange(incomingObj);
*/
