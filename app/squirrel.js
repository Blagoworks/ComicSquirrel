var request 	= require("request");
var cheerio 	= require("cheerio");
var fs      	= require("fs");
var url     	= require("url");

var apppaths	= require("./app-paths");
var imgDownloader = require("./img-downloader");
var jsonwriter = require("./json-writer");
var logwriter	= require("./log-writer");
var utils		= require("./utilities");



//internal vars
var sq = [];	//squirrel var obj
//statics
sq.dataFile 	= apppaths.dataFile["comicsdata"];
sq.statusClassArr = { "ok":"fa-check-circle", "waiting":"fa-clock-o", "error":"fa-times-circle" };

initSqVars = function(){
	sq.testRun = false;
	sq.dataObj = [];
	sq.doneArr = [];
}
//event emitter
var squirrelEvtEmitter = require("events").EventEmitter;
var squirrelEvt;
//make sure there's only ONE eventEmitter per request
initSqEvtEmitter = function(){	
	squirrelEvt  = new squirrelEvtEmitter();
	exports.squirrelEvt = squirrelEvt;
	console.log("squirrel inited new eventEmitter");
};
//called in readDataForEach
initSqDoneArr = function(comicsCount){
	for(var i=0; i<comicsCount; i++){
		sq.doneArr[i] = [];
		sq.doneArr[i].done = false;
		sq.doneArr[i].imgs = [];
	}	
};


getJsonDataFile = function(fileUrl, callback){
	var file = fileUrl;
	var err = "";

	if(!file){
		console.log("squirrel: datafile is undefined");
		err = "cannot find datafile";
		return callback(err);
	}else{
		//get the json data into objects
		jsonwriter.getDataFile(file, function(error, data){
			if(error){
				console.log("squirrel: error getDataFile - txtfile not found: "+error.message);
				err = "cannot read datafile, err: " + error.message;
				return callback(err);
			}else{
				sq.dataObj = data;
				return callback(null, sq.dataObj); //readDataForEach
			}
		});
	}
};

//for each comic in comicObject, find the image to download
readDataForEach = function(err, obj){
	if(!err){
		if(obj.comics){
			var comics = obj.comics;
			initSqDoneArr(comics.length);
			
			for(var i=0; i<comics.length; i++){
				var id = comics[i]._id;
				var name = comics[i].name;
				var page = comics[i].comicpage;
				var base = comics[i].imgdir;
				var img = comics[i].imgselector;
				//check for slash
				var slash = (obj.downloaddir.slice(-1)=="/")? "" : "/";
				var dir = obj.downloaddir + slash + name;
				//get current image
				getComicById(id, dir, page, base, img);
			}
		}
	}else{
		logwriter.logResults("datafile error: "+err.message);
		return comicDone("onDataFileError");
	}
};


//----nodeScraper----
//on the current comic page, find img to be downloaded 
getComicById = function(comicId, comicDir, pageUrl, baseUrl, imgEl) {
	//console.log("getComic is getting img from: "+imgEl);
	//get the page
	request(pageUrl, ( function(imgEl) {
		return function(err, resp, body) {
			if (err){
				//console.log("request pageurl error: "+err.message);
				return comicDone(comicId, "error", "page url not found "+err.message);
			}
			
			$ = cheerio.load(body);
			if($(imgEl)==""){ 
				//console.log("error: can't find any element with "+imgEl);
				return comicDone(comicId, "error", "cannot find the img element with "+imgEl);
			}
			
			// find img in dom elements
			$(imgEl).each(function() {
				var src = $(this).attr("src");
				if (src){
					//console.log("getting something from src= "+src);
					var imgName = url.parse(src).pathname.split("/").pop();	//1.jpg
					addImgToDoneArr(comicId, imgName);
					//does it slash?
					var slash = (baseUrl.slice(-1)=="/")? "" : "/";
					var getPath = (src.indexOf("http://")!=-1)? src : baseUrl + slash + imgName;
					//console.log("imgEl getPath construct: "+getPath);
					var savePath = comicDir + "/" + imgName;
					
					//check for existing file before downloading it again
					fs.stat(savePath, function(err, stats) {
						if(err == null && stats.isFile()) {
							//console.log("file "+imgName+" aleady downloaded" +'\n');
							stripImgFromDoneArr(comicId, imgName);
							return comicDone(comicId, "waiting", "no new image yet");
						}
						else if(err.code == "ENOENT") {
							//file not found: not downloaded before, go get it
							return imgDownloader.saveImg(comicId, 1, imgName, comicDir, getPath, savePath, onError, onSuccess);
						}
						else {
							console.log("some other file error: ", err.code);
							stripImgFromDoneArr(comicId, imgName);
							return comicDone(comicId, "error", "path does not return a file");
						}
					});
				}else{ 
					//console.log("failed to get src");
					stripImgFromDoneArr(comicId, imgName);
					return comicDone(comicId, "error", "cannot find img source on "+getPath);
				}
			});
		}		
	} )(imgEl));	
};


//download the scraped img to the designated folder
// callbacks in imgDownloader.saveImg
onError = function(nr, dl, msg){
	console.log("onError for id: "+nr+", msg: "+msg);
	comicDone(nr, "error", msg);
};
onSuccess = function(nr, name, dir){
	console.log("onSuccess for id: "+nr+", name: "+name+", dir: "+dir);
	stripImgFromDoneArr(nr, name);
	comicDone(nr, "ok", "saved image");
};

