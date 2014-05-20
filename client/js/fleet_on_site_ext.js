// extending the Number
(function(){
	var PROTO = Number.prototype;
	/**
	 * Round a number to a given decimal points.
	 * 
	 * @param decimalPoints The number of decimal points that should appear in the result
	 */
	function round(decimalPoints) {
		if (!decimalPoints) return Math.round(this);
		if (this == 0) {
			var decimals = "";
			for (var i = 0; i < decimalPoints; i++) decimals += "0";
			return "0." + decimals;
		}

		var exponent = Math.pow(10, decimalPoints);
		var num = Math.round((this * exponent)).toString();
		return num.slice(0, -1 * decimalPoints) + "." + num.slice(-1 * decimalPoints);
	};
	
	/**
	 * Rounds a number to the nearest hundred.
	 *
	 * @return Returns the rounded number.
	 */
	function roundToNearestHundred() {      
		var isNegative = (this < 0) ? true : false;
		var b = Math.abs(this);
		var tens = b % 100;
		b -= tens;
		if (tens > 49) b += 100;
		if (isNegative) b *= -1;
		return b;
	};
	// exports
	PROTO.round = round;
	PROTO.roundToNearestHundred = roundToNearestHundred;
})();

// extending the Math
(function(){
	/**
	 * Based on RFC4122v4 solution to generate a uuid.
	 */
	function uuid() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
			return v.toString(16);
		});
	};
	// exports
	Math.uuid = uuid;
})();

function Util() {
}

// extending the Util
(function(){
	var isMobile = {
    	Android: function() {
        	return navigator.userAgent.match(/Android/i);
    	},
    	BlackBerry: function() {
        	return navigator.userAgent.match(/BlackBerry/i);
    	},
    	iOS: function() {
        	return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    	},
    	Opera: function() {
        	return navigator.userAgent.match(/Opera Mini/i);
    	},
    	Windows: function() {
        	return navigator.userAgent.match(/IEMobile/i);
    	},
    	any: function() {
        	return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
    	}
	};
    
    /**
     * Convert a string format of date/time to UTC timestamp
     */
    function toUTC(dateTime) {
        var tsDate = dateTime.split(" "),
            date = tsDate[0],
            time = tsDate[1],
            timeInfo = time.split(":"),
            amPm = time.substr(-2),
            hh = parseInt(timeInfo[0]),
            mm = parseInt(timeInfo[1]),
            ss = parseInt(timeInfo[2]);
            
        if (amPm == "PM") {
            if (hh < 12) {
            	hh += 12;
    		}
        }

        //Subtract 1 from month to accomodate the month start from 0 in the function
        var timestamp = new Date(date.substring(6, 10), ((date.substring(0, 2) * 1) - 1), date.substring(3, 5), hh, mm, ss).getTime() / 1000;
        return timestamp;
    }
	// exports
	Util.isMobile = isMobile;
    Util.toUTC = toUTC;
})();

// extend polygon of Gmap V3 with getBounds method
(function(){
	var PROTO = google.maps.Polygon.prototype;
    
    function getBounds(){
        var bounds = new google.maps.LatLngBounds();
        this.getPath().forEach(function(element,index){bounds.extend(element)})
        return bounds;
    }
    
    // exports
    if (!google.maps.Polygon.prototype.getBounds) {
        PROTO.getBounds = getBounds;
    }
})();