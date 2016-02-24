//pageurl-getter @ ./app

var request 	= require("request");
var cheerio 	= require("cheerio");


// get image(s) from a given page url
fromLinkEls = function(testrun, listurl, linkslct, min, max, cbOnPagesArray) {
	
	var pageUrl	= listurl;
	var aEl	= linkslct;	
	var pagesArr = [];
		
	if(testrun && (max!=min)) max = min;

	//get the page
	request(pageUrl, ( function(aEl){
		return function(err, resp, body) {
			if(err) return cbOnPagesArray("cannot find page", false);
			
			$ = cheerio.load(body);

			if($(aEl)=="") return cbOnPagesArray("no link element found with "+aEl, false);
			
			// find a.selector element in dom elements, within the given range
			var count = 1;
			$(aEl).each(function(){
				var src = $(this).attr("href");
				var inRange = (count >= min && count <= max)? true : false;
				if (src && inRange){
					//console.log("on count "+count+", pushing "+src);
					pagesArr.push(src);
				}
				count += 1;
				if(count > max && pagesArr[0]==null) cbOnPagesArray("no links found within this range", false);
			});
			//console.log("getPageUrls.fromLinkEls ready to return arr: "+pagesArr.toString() );
			cbOnPagesArray(false, pagesArr);
		}		
	} )(aEl));

};
exports.fromLinkEls = fromLinkEls;
