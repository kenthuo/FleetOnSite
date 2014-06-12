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


// extending the TileMap
(function(){
	var PROTO = MQA.TileMap.prototype;
	function zoomIn() {
		var zoom = this.getZoomLevel();
		if (zoom < 16) this.setZoomLevel(zoom+1);
	};
	function zoomOut() {
		var zoom = this.getZoomLevel();
		if (zoom > 1) this.setZoomLevel(zoom-1);
	};
	// exports
	PROTO.zoomIn = zoomIn;
	PROTO.zoomOut = zoomOut;
})();
// extending the LatLng
(function(){
	var PROTO = MQA.LatLng.prototype,
		EARTH_MEAN_RADIUS_KM = 6371,
		EARTH_MEAN_RADIUS = EARTH_MEAN_RADIUS_KM * 1000,
		R2D = 180 / Math.PI,
		D2R = Math.PI / 180,
		ROUNDER = function(number) { return Math.round(number * 100000) / 100000 };

	function toString() { return ROUNDER(this.lat) + "," + ROUNDER(this.lng) };
	function copy() { return new MQA.LatLng(this.lat, this.lng) };
	function equals(latLng) {
		if (!latLng || isNaN(latLng.lat) || isNaN(latLng.lng)) return false;
		return this.distanceFrom(latLng) < 0.3;
	};
	/**
	 * Get the distance in meters between this MQA.LatLng object and the other MQA.LatLng object in Great Circle.
	 * @param latLng a given MQA.LatLng
	 * @return the distance in meters between two locations in Great Circle
	 */
	function distanceFrom(latLng) {
		if (!latLng || isNaN(latLng.lat) || isNaN(latLng.lng)) return NaN;
		//distance = EquatorialRadius * arccos[sin(lat1/RadiansToDegrees) * sin(lat2/RadiansToDegrees) + cos(lat1/RadiansToDegrees) * cos(lat2/RadiansToDegrees) *  cos(lon2/RadiansToDegrees -lon1/RadiansToDegrees)]
		var lat = Math.sin(this.lat / R2D) * Math.sin(latLng.lat / R2D), 
			lng = Math.cos(this.lat / R2D) * Math.cos(latLng.lat / R2D) * Math.cos((latLng.lng / R2D) - (this.lng / R2D));
		return EARTH_MEAN_RADIUS * Math.acos(lat + lng);
	};
	/**
	 * Get the coordinate of destination by given a distance in meters and bearing.
	 *
	 * @param metres
	 * @param degrees
	 */
	function distanceShift(metres, degrees) {
		var latLng = this.copy();
		if (!isNaN(metres) && metres) {
			degrees = isNaN(degrees) ? 0 : parseFloat(degrees) - 90;
			var lat = (metres / EARTH_MEAN_RADIUS) * R2D, 
			lng = lat / Math.cos(this.lat * D2R);
			latLng.lat += lat * Math.sin(degrees * D2R);
			latLng.lng += lng * Math.cos(degrees * D2R);
		};
		return latLng;
	};
  	/**
     * Calculates the destination coordinate, based on an initial bearing and 
     * distance (in km).
     *
     * @param distance The distance to the destination, in kilometres
     * @param bearing A number, in radians, indicating the initial bearing.
     *
     * @return The destination MQA.LatLng, or null if the calculated lat or lng
     *         for the destination is NaN.
     *
     * This method is adapted from the "destPoint" method by Chris Veness 
     * (copyright 2002-2007) at: 
     * http://www.movable-type.co.uk/scripts/latlong.html.
     */
  	function destPoint(distance, bearing) {  	  
		var startLat = this.lat * D2R;
		var startLng = this.lng * D2R;  	  
		var d = distance / EARTH_MEAN_RADIUS_KM;  	  
		var destLat = Math.asin(Math.sin(startLat) * Math.cos(d) + Math.cos(startLat) * Math.sin(d) * Math.cos(bearing));  	            
		var destLng = startLng + Math.atan2(Math.sin(bearing) * Math.sin(d) * Math.cos(startLat), Math.cos(d) - Math.sin(startLat) * Math.sin(destLat));  	    
		if (isNaN(destLat) || isNaN(destLng)) {
			return null;
		}  	  
		return new MQA.LatLng(destLat * R2D, destLng * R2D);  	  
  	}
	/**
	 * Get a MQA.LatLng which is exactly the middle point between this MQA.LatLng and the given MQA.LatLng.
	 * @param latLng a given MQA.LatLng
	 * @return a MQA.LatLng
	 */
	function midPoint(latLng) {
		var lat1 = this.lat * D2R,
			lng1 = this.lng * D2R,
			lat2 = latLng.lat * D2R,
			dLng = (latLng.lng - this.lng) * D2R,
			bx = Math.cos(lat2) * Math.cos(dLng),
			by = Math.cos(lat2) * Math.sin(dLng),
			lat3 = Math.atan2(Math.sin(lat1) + Math.sin(lat2), Math.sqrt((Math.cos(lat1) + bx) * (Math.cos(lat1) + bx) + by * by)),
			lng3 = lng1 + Math.atan2(by, Math.cos(lat1) + bx);
		return new MQA.LatLng(lat3 * R2D, lng3 * R2D);
	};   
	/**
	 * Get the lat/lng of the destination by given a lat/lng, distance in m, and heading in radians.
	 * 
	 * @param dist in meter
	 * @param tc heading in radians
	 * @returns a Coordinate object
	 * 
	 * @see http://jamesmccaffrey.wordpress.com/2011/04/01/determining-latitude-longitude-given-a-point-a-direction-and-a-distance/
	 */
	function latLonOf(dist, tc) {
		// given a point latLon, a distance (in m),
		// and a direction in true course,
		// return the Coordinate
		// see http://mathforum.org/library/drmath/view/51816.html for the math
		var lat = this.lat * D2R; // in radians
		var lon = this.lng * D2R; // in radians
		var d = dist / EARTH_MEAN_RADIUS; // convert dist to arc radians

		var resultLat, resultLon;
		resultLat = Math.asin(Math.sin(lat) * Math.cos(d) + Math.cos(lat) * Math.sin(d) * Math.cos(tc));
		var dlon = Math.atan2(Math.sin(tc) * Math.sin(d) * Math.cos(lat), Math.cos(d) - Math.sin(lat) * Math.sin(lat));
		resultLon = ((lon + dlon + Math.PI) % (2 * Math.PI)) - Math.PI;

		resultLat = resultLat * R2D; // back to degrees
		resultLon = resultLon * R2D;
		return new MQA.LatLng(resultLat, resultLon);
	};
	// exports
	PROTO.toString = toString;
	PROTO.copy = copy;
	PROTO.equals = equals;
	PROTO.distanceFrom = distanceFrom;
	PROTO.distanceShift = distanceShift;
	PROTO.destPoint = destPoint;
	PROTO.midPoint = midPoint;
	PROTO.latLonOf = latLonOf;
})();

