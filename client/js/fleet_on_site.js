/**
 * Constant indicating the current filter mode for beacon locate points is
 * set to show all.
 */
var LOCATES_SHOW_ALL = "locates_all";
/**
 * Constant indicating the current filter mode for beacon locate points is
 * set to show only the three most recent points.
 */
var LOCATES_SHOW_LAST_THREE = "locates_show_last_three";
/**
 * Constant indicating the current filter mode for beacon locate points is
 * set to show only the most recent point.
 */
var LOCATES_SHOW_LAST = "locates_show_last";
/**
 * Constant indicating that the current CoC filter mode is set show CoCs
 * only on the last point for each beacon on the map.
 */
var COC_SHOW_LAST = "coc_show_last";
/**
 * Constant indicating that the current CoC filter mode is set show CoCs
 * for all points on the map.
 */
var COC_SHOW_ALL = "coc_show_all";
/**
 * Constant indicating that the current CoC filter mode is set show no CoCs
 * on the map.
 */
var COC_SHOW_NONE = "coc_show_none";
/**
 * The tag for all of location markers.
 */
var TAG_GROUP_LOCATION = "group_location";
/**
 * The tag for all of circle of certainty.
 */
var TAG_GROUP_COC = "group_coc";

var DEFAULT_ROUTE_COLOR = "#FF0000";

var ICON_HOST_PATH = "icons/";

var NUMBERS_ICON_HOST_PATH = "icons/numbers/";

var IMG_HOST_PATH = "images/";

function ContigoMap() {
    this.map = null;
    this.contextMenu = null;
    this.current = null; // current click event (used to save as start / end position)
    this.isMetric = false;
    this.currentLocateFilterMode = LOCATES_SHOW_ALL;
    this.currentCocMode = COC_SHOW_ALL;
    this.m1 = null;
    this.m2 = null;
}

