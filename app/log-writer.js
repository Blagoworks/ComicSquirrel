var http 	= require("http");
var fs 		= require("fs");


var apppaths	= require("./app-paths");
var utils		= require("./utilities");

var logFile 	= apppaths.dataFile["logdata"];


//get data from the file from disk
getLogFile = function(logfile, callback){
	try{
		//async function, unparsed, not cached - in pattern: if err, try, catch, return
		fs.readFile(logfile, "utf8", function (err, data) {
			if(err){
				return callback(err);
			}
			else {
				return callback(null, data); //return data as txt string
			}
		});
	}
	catch(e){
		console.log("error getting logfile: "+e.message);
		return callback(err);
	}
};
exports.getLogFile = getLogFile;


//write object to logfile, prepending new to existing msgs 
writeToLogFile = function(str, logfile, callback){
	try{
		/* prepend new msg */		
		getLogFile(logfile, function(err, data){
			var newdata = str + '\n' + data;	
			try{
				fs.writeFileSync(logfile, newdata, "utf8");
			}catch(e){
				console.log("error writing logfile: "+e.message);
			}
		});
	}
	catch(err){
		console.log("error getting logfile: " + err.message);
		return callback(err);
	}
};
exports.writeToLogFile = writeToLogFile;


clearLogFile = function(msgobj, logfile, callback){
	var msg = msgobj.txt;
	try{
		//replace contents with new msg
		fs.writeFile(logfile, msg, function(err){
			if(err){
				console.log("error writing to file: " + err.message);
				return callback(err);
			}
			else{
				//saved new data
				console.log("logfile cleared: "+msg);
				return callback(null,msg);
			}
		});	
	}
	catch(err){
		console.log("error trying to write logfile: " + err.message);
	}
};
exports.clearLogFile = clearLogFile;


//----nodeLogger----
logResults = function(msg, indent){
	var theDate = utils.formatDateStr( new Date() );
	var indent = (indent)? indent : '\t ';
	var theMsg = theDate + indent + msg;
	//prepend new msg
	writeToLogFile(theMsg, logFile, function(){
		console.log("logResults wrote to file: "+msg);
	});
};
exports.logResults = logResults;

