//global modules =========================================
var express 	= require("express");
var bodyParser = require("body-parser");

var apppaths	= require("./app/app-paths");
var jsonwriter = require("./app/json-writer");
var cronmngr 	= require("./app/cron-manager");


//start app ============================================
var app = express();

//config ===============================================
//app.set("port", process.env.PORT || 3030);
app.use(bodyParser.json());
app.use(express.static(__dirname + "/public"));


var datafile = apppaths.dataFile["comicsdata"];
jsonwriter.getDataFile(datafile, function(err, data){
	if(err){
		console.log("error in server getDataFile, json malformed: "+'\n'+err.message);
	}else{
		var port = data.port;
		app.set("port", process.env.PORT || port);
		app.locals.port = port;
		
		//start cron on app start if there are comics to fetch
		if(data.cronstatus == "ok" && data.comics.length>0){ 
			cronmngr.setTimeToRun(data.timetorun, function(err,response){
				if(response) app.locals.cronstatus = "ok";
				else app.locals.cronstatus = "error";
			});
		}	
		
		//server start listening ==========================
		app.locals.listener = app.listen(port, function() {
			console.log("app started, listening on port " + port ); 
		});
		app.locals.listener.on("error",function(err) {
			console.log( "server port error: "+err.message);
		});
		app.locals.listener.on("listening",function(err) {
			//==== pass app + locals to router =============
			require("./app/router")(app);
			exports = module.exports = app; 
		});
		
		
	}
});	

	

	
	
//---some other time---
//prevent shutdown on exception============================
/*
var cluster = require("cluster");
var workers = process.env.WORKERS || require("os").cpus().length;

if (cluster.isMaster) {
  console.log("start cluster with %s workers", workers);

  for (var i = 0; i < workers; ++i) {
    var worker = cluster.fork().process;
    console.log("worker %s started.", worker.pid);
  }
  cluster.on("exit", function(worker) {
    console.log("worker %s died. restart...", worker.process.pid);
    cluster.fork();
  });
} 
else {
	//start app + routes
}

process.on("uncaughtException", function (err) {
	console.error((new Date).toUTCString() + " uncaughtException:", err.message);
	console.error(err.stack);
	process.exit(1);
})
*/

