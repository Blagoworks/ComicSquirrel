//utilities @ ./app


var removeByAttr = function(arr, attr, value){
    var i = arr.length;
    while(i--){
       if( arr[i] && arr[i].hasOwnProperty(attr) && (arguments.length > 2 && arr[i][attr] === value ) ){ 
           arr.splice(i,1);
       }
    }
    return arr;
}
exports.removeByAttr = removeByAttr;


//remove all chars except whitelisted ones
whiteListStr = function(str){
	return str.replace(/[^a-z0-9 -_\/]/ig, "");
}
exports.whiteListStr = whiteListStr;


//return file extension
findFileExtension = function(str){
	var ext = str.slice((str.lastIndexOf(".")-1 >>> 0) + 2);
	ext = (ext.length != 0 && ext.length <5)? ext : ""; //"jpg" or ""
	return ext;
};
exports.findFileExtension = findFileExtension;

addPadding = function(nr,depth){
	var d = "";
	for(var i=0; i<depth; i++){ d = d+"0"; }
	var s = d + nr; //"0000"+11
	return s.substr(s.length - depth);
};
exports.addPadding = addPadding;	

// test/22000222/ch2-p0010.jpg --> test/22000222/ch2-p0011.jpg
getNextFileUrlByNumber = function(str, count){			
	var fileExt = findFileExtension(str); 		//"jpg" or ""
	//for str = http://somedomain.com/test/2200022/ch1-p0010, return str
	var baseUrl = (fileExt.length > 0)? str.substr( 0, str.lastIndexOf(".") ) : str;

	//find last numbers in string
	var paddedNr = baseUrl.match(/\d+$/)[0];	//0010
	var padDepth = paddedNr.length;
	var baseBeforeNr = str.substr(0, (baseUrl.length-padDepth) ); ////http://somedomain.com/test/2200022/ch1-p
	
	//remove any zeros that are not preceded by Latin letters, decimal digits, underscores
	var newNr = paddedNr.replace(/\b0+/g, ''); //10+1
	newNr = parseInt(newNr)+count;
	newNr = addPadding( newNr, padDepth);		//0011
	
	var point = (fileExt.length > 0)? "." : "";
	var nextUrl = baseBeforeNr + newNr + point + fileExt;
	
	return nextUrl;
};
exports.getNextFileUrlByNumber = getNextFileUrlByNumber;
	

//return base-url without page or date numbers
//returns empty string when no number is found
findUrlBeforeNumber = function(str){
	var nr = str.match(/\d+$/);
	var i = (nr!=null)? str.match(/\d+$/)[0] : 0; //prevent errors on no nr match
	var n = str.lastIndexOf(i);	
	return str.substr(0,n);
};
exports.findUrlBeforeNumber = findUrlBeforeNumber;

findUrlBeforeDate = function(str,regex){
	try{
		var regDate = str.match(regex)[0];
		//console.log("regDate: "+regDate);
		var n = str.lastIndexOf(regDate);
		var strRegged = str.substr(0,n);
		return strRegged;
	}
	catch(err){
		console.log("date format does not match given url");
		return "error";
	}
}
exports.findUrlBeforeDate = findUrlBeforeDate;

findUrlBeforePage = function(str){
	var n = str.lastIndexOf("/");
	var hrf = str.substr(0,n+1);
	
	return (hrf!="http://")? hrf : str+"/";
};
exports.findUrlBeforePage = findUrlBeforePage;


getUrlDateStr = function(date,format){
	//date
	var d = new Date(date); //date: 1420066800000
	var mm = ("0" + (d.getMonth()+1)).slice(-2);
	var dd = ("0" + d.getDate()).slice(-2);
	var yyyy = d.getFullYear();
	//format
	var div = format.match(/[^yYmMdD]/); //not y, m or d?
	if(div==null || div==undefined) div = "";
	//console.log("div: "+div);
	if(format.match(/^yyyy|^YYYY/)) return "" + yyyy + div + mm + div + dd;
	else if(format.match(/^mm|^MM/)) return "" + mm + div + dd + div + yyyy;
	else return "" + dd + div + mm + div + yyyy;
};
exports.getUrlDateStr = getUrlDateStr;


formatDateStr = function(d){
	//date-to-str with timezoneoffset
	d = d - (d.getTimezoneOffset() * 60000);
	d = new Date(d);
	var str = d.toISOString().substr(0,16).replace(/T/, " "); //2015-03-02 12:28
	//console.log("formatted date str before regex: "+str);  
	var objRegExp = /(\d+)-(\d+)-(\d+)\s(\d+):(\d+)/;
	var strRegged = str.replace(objRegExp, "$2-$3-$1 $4:$5"); //03-02-2015 12:28
	return strRegged;
}
exports.formatDateStr = formatDateStr;


setRegexByFormat = function(format){
	var regx;
	var yrstart = format.match(/^yyyy|^YYYY/);
	var mstart = format.match(/^mm|^MM/);
	//yyyy-mm-dd or yyyy.mm.dd or yyyy/mm/dd or yyyymmdd
	if(yrstart) regx = /(19|20)\d\d[- _.\/]?(0[1-9]|1[012])[- _.\/]?(0[1-9]|[12][0-9]|3[01])/;	//yyyy-mm-dd
	else if(mstart) regx = /(0[1-9]|1[012])[- _.]?(0[1-9]|[12][0-9]|3[01])[- _.]?(19|20)\d\d/;	//mm-dd-yyyy
	else regx = /(0[1-9]|[12][0-9]|3[01])[- _.]?(0[1-9]|1[012])[- _.]?(19|20)\d\d/;					//dd-mm-yyyy
	return regx;
}
exports.setRegexByFormat = setRegexByFormat;

