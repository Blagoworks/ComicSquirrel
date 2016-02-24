//comic-getter @ ./app

var request 	= require("request");
var cheerio 	= require("cheerio");
var fs      	= require("fs");
var url     	= require("url");

var imgDownloader = require("./img-downloader");
var prevName 	= "";
	
	
// get image(s) from a given page url
byPageUrl = function(varObj, cbTryAgain, cbFetchNext, cbFetchComplete, cbRangeError, cbRangeSuccess) {
	var count	= varObj.count;
	var dlcount	= varObj.dlcount;
	var comicDir = varObj.comicDir;
	var pageUrl	= varObj.pageUrl;
	var imgDir	= varObj.imgDir;
	var imgEl	= varObj.imgEl;
	var min		= varObj.min;
	var retry 	= varObj.retry;

	console.log("getComic.byPageUrl is getting img from: "+imgEl);	
	//get the page
	request(pageUrl, ( function(imgEl) {
		return function(err, resp, body) {
			if (err) return cbTryAgain(count, dlcount, "cannot find page "+ parseInt(count+min) +", tried "+(retry+1)+"x");
			
			$ = cheerio.load(body);
			if($(imgEl)=="") return cbTryAgain(count, dlcount, "page "+ parseInt(count+min) +" has no image element, tried "+(retry+1)+"x");
			
			// find img in dom elements
			$(imgEl).each(function() {
				var src = $(this).attr("src");
				if (src){
					var origName = url.parse(src).pathname.split("/").pop(); //1.jpg or adc9caa05cde012ee3bd00163e41dd5b		
					if(origName=="") return cbTryAgain(count, dlcount, "image file has no name or does not exist, tried "+(retry+1)+"x");
					if(origName==prevName) {
						console.log(count+ "img already downloaded");
						cbFetchNext(count+1, dlcount);
						return;
					}
					var imgName = "";
					if( origName.indexOf(".")==-1 ) imgName = padZero(dlcount) + "_img.jpg"; //extension is just a wild guess
					else imgName = padZero(dlcount) + "_" + origName;	 //01_1.jpg or 01_img.jpg
					//slash?
					var slash = (imgDir.slice(-1)=="/")? "" : "/";
					var getPath = (src.indexOf("http://")!=-1)? src : imgDir + slash + origName;
					var savePath = comicDir + "/" + imgName;
					//check for existing file before downloading it again
					fs.stat(savePath, function(err, stats) {
						if(err == null && stats.isFile()) {
							console.log("img "+count+ " already downloaded");
							cbFetchNext(count+1, dlcount);
							return;
						}
						else if(err.code == "ENOENT") {
							//file not downloaded before, go get it!
							prevName = origName;
							
							return imgDownloader.saveImg(count, dlcount, imgName, comicDir, getPath, savePath, cbRangeError, cbRangeSuccess);
						}
						else {
							cbFetchComplete(count, dlcount, "fs.stat error trying to save the image: "+err.code);
							return false;
						}
					});
				}else{ 
					cbFetchComplete(count, dlcount, "cannot find img src element on page "+ parseInt(count+min) );
					return false;
				}
			});
		}		
	} )(imgEl));	
};
exports.byPageUrl = byPageUrl;


// get image from a given file url
byFileName = function(varObj, cbTryAgain, cbFetchNext, cbRangeError, cbRangeSuccess){
	var count	= varObj.count;
	var dlcount	= varObj.dlcount;
	var comicDir = varObj.comicDir;
	var imgEl	= varObj.imgEl;
	var retry	= varObj.retry;

	var imgName = url.parse(imgUrl).pathname.split("/").pop(); //ch1-001.jpg					
	if(imgName==""){
		cbTryAgain(count, dlcount, "image file has no name or does not exist, tried "+(retry+1)+"x");
	}else if(imgName==prevName) {
		console.log(count+ "img-file already downloaded "+imgName);
		cbFetchNext(count+1, dlcount);
	}else{
		var savePath = comicDir + "/" + imgName;
		prevName = imgName;
		imgDownloader.saveImg(count, dlcount, imgName, comicDir, imgUrl, savePath, cbRangeError, cbRangeSuccess);
	}
};
exports.byFileName = byFileName;
