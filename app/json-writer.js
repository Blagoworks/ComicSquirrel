var http 	= require("http");
var fs 		= require("fs");
var path		= require("path");


//get data from the file from disk
getDataFile = function(datafile, callback){
	try{
		//async function, unparsed, not cached - in pattern: if err, try, catch, return
		fs.readFile(datafile, "utf8", function (err, data) {
			var jsonExt = (path.extname(datafile)==".json")? true : false;
			
			if (err) {
				console.log("jsonwriter error reading datafile, msg: " + err.message);
				return callback(err);
			}
			if(!jsonExt) return callback(null, data); //return data as txt string
			
			try { 
				data = JSON.parse(data);
			} catch(err) { 
				return callback(err);
			}
			return callback(null, data); //return data parsed as json obj
		});
	}
	catch(e){
		console.log("error getting datafile: "+e.message);
	}
};
exports.getDataFile = getDataFile;


//write object to file on disk
writeDataFile = function(newdata, datafile, callback){
	try{
		getDataFile(datafile,function (err, data) {
			//write obj to file as string, with prettified indent of 4 spaces 
			fs.writeFile(datafile, JSON.stringify(newdata, null, 4), function(err){
				if(err){
					console.log("error writing to file: " + err.message);
					return callback(err);
				}
				else{
					//saved new data
					console.log("JSON data saved to file: " + datafile);
					return callback(null,newdata);
				}
			});
		});		
	}
	catch(err){
		console.log("error trying to write datafile: " + err.message);
	}
};
exports.writeDataFile = writeDataFile;