//helpers to determine if all images have finished downloading
addImgToDoneArr = function(id, str){
	var comics = sq.dataObj.comics;	
	for(var i=0; i<comics.length; i++){
		if(id == comics[i]._id){
			sq.doneArr[i].imgs.push(str);
		}	
	}				
};
stripImgFromDoneArr = function(id, str){	
	var comics = sq.dataObj.comics;	
	for(var i=0; i<comics.length; i++){
		if(id == comics[i]._id){
			for(var d=0; d<sq.doneArr[i].imgs.length; d++){
				//console.log("stripImgFromDoneArr comparing str "+str+" to imgs["+d+"], "+sq.doneArr[i].imgs[d]);
				if(sq.doneArr[i].imgs[d] == str){ 
					sq.doneArr[i].imgs.splice(d,1);
				}	
			}
		}	
	}	
};
checkImgsDone = function(arr){
	return (arr.length>0)? false : true;
};

//collect and update results per comic
updateDataForComic = function(id, status, msg){
	if(!sq.testRun){
		var lastupdated = utils.formatDateStr( new Date() ); 	
		var comics = sq.dataObj.comics;	
		for(var i=0; i<comics.length; i++){
			if(id == comics[i]._id){
				//set done=true for this _id - check for multiple images on one page
				sq.doneArr[i].done = checkImgsDone( sq.doneArr[i].imgs );
				
				//set lastupdated string for client
				comics[i].runstatusicon = sq.statusClassArr[status];
				comics[i].runstatusmsg = msg;
				if (msg != "no new image yet"){ comics[i].lastupdated = lastupdated; }
						
				//log results for each image downloaded, with the name of the comics for clarity
				var comicName = comics[i].name; 
				var testStr = (sq.testRun)? "testrun for " : "";
				var logMsg = testStr + comicName +": img " +status+ ", " +msg;
				logwriter.logResults( logMsg );
			}	
		}	
	}
};

//finally, save to datafile
comicDone = function(id, status, msg){
	console.log("comicDone for id: "+id);
	//break on error or testrun
	if(id=="onDataFileError"){ 	
		sendSqErrorMsg(id, status, msg);
		return;
	}	
	if(sq.testRun){
		sendSqTestDoneMsg(id, status, msg);
		return;
	}
	//set true in doneArr, set lastupdated var in comics data obj	
	updateDataForComic(id, status, msg);
	
	for(var i=0; i<sq.doneArr.length; i++){
		//console.log("on comicDone, loop count "+i+" doneArr: "+sq.doneArr[i].done);
		if(sq.doneArr[i].done == false){
			//step out of loop if images still need to finish downloading
			return;
		}else if( i==(sq.doneArr.length-1) ){
			sendSquirrelDoneMsg(id, status, msg);
		}
	}
};
sendSqTestDoneMsg = function(id, status, msg){
	//emit events
	if(status=="error"){ 
		squirrelEvt.emit("TESTRUN_ERROR", msg); 
	}else{ 
		squirrelEvt.emit("TESTRUN_DONE"); 
	}
};
sendSqErrorMsg = function(id, status, msg){
	sq.dataObj.cronstatus = "error";
	squirrelEvt.emit("SQUIRREL_ERROR");
}
		
sendSquirrelDoneMsg = function(id, status, msg){
	//write datafile when done with the list
	console.log("emitting SQUIRREL_DONE for all comics, datafile: "+sq.dataObj.cronstatus+", err msg: "+msg);
	//write dataObj back to file
	jsonwriter.writeDataFile(sq.dataObj, sq.dataFile, function(){ 
		squirrelEvt.emit("SQUIRREL_DONE");
	});
};


//----public export----
testFetch = function(obj, callback){
	initSqVars();
	initSqEvtEmitter();
	
	sq.testRun = true;
	var id = "testitem";
	var name = obj.name;
	var page = obj.comicpage;
	var base = obj.imgdir;
	var img = obj.imgselector;
	//check for slash
	var slash = (obj.downloaddir.slice(-1)=="/")? "" : "/";
	var dir = obj.downloaddir + slash + name;
	
	squirrelEvt.on("TESTRUN_ERROR", function(msg) {
		logwriter.logResults("--- testrun with error: "+msg+" ---", " " );
		console.log("squirrel testrun with error");
		return callback(msg);
	});
	squirrelEvt.on("TESTRUN_DONE", function() {
		logwriter.logResults("--- testrun: OK ---", " " );
		console.log("squirrel testrun done");
		return callback(null,"done");
	});
		
	//start test run
	getComicById(id, dir, page, base, img);
};
exports.testFetch = testFetch;


//called via cron-manager and via Force Fetch
fetchNow = function(callback){
	//get datafile, set callback, get back with results
	initSqVars();
	initSqEvtEmitter();
	
	try{
		console.log("Squirrel fetchNow started - getting comics");
		getJsonDataFile(sq.dataFile, readDataForEach);
		
		squirrelEvt.on("SQUIRREL_DONE", function() {
			logwriter.logResults("--- update done ---", " " );
			console.log("squirrel got done");
			return callback(null,"done");
		});
		squirrelEvt.on("SQUIRREL_ERROR", function() {
			logwriter.logResults("--- update with errors ---", " " );
			console.log("squirrel got error");
			throw new Error("squirrel got error");
		});
	}
	catch(err){
		return callback(err);
	}
}
exports.fetchNow = fetchNow;


/* 
//test:   node /volume1/development/ComicSquirrel/app/squirrel.js
initSqVars();
initSqEvtEmitter();
getJsonDataFile(sq.dataFile, readDataForEach);
*/