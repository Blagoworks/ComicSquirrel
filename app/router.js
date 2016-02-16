var express 	= require("express");
var path 		= require("path");
var url 			= require("url");
var bodyParser = require("body-parser");

var apppaths	= require("./app-paths");
var tool 		= require("./utilities");
var jsonwriter = require("./json-writer");
var logwriter	= require("./log-writer");
var imgwriter 	= require("./img-writer");
var cronmngr 	= require("./cron-manager");
var squirrel 	= require("./squirrel");
var ranger 		= require("./range-fetcher");


module.exports = function(app) {
	
	var portError = false;
	
	//router
	var datarouter = express.Router();
	datarouter.use(bodyParser.json());
	datarouter.use(function(req, res, next) {
		console.log(req.method, req.url);
		next(); 
	});

	
	//GET - Get the details of an item
	datarouter.get("/dataservice", function(req, res, next) {
		var datafile = apppaths.dataFile["comicsdata"];
		console.log("router, get datafile: "+datafile);
		
		if(!datafile){
			console.log("router: datafile is undefined");
			res.send({ status: "router: datafile is undefined" });
			next;
		}else{
			//get the json data into objects
			jsonwriter.getDataFile(datafile, function(err, data){
				if(err){
					console.log("json malformed read error getDataFile "+'\n'+err.message);
					res.send({ status: "json malformed read error getDataFile" });
				}else{
					var dataObj = data;
					//return the data as obj
					res.send({
						status: "Items found, returning dataObj: "+dataObj,
						items: dataObj
					});
				}
			});
		}
	});
	//get cron status
	datarouter.get("/cronservice", function(req, res, next) {
		//check on cronjob status
		cronmngr.getCronStatus(function(err, data){
			if(err){
				console.log("router: cron not running");
				res.send({ status: "cron not running, "+err.message });
			}else{
				console.log("router: cronjob is running");
				res.send({ 
					status: "cronjob is running OK",
					timetorun: data 
				});
			}
		});
	});	
	//get images without cron
	datarouter.get("/fetchservice", function(req, res, next) {
		squirrel.fetchNow( function(err, data){
			if(err){
				console.log("router: squirrel dead");
				res.send({ status: "squirrel not fetching, "+err.message });
			}else{
				console.log("router: squirrel is fetching");
				res.send({ 
					status: "squirrel fetch run done",
					done: data 
				});
			}
		});
	});
	//get logfile
	datarouter.get("/logservice", function(req, res, next) {
		var logFile = apppaths.dataFile["logdata"];
		logwriter.getLogFile(logFile, function(err, data){
			if(err){
				console.log("logfile error");
				res.send({ status: "logfile error: "+err.message });
			}else{
				console.log("logfile read and returned");
				res.send({ 
					status: "logfile read and returned",
					items: data 
				});
			}
		});
	});

	
	//---GET/events - server-side events routes for fetch and cron---
	startSse = function(res) {
		res.writeHead(200, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive'
		});
		res.write("\n");
		
		return function sendSse(name,data,id) {
			res.write("event: " + name + "\n");
			res.write("data: " + JSON.stringify(data) + "\n\n"); //parse it back into obj on client-side
			if(id) res.write("id: " + id + "\n");
			console.log("router: sendSse return-writing data for: "+name);		
		}
	};
	
	/* cronmngr event */	
	datarouter.get("/cronservice/events", function(req, res){
		req.socket.setTimeout(0x7FFFFFFF); //=24days; Infinity causes rangeError

		var cronSse = startSse(res);
		function sendCronDoneUpdate(){ cronSse("CRON_DONE"); }
		var cronEvt = cronmngr.cronEvt;
		cronEvt.on("CRON_DONE", sendCronDoneUpdate);
		
		req.once("end", function() {
			console.log("router: /cronservice/events end event fired");
			cronEvt.removeEventListener("CRON_DONE", sendCronDoneUpdate);			
			res.end();
		});	
	});
	/* range-fetcher events */
	datarouter.get("/fetchservice/events", function(req, res){
		// set timeout as high as possible
		req.socket.setTimeout(0x7FFFFFFF); 

		var sse = startSse(res);
		/* sse calls */
		function sendSavedUpdate(msg) { sse("FETCH_SAVED_IMG", msg); }
		function sendInitedUpdate() { sse("FETCH_INITED"); }
		function sendDoneUpdate(obj) { sse("FETCH_DONE", obj); }
		function sendDoneTestUpdate(obj) { sse("FETCH_TEST_DONE", obj); }

		var rangerEvt = ranger.fetchEvt; //event emitter in range-fetcher
		rangerEvt.on("FETCH_INITED", sendInitedUpdate);
		rangerEvt.on("FETCH_SAVED_IMG", sendSavedUpdate);
		rangerEvt.on("FETCH_DONE", sendDoneUpdate);		
		rangerEvt.on("FETCH_TEST_DONE", sendDoneTestUpdate);
		
		req.once("end", function() {
			console.log("router: /fetchservice/events end event fired");
			rangerEvt.removeEventListener("FETCH_INITED", sendInitedUpdate);
			rangerEvt.removeEventListener("FETCH_SAVED_IMG", sendSavedUpdate);
			rangerEvt.removeEventListener("FETCH_DONE", sendDoneUpdate);		
			rangerEvt.removeEventListener("FETCH_TEST_DONE", sendDoneTestUpdate);
			res.end();
		});	
	});
	
	
	
	//PUT - send object with req
	//Replace the datafile with new data
	datarouter.put("/dataservice", function(req, res, next) {	
		var dataObj = req.body;
		var datafile = apppaths.dataFile["comicsdata"];	
		if(datafile){
			//save data as json to file
			jsonwriter.writeDataFile(dataObj, datafile, function(err, data){
				if(err){
					console.log("error writeDataFile - txtfile not found "+'\n'+err.message);
					res.send({ status: "error: could not save data" });
				}else{
					console.log("success writeDataFile - txtfile saved");
					res.send({ status: "data saved" });
				}
			});
		}else if(!datafile){
			res.send({ status: "datafile not found" });
		}
	});
	
	//replace existing cronjob timetorun via settings	
	datarouter.put("/cronservice", function(req, res, next) {
		var obj = req.body; //put requires json obj, not str
		var strTime = obj.timetorun;
		console.log("router put-call for CRONservice: "+strTime);
		cronmngr.setTimeToRun(strTime, function(err, data){
			if(err){
				console.log("error cronjob: "+'\n'+err.message);
				res.send({ status: "error with cron pattern:"+err.message });
			}else{
				console.log("cronjob started");
				res.send({ 
					status: "cron job set to run on "+strTime,
					timetorun: data
				});
			}
		});
	});
	
	//testing user inputs for squirrel fetch
	datarouter.put("/testservice", function(req, res, next) {
		var testObj = req.body;
		console.log("router put-call for testRun");
		
		squirrel.testFetch(testObj, function(err, data){
			if(err){
				console.log("squirrel test error");
				res.send({ status: "error, "+err });
			}else{
				console.log("squirrel test OK");
				res.send({ 
					status: "all OK",
					done: data 
				});
			}
		});
	});
	
	//download all images in a range; send obj to range-fetcher
	datarouter.put("/fetchservice", function(req, res, next) {
		var obj = req.body;
		//console.log("router put-call for fetchservice, go download archived comics in range");
		ranger.fetchRange(obj, function(err, data){
			try{
				if(err){
					console.log("router: fetchservice, Try error: "+err);
					res.send({ status: "Range fetch error, "+err.message });
				}else{
					console.log("router: callback of ranger.fetchRange is returning data, fetch ended successful");
					res.send({ 
						status: "Range fetch successful",
						result: data 
					});
				}
			}
			catch(err){
				console.log("router: fetchservice, Catch error: "+err);
			}	
			console.log("router: fetchservice, response end"+'\n');
			res.end();
		});
	});
	
	//replace logfile by empty one
	datarouter.put("/logservice", function(req, res, next) {
		var msgObj = req.body; //object
		var logFile = apppaths.dataFile["logdata"];
		console.log("router put-call clearing the log");	
		logwriter.clearLogFile(msgObj, logFile, function(err, data){
			console.log("clearing log: "+data);
			if(err){
				res.send({ status: "Log writer error, "+err.message });
			}else{	
				res.send({ 
					status: "Logs cleared",
					items: data
				});
			}
			res.end();
		});
	});
	
	//replace port
	datarouter.put("/portsetting", function(req, res, next){
		var newport = parseInt(req.body.port);
		console.log("router put-call setting port (app.locals.port: "+app.locals.port+") to: "+newport);			
		try{
			var listener = app.listen(newport, function(){ 
				console.log("router portsetting, setting listener to newport: "+newport); 
			});
			//this catches EADDRINUSE error, not the try-catch
			listener.on("error",function(err) {
				portError = true;
				console.log( "router port error: "+err.message);
				res.send({ 
					status: "port error: "+err.message
				});
			});
			listener.on("listening", function() {
				portError = false;
				//console.log("router portsetting, on listening to new port: "+app.get('port') );
				app.set("port", newport);
				process.env.PORT = newport;
				//close old port so we can move on
				app.locals.listener.close();
				app.locals.listener = listener;
				//the check for success in SettingsCtrl uses this literal string
				res.send({ 
					status: "port change complete"
				});
			});
		}catch(err){
			res.send({ 
				status: "port error: "+err.message
			});	
		}
		res.end();
	});	

	
	
	//POST - add a new item to the server-stored data
	//write image to cache
	datarouter.post("/imagecache", function (req, res, next) {
		var imgFileName = req.body.imgFileName; //stripspaces.jpg
		var getPath = req.body.tmbLink;//undefined
		var cacheDir = apppaths.imgCache;
		var savePath = cacheDir + imgFileName ; //"/volume1/.../img/cache/stripspaces.jpg" 
		
		imgwriter.writeImgFile(getPath, savePath, function(err, data){
			if(err){
				return res.send({ status: "Error: could not save to cache" });
			}else{
				var imgSrc = "img/cache/" + imgFileName; //img src in html
				res.send({ 
					status: "image saved to cache",
					cachepath: imgSrc
				});
			}
		});
	});		
		

	app.use(express.static(__dirname + "/public")).use("/", datarouter);
	//app.use("/", datarouter);
		

	//===========================================================================	
	//point any url-based get-requests (/comics, /settings) to the index file 
	//to be handled as views with angular appRoutes.js
	app.get("*", function(req, res) {
		//path relative to this script's dir, so go one up ../
		res.sendFile(path.join(__dirname, "../public", "index.html"));
	});
	
};
