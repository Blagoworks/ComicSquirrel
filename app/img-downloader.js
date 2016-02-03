//img-downloader @ ./app

var request = require("request");
var fs 		= require("fs");


saveImg = function(nr, dl, name, dir, getfile, savefile, cbError, cbSuccess){
	var count = nr;
	var dlcount = dl;
	var fileName = name;
	var getPath = getfile;
	var savePath = savefile ; //"/volume1/.../comicname/0123.jpg" 
	
	//first, make a download folder if none exists
	try {
		fs.mkdirSync(dir);
	} 
	catch(e) {
		if (e.code != 'EEXIST'){
			console.log("mkdir error: "+e.message+'\n'); //<== this should never happen
		}
	}
	
	//now write the file to its destination
	request.head(getfile, function(err, res, body){
		console.log("imgDownloader requesting img "+count+": "+getfile+" to: "+savefile);
		//console.log("content-type:", res.headers["content-type"]);
		//console.log("content-length:", res.headers["content-length"]+'\n');
		var contenttype = res.headers["content-type"];
		var contentlength = res.headers["content-length"];
		if(err){ 
			console.log("error: "+err.message);
			cbError(count,dlcount, "path request returns an error");
			return;
		}
		else if(contenttype.indexOf("html")!=-1 || contentlength==0){ 
			console.log("error: html returned");
			//nr,dl,msg
			cbError(count,dlcount, "this url does not return an image");
			return;
		}
		else{
			console.log("imgDownloader getting the img file for nr "+count);
			var r = request(getfile).pipe(fs.createWriteStream(savefile));
			//after saving img, call onSuccess
			r.on("close", function(){
					//nr,name,dir
					cbSuccess(count, fileName, dir);
				}); 
		}
	});	
};
exports.saveImg = saveImg;



/* -- test:  node /volume1/development/ComicSquirrel/app/img-downloader.js -- 

onError = function(nr,dl,msg){
	console.log("onError, error on nr: "+nr+", msg: "+msg);
};
onSuccess = function(nr,name,dir){
	console.log("onSuccess, count: "+nr+", name: "+name+", dir: "+dir);
};

var testname = "025.jpg;";
var testDir = "/volume1/Media/Comics/test dir/";
var testGetPath = "http://sssscomic.com/comicpages/256.jpg";
var testSavePath = "/volume1/Media/Comics/test dir/025.jpg";
//test call
saveImg(35,24, testname, testDir, testGetPath, testSavePath, onError, onSuccess);

*/
