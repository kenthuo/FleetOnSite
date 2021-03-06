var LOCATE_MODE = {
	ALL: 0, // show all points for each beacon on the map
	LAST3: 1, // show the last 3 points for each beacon on the map 
	LAST: 2 // show the last point for each beacon on the map 
}
var COC_MODE = {
	LAST: 0, // show CoCs only on the last point for each beacon on the map
	ALL: 1, // show CoCs on all of points for each beacon on the map
	NONE: 2 // // show no CoC of every point for each beacon on the map
}

var TAG_GROUP = {
	LOCATION: "tg_location", // The tag for all of location markers
	COC: "tg_coc", // The tag for all of circle of certainty
	LANDMARK: "tg_landmark", // The tag for all of landmark markers
	JOB: "tg_job", // The tag for all of job markers.
	CIRCLE_ZONE: "tg_circle_zone", // The tag for all of circle zones
	RECTANGLE_ZONE: "tg_group_rectangle_zone", // The tag for all of rectangle zones
	POLYGON_ZONE: "tg_polygon_zone", // The tag for all of polygon zones
	ADDRESS: "tg_address" // The tag for all of address markers
};

var DEFAULT_ROUTE_COLOR = "#FF0000";

var ICON_HOST_PATH = "icons/";

var NUMBERS_ICON_HOST_PATH = "icons/numbers/";

var IMG_HOST_PATH = "images/";

var DEFAULT = {CENTER_COORDINATE: new google.maps.LatLng(48.16700, -100.16700), ZOOM_LEVEL: 4};

var CENTER_ICON = {url: ICON_HOST_PATH + 'crosshair.png', width: 41, height: 41}

var POLYLINE_DECORATED_ICON = {
	icon: {
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        strokeColor: 'black',
        strokeOpacity: 1.0,
        strokeWeight: 1.0,
        fillColor: 'yellow',
        fillOpacity: 1.0,
        scale: 3},
    offset: '66%'};
