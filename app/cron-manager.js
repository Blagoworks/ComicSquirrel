var squirrel	= require("./squirrel");

var utils		= require("./utilities");
var CronJob 	= require("cron").CronJob;
var CronTime 	= require("cron").CronTime;
//https://github.com/ncb000gt/node-cron

var cronRunning = false;
var cronPattern = "00 30 12 * * 1-5";
var cronTimeStr = "12:30";
//default cron: runs every weekday (Monday through Friday) at 12:30:00 hrs. Does not run on Saturday or Sunday.

/* -- create a default cronjob object to be started later -- */
try {
	var job = new CronJob({
		cronTime: cronPattern,
		onTick: function() {
			console.log("==== CRON TICK on "+ thisTickDate() +" ====");
			squirrel.fetchNow(onSquirrelDone);
		},
		start: false
	});	
} catch(err) {
	console.log("CRON pattern not valid!");
};

/* callback from onTick -> squirrel.fetchNow */
onSquirrelDone = function(err,data){
	if(err){
		console.log("after cron tick, error from squirrel: "+err);
	}else{
		console.log("after cron tick, success from squirrel: "+data);
	}
};

thisTickDate = function(){
	var tickDate = utils.formatDateStr( new Date() );
	return tickDate;
};


/* --- on load html frontend: HeadCtrl --- */
getCronStatus = function(callback){
	try{
		if(!cronRunning) throw new Error("cron-mgr: cronRunning is false");
		else return callback(null,cronTimeStr);
	}
	catch(err){
		return callback(err);
	}
};
exports.getCronStatus = getCronStatus;


/* --- on start app, on save settings --- */
setTimeToRun = function(timestr, callback){
	//console.log("called cron to set new time");
	cronTimeStr = timestr;
	if(cronRunning){
		cronRunning = false;
		job.stop();
	}
	
	try{
		var objRegExp = /(\d+):(\d+)/;
		cronPattern = timestr.replace(objRegExp, "00 $2 $1 * * 1-5"); 
		//console.log("new cron pattern: " + cronPattern);
	}
	catch(err){
		console.log("error setting cron pattern: " + err.message);
		return callback(err);
	}
	
	job.cronTime = new CronTime(cronPattern);
	job.start();
	cronRunning = true;
	
	var startDate = utils.formatDateStr( new Date() );
	console.log("["+startDate+"] started cron job, runs on "+cronTimeStr+", pattern: "+job.cronTime);	
	return callback(null,timestr);	
};
exports.setTimeToRun = setTimeToRun;


//testing
/* 
// test:  node /volume1/development/ComicSquirrel/app/cron-manager.js
report = function(err,str){
	console.log("report: cron job set at "+str+", err: "+err );
}
setTimeToRun("10:31",report);
*/