ContigoMap.prototype = {
	/**
	 * Initialize and show the map with the default central position and zoom level, and
	 * also initialize the context menu.
	 */
	init: function() {
		var that = this;
		this.map = $('#map');
		this.contextMenu = new Gmap3Menu(this.map);
		this.initContextMenu();
        this.map.gmap3({
            defaults:{ 
                classes:{
                    Marker: MarkerWithLabel
                }
            },
            map: {
                options: {
                    center: [48.16700, -100.16700],
                    zoom: 3,
                    mapTypeId: google.maps.MapTypeId.ROADMAP,
                    mapTypeControl: true,
                    mapTypeControlOptions: {
                        style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
                    },
                    navigationControl: true,
                    scrollwheel: true,
                    streetViewControl: true
                },
                events:{
                	rightclick: function(map, event) {
						that.current = event;
						that.contextMenu.open(that.current);
					},
					click: function() {
						that.contextMenu.close();
					},
					dragstart: function() {
						that.contextMenu.close();
					},
					zoom_changed: function() {
						that.contextMenu.close();
					}
				}
            }
        });
        this.initCentralMap();

	},
	
	/**
	 * Add menu item to the context menu.
	 */
	initContextMenu: function() {
		var that = this;
        this.contextMenu.add("Clear Markers", "clearMarker separator", 
            function(){
                that.clear(["marker", "circle", "polyline"]);
                that.contextMenu.close();
            });
		this.contextMenu.add("Zoom in", "zoomIn", 
			function() {
				var map = that.map.gmap3("get");
				map.setZoom(map.getZoom() + 1);
				that.contextMenu.close();
			});
		that.contextMenu.add("Zoom out", "zoomOut",
			function() {
				var map = that.map.gmap3("get");
				map.setZoom(map.getZoom() - 1);
				that.contextMenu.close();
			});
		this.contextMenu.add("Center here", "centerHere", 
			function() {
				that.map.gmap3("get").setCenter(that.current.latLng);
				that.contextMenu.close();
			});
	},
	
	/**
	 * Show a cross-hair image to represent the center of the map.
	 */
	initCentralMap: function() {
        var marker = new google.maps.Marker({
			map: this.map.gmap3("get"),
			 icon: new google.maps.MarkerImage(
			 	ICON_HOST_PATH + 'crosshair.png', 
			 	null, 
			 	null, 
			 	new google.maps.Point(20, 20)), // crosshair.png is 41x41
			shape: {coords: [0,0,0,0], type: 'rect'}
		});
		marker.bindTo('position', this.map.gmap3("get"), 'center');
	},
    
    /**
     * Sends points to be displayed on the map.
     *
     * @param poiCollection A JSON string of the ContigoPoiCollection 
     *                      containing the data for the points to be shown on 
     *                      the map.
     */    
    sendPoints: function(poiCollection) {
        this.refreshMap(poiCollection);
    },
    
    refreshMap: function(poiCollection) {
        var landmarks = poiCollection.landmarks;
	    var beaconItems = poiCollection.beaconItems;
	    var jobCollection = poiCollection.jobs;    
	    var measurementUnit = poiCollection.measurementUnit;
	    this.isMetric = (measurementUnit && measurementUnit.toLowerCase() == "m") ? true : false;
        
        var locationPois = this.buildLocationPois(beaconItems, this.isMetric);
	    //var landmarkMarkers = this.buildLandmarkMarkers(landmarks, this.isMetric);
	    //var jobMarkers = this.buildJobMarkers(jobCollection, this.isMetric);
	    var mapObjects = {};
	    if (locationPois.marker.length) {
	    	mapObjects["marker"] = {
                values: locationPois.marker,
                options:{
                    draggable: false
                },
                events:{
                	click: function(marker, event, context){
						var map = $(this).gmap3("get"),
            			infowindow = $(this).gmap3({get:{name:"infowindow"}});
            			if (infowindow){
              				infowindow.open(map, marker);
              				infowindow.setContent(context.data);
            			} else {
              				$(this).gmap3({
                				infowindow:{
                  					anchor:marker,
                  					options:{content: context.data}
                				}
              				});
              			}
            		}
            		/*,
                    mouseover: function(marker, event, context){
                        var map = $(this).gmap3("get"),
                        infowindow = $(this).gmap3({get:{name:"infowindow"}});
                        if (infowindow){
                            infowindow.open(map, marker);
                            infowindow.setContent(context.tag[0]);
                        } else {
                            $(this).gmap3({
                                infowindow:{
                                    anchor:marker, 
                                    options:{content: context.tag[0]}
                                }
                            });
                        }
                    },
                    mouseout: function(){
                        var infowindow = $(this).gmap3({get:{name:"infowindow"}});
                        if (infowindow){
                            infowindow.close();
                        }
                    }*/
                }
            }
	    }
	    
	    if (locationPois.coc.length > 0) {
	    	mapObjects["circle"] = {
	    		values: locationPois.coc
	    	}
	    }
	    
	    if (locationPois.route.length > 0) {
	    	mapObjects["polyline"] = {
	    		options: {
						strokeColor: DEFAULT_ROUTE_COLOR,
						strokeOpacity: 1.0,
						strokeWeight: 1,
						path: locationPois.route
					}
	    	}
	    }
	    
        this.map.gmap3(mapObjects, "autofit");
    },
    	/**
	 * Convert from a list of contigo's location poi objects into marker and circle objects.
	 * 
	 * @param beaconItems a list of beacon items
	 * @param is metric system applied
	 * 
	 * @returns a list of definition of location markers and a list of definition of CoCs (circle of certainty)
	 */
	buildLocationPois : function(beaconItems, isMetric) {
		var self = this;
	    var markers = new Array();
        var cocs = new Array();
        var routes = new Array();
	    for (var x in beaconItems) {
	        //var beaconId = x; // 3994
	        var locatePoints = beaconItems[x].locatePoints;
	        var isPointsConnected = beaconItems[x].isPointsConnected;
	        var showInputOutputColor = beaconItems[x].showInputOutputColor;
	        var szLocatePoints = locatePoints.length;
	        var initialIndex = 0;
	        var lastIndex = szLocatePoints;
	        
	        // determine the starting and ending index to display location points
	        if (szLocatePoints > 0) {
		        var minNetworkTs = Util.toUTC(locatePoints[0]['timestamp']);
                var maxNetworkTs = Util.toUTC(locatePoints[szLocatePoints - 1]['timestamp']);
                var isDescOrder = (minNetworkTs > maxNetworkTs);
                if (isDescOrder) {
                    locatePoints = locatePoints.reverse();
                }
		        initialIndex = this.determineInitialIndex(locatePoints);
	        }
	        
	        for (var i = initialIndex; i < szLocatePoints; i++) {
	        	var currentPoint = locatePoints[i];
	            var icon = currentPoint.icon;
	            var label = currentPoint.label;
	            var coord = currentPoint.coord;
	            var eventType = currentPoint.eventType;
	            var address = currentPoint.address;
	            var stopDuration = currentPoint.stopDuration;
	            var speed = currentPoint.speed;
	            var direction = currentPoint.direction;
	            var timestamp = currentPoint.timestamp;
	            var landmark = currentPoint.landmark;
	            var circleCertaintyRadius = currentPoint.circleCertaintyRadius;
	            var status = currentPoint.status;
	            var userNote = currentPoint.userNote;
	            var driverID = currentPoint.driverID;
	            var driverStatus = currentPoint.driverStatus;
	            var beaconID = currentPoint.beaconID;
	            var guardianID = currentPoint.guardianID;
	            var ioprt1Scenario = currentPoint.ioprt1Scenario;
	            var ioprt2Scenario = currentPoint.ioprt2Scenario;
	            var lineColor = currentPoint.lineColor;
	            var numberLabel = currentPoint.numberLabel;
				var dispatch = currentPoint.dispatch;

	            if (label) {
	            	var infoContent = this.buildLocationInfoWindowContents(
		                            label, coord, eventType, address, stopDuration, speed, 
		                            direction, timestamp, landmark, circleCertaintyRadius, 
		                            status, userNote, driverID, driverStatus, beaconID,
		                            guardianID, ioprt1Scenario, ioprt2Scenario, lineColor, 
		                            dispatch, isMetric);
                    var marker = {
                    	tag: [label, TAG_GROUP_LOCATION],
                        latLng: [coord.lat, coord.lng], 
                        data: infoContent, 
                        options: {
                            icon: this.constructMarkerIconName(icon, numberLabel),
                            labelAnchor: new google.maps.Point(10, -2),
                            labelClass: "labels",
                            labelStyle: {opacity: 0.75},
                            labelContent: label}};
		            markers.push(marker);
	            }
                circleCertaintyRadius = parseInt(circleCertaintyRadius, 10);
                if (circleCertaintyRadius > 0) {
                    if (this.currentCocMode == COC_SHOW_ALL || this.currentCocMode == COC_SHOW_LAST && i == szLocatePoints - 1) {
                        var circle = {
                            tag: [TAG_GROUP_COC],
                            options: {
                                center: [coord.lat, coord.lng],
                                radius : parseInt(circleCertaintyRadius, 10),
                                fillColor : "#C80000",
                                strokeWeight: 1,
                                strokeColor : "#F00000"}};
                        cocs.push(circle);
	        		}
                }
                
                if (isPointsConnected) {
                	routes.push([coord.lat, coord.lng]);
                }
	        } // for (var i = 0; i < szLocatePoints; i++)

	    } // for (var x in beaconItems)
	    return {"marker": markers, "coc": cocs, "route": routes};
	},
    
	/**
	 * Get icon name for marker 
	 * 
	 * @param customIcon
	 * @param numberLabel
	 * @returns
	 */
	constructMarkerIconName : function(icon, numberLabel) {
		 
		 var iconName = ICON_HOST_PATH + "blank.png";
		 if (icon) {
			if (numberLabel && numberLabel > 0) {
				iconName = NUMBERS_ICON_HOST_PATH + icon.name + "-" + numberLabel + ".png";
			} else {
				iconName = ICON_HOST_PATH + icon.name + ".png";        		
			}
		 }
		 
		 return iconName;
	},  
	
		/**
	 * Construct the content of InfoWindow for each location Poi object.
	 * 
	 * @returns string the content of InfoWindow
	 */
	buildLocationInfoWindowContents : function(
	                label, coord, eventType, address, stopDuration, speed, direction, timestamp, landmark,
	                circleCertaintyRadius, status, userNote, driverID, driverStatus, beaconID,
	                guardianID, ioprt1Scenario, ioprt2Scenario, lineColor, dispatch, isMetric) {

	    var infoContent = "<div class='marker_infowindow'>";
	    infoContent += "<div class='marker_infowindow_title'>" + label + "</div>";
		infoContent += "<div class='event_time'>";
	    infoContent += this.createMarkerInfoWindowPara(timestamp);

	    infoContent += (speed) ? this.createMarkerInfoWindowPara(speed + " " + direction) : "";
		infoContent += "</div>";
	    infoContent += "<div class='event_location'>";
	    infoContent += this.createMarkerInfoWindowPara(address.street);

	    var secondAddressLine = "";
	    var city = address.city;
	    var county = address.county;
	    var stateProvince = address.state;
	    secondAddressLine += (city) ? city : "";
	    secondAddressLine += (county) ? ((secondAddressLine) ? ", " + county : county) : "";
	    secondAddressLine += (stateProvince) ? ((secondAddressLine) ? ", " + stateProvince : stateProvince) : "";
	    secondAddressLine += " " + address.postalCode;
	    infoContent += this.createMarkerInfoWindowPara(secondAddressLine);

	    infoContent += this.createMarkerInfoWindowPara(address.country);
	    infoContent += (stopDuration) ? this.createMarkerInfoWindowPara(stopDuration) : "";

        if (!isMetric) {
            var cocValueFeet = Math.round(circleCertaintyRadius) * 3.2808399;
            infoContent += (cocValueFeet > 0) ? this.createMarkerInfoWindowPara(cocValueFeet + " ft accuracy (radius)") : "";
        } else {
            var cocValueMetres = circleCertaintyRadius;
            infoContent += (cocValueMetres > 0) ? this.createMarkerInfoWindowPara(cocValueMetres + " m accuracy (radius)") : "";
        }

	    infoContent += (coord && this.latLonDisplayed) ? this.createMarkerInfoWindowPara("Lat/Long: (" + coord.lat + ", " + coord.lng + ")") : "";
	    infoContent += (eventType) ? this.createMarkerInfoWindowPara("Event Type: " + eventType) : "";
	    infoContent += (landmark) ? this.createMarkerInfoWindowPara("Landmark: " + landmark) : "";
	    infoContent += "</div>";

		
	    infoContent += "</div>";
		return infoContent;
	},
	
	/**
	 * Construct a paragraph for the content of InfoWindow of Parker object.
	 * 
	 * @param paragraph
	 * @returns string the decorated paragraph
	 */
	createMarkerInfoWindowPara : function(paragraph) {
	    return "<p>" + paragraph + "</p>";
	},
    
	/**
	 * Determines the initial index to start putting locate points for a 
	 * particular beacon, based on the current activated locate filter.
	 *
	 * @param locatePoints  The array of locate points.
	 *
	 * @return  Returns the index at which to start.
	 */
	determineInitialIndex : function(locatePoints) {
	    var initialIndex = 0;
	    var szLocatePoints = locatePoints.length;

	    if (this.currentLocateFilterMode == LOCATES_SHOW_LAST_THREE) {
	        if (szLocatePoints > 2) {
           	 	initialIndex = szLocatePoints - 3;
	        }
	    } else if (this.currentLocateFilterMode == LOCATES_SHOW_LAST) {
	        if (szLocatePoints > 0) {
	            initialIndex = szLocatePoints - 1;
	        }
	    }

	    return initialIndex;
	},
    
    /**
     * Clear objects in the groups on the map.
     *
     * @param groups a list of groups
     */
    clear : function(groups) {
        this.map.gmap3({
            clear: {
                name: groups,
                all: true
            }
        });
    }
}