function ContigoUtil() {
}

// extending the ContigoUtil
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
	// exports
	ContigoUtil.isMobile = isMobile;
})();

function ContigoMapUtil() {
}

// extending the ContigoMapUtil
(function(){
	/**
	 * Determines the intersection point of the line segment defined by points A and B
	 * with the line segment defined by points C and D.
	 *
	 * Returns TRUE if the intersection point was found
	 * Returns FALSE if there is no determinable intersection point
	 *
	 * Details: http://alienryderflex.com/intersect/
	 * 
	 */
	function detectIntersection(Ax, Ay, Bx, By, Cx, Cy, Dx, Dy) {
		var distAB = 0;
		var theCos = 0;
		var theSin = 0;
		var newX = 0;
		var ABpos = 0;
		var slope1 = 0;
		var slope2 = 0;
		
		// Fail if either line is underfined.
		if (Ax == Bx && Ay == By || Cx == Dx && Cy == Dy) {
			return false;
		}
		
		//  Fail if the segments share an end-point.
		if ((Ax == Cx && Ay == Cy) || (Bx == Cx && By == Cy) || (Ax == Dx && Ay == Dy) || (Bx == Dx && By == Dy)) {
			// if the 2 lines collide each other => should treat it as intersect as MTGU may not support
			// check for the slope of 2 lines
			slope1 = (By - Ay) / (Bx - Ax);
			slope2 = (Dy - Cy) / (Dx - Cx);
			
			if (slope1 == slope2) {			
				if (Ax == Cx && Ay == Cy) {
					if ((Ax >= Dx && Ax <= Bx) || (Ax >= Bx && Ax <= Dx)) {
						//lines are not overlapping each other
						return false;
					} else {
						//lines are overlapping each other
						return true;
					}
				}
		
				if (Bx == Cx && By == Cy) {
					if ((Bx >= Dx && Bx <= Ax) || (Bx >= Ax && Bx <= Dx)) {
						//lines are not overlapping each other
						return false;
					} else {
						//lines are overlapping each other
						return true;
					}
				}
		
				if (Ax == Dx && Ay == Dy) {
					if ((Ax >= Cx && Ax <= Bx) || (Ax >= Bx && Ax <= Cx)) {
						//lines are not overlapping each other
						return false;
					} else {
						//lines are overlapping each other
						return true;
					}
				}
				
				if (Bx == Dx && By == Dy) {
					if ((Bx >= Cx && Bx <= Ax) || (Bx >= Ax && Bx <= Cx)) {
						//lines are not overlapping each other
						return false;
					} else {
						//lines are overlapping each other
						return true;
					}
				}				
			}
		
			return false; 
		}
		
		//  (1) Translate the system so that point A is on the origin.
		Bx -= Ax; 
		By -= Ay;
		Cx -= Ax; 
		Cy -= Ay;
		Dx -= Ax; 
		Dy -= Ay;
		
		//  Discover the length of segment A-B.
		distAB = Math.sqrt(Bx * Bx + By * By);
		
		//  (2) Rotate the system so that point B is on the positive X axis.
		theCos = Bx / distAB;
		theSin = By / distAB;
		newX = Cx * theCos + Cy * theSin;
		Cy = Cy * theCos - Cx * theSin; 
		Cx = newX;
		newX = Dx * theCos + Dy * theSin;
		Dy = Dy * theCos - Dx * theSin; 
		Dx = newX;
		
		//  Fail if segment C-D doesn't cross line A-B.
		if (Cy < 0 && Dy < 0 || Cy > 0 && Dy > 0) {
			return false;
		}
		
		//  if the lines are parallel.
		if (Cy == Dy) {
			//if either Cx or Dx between Ax and Bx, the 2 lines are overlapping each other => return true
			if (((0 <= Cx) && (Cx <= Bx) || (0 >= Cx) && (Cx >= Bx)) || ((0 <= Dx) && (Dx <= Bx) || (0 >= Dx) && (Dx >= Bx)) ) {
				return true;
			}
		
			return false;
		}
		
		//  (3) Discover the position of the intersection point along line A-B.
		ABpos = Dx + (Cx - Dx) * Dy / (Dy - Cy);
		
		//  Fail if segment C-D crosses line A-B outside of segment A-B.
		if ((ABpos < 0) || (ABpos > distAB)) {
			return false;
		}
		
		return true;
	};
	/**
	 * Check if the current line segment intersect with the previous line segments 
	 * (from all the previous point)
	 * 
	 * @param boundingBox an array of lat/lng collection, e.g. [{lat:lat1, lng:lng1}, {lat:lat2, lng:lng2}, ...]
	 * @param isLastPt
	 * @return true if intersect, otherwise false
	 */
	function checkIntersection(boundingBox, isLastPt) {
		var result = false;
		if (boundingBox.length > 2) {
			var lastPtA = boundingBox[boundingBox.length - 1];
			var lastPtB;
			
			if (isLastPt) {
				// this is end point
				// the current line segment is from end point to first point
				lastPtB = boundingBox[0];					
			} else {
				// the current line segment is from current point to previous point
				lastPtB = boundingBox[boundingBox.length - 2];	 
			}
			
			//var lastPtE:LatLng = boundingBox[0];
			for (var j = (boundingBox.length - 2); j >= 1; j--) {
				// get the next line segment to check against
				var currentPtC = boundingBox[j]; 
				var currentPtD = boundingBox[j - 1];
				
				if (ContigoMapUtil.detectIntersection(lastPtA.lat, lastPtA.lng, lastPtB.lat, lastPtB.lng, currentPtC.lat, currentPtC.lng, currentPtD.lat, currentPtD.lng)){
					//Alert("Find intersection point 1  !!!!!");
					result = true;
					break;
				}				
			}
		}
		return result;
	}
	
	/**
	 * Check if the 2 line segments generated (last point with first point, 
	 * last point with 2nd last point) by the last point of the zone intersect 
	 * with the rest of the line segments.
	 * 
	 * @param boundingBox an array of lat/lng collection, e.g. [{lat:lat1, lng:lng1}, {lat:lat2, lng:lng2}, ...]
	 * @return true if intersect, otherwise false
	 */		 
	function checkLastPointIntersection(boundingBox) {
		var result = false;
		if (ContigoMapUtil.checkIntersection(boundingBox, false)) {
			// the line segment (last point with 2nd last point) has intersection with other line segment of the zone
			result = true;
		} else if (ContigoMapUtil.checkIntersection(boundingBox, true)) {
			// the line segment (last point with first point) has intersection with other line segment of the zone
			result = true;
		}		
		return result;
	}
	
	/**
	 * Check if a given vertex will make a polygon be a self-intersecting polygon. 
	 * 
	 * @param boundingBox an array of lat/lng collection, e.g. [{lat:lat1, lng:lng1}, {lat:lat2, lng:lng2}, ...]
	 * @param key the number of vertex
	 * @return true if the polygon is a self-intersecting polygon, otherwise false
	 */
	function isSelfIntersectingPolygon(boundingBox, key) {
		var result = false
		if (boundingBox.length > 2) {
			// there should be two line segments associated with a vertex
			var lineSegment1Start = boundingBox[key];
			var nextKey = parseInt(key) + 1;
			if (nextKey == boundingBox.length) {
				nextKey = 0;
			}			
			var lineSegment1End = boundingBox[nextKey];
			// check line segment 1
			if (ContigoMapUtil.checkIntersectionHelper(boundingBox, lineSegment1Start, lineSegment1End)) {
				result = true;
			} else {			
				var prevKey = boundingBox.length - 1;
				if (key > 0) {
					prevKey = key - 1;
				}
				var lineSegment2End = boundingBox[prevKey];
				// check line segment 2
				result = ContigoMapUtil.checkIntersectionHelper(boundingBox, lineSegment2End, lineSegment1Start);
			}
		}
		return result;
	}
	
	/**
	 * check intersection helper function
	 *
	 * @param boundingBox an array of lat/lng collection, e.g. [{lat:lat1, lng:lng1}, {lat:lat2, lng:lng2}, ...]
	 * @param lastPtA
	 * @param lastPtB
	 */
	function checkIntersectionHelper(boundingBox, lastPtA, lastPtB) {
		var result = false;
		// check line segment 1
		var bbLength = boundingBox.length;
		if (bbLength > 2) {
			for (var i = 0; i < bbLength; i++) {
				// get the next line segment to check against
				var currentPtC = boundingBox[i];				
				var nextKey = i + 1;
				if (nextKey == bbLength) {
					nextKey = 0; 
				}
				var currentPtD = boundingBox[nextKey];
				// test only if not same line segment
				if (!((lastPtA.lat == currentPtC.lat) && (lastPtA.lng == currentPtC.lng)) && !((lastPtA.lat == currentPtD.lat) && (lastPtA.lng == currentPtD.lng))){
					if (ContigoMapUtil.detectIntersection(lastPtA.lat, lastPtA.lng, lastPtB.lat, lastPtB.lng, currentPtC.lat, currentPtC.lng, currentPtD.lat, currentPtD.lng)) {
						result = true;
						break;
					}
				}
			}
		}
		
		return result;					
	}
	
	/**
	 * Convert an array of MQA.LatLng objects to an array of numbers 
	 * from the collection of lat and lng values of MQA.LatLng object.
	 *
	 * @param latLngs
	 */
	function flattenLatLngs(latLngs) {
		var array = [];
		for (var i = 0, len = latLngs.length; i < len; i++) {
			array.push(latLngs[i].lat, latLngs[i].lng);
		}	
		return array;
	}
	
	/**
	 * Convert an array of numbers to an array of MQA.LatLng objects.
	 *
	 * @param numberArray
	 */
	function groupLatLngs(numberArray) {
		var latLngs = [];
		var j = 0;
		for (var i = 0, szArray = numberArray.length; i < szArray; i += 2) {
			latLngs[j] = new MQA.LatLng(numberArray[i], numberArray[i + 1]);
			j++;
		}
		return latLngs;
	}
	
	/**
	 * A helper function to get the middle point between two points
	 *
	 * @param latLng1
	 * @param latLng2
	 */
	function getMidPoint(latLng1, latLng2) {
		var mp = null;
		if (latLng1 && latLng2 && (latLng1 instanceof MQA.LatLng) && (latLng2 instanceof MQA.LatLng)) {
			mp = latLng1.midPoint(latLng2);
		}
		return mp;
	}
	
	// exports
	ContigoMapUtil.detectIntersection = detectIntersection;
	ContigoMapUtil.checkIntersection = checkIntersection;
	ContigoMapUtil.checkLastPointIntersection = checkLastPointIntersection;
	ContigoMapUtil.checkIntersectionHelper = checkIntersectionHelper;
	ContigoMapUtil.isSelfIntersectingPolygon = isSelfIntersectingPolygon;
	ContigoMapUtil.flattenLatLngs = flattenLatLngs;
	ContigoMapUtil.groupLatLngs = groupLatLngs;
	ContigoMapUtil.getMidPoint = getMidPoint;
})();
