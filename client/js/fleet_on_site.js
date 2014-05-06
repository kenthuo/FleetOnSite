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
/**
 * The tag for all of landmark markers.
 */
var TAG_GROUP_LANDMARK = "group_landmark";
/**
 * The tag for all of job markers.
 */
var TAG_GROUP_JOB = "group_job";
/**
 * The tag for all of circle zones.
 */
var TAG_GROUP_CIRCLE_ZONE = "group_circle_zone";
/**
 * The tag for all of rectangle zones.
 */
var TAG_GROUP_RECTANGLE_ZONE = "group_rectangle_zone";
/**
 * The tag for all of polygon zones.
 */
var TAG_GROUP_POLYGON_ZONE = "group_polygon_zone";
/**
 * The tag for all of address markers.
 */
var TAG_GROUP_ADDRESS = "group_address";
var DEFAULT_ROUTE_COLOR = "#FF0000";

var ICON_HOST_PATH = "icons/";

var NUMBERS_ICON_HOST_PATH = "icons/numbers/";

var IMG_HOST_PATH = "images/";

function ContigoMarkers(markers, cocs, routes) {
    this.markers = markers ? markers : new Array(); // an array of markers
    this.cocs = cocs ? cocs : new Array(); // circle of certainty for each marker
    this.routes = routes ? routes : new Array(); // routes to connect markers
}

function ContigoMap(mapId) {
    this.mapId = mapId ? mapId : 'map'; // the identity of the DOM element to hold the map
    this.map = null; // the google map object
    this.canvas = null; // the canvas object of a map
    this.contextMenu = null; // the context menu of a map
    this.currentClickEvent = null;
    this.isMetric = false; // to use metric system to show information on the map or not
    this.currentLocateFilterMode = LOCATES_SHOW_ALL;
    this.currentCocMode = COC_SHOW_ALL;
    this.geocoder = new google.maps.Geocoder();
    this.withLabel = true; // with lable for markers
    this.withTraffic = false; // with traffic layer on the map
}

