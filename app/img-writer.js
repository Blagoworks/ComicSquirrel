var request = require("request");
var fs 		= require("fs");


writeImgFile = function(getfile, savefile, callback){
	try{
		request.head(getfile, function(err, res, body){
			console.log("writeImgFile req img: "+getfile+" to: "+savefile);
			console.log("content-type:", res.headers["content-type"]);
			console.log("content-length:", res.headers["content-length"]+"\n");
			var contenttype = res.headers["content-type"];

			if(err){ 
				console.log("error req headers: "+err.message);
				return "writeImgFile error req headers: "+err.message;
			}
			else if(contenttype.indexOf("html")!=-1){ 
				console.log("error: html file returned");
				return "writeImgFile error: html file returned, not an image";
			}
			else{
				console.log("writeImgFile getting the file");
				//write the file to its destination
				var r = request(getfile).pipe(fs.createWriteStream(savefile));
				r.on("close", callback);
			}
		});
	}
	catch(err){
		console.log("error trying to write imgfile: " + err.message);
	}
};
exports.writeImgFile = writeImgFile;
		