$(document).ready(function() {
    var map = new ContigoMap();
    map.init();
    

    var locatePoint_786_1 = new ContigoBeaconPoi({icon: new Icon({name: "CP00001", width: 16, height: 16}), label: "MT3000-85071-786-RACO", coord: new Coordinate({lat: 49.27700, lng: -123.11995}), eventType: "Locate", address: new Address({street: "380 Nelson St", city: "Vancouver", county: "", state: "BC", postalCode: "V6B", country: "CANADA"}), stopDuration: "", speed: "", direction: "", timestamp: "08/20/2012 05:46:38PM EDT ", landmark: "(\'Contigo Office--raco Dep\'s) ", circleCertaintyRadius: "8", status: "", userNote: "", driverID: "", driverStatus: "", beaconID: "786", guardianID: "", ioprt1Scenario: "", ioprt2Scenario: "", lineColor:  "" });
	var locatePoint_786_2 = new ContigoBeaconPoi({icon: new Icon({name: "CP00001", width: 16, height: 16}), label: "MT3000-85071-786-RACO", coord: new Coordinate({lat: 49.27715, lng: -123.12038}), eventType: "Low Battery", address: new Address({street: "1021 Homer St", city: "Vancouver", county: "", state: "BC", postalCode: "V6B 0A3", country: "CANADA"}), stopDuration: "", speed: "", direction: "", timestamp: "08/20/2012 06:28:06PM EDT ", landmark: "(\'Contigo Office--raco Dep\'s) ", circleCertaintyRadius: "12", status: "", userNote: "", driverID: "", driverStatus: "", beaconID: "786", guardianID: "", ioprt1Scenario: "", ioprt2Scenario: "", lineColor:  "" });
	var locatePoint_786_3 = new ContigoBeaconPoi({icon: new Icon({name: "CP00001", width: 16, height: 16}), label: "MT3000-85071-786-RACO", coord: new Coordinate({lat: 49.27715, lng: -123.12038}), eventType: "Locate", address: new Address({street: "1021 Homer St", city: "Vancouver", county: "", state: "BC", postalCode: "V6B 0A3", country: "CANADA"}), stopDuration: "", speed: "", direction: "", timestamp: "08/20/2012 07:27:57PM EDT ", landmark: "(\'Contigo Office--raco Dep\'s) ", circleCertaintyRadius: "10", status: "", userNote: "", driverID: "", driverStatus: "", beaconID: "786", guardianID: "", ioprt1Scenario: "", ioprt2Scenario: "", lineColor:  "" });
	var locatePoint_786_4 = new ContigoBeaconPoi({icon: new Icon({name: "CP00001", width: 16, height: 16}), label: "MT3000-85071-786-RACO", coord: new Coordinate({lat: 49.27715, lng: -123.12038}), eventType: "Locate", address: new Address({street: "1021 Homer St", city: "Vancouver", county: "", state: "BC", postalCode: "V6B 0A3", country: "CANADA"}), stopDuration: "", speed: "", direction: "", timestamp: "08/20/2012 07:35:14PM EDT ", landmark: "(\'Contigo Office--raco Dep\'s) ", circleCertaintyRadius: "20", status: "", userNote: "", driverID: "", driverStatus: "", beaconID: "786", guardianID: "", ioprt1Scenario: "", ioprt2Scenario: "", lineColor:  "" });
	var locatePoint_786_5 = new ContigoBeaconPoi({icon: new Icon({name: "CP00001", width: 16, height: 16}), label: "MT3000-85071-786-RACO", coord: new Coordinate({lat: 49.27715, lng: -123.12038}), eventType: "Locate", address: new Address({street: "1021 Homer St", city: "Vancouver", county: "", state: "BC", postalCode: "V6B 0A3", country: "CANADA"}), stopDuration: "", speed: "", direction: "", timestamp: "08/20/2012 08:05:01PM EDT <br>(GPS Age: 0h 05m 01s)", landmark: "(\'Contigo Office--raco Dep\'s) ", circleCertaintyRadius: "10", status: "", userNote: "", driverID: "", driverStatus: "", beaconID: "786", guardianID: "", ioprt1Scenario: "", ioprt2Scenario: "", lineColor:  "" });
	var locatePoint_786_6 = new ContigoBeaconPoi({icon: new Icon({name: "CP00001", width: 16, height: 16}), label: "MT3000-85071-786-RACO", coord: new Coordinate({lat: 49.27732, lng: -123.11997}), eventType: "Low Battery", address: new Address({street: "393 Nelson St", city: "Vancouver", county: "", state: "BC", postalCode: "V6B", country: "CANADA"}), stopDuration: "", speed: "", direction: "", timestamp: "08/20/2012 08:09:46PM EDT ", landmark: "(\'Contigo Office--raco Dep\'s) ", circleCertaintyRadius: "5", status: "", userNote: "", driverID: "", driverStatus: "", beaconID: "786", guardianID: "", ioprt1Scenario: "", ioprt2Scenario: "", lineColor:  "" });
	var locatePoint_786_7 = new ContigoBeaconPoi({icon: new Icon({name: "CP00001", width: 16, height: 16}), label: "MT3000-85071-786-RACO", coord: new Coordinate({lat: 49.27732, lng: -123.11997}), eventType: "Locate", address: new Address({street: "393 Nelson St", city: "Vancouver", county: "", state: "BC", postalCode: "V6B", country: "CANADA"}), stopDuration: "", speed: "", direction: "", timestamp: "08/21/2012 01:36:59PM EDT ", landmark: "(\'Contigo Office--raco Dep\'s) ", circleCertaintyRadius: "30", status: "", userNote: "", driverID: "", driverStatus: "", beaconID: "786", guardianID: "", ioprt1Scenario: "", ioprt2Scenario: "", lineColor:  "" });
	var locatePoint_786_8 = new ContigoBeaconPoi({icon: new Icon({name: "CP00001", width: 16, height: 16}), label: "MT3000-85071-786-RACO", coord: new Coordinate({lat: 49.27732, lng: -123.11997}), eventType: "Motion Detection", address: new Address({street: "393 Nelson St", city: "Vancouver", county: "", state: "BC", postalCode: "V6B", country: "CANADA"}), stopDuration: "", speed: "", direction: "", timestamp: "08/21/2012 02:17:24PM EDT ", landmark: "(\'Contigo Office--raco Dep\'s) ", circleCertaintyRadius: "15", status: "", userNote: "", driverID: "", driverStatus: "", beaconID: "786", guardianID: "", ioprt1Scenario: "", ioprt2Scenario: "", lineColor:  "" });
	var locatePoint_786_9 = new ContigoBeaconPoi({icon: new Icon({name: "CP00001", width: 16, height: 16}), label: "MT3000-85071-786-RACO", coord: new Coordinate({lat: 49.27732, lng: -123.11997}), eventType: "Motion Detection", address: new Address({street: "393 Nelson St", city: "Vancouver", county: "", state: "BC", postalCode: "V6B", country: "CANADA"}), stopDuration: "", speed: "", direction: "", timestamp: "08/21/2012 02:44:58PM EDT ", landmark: "(\'Contigo Office--raco Dep\'s) ", circleCertaintyRadius: "", status: "", userNote: "", driverID: "", driverStatus: "", beaconID: "786", guardianID: "", ioprt1Scenario: "", ioprt2Scenario: "", lineColor:  "" });
	var locatePoint_786_10 = new ContigoBeaconPoi({icon: new Icon({name: "CP00001", width: 16, height: 16}), label: "MT3000-85071-786-RACO", coord: new Coordinate({lat: 49.27732, lng: -123.11997}), eventType: "Locate", address: new Address({street: "393 Nelson St", city: "Vancouver", county: "", state: "BC", postalCode: "V6B", country: "CANADA"}), stopDuration: "", speed: "", direction: "", timestamp: "08/21/2012 05:29:17PM EDT <br>(GPS Age: 2h 43m 17s)", landmark: "(\'Contigo Office--raco Dep\'s) ", circleCertaintyRadius: "12", status: "", userNote: "", driverID: "", driverStatus: "", beaconID: "786", guardianID: "", ioprt1Scenario: "", ioprt2Scenario: "", lineColor:  "" });
	var locatePoint_786_11 = new ContigoBeaconPoi({icon: new Icon({name: "CP00001", width: 16, height: 16}), label: "MT3000-85071-786-RACO", coord: new Coordinate({lat: 49.27732, lng: -123.11997}), eventType: "Locate", address: new Address({street: "393 Nelson St", city: "Vancouver", county: "", state: "BC", postalCode: "V6B", country: "CANADA"}), stopDuration: "", speed: "", direction: "", timestamp: "08/21/2012 05:29:20PM EDT <br>(GPS Age: 2h 43m 20s)", landmark: "(\'Contigo Office--raco Dep\'s) ", circleCertaintyRadius: "8", status: "", userNote: "", driverID: "", driverStatus: "", beaconID: "786", guardianID: "", ioprt1Scenario: "", ioprt2Scenario: "", lineColor:  "" });
	var locatePoint_786_12 = new ContigoBeaconPoi({icon: new Icon({name: "CP00001", width: 16, height: 16}), label: "MT3000-85071-786-RACO", coord: new Coordinate({lat: 49.27732, lng: -123.11997}), eventType: "Locate", address: new Address({street: "393 Nelson St", city: "Vancouver", county: "", state: "BC", postalCode: "V6B", country: "CANADA"}), stopDuration: "", speed: "", direction: "", timestamp: "08/21/2012 05:29:23PM EDT <br>(GPS Age: 2h 43m 23s)", landmark: "(\'Contigo Office--raco Dep\'s) ", circleCertaintyRadius: "10", status: "", userNote: "", driverID: "", driverStatus: "", beaconID: "786", guardianID: "", ioprt1Scenario: "", ioprt2Scenario: "", lineColor:  "" });
	var locatePoint_786_13 = new ContigoBeaconPoi({icon: new Icon({name: "CP00001", width: 16, height: 16}), label: "MT3000-85071-786-RACO", coord: new Coordinate({lat: 49.27697, lng: -123.11990}), eventType: "Low Battery", address: new Address({street: "1021 Hamilton St", city: "Vancouver", county: "", state: "BC", postalCode: "V6B 5T4", country: "CANADA"}), stopDuration: "", speed: "", direction: "", timestamp: "08/21/2012 05:33:59PM EDT ", landmark: "(\'Contigo Office--raco Dep\'s) ", circleCertaintyRadius: "20", status: "", userNote: "", driverID: "", driverStatus: "", beaconID: "786", guardianID: "", ioprt1Scenario: "", ioprt2Scenario: "", lineColor:  "" });
	var locatePointsArray = [locatePoint_786_1, locatePoint_786_2, locatePoint_786_3, locatePoint_786_4, locatePoint_786_5, locatePoint_786_6, locatePoint_786_7, locatePoint_786_8, locatePoint_786_9, locatePoint_786_10, locatePoint_786_11, locatePoint_786_12, locatePoint_786_13];
	var beaconItem = new ContigoBeaconItem({locatePoints: locatePointsArray, isPointsConnected: true, showInputOutputColor: false});
	var landmarkArray = [];
	var beaconPointsArray = {};
	beaconPointsArray["786"] = beaconItem;
	var poiCollection = new ContigoPoiCollection({landmarks: landmarkArray, beaconItems: beaconPointsArray, measurementUnit: 'm', "zones":{"47":[{"type":1,"points":[{"lat":49.28061,"lng":-123.11966},{"lat":49.27818,"lng":-123.11337}],"name":"rs_dGeoFence_Library : rs_dGeoFence_Library_evt"}], "1229":[{"type":2,"points":[{"lat":49.2597801948,"lng":-122.878012314},{"lat":49.2424982841,"lng":-122.851612294}],"name":"1229 circular disallowed burnaby : Zone - disallowed"}]}, "polygonZones":[{"key":"1 Z_POLY_Frank : Lougheed Mall","points":[{"lat":49.25281,"lng":-122.89886},{"lat":49.24939,"lng":-122.90349},{"lat":49.24625,"lng":-122.89826},{"lat":49.24816,"lng":-122.8907},{"lat":49.25281,"lng":-122.89886}]},{"key":"1 Z_POLY_Frank : FM Parents","points":[{"lat":49.22468,"lng":-123.04151},{"lat":49.22378,"lng":-123.04391},{"lat":49.22243,"lng":-123.04366},{"lat":49.22176,"lng":-123.04237},{"lat":49.22176,"lng":-123.04057},{"lat":49.22221,"lng":-123.03885},{"lat":49.22327,"lng":-123.03885},{"lat":49.22468,"lng":-123.04151}]},{"key":"1 Z_POLY_Frank : HOME","points":[{"lat":49.24804,"lng":-122.83637},{"lat":49.24799,"lng":-122.83285},{"lat":49.24524,"lng":-122.83277},{"lat":49.24508,"lng":-122.83586},{"lat":49.24804,"lng":-122.83637}]}]
	});

	
	/*
	var landmark_only = new ContigoLmkPoi({icon: new Icon({name: "LM00001", width: 16, height: 16}),label: "Office", coord: new Coordinate({lat: 49.277265, lng: -123.120191}),lmkAddress: "1008 Homer Street, Vancouver, BC, CANADA, V6B 2X1",content: "You are my sunshine.",category: "Company"});
        var landmarkArray = [landmark_only];
        var beaconPointsArray = {};
        var poiCollection = new ContigoPoiCollection({landmarks: landmarkArray, beaconItems: beaconPointsArray});
	*/
	
	/*
	var beaconPointsArray = {};
	var jobsArray = {};
	var locatePoint_23060_1 = new ContigoBeaconPoi({icon: new Icon({name: "GB01329", width: 20, height: 20}), label: "G2", coord: new Coordinate({lat: 51.03710, lng: -113.99893}), eventType: "Locate", address: new Address({street: "17 Ave Se", city: "Calgary", county: "", state: "AB", postalCode: "T2B", country: "CANADA"}), stopDuration: "", speed: "62kph", direction: "E", timestamp: "02/10/2012 11:19:43AM MST ", landmark: "HICKSVILLE GARAGE", circleCertaintyRadius: "", status: "Disconnected", userNote: "", driverID: "Hedis", driverStatus: "On Duty", beaconID: "48275", guardianID: "23060", ioprt1Scenario: "ioprt1Scenario", ioprt2Scenario: "ioprt1Scenario", lineColor: "", dispatch: new Dispatch({type: "driver", id: "23060"}) });
	var locatePointsArray_23060 = [locatePoint_23060_1];
	var beaconItem_23060 = new ContigoBeaconItem({locatePoints: locatePointsArray_23060, isPointsConnected: true});
	beaconPointsArray["23060"] = beaconItem_23060;
	var locatePoint_23063_1 = new ContigoBeaconPoi({icon: new Icon({name: "GB01329", width: 20, height: 20}), label: "G2", coord: new Coordinate({lat: 51.07770, lng: -113.99357}), eventType: "Ignition Off", address: new Address({street: "2906 Sunridge Blvd Ne", city: "Calgary", county: "", state: "AB", postalCode: "T1Y 6G2", country: "CANADA"}), stopDuration: "", speed: "", direction: "", timestamp: "10/18/2012 12:17:04PM MDT ", landmark: "", circleCertaintyRadius: "", status: "Disconnected", userNote: "", driverID: "Syeda", driverStatus: "On Duty", beaconID: "48275", guardianID: "23063", ioprt1Scenario: "", ioprt2Scenario: "", lineColor: "", dispatch: new Dispatch({type: "driver", id: "23063"}) });
	var locatePointsArray_23063 = [locatePoint_23063_1];
	var beaconItem_23063 = new ContigoBeaconItem({locatePoints: locatePointsArray_23063, isPointsConnected: true});
	beaconPointsArray["23063"] = beaconItem_23063;
	var locatePoint_23116_1 = new ContigoBeaconPoi({icon: new Icon({name: "GB01307", width: 16, height: 16}), label: "Karly", coord: new Coordinate({lat: 51.04932, lng: -114.10918}), eventType: "Ignition Off", address: new Address({street: "2148 Brownsea Dr Nw", city: "Calgary", county: "", state: "AB", postalCode: "T2N 3G9", country: "CANADA"}), stopDuration: "STOP: 0h 47m 00s", speed: "", direction: "", timestamp: "11/23/2012 03:29:51PM PST ", landmark: "(Scouts) ", circleCertaintyRadius: "", status: "Disconnected", userNote: "", driverID: "Catd", driverStatus: "On Duty", beaconID: "51840", guardianID: "23116", ioprt1Scenario: "", ioprt2Scenario: "", lineColor: "", dispatch: new Dispatch({type: "driver", id: "23116"}) });
	var locatePointsArray_23116 = [locatePoint_23116_1];
	var beaconItem_23116 = new ContigoBeaconItem({locatePoints: locatePointsArray_23116, isPointsConnected: true});
	beaconPointsArray["23116"] = beaconItem_23116;
	var landmarkArray = [];
	var poiCollection = new ContigoPoiCollection({landmarks: landmarkArray, beaconItems: beaconPointsArray, jobs: jobsArray, measurementUnit: 'm'});
	*/
	
	/*
	var locatePoint_42219_495 = new ContigoBeaconPoi({icon: new Icon({name: "aux_OFF_16x16", width: 16, height: 16}), label: "A-103", coord: new Coordinate({lat: 40.58332, lng: -74.08545}), eventType: "2_off", address: new Address({street: "495 Seaview Ave", city: "Staten Island", county: "Richmond", state: "NY", postalCode: "10305", country: "US"}), stopDuration: "", speed: "", direction: "", timestamp: "10/29/2012 09:21:26PM EDT ", landmark: "(SIUH) ", circleCertaintyRadius: "", status: "", userNote: "", driverID: "", driverStatus: "", beaconID: "42219", guardianID: "", ioprt1Scenario: "", ioprt2Scenario: "", lineColor: "0x000000" });
	var locatePoint_42219_496 = new ContigoBeaconPoi({icon: new Icon({name: "aux1_ON_16x16", width: 16, height: 16}), label: "A-103", coord: new Coordinate({lat: 40.68330, lng: -75.48548}), eventType: "1_off", address: new Address({street: "495 Seaview Ave", city: "Staten Island", county: "Richmond", state: "NY", postalCode: "10305", country: "US"}), stopDuration: "", speed: "", direction: "", timestamp: "10/29/2012 09:33:47PM EDT ", landmark: "(SIUH) ", circleCertaintyRadius: "", status: "", userNote: "", driverID: "", driverStatus: "", beaconID: "42219", guardianID: "", ioprt1Scenario: "", ioprt2Scenario: "", lineColor: "0xBE53B4" });
	var locatePoint_42219_497 = new ContigoBeaconPoi({icon: new Icon({name: "aux_OFF_16x16", width: 16, height: 16}), label: "A-103", coord: new Coordinate({lat: 40.59330, lng: -76.09548}), eventType: "1_on", address: new Address({street: "495 Seaview Ave", city: "Staten Island", county: "Richmond", state: "NY", postalCode: "10305", country: "US"}), stopDuration: "", speed: "", direction: "", timestamp: "10/29/2012 09:33:49PM EDT ", landmark: "(SIUH) ", circleCertaintyRadius: "", status: "", userNote: "", driverID: "", driverStatus: "", beaconID: "42219", guardianID: "", ioprt1Scenario: "", ioprt2Scenario: "", lineColor: "0x000000" });
	var locatePoint_42219_498 = new ContigoBeaconPoi({icon: new Icon({name: "aux1_ON_16x16", width: 16, height: 16}), label: "A-103", coord: new Coordinate({lat: 40.88330, lng: -72.18548}), eventType: "1_off", address: new Address({street: "495 Seaview Ave", city: "Staten Island", county: "Richmond", state: "NY", postalCode: "10305", country: "US"}), stopDuration: "", speed: "", direction: "", timestamp: "10/29/2012 09:35:31PM EDT ", landmark: "(SIUH) ", circleCertaintyRadius: "", status: "", userNote: "", driverID: "", driverStatus: "", beaconID: "42219", guardianID: "", ioprt1Scenario: "", ioprt2Scenario: "", lineColor: "0xBE53B4" });
	var locatePoint_42219_499 = new ContigoBeaconPoi({icon: new Icon({name: "aux12_ON_16x16", width: 16, height: 16}), label: "A-103", coord: new Coordinate({lat: 41.58330, lng: -74.07548}), eventType: "2_on", address: new Address({street: "495 Seaview Ave", city: "Staten Island", county: "Richmond", state: "NY", postalCode: "10305", country: "US"}), stopDuration: "", speed: "", direction: "", timestamp: "10/29/2012 09:35:48PM EDT ", landmark: "(SIUH) ", circleCertaintyRadius: "", status: "", userNote: "", driverID: "", driverStatus: "", beaconID: "42219", guardianID: "", ioprt1Scenario: "", ioprt2Scenario: "", lineColor: "0x247513" });
	var locatePoint_42219_500 = new ContigoBeaconPoi({icon: new Icon({name: "aux2_ON_16x16", width: 16, height: 16}), label: "A-103", coord: new Coordinate({lat: 42.78330, lng: -73.29548}), eventType: "1_on", address: new Address({street: "495 Seaview Ave", city: "Staten Island", county: "Richmond", state: "NY", postalCode: "10305", country: "US"}), stopDuration: "", speed: "", direction: "", timestamp: "10/29/2012 09:35:48PM EDT ", landmark: "(SIUH) ", circleCertaintyRadius: "", status: "", userNote: "", driverID: "", driverStatus: "", beaconID: "42219", guardianID: "", ioprt1Scenario: "", ioprt2Scenario: "", lineColor: "0x0000FF" });
	var locatePointsArray = [locatePoint_42219_495, locatePoint_42219_496, locatePoint_42219_497, locatePoint_42219_498, locatePoint_42219_499, locatePoint_42219_500];
	var beaconItem = new ContigoBeaconItem({locatePoints: locatePointsArray, isPointsConnected: true, showInputOutputColor: true});
	var landmarkArray = [];
	var beaconPointsArray = {};
	beaconPointsArray["42219"] = beaconItem;
	var poiCollection = new ContigoPoiCollection({landmarks: landmarkArray, beaconItems: beaconPointsArray, measurementUnit: 'ft'});
	*/
	
    map.sendPoints(poiCollection);
});