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
    
    /**
	 * Parses a timestamp string and returns the millisecond representation of
	 * it.
	 *
	 * @param timestamp  The timestamp string  (e.g. 12/13/2007 10:59:56AM PST).
	 *
	 * @return Returns the millisecond representation of the timestamp.
	 */
	function parseTimestampString(timestamp) {  
		var dateStr = timestamp.substring(0, timestamp.length - 4);
		var timeZone = timestamp.substring(timestamp.length - 3);
	  
		// convert the time portion to 24h format
		var dateArray = dateStr.split(" ");
		var datePortion = dateArray[0];
		var timePortion = dateArray[1];
	  
		var timePortionArray = timePortion.split(":");
		var hour = timePortionArray[0] * 1;
		var minute = timePortionArray[1];
		var seconds = timePortionArray[2].substring(0, 2);
		var amPm = timePortionArray[2].substring(2).toLowerCase();
	  
		if (amPm == "pm") {
			hour += 12;
		}
	  
		var revampedTimePortion = hour + ":" + minute + ":" + seconds;
	    
		var revampedTimeZone = null;
	  
		if (timeZone == "PST") {
			revampedTimeZone = "UTC-0800";    
		} else if (timeZone == "PDT" || timeZone == "MST") {
			revampedTimeZone = "UTC-0700";
	    } else if (timeZone == "MDT" || timeZone == "CST") {
	    	revampedTimeZone = "UTC-0600";    
	    } else if (timeZone == "CDT" || timeZone == "EST") {
	    	revampedTimeZone = "UTC-0500";    
	    } else if (timeZone == "EDT" || timeZone == "AST") {    
	    	revampedTimeZone == "UTC-0400";
	    } else if (timeZone == "ADT") {    
	    	revampedTimeZone == "UTC-0300";    
	    } else if (timeZone == "NST") {    
	    	revampedTimeZone = "UTC-0330";    
	    } else if (timeZone == "NDT") {    
	    	revampedTimeZone = "UTC-0230";    
	    } else {
	    	// do nothing    
	    }
	  
		var revampedTimestamp = datePortion + " " + revampedTimePortion;
	  
		if (revampedTimeZone != null) {
			revampedTimestamp += " " + revampedTimeZone;
		}

		return Date.parse(revampedTimestamp);	  
	}
	
    /**
     * Convert from LatLng to Point.
	 * 
	 * @param latLng
	 * @param map
     */
	function fromLatLngToPoint(latLng, map) {
		var topRight = map.getProjection().fromLatLngToPoint(map.getBounds().getNorthEast());
		var bottomLeft = map.getProjection().fromLatLngToPoint(map.getBounds().getSouthWest());
		var scale = Math.pow(2, map.getZoom());
		var worldPoint = map.getProjection().fromLatLngToPoint(latLng);
		return new google.maps.Point((worldPoint.x - bottomLeft.x) * scale, (worldPoint.y - topRight.y) * scale);
	}
	
    /**
     * Calculate distance between two points
	 *
	 * @param point1
	 * @param point2
     */
	function distanceBetween(point1, point2) {
		var xDist = point1.x - point2.x;
		var yDist = point1.y - point2.y;
		return Math.sqrt(xDist * xDist + yDist * yDist);
	}
	
	/**
	 * Convert direction to heading degree.
	 *
	 * @param direction the abbreviation of a direction. It can be "N", "NE", "E", "SE", "S", "SW", "W", "NW", or empty.
	 */
	function fromDirectionToHeading(direction) {
		var mapping = {"N": "0", "NE": "45", "E": "90", "SE": "135", "S": "180", "SW": "225", "W": "270", "NW": "315"};
		return direction ? mapping[direction] : "";
	}
	
	/**
	 * Generate the IMG tag to represent the street view of a lat/lon location.
	 * The dimension is 300x100. 
	 */
	function getStreetView(lat, lng, direction) {
		return "<img class='streetview' src='http://maps.googleapis.com/maps/api/streetview?size=300x100&location=" + lat + "," + lng + "&heading=" + fromDirectionToHeading(direction) + "' />";
	}
    
	// exports
	Util.isMobile = isMobile;
    Util.toUTC = toUTC;
    Util.parseTimestampString = parseTimestampString;
	Util.fromLatLngToPoint = fromLatLngToPoint;
	Util.distanceBetween = distanceBetween;
	Util.getStreetView = getStreetView;
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