ContigoMap.prototype = {
	/**
	 * Initialize and show the map with the default central position and zoom level, and
	 * also initialize the context menu.
	 */
	init: function() {
		var $this = this;
		this.canvas = $('#' + this.mapId);
		this.contextMenu = new Gmap3Menu(this.canvas);
		this.initContextMenu();
        this.canvas.gmap3({
            defaults:{ 
                classes:{
                    Marker: MarkerWithLabel // use MarkerWithLabel class to allow to show lable with marker
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
						$this.currentClickEvent = event;
						$this.contextMenu.open(event);
					},
					click: function() {
						$this.contextMenu.close();
					},
					dragstart: function() {
						$this.contextMenu.close();
					},
					zoom_changed: function() {
						$this.contextMenu.close();
					}
				}
            }
        });
        this.map = this.canvas.gmap3("get");
        this.markCenter();
	},
	
	/**
	 * Add menu item to the context menu.
	 */
	initContextMenu: function() {
		var $this = this;
		/*
        this.contextMenu.add("Draw Circle", "drawCircle", 
            function(){
                self.contextMenu.close();
            });
        this.contextMenu.add("Draw Rectangle", "drawRectangle", 
            function(){
                self.contextMenu.close();
            });
        this.contextMenu.add("Draw Polygon", "drawPolygon", 
            function(){
                self.contextMenu.close();
            }); 
        */ 
        this.contextMenu.add("Traffic", "traffic", 
            function() {
            	if ($this.withTraffic) {
            		$this.clear({name: ["trafficlayer"]});
            		$this.withTraffic = false;
            	} else {
            		$this.canvas.gmap3("trafficlayer");
            		$this.withTraffic = true;
            	}
                $this.contextMenu.close();
            });              
        this.contextMenu.add("Clear Markers", "clearMarker separator", 
            function(){
                $this.clear({name: ["marker", "circle", "polyline", "rectangle", "polygon"]});
                $this.contextMenu.close();
            });
		this.contextMenu.add("Zoom in", "zoomIn", 
			function() {
				$this.map.setZoom($this.map.getZoom() + 1);
				$this.contextMenu.close();
			});
		this.contextMenu.add("Zoom out", "zoomOut",
			function() {
				$this.map.setZoom($this.map.getZoom() - 1);
				$this.contextMenu.close();
			});
		this.contextMenu.add("Center here", "centerHere separator", 
			function() {
				$this.map.setCenter($this.currentClickEvent.latLng);
				$this.contextMenu.close();
			});
		this.contextMenu.add("Show All CoCs", "showAllCoC", 
			function() {
				$($this.canvas).gmap3({
					get: {
						tag: TAG_GROUP_COC,
						all: true,
						callback: function(circles) {
							$.each(circles, function(i, circle){
								circle.setVisible(true);
							});
							
        				}
      				}
    			});
				$this.contextMenu.close();
			});
		this.contextMenu.add("Show Last CoC", "showLastCoC", 
			function() {
				$($this.canvas).gmap3({
					get: {
						tag: TAG_GROUP_COC,
						all: true,
						callback: function(circles) {
							$.each(circles, function(i, circle) {
								circle.setVisible(i == circles.length - 1);
							});
							
        				}
      				}
    			});
				$this.contextMenu.close();
			});
		this.contextMenu.add("Hide CoC", "hideCoC separator", 
			function() {
				$($this.canvas).gmap3({
					get: {
						tag: TAG_GROUP_COC,
						all: true,
						callback: function(circles) {
							$.each(circles, function(i, circle) {
								circle.setVisible(false);
							});
							
        				}
      				}
    			});
				$this.contextMenu.close();
			});
		this.contextMenu.add("View Address", "viewAddress", 
			function() {
				$this.clear({tag: TAG_GROUP_ADDRESS});
				$this.geocoder.geocode({'latLng': $this.currentClickEvent.latLng}, function(results, status) {
					if (status == google.maps.GeocoderStatus.OK) {
						if (results[0]) {
							$this.canvas.gmap3({
            					marker: {
                					tag: TAG_GROUP_ADDRESS,
                					latLng: $this.currentClickEvent.latLng,
                					options: {
                    					icon: ICON_HOST_PATH + "red_dot.png"
                					},
                					callback: function(marker) {
           								var infowindow = $this.canvas.gmap3({get:{name:"infowindow"}});
           								if (infowindow){
											infowindow.open($this.map, marker);
											infowindow.setContent(results[0].formatted_address);
										} else {
											$this.canvas.gmap3({
												infowindow: {
													anchor: marker, 
													options: {content: results[0].formatted_address},
													events: {
														closeclick: function(infowindow) {
															$this.clear({tag: TAG_GROUP_ADDRESS});
														}
													}
												}
											});
										}
									}
           						}
							});
      					} else {
        					alert('No results found');
      					}
    				} else {
      					alert('Geocoder failed due to: ' + status);
    				}
  				});
				$this.contextMenu.close();
			});
		this.contextMenu.add("Best Fit", "bestFit",
			function() {
                $this.bestFit();
				$this.contextMenu.close();
			});
	},
	
	/**
	 * Show a cross-hair image to represent the center of the map.
	 */
	markCenter: function() {
        var marker = new google.maps.Marker({
			map: this.map,
			 icon: new google.maps.MarkerImage(
			 	ICON_HOST_PATH + 'crosshair.png', 
			 	null, 
			 	null, 
			 	new google.maps.Point(20, 20)), // crosshair.png is 41x41
			shape: {coords: [0, 0, 0, 0], type: 'rect'}
		});
		marker.bindTo('position', this.map, 'center');
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
    
	/**
	 * Refresh the map.
	 * 
	 * @param poiCollection
	 */    
    refreshMap: function(poiCollection) {
        var mapMarkers = new Array();
        var landmarks = poiCollection.landmarks;
	    var beaconItems = poiCollection.beaconItems;
	    var jobCollection = poiCollection.jobs;    
	    var measurementUnit = poiCollection.measurementUnit;
	    this.isMetric = (measurementUnit && measurementUnit.toLowerCase() == "m") ? true : false;
        
        var locationMarkers = this.buildLocationMarkers(beaconItems, this.isMetric);
	    var landmarkMarkers = this.buildLandmarkMarkers(landmarks, this.isMetric);
	    var jobMarkers = this.buildJobMarkers(jobCollection, this.isMetric);
        mapMarkers = locationMarkers.markers.concat(landmarkMarkers.markers);
        mapMarkers = mapMarkers.concat(jobMarkers.markers);
	    var mapObjects = {};
	    if (mapMarkers.length > 0) {
	    	mapObjects["marker"] = {
                values: mapMarkers,
                options: {
                    draggable: false
                },
                events: {
                	click: function(marker, event, context) {
            			var infowindow = $(this).gmap3({get:{name:"infowindow"}});
            			if (infowindow) {
              				infowindow.open(marker.getMap(), marker);
              				infowindow.setContent(context.data);
            			} else {
              				$(this).gmap3({
                				infowindow: {
                  					anchor: marker,
                  					options: {content: context.data}
                				}
              				});
              			}
            		}
                }
            }
	    }
	    
	    if (locationMarkers.cocs.length > 0) {
	    	mapObjects["circle"] = {values: locationMarkers.cocs};
	    }
	    
	    if (locationMarkers.routes.length > 0) {
            mapObjects["polyline"] = {};
            mapObjects["polyline"]["values"] = new Array();
            for (var i = 0; i < locationMarkers.routes.length; i++) {
                mapObjects["polyline"]["values"].push({
                    options: {
                        strokeColor: locationMarkers.routes[i].color,
                        strokeOpacity: 1.0,
                        strokeWeight: 2,
                        path: locationMarkers.routes[i].segment,
                        icons: [{
                            icon: {
                                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                                strokeColor: 'black',
                                strokeOpacity: 1.0,
                                strokeWeight: 1.0,
                                fillColor: 'yellow',
                                fillOpacity: 1.0,
                                scale: 4
                            },
                            offset: '50%'
                        }]
                    }
                });
            }
	    }
	    
        this.canvas.gmap3(mapObjects, "autofit");
    },
    
    /**
	 * Convert from a list of contigo's location poi objects into marker and circle objects.
	 * 
	 * @param beaconItems a list of beacon items
	 * @param is metric system applied
	 * 
	 * @returns a list of definition of location markers and a list of definition of CoCs (circle of certainty)
	 */
	buildLocationMarkers : function(beaconItems, isMetric) {
		var self = this, 
            markers = new Array(),
            cocs = new Array(),
            routes = new Array();
	    for (var x in beaconItems) {
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
                var segment = new Array();
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
                    var marker = null;
                    if (this.withLabel) {
                        marker = {
                            tag: [label, TAG_GROUP_LOCATION],
                            latLng: [coord.lat, coord.lng], 
                            data: infoContent,                        
                            options: {
                                title: label,
                                icon: {
                                	url: this.constructMarkerIconName(icon, numberLabel),
                                	anchor: new google.maps.Point(Math.floor(icon.width / 2), Math.floor(icon.height / 2)),
                                },
                                labelAnchor: new google.maps.Point(10, -2),
                                labelClass: "labels",
                                labelStyle: {opacity: 0.75},
                                labelContent: label}};
                    } else {
                        marker = {
                            tag: [label, TAG_GROUP_LOCATION],
                            latLng: [coord.lat, coord.lng], 
                            data: infoContent,                        
                            options: {
                                title: label,
                                icon: {
                                	anchor: new google.maps.Point(Math.floor(icon.width / 2), Math.floor(icon.height / 2)),
                                	url: this.constructMarkerIconName(icon, numberLabel)
                                	}
                            }
                        };                    
                    }
		            markers.push(marker);
	            }
                
                circleCertaintyRadius = parseInt(circleCertaintyRadius, 10);
                if (circleCertaintyRadius > 0) {
                    if (this.currentCocMode == COC_SHOW_ALL || this.currentCocMode == COC_SHOW_LAST && i == szLocatePoints - 1) {
                        var circle = {
                            tag: [TAG_GROUP_COC],
                            options: {
                                center: [coord.lat, coord.lng],
                                radius : circleCertaintyRadius,
                                fillColor : "#C80000",
                                strokeWeight: 1,
                                strokeColor : "#F00000"}};
                        cocs.push(circle);
	        		}
                }
                
                if (isPointsConnected) {
                    segment.push([coord.lat, coord.lng]);
                    // change the color of line segment of the route log if the showInputOutputColor flag is turned on
                    var nextPoint = null;
                    var nextCoord = null;
                    lineColor = lineColor.replace("0x", "#"); // convert from flash color to html color
                    if (i != szLocatePoints - 1) {
                        // not last point
                        nextPoint = locatePoints[i + 1];
                        nextCoord = nextPoint.coord;
                        if (nextPoint) {
                            segment.push([nextCoord.lat, nextCoord.lng]);
                            if (showInputOutputColor) {
                                routes.push({color: lineColor, segment: segment});
                            } else {
                                routes.push({color: DEFAULT_ROUTE_COLOR, segment: segment});
                            }
                        }
                    }
                }
	        } // for (var i = 0; i < szLocatePoints; i++)
	    } // for (var x in beaconItems)
	    return new ContigoMarkers(markers, cocs, routes);
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
	 * Convert from a list of contigo's landmark poi objects into landmark marker objects.
	 * 
	 * @param landmarks a list of landmarks
	 * @param is metric system applied
	 * 
	 * @returns a list of definition of landmark markers
	 */
	buildLandmarkMarkers : function(landmarks, isMetric) {
		var self = this,
            markers = new Array();
		for (var x in landmarks) {
			var icon = landmarks[x].icon;
			var coord = landmarks[x].coord;
			var label = landmarks[x].label;
			var category = landmarks[x].category;
			var userNote = landmarks[x].userNote;
			var lmkAddress = landmarks[x].lmkAddress;
			var content = landmarks[x].content;
			var numberLabel = landmarks[x].numberLabel;
			var dispatch = landmarks[x].dispatch;
			
			if (category) {
				label += " (" + category + ")";
			}
			if (label) {
                var infoContent = this.buildLmkInfoWindowContents(label, userNote, lmkAddress, content, dispatch);
                var marker = {
                    tag: [label, TAG_GROUP_LANDMARK],
                    latLng: [coord.lat, coord.lng], 
                    data: infoContent,    
                    options: {
                        title: label,
                        icon: {url: this.constructMarkerIconName(icon, numberLabel)},
                        labelAnchor: new google.maps.Point(10, -2),
                        labelClass: "labels",
                        labelStyle: {opacity: 0.75},
                        labelContent: label}};
                markers.push(marker);
			}				
		}
		
		return new ContigoMarkers(markers);
	},
    
	/**
	 * Creates and returns the string to be used in a landmark marker's info window.
	 *
	 * @param label
	 * @param userNote
	 * @param lmkAddress
	 * @param content
	 * @param dispatch   
	 *
	 * @return string the content of landmark's InfoWindow
	 */
	buildLmkInfoWindowContents : function(label, userNote, lmkAddress, content, dispatch) {
	  
	    var infoContent = "<div class='marker_infowindow'>";
	    infoContent += "<div class='marker_infowindow_title'>" + label + "</div>";
	    
	    // dispatch toolbar
		if (dispatch) {
			var type = dispatch.type;
			var id = dispatch.id;
			infoContent += "<div class='dispatch_toolbar'>";
			var landmarkInfo = id.split("|"); // 11903|1008 Homer Street, Vancouver, BC, Canada, V6B 2X1|49.27727|-123.12019|407|1008 Homer Street
			var landmarkId = landmarkInfo[0];
			infoContent += "<div><a href='#' id='sendjob_" + type + "_" + landmarkId + "'><img src='" + ICON_HOST_PATH + "send_job.png'></a></div>";
			infoContent += "</div>";
		}
	    if (userNote || lmkAddress || content) {
			infoContent += "<div class='landmark_info'>";
			// user note
			infoContent += (userNote) ? this.createMarkerInfoWindowPara(userNote) : "";
	    
			// landmark's address
			infoContent += (lmkAddress) ? this.createMarkerInfoWindowPara(lmkAddress) : "";
	    
			// landmark's content
			infoContent += (content) ? this.createMarkerInfoWindowPara(content) : "";
			infoContent += "<br></div>";
	    }
	    infoContent += "</div>";
		return infoContent;	    
	},

    /**
	 * Convert from a list of contigo's job poi objects into job marker objects.
	 * 
	 * @param jobCollection a list of jobs
	 * @param is metric system applied
	 * 
	 * @returns a list of definition of job markers
	 */
	buildJobMarkers : function(jobCollection, isMetric) {
		var self = this,
            markers = new Array();
		for (var beaconId in jobCollection) {
			var jobs = jobCollection[beaconId];
			var szJobs = jobs.length;
			for (var i = 0; i < szJobs; i++) {
				var job = jobs[i];
				var jobId = job.id;
				var icon = job.icon;
				var coord = job.coord;					
				var label = job.label;
				var description = job.description;
				var landmark = job.landmark;
				var destination = job.destination;
				var priority = job.priority;
				var status = job.status;
				var sentTimestamp = job.sentTimestamp;
				var ackTimestamp = job.ackTimestamp;
				var etaTimestamp = job.etaTimestamp;
				var doneTimestamp = job.doneTimestamp;
				var deletedTimestamp = job.deletedTimestamp;
				var deletedBy = job.deletedBy;
				var numberLabel = job.numberLabel;
				var isDeleted = (deletedTimestamp) ? true : false;
				var isDone = (status && status.toLowerCase() == "done") ? true : false;
	            
				if (label) {
                    var infoContent = this.buildJobInfoWindowContents(
		            		beaconId, jobId, label, description, landmark, destination, 
		            		priority, status, sentTimestamp, ackTimestamp, 
		            		etaTimestamp, doneTimestamp, deletedTimestamp, 
		            		deletedBy, isDeleted, isDone);
                    var marker = {
                    	tag: [label, TAG_GROUP_JOB],
                        latLng: [coord.lat, coord.lng], 
                        data: infoContent,                        
                        options: {
                            title: label,
                            icon: {url: this.constructMarkerIconName(icon, numberLabel)},
                            labelAnchor: new google.maps.Point(10, -2),
                            labelClass: "labels",
                            labelStyle: {opacity: 0.75},
                            labelContent: label}};
		            markers.push(marker);
				}
			}				
		}
		return new ContigoMarkers(markers);
	},
    
    /**
	 * Creates and returns the string to be used in a job marker's info window.
	 *
	 * @param beaconId
	 * @param jobId
	 * @param label
	 * @param description
	 * @param landmark
	 * @param destination
	 * @param landmark
	 * @param priority
	 * @param status
	 * @param sentTimestamp
	 * @param ackTimestamp
	 * @param etaTimestamp
	 * @param doneTimestamp
	 * @param deletedTimestamp
	 * @param deletedBy
	 * @param isDeleted
	 * @param isDone   
	 *
	 * @return string the content of job's InfoWindow
	 */
	buildJobInfoWindowContents : function(beaconId, jobId, label, description, landmark, destination, 
    		priority, status, sentTimestamp, ackTimestamp, 
    		etaTimestamp, doneTimestamp, deletedTimestamp, 
    		deletedBy, isDeleted, isDone) {	

		var jobDescription = jobLocation = jobDetails = "";
	    var infoContent = "<div class='marker_infowindow'>";
	    infoContent += "<div class='marker_infowindow_title'>" + label + "</div>";
	    
	    jobDescription = "<div class='job_description'>";
		jobDescription += "<div class='job_description_title'>Job Description:</div>";
		jobDescription += "<div class='job_description_content'>" + description + "</div>";
		jobDescription += "</div>";
		
		jobLocation = "<div class='job_location'>";
		jobLocation += "<div class='job_location_title'>Job Location:</div>";
		jobLocation += ((landmark) ? "<div clas='job_landmark'>(" + landmark + ")</div>" : "");
		jobLocation += "<div class='job_destination'>" + destination + "</div>";
		jobLocation += "</div>";
		
		jobDetails = "<table class='job_details'>";
		jobDetails += "<tr><td class='job_details_title'>Priority</td><td>" + ((priority == -1) ? "-" : priority) + "</td></tr>";
		jobDetails += "<tr><td class='job_details_title'>Status:</td><td>" + ((status) ? status : "-") + "</td></tr>";
		jobDetails += "<tr><td class='job_details_title'>Sent:</td><td>" + ((sentTimestamp) ? sentTimestamp : "-") + "</td></tr>";
		jobDetails += "<tr><td class='job_details_title'>Ack'd:</td><td>" + ((ackTimestamp) ? ackTimestamp : "-") + "</td></tr>";
		jobDetails += "<tr><td class='job_details_title'>ETA:</td><td>" + ((etaTimestamp) ? etaTimestamp : "-") + "</td></tr>";
		jobDetails += (isDone) ? "<tr><td class='job_details_title'>Done:</td><td>" + doneTimestamp + "</td></tr>" : "";
		jobDetails += (isDeleted) ? "<tr><td class='job_details_title'>Deleted:</td><td>" + ((deletedTimestamp) ? deletedTimestamp : "") + " " + ((deletedBy) ? deletedBy : "") + "</td></tr>" : "";
		jobDetails += "</table>";
		
		infoContent += jobDescription + jobLocation + jobDetails;
			    
	    infoContent += "<div class='job_toolbar'>";
	    infoContent += "<input id='delete_job_" + beaconId + "_" + jobId + "' type='button' class='job_button' value='delete' />&nbsp;";
	    infoContent += "<input id='reorder_job_" + beaconId + "_" + jobId + "' type='button' class='job_button button_reorder_job' value='reorder'" + ((isDeleted || isDone) ? " disabled='disabled'" : "") + " />&nbsp;";
	    infoContent += "<input id='reassign_job_" + beaconId + "_" + jobId + "' type='button' class='job_button button_reassign_job' value='reassign'" + ((!isDeleted && isDone) ? " disabled='disabled'" : "") + " />";
	    infoContent += "</div>";
		infoContent += "</div>";
		return infoContent;	    
	},
    
    /**
     * Draw a circular overlay on the map.
     *
     * @param lat The latitude of the centre coordinate, in decimal degrees.
     * @param lng The longitude of the centre coordinate, in decimal degrees.
     * @param radius The radius of the circle, in metres.
     */
    drawCircle : function(lat, lng, radius) {
        this.canvas.gmap3({
            circle:{
                tag: TAG_GROUP_CIRCLE_ZONE,
                options:{
                    center: [lat, lng],
                    radius: radius,
                    fillColor: "#C80000",
                    fillOpacity: 0.18,
                    strokeColor: "#F00000",
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    editable: true,
                    draggable: true
                },
                events: {
                    dragend: function(circle) {
                        var center = circle.center;
                        var radius = circle.radius;
                    },
                    radius_changed: function(circle) {
                        var center = circle.center;
                        var radius = circle.radius;
                    },
                    rightclick: function(circle, event) {
                        var contextMenu = new Gmap3Menu($(this).gmap3());
                        contextMenu.add("Delete", "clearMarker", 
                            function(){
                                circle.setMap(null);
                                contextMenu.close();
                            });
                        contextMenu.open(event);                        
                    }
                },
                callback: function() {}
           }
        }, "autofit");
    },
    
    /**
     * Draws a rectangular overlay on the map.
     *
     * @param lat1 The latitude of the first coordinate, in decimal degrees.
     * @param lng2 The longitude of the first coordinate, in decimal degrees.
     * @param lat1 The latitude of the second coordinate, in decimal degrees.
     * @param lng2 The longitude of the second coordinate, in decimal degrees.
     */ 
    drawRectangle : function(lat1, lng1, lat2, lng2) {    
        this.canvas.gmap3({
            rectangle: {
                tag: TAG_GROUP_RECTANGLE_ZONE,
                options: {
                    bounds: {n: lat1, e: lng1, s: lat2, w: lng2},
                    fillColor: "#C80000",
                    fillOpacity: 0.18,
                    strokeColor: "#F00000",
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    editable: true,
                    draggable: true
                },
                events: {
                    bounds_changed: function(rectangle) {
                        var bounds = rectangle.bounds;
                        var ne = bounds.getNorthEast();
                        var sw = bounds.getSouthWest();
                    },
                    rightclick: function(rectangle, event) {
                        var contextMenu = new Gmap3Menu($(this).gmap3());
                        contextMenu.add("Delete", "clearMarker", 
                            function() {
                                rectangle.setMap(null);
                                contextMenu.close();
                            });
                        contextMenu.open(event);                        
                    }
                },
                callback: function() {}
           }
        }, "autofit");
    },
    
    /**
     * Draw an array of polygonal overlays on the map.
	 *
	 * @param polygonZoneCollection an array of polygon information.
	 *        {polygonZones: [{key: name1, points: [{lat: lat1, lng: lng1}, {lat: lat2, lng: lng2}, ...]}, ...]}
     * @return the number of polygons
	 */
	drawPolygonZones : function(polygonZoneCollection) {
        var szPolygons = 0;
        var polygons = new Array();
        if (polygonZoneCollection) {
			var polygonZones = polygonZoneCollection.polygonZones;
            if (polygonZones) {
            	szPolygons = polygonZones.length;
                for (var i = 0; i < szPolygons; i++) {
            		var polygonInfo =  polygonZones[i];
                    var zoneName = polygonInfo.key;
                    var vertices = new Array();
                    for (var j = 0; j < polygonInfo.points.length; j++) {
                    	var point = polygonInfo.points[j];
                    	vertices.push([polygonInfo.points[j].lat, polygonInfo.points[j].lng]);
                    }

                    var polygon = {
                    	tag: TAG_GROUP_POLYGON_ZONE,
                		options: {
                    		paths: vertices,
                    		fillColor: "#C80000",
                    		fillOpacity: 0.18,
                    		strokeColor: "#F00000",
                    		strokeOpacity: 0.8,
                    		strokeWeight: 2,
                    		editable: true,
                    		draggable: true
                		},
                		events: {
                    		mouseup: function(polygon) {
                    			var paths = polygon.getPaths();
                        		//console.log(paths);
                    		},
                    		dragend: function(polygon) {
                        		var paths = polygon.getPaths();
                        		//console.log(paths);
                    		},
                            rightclick: function(polygon, event) {
                                var contextMenu = new Gmap3Menu($(this).gmap3());
                                contextMenu.add("Delete", "clearMarker", 
                                    function() {
                                        polygon.setMap(null);
                                        contextMenu.close();
                                    });
                                contextMenu.open(event);                        
                            }
                		},
                		callback: function() {}
                    };
		            polygons.push(polygon);
	            }

                this.canvas.gmap3({polygon: {values: polygons}}, "autofit");
            }
        }
        return szPolygons;
	},    
    
    /**
     * Clear objects in the groups on the map based on id, name, or tag in the groups.
     * id: string or array of string,
     * name: string or array of string,
     * tag: boolean, string, or array of string
     *
     * @param groups a list of groups
     */
    clear : function(groups) {
    	if (groups.id) {
    		this.canvas.gmap3({clear: {id: groups.id}});
    	} else if (groups.name) {
    		this.canvas.gmap3({clear: {name: groups.name}});
    	} else if (groups.tag) {
    		this.canvas.gmap3({clear: {tag: groups.tag}});
    	}
    },
    
    /**
     * Fit all of markers, polylines, circles, polygons to be visible on the map.
     */
    bestFit : function() {
        //  Create a new viewpoint bound
        var bounds = new google.maps.LatLngBounds();
        this.canvas.gmap3({
            get: {
                name: "marker",
				all: true,
				callback: function(markers) {
					$.each(markers, function(i, marker){
						bounds = bounds.extend(marker.getPosition());
					});		
        		}
      		}
    	});        
        this.canvas.gmap3({
            get: {
                name: "circle",
				all: true,
				callback: function(circles) {
					$.each(circles, function(i, circle){
						bounds = bounds.union(circle.getBounds());
					});		
        		}
      		}
    	});
        this.canvas.gmap3({
            get: {
                name: "rectangle",
				all: true,
				callback: function(rectangles) {
					$.each(rectangles, function(i, rectangle){
						bounds = bounds.union(rectangle.getBounds());
					});		
        		}
      		}
    	});
        this.canvas.gmap3({
            get: {
                name: "polygon",
				all: true,
				callback: function(polygons) {
					$.each(polygons, function(i, polygon){
						bounds = bounds.union(polygon.getBounds());
					});		
        		}
      		}
    	});
        this.map.fitBounds(bounds);        
    },
    
    /**
     * Set withLabel property.
     *
     * @param withLabel
     */
    setWithLabel : function(withLabel) {
        this.withLabel = withLabel;
    }
}