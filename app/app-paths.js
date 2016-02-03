var path = require("path");


//"/volume1/development/ComicSquirrel/public/"
dataFile =  {
	"comicsdata": path.join(__dirname, "../public", "data/comicdata.json"),  
	"logdata": path.join(__dirname, "../public", "data/comicslog.txt")
};
exports.dataFile = dataFile;


imgCache = path.join(__dirname, "../public", "img/cache/");
exports.imgCache = imgCache;