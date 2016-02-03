/* === navbar directive: from angular-strap module === */
angular.module("ActiveNav", []).directive("bsNavbar", function($location) {
	"use strict";

	return {
		restrict: "A",
		link: function postLink(scope, element, attrs, controller) {
			// Watch for the $location
			scope.$watch(function() {
				return $location.path();
			}, 
			function(newValue, oldValue) {
				$("li[data-match-route]", element).each(function(k, li) {
					var $li = angular.element(li),
					// data("match-route") does not work with dynamic attributes
					pattern = $li.attr("data-match-route"),
					regexp = new RegExp("^" + pattern + "$", ["i"]);

					if(regexp.test(newValue)) {
						$li.addClass("active");
					} else {
						$li.removeClass("active");
					}
				});
			});
		}
	};
});


/* === validation: error html snippets as templates === */
var appwide = angular.module("ErrorMessages", []);

appwide.directive("errorsFormName", function() {
	return { templateUrl: "templates/errors-form-name.html" };
});
appwide.directive("errorsFormUrl", function() {
	return { templateUrl: "templates/errors-form-url.html" };
});
appwide.directive("errorsFormImgdir", function() {
	return { templateUrl: "templates/errors-form-imgdir.html" };
});
appwide.directive("errorsFormImgselector", function() {
	return { templateUrl: "templates/errors-form-imgselector.html" };
});
appwide.directive("errorsNumberRange", function() {
	return { templateUrl: "templates/errors-number-range.html" };
});
appwide.directive("errorsDateRange", function() {
	return { templateUrl: "templates/errors-date-range.html" };
});

appwide.directive("errorsFormLibdir", function() {
	return { templateUrl: "templates/errors-form-libdir.html" };
});
appwide.directive("errorsFormCronruntime", function() {
	return { templateUrl: "templates/errors-form-cronruntime.html" };
});
appwide.directive("errorsFormPortrange", function() {
	return { templateUrl: "templates/errors-form-portrange.html" };
});


//date helper
getFormattedDate = function(datestr){
	var d = datestr;
	var mm = d.getMonth()+1;
	var dd = d.getDate();
	var yyyy = d.getFullYear();
	return mm +"/"+ dd +"/"+ yyyy;
};

//number validation
isEmptyVal = function(val){
	var bool = (val == undefined || val == "" || val == NaN || val.toString() == "NaN" )? true:false;
	if(val==0) bool = false;
	return bool;
};
isValidNumberRange = function (min, max) {
	//console.log("is valid number? emptyMin: "+isEmptyVal(min)+", min: "+min+", max: "+max+", emptyMax:"+isEmptyVal(max) );
	if ( isEmptyVal(min) && isEmptyVal(max) ) return true;
	if ( isEmptyVal(min) || isEmptyVal(max) ) return false;
	if (min && max) {   
		if (min >= max) return false;
	}
	return true;
};


//date validation
isValidDate = function (dateStr) {
    if (dateStr == undefined || dateStr == "") return false;
    var dateTime = Date.parse(dateStr);
    if (isNaN(dateTime)) return false; 
	 
    return true;
};
getDateDifference = function (fromDate, toDate) {
    return Date.parse(toDate) - Date.parse(fromDate);
};
isValidDateRange = function (fromDate, toDate) {
	 //console.log("valid fromDate? "+isValidDate(fromDate)+", valid toDate? "+isValidDate(toDate)+", from: "+fromDate+", to: "+toDate );
	 if (!isValidDate(fromDate) && !isValidDate(toDate)) return true;
    if (isValidDate(fromDate) && isValidDate(toDate)) {
        var days = getDateDifference(fromDate, toDate);
        if (days < 0) return false; 
    }
    return true;
};


//directives number range validation
appwide.directive("numberLowerThan", [function () {
    return {
        require: "ngModel",
        link: function (scope, elm, attrs, ctrl) {           
            var validateNumberRange = function (inputValue) {
                var minRange = parseInt(inputValue);
                var maxRange = parseInt(attrs.numberLowerThan);
                var isValid = isValidNumberRange(minRange, maxRange);
                ctrl.$setValidity("numberLowerThan", isValid);
                return inputValue;
            };
            ctrl.$parsers.unshift(validateNumberRange);
            ctrl.$formatters.push(validateNumberRange);
            attrs.$observe("numberLowerThan", function () {
                validateNumberRange(ctrl.$viewValue);
            });
        }
    };
}]);
appwide.directive("numberGreaterThan", [function () {
    return {
        require: "ngModel",
        link: function (scope, elm, attrs, ctrl) {            
            var validateNumberRange = function (inputValue) {
					//values from input are strings, not numbers
					var minRange = parseInt(attrs.numberGreaterThan);
					var maxRange = parseInt(inputValue);
					var isValid = isValidNumberRange(minRange, maxRange);
					ctrl.$setValidity("numberGreaterThan", isValid);
					return inputValue;
            };
            ctrl.$parsers.unshift(validateNumberRange);
            ctrl.$formatters.push(validateNumberRange);
            attrs.$observe("numberGreaterThan", function () {
                validateNumberRange(ctrl.$viewValue);
            });
        }
    };
}]);

//directives date range validation
appwide.directive("dateLowerThan", ["$filter", function ($filter) {
    return {
        require: "ngModel",
        link: function (scope, elm, attrs, ctrl) {           
            var validateDateRange = function (inputValue) {
                var fromDate = inputValue; //$filter("date")(, "short");
                var toDate = attrs.dateLowerThan; //$filter("date")(, "short");
                var isValid = isValidDateRange(fromDate, toDate);
					 //console.log("valid dates: "+isValid);
                ctrl.$setValidity("dateLowerThan", isValid);
                return inputValue;
            };

            ctrl.$parsers.unshift(validateDateRange);
            ctrl.$formatters.push(validateDateRange);
            attrs.$observe("dateLowerThan", function () {
                validateDateRange(ctrl.$viewValue);
            });
        }
    };
}]);
appwide.directive("dateGreaterThan", ["$filter", function ($filter) {
    return {
        require: "ngModel",
        link: function (scope, elm, attrs, ctrl) {            
            var validateDateRange = function (inputValue) {
                var fromDate = attrs.dateGreaterThan; //$filter("date")(attrs.dateGreaterThan, "short");
                var toDate = inputValue;
                var isValid = isValidDateRange(fromDate, toDate);
					 //console.log("inputval: "+inputValue+", check fromDate: "+fromDate+", toDate: "+toDate+", valid dates: "+isValid);
                ctrl.$setValidity("dateGreaterThan", isValid);
                return inputValue;
            };

            ctrl.$parsers.unshift(validateDateRange);
            ctrl.$formatters.push(validateDateRange);
            attrs.$observe("dateGreaterThan", function () {
                validateDateRange(ctrl.$viewValue);

            });
        }
    };
}]);




/* for old times sake: a rel=external gets a target=_blank (which is no longer deprecated in html5) */
angular.module("ExternalLinks", []).directive("rel", function() {
	return {
		restrict: "A",
		link: function(scope, element, attrs){
			if(attrs.rel=="external"){
				attrs.$set("target", "_blank");
			}
		}
	};
});