var POLYLINE_PLAIN_ICON = {};
var POLYLINE_DECORATED_ICON_THRESHOLD = 30; // if the distance between two markers is greater than this threshold, a decorated icon is shown in the route


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
	 * Build the source of an IMG tag to represent the street view of a lat/lon location.
	 * The dimension is 290x100. 
	 */
	function getStreetView(lat, lng, direction) {
		return "http://maps.googleapis.com/maps/api/streetview?size=290x100&location=" + lat + "," + lng + "&heading=" + fromDirectionToHeading(direction);
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

/**
 * Create a jQuery object to represent the custom control.
 *
 * @param options an object holds related properties of the control. Properties include:
 *			type: the type of the control. It can be "select", "option", "checkbox". If not specified, the default control is a regular clickable toolbar.
 *			content: text or html content in the control.
 *			id: id of the control.
 *			children: a list of html string, DOM element, jQuery objects to insert at the end of each element in the control. 
 *			styles: css styles appled to the control.
 *			title: the title of the control.
 *			classes: the css classes appled to the control.
 *			disabled: disable the control. If true, all of events won't be applied.
 *			checked: make the check checked by default. The propery has to go with "checkbox" type.
 *			events: the events applied to the control.
 * @param onClick the callback function when the click event is trigger for the control. This callback will override the click event in the options.
 * @return the jQuery object of the created control.
 */
function Control_(options) {
	var control = $("<div style='cursor: pointer;'></div>");
	var highlightElm = control[0];
	switch (options.type) {
	case "select":
		var innerContainer = $("<div class='select_dropdown'>" + (options.content ? options.content : "") + "<img class='select_arrow' src='" + IMG_HOST_PATH + "arrow-down.png" + "' /></div>");
		control.append(innerContainer);
		highlightElm = innerContainer[0];
		break;
	case "checkbox":
		var checked = options.checked  ? " show" : ""; // add show class if checked by default
		var span = $("<span class='checkbox_span' role='checkbox'><div class='checkbox_image_container" + checked + "'><img class='checkbox_image' src='" + IMG_HOST_PATH + "imgs8.png" + "' /></div></span>");
		var label = $("<label class='checkbox_label'>" + options.content + "</label>");
		control.append(span, label);
		break;
	case "option":
	default:
		if (options.content) {
			control.html(options.content);
		}
		break;
	}
	if (options.id) {
		control.attr('id', options.id);
	}          
	if (options.children) {
		_.each(options.children, function(child) {
			control.append(child);
		});
	}
	_.each(options.styles, function(style, name) {
		control.css(name, style);
	});
	if (options.title) {
		control.prop('title', options.title);
	}
	if (options.classes) {
		control.addClass(options.classes);
	}        
	if (options.type == "checkbox") {
		(function(object, name) {
			google.maps.event.addDomListener(object, name, function() {
				var selectedCheckbox = $(object).find(".checkbox_image_container");
				selectedCheckbox.is(":visible") ? selectedCheckbox.removeClass("show") : selectedCheckbox.addClass("show");
			});
		})(control[0], "click");
	}
	if (options.disabled == false) {
		(function(object, name) {
			google.maps.event.addDomListener(object, name, function() {
				$(this).css("background-color", "#EEEEEE");
			});
		})(highlightElm, "mouseover");
		(function(object, name) {
			google.maps.event.addDomListener(object, name, function() {
				$(this).css("background-color", "#FFFFFF");
			});
		})(highlightElm, "mouseout");
		
		_.each(options.events, function(event, name) {
			(function(object, name) {
				google.maps.event.addDomListener(object, name, function() {
					event.apply(this, [this]);
				});
			})(control[0], name);
		});
	} else {
		control.addClass("control_disabled");
	}
	return control;
}

function MoreControl(contigoMap) {
	var optionControls = new Control_({
        classes: "options_container",
        children: _.reduce(contigoMap.opts.controlOptions, function(memo, value, option) {
			memo.push(new window[option](contigoMap)[0]);
			return memo;
		}, [])
    })[0];
	
	return new Control_({
        id: 'more_control',
        type: "select",
        content: "More ...",
        title: "Show more control options",
        children: [optionControls],
        disabled: false,
        events: {
            click: function() {
                var optionsContainer = $("#more_control .options_container");
                optionsContainer.is(":visible")  ? optionsContainer.hide() : optionsContainer.show();          
                optionsContainer.on('mouseover', function() {
                    optionsContainer.show();
                })                
                optionsContainer.on('mouseout', function() {
                    optionsContainer.hide();
                })
            }
        }        
    });
}

function TrafficOption(contigoMap) {
	return new Control_({
        type: 'checkbox',
        content: 'Live Traffic',
        title: 'Show live traffic information',
        classes: 'select_checkbox_option',
        disabled: false,
        events: {
            click: function() {
                contigoMap.idOptionChecked(this) ? contigoMap.canvas.gmap3('trafficlayer') : contigoMap.clear({name: ['trafficlayer']});
            }
        }    
    });
}

function BestFitOption(contigoMap) {
	return new Control_({
        type: 'option',
        content: 'Best Fit',
        title: 'Best fit',
        classes: 'select_option',
        disabled: false,
        events: {
            click: function() {
                contigoMap.bestFit();
            }
        }
    });
}

function CenterMapOption(contigoMap) {
	return new Control_({
        type: 'option',
        content: 'Center Map',
        title: 'Center map',
        classes: 'select_option',
        disabled: false,
        events: {
            click: function() {
                alert('Center map');
            }            
        }
    });
}

function CenterLastOption(contigoMap) {
	return new Control_({
        type: 'checkbox',
        id: 'center_last_option',
        title: 'Center last',
        content: 'Center Last',
        classes: 'select_checkbox_option',
        disabled: false,
        events: {
            click: function() {
                contigoMap.isAutoCenteringActive = contigoMap.idOptionChecked(this);
            }       
        }
    });
}

function AutoBestFitOption(contigoMap) {
	return new Control_({
        type: 'checkbox',
        id: 'auto_best_fit_option',
        title: 'Auto best fit',
        content: 'Auto Best Fit',
        classes: 'select_checkbox_option',
        disabled: false,
        events: {
            click: function() {
                contigoMap.isAutoBestFitActive = contigoMap.idOptionChecked(this);
            }       
        }
    });
}

function DisplayItemStateOption(contigoMap) {
	return new Control_({
        type: 'checkbox',
        id: 'display_item_state_option',
        title: 'Display item state',
        content: 'Display Item State',
        classes: 'select_checkbox_option',
        disabled: false,
        checked: true,
        events: {
            click: function() {		
                contigoMap.enableItemState(contigoMap.idOptionChecked(this));
            }       
        }
    });
}

function LocateOption(contigoMap) {
	return new Control_({
        classes: "options_container",
        children: [
			new Control_({
				classes: "option_separator"
			}),
            new Control_({
				type: 'option',
				id: 'show_all_points_option',
				title: 'Show Locates For All Points',
				content: 'All Points',
				classes: 'select_option',
				disabled: false,
				events: {
					click: function() {		
						contigoMap.filterLocatePoints(LOCATE_MODE.ALL);
					}       
				}
			}),
            new Control_({
				type: 'option',
				id: 'show_last3_points_option',
				title: 'Show Locates For Last 3 Points',
				content: 'Last 3 Points',
				classes: 'select_option',
				disabled: false,
				events: {
					click: function() {		
						contigoMap.filterLocatePoints(LOCATE_MODE.LAST3);
					}       
				}
			}),
            new Control_({
				type: 'option',
				id: 'show_last_point_option',
				title: 'Show Locates For Last Point',
				content: 'Last Point',
				classes: 'select_option',
				disabled: false,
				events: {
					click: function() {		
						contigoMap.filterLocatePoints(LOCATE_MODE.LAST);
					}       
				}
			})			
        ]    
    });
}

function CoCOption(contigoMap) {
	return new Control_({
        classes: "options_container",
        children: [
			new Control_({
				classes: "option_separator"
			}),
            new Control_({
				type: 'option',
				id: 'show_coc_on_all_points_option',
				title: 'Show Circles of Certainty On All Points',
				content: 'CoC On All Points',
				classes: 'select_option',
				disabled: false,
				events: {
					click: function() {
						contigoMap.filterCoCs(COC_MODE.ALL);
					}       
				}
			}),
            new Control_({
				type: 'option',
				id: 'show_coc_on_most_recent_point_option',
				title: 'Show Circles of Certainty On Most Recent Point',
				content: 'CoC On Most Recent Point',
				classes: 'select_option',
				disabled: false,
				events: {
					click: function() {
						contigoMap.filterCoCs(COC_MODE.LAST);
					}       
				}
			}),
            new Control_({
				type: 'option',
				id: 'hide_coc_on_all_points_option',
				title: 'Hide Circles of Certainty On All Points',
				content: 'Hide All CoC',
				classes: 'select_option',
				disabled: false,
				events: {
					click: function() {		
						contigoMap.filterCoCs(COC_MODE.NONE);
					}       
				}
			})			
        ]    
    });
}

function TabularDataOption(contigoMap) {
	return new Control_({
        type: 'checkbox',
        id: 'tabular_data_option',
        title: 'Show tabular data',
        content: 'Tabular Data',
        classes: 'select_checkbox_option',
        disabled: false,
        events: {
            click: function() {
                contigoMap.isTabularDataActive = contigoMap.idOptionChecked(this);
                if (contigoMap.isTabularDataActive) {
					var template = $("script.tabular_data_template").html();
                    contigoMap.canvas.gmap3({
                        panel: {
                            options: {
                                content: template,
                                bottom: true,
                                left: true
                            },
                            callback: function(panel) {
                                $(panel).css({width: '100%', height: '200px', bottom: '0px', top: ''});                                
                                contigoMap.canvas.gmap3({
                                    get: {
                                        tag: TAG_GROUP.LOCATION,
                                        all: true,
                                        full: true,
                                        callback: function(markers) {                                            
                                            _.templateSettings.variable = "rc";
											var compiled = _.template($("script.tabs_location_template").html());
											$( "#tabs_location" ).append(
												compiled({locationTab: $("#tabs_location"), markers: markers})
											);                                           
                                        }
                                    }
                                });
                                contigoMap.canvas.gmap3({
                                    get: {
                                        tag: TAG_GROUP.LANDMARK,
                                        all: true,
                                        full: true,
                                        callback: function(landmarks) {
											// When rending an underscore template, we want top-level
											// variables to be referenced as part of an object. For
											// technical reasons (scope-chain search), this speeds up
											// rendering; however, more importantly, this also allows our
											// templates to look / feel more like our server-side
											// templates that use the rc (Request Context / Colletion) in
											// order to render their markup.
											_.templateSettings.variable = "rc";
											var compiled = _.template($("script.tabs_landmark_template").html());
											$( "#tabs_landmark" ).append(
												compiled({landmarkTab: $("#tabs_landmark"), landmarks: landmarks})
											);
                                        }
                                    }
                                });
                                contigoMap.canvas.gmap3({
                                    get: {
                                        tag: TAG_GROUP.JOB,
                                        all: true,
                                        full: true,
                                        callback: function(jobs) {
                                            _.templateSettings.variable = "rc";
											var compiled = _.template($("script.tabs_job_template").html());
											$( "#tabs_job" ).append(
												compiled({jobTab: $("#tabs_job"), jobs: jobs})
											); 
                                        }
                                    }
                                });
                                $("#tabs").tabs();
                            }
                        }                        
                    })
                } else {
                    contigoMap.clear({name: 'panel'});
                }
            }       
        }
    });
}