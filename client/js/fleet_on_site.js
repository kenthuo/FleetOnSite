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

function ContigoMarkers(markers, cocs, routes) {
    this.markers = markers ? markers : []; // an array of markers
    this.cocs = cocs ? cocs : []; // circle of certainty for each marker
    this.routes = routes ? routes : []; // routes to connect markers
}

function MoreControl(contigoMap) {
    var liveTrafficOption = contigoMap.createControl({
        type: "checkbox",
        position: 'top_right',
        content: 'Live Traffic',
        title: 'Show live traffic information',
        classes: "select_checkbox_option",
        highlight: true,
        events: {
            click: function() {
                contigoMap.idOptionChecked(this) ? contigoMap.canvas.gmap3("trafficlayer") : contigoMap.clear({name: ["trafficlayer"]});
            }
        }    
    });
    var bestFitOption = contigoMap.createControl({
        type: "option",
        content: 'Best Fit',
        title: "Best fit",
        classes: "select_option",
        highlight: true,
        events: {
            click: function() {
                contigoMap.bestFit();
            }            
        }
    });
    var centerMapOption = contigoMap.createControl({
        type: "option",
        content: 'Center Map',
        title: "Center map",
        classes: "select_option",
        highlight: true,
        events: {
            click: function() {
                alert('Center map');
            }            
        }
    });    
    var centerLastOption = contigoMap.createControl({
        type: 'checkbox',
        id: 'center_last_option',
        title: 'Center last',
        content: 'Center Last',
        classes: 'select_checkbox_option',
        highlight: true,
        events: {
            click: function() {
                contigoMap.isAutoCenteringActive = contigoMap.idOptionChecked(this);
            }       
        }
    });     
    var autoBestFitOption = contigoMap.createControl({
        type: 'checkbox',
        id: 'auto_best_fit_option',
        title: 'Auto best fit',
        content: 'Auto Best Fit',
        classes: 'select_checkbox_option',
        highlight: true,
        events: {
            click: function() {
                contigoMap.isAutoBestFitActive = contigoMap.idOptionChecked(this);
            }       
        }
    });
    var displayItemStatusOption = contigoMap.createControl({
        type: 'checkbox',
        id: 'display_item_status_option',
        title: 'Display item status',
        content: 'Display Item Status',
        classes: 'select_checkbox_option',
        highlight: true,
        events: {
            click: function() {
                contigoMap.isItemStatusActive = contigoMap.idOptionChecked(this);
            }       
        }
    });
    var options = contigoMap.createControl({
        classes: "options_container",
        children: [
            liveTrafficOption,
            contigoMap.createControl({
                classes: "option_separator"
            }),            
            centerMapOption,
            bestFitOption,
            contigoMap.createControl({
                classes: "option_separator"
            }), 
            centerLastOption,
            autoBestFitOption,
            displayItemStatusOption
        ]
    });
    return {
        id: 'more_control',
        position: 'top_right',
        type: "select",
        content: "More ...",
        title: "Show more control options",
        children: [options],
        highlight: true,
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
    }
}

function ContigoMap(mapId) {
    this.mapId = mapId ? mapId : 'map'; // the identity of the DOM element to hold the map
    this.map = null; // the google map object
    this.canvas = null; // the canvas object of a map
    this.contextMenu = null; // the context menu of a map
    this.currentClickEvent = null;
    this.isMetric = false; // to use metric system to show information on the map or not
    this.currentLocateFilterMode = LOCATE_MODE.ALL;
    this.currentCocMode = COC_MODE.ALL;
    this.isAutoCenteringActive = false;
    this.isAutoBestFitActive = false;
    this.isItemStatusActive = false;
    this.geocoder = new google.maps.Geocoder();
    this.withMarkerLabel = true; // with lable for markers
    this.poiCollection = null;
    this.controls = [];
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
                    center: DEFAULT.CENTER_COORDINATE,
                    zoom: DEFAULT.ZOOM_LEVEL,
                    mapTypeId: google.maps.MapTypeId.ROADMAP,
                    mapTypeControl: true,
                    mapTypeControlOptions: {
                        style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
                    },
                    navigationControl: true,
                    scrollwheel: true,
                    streetViewControl: true
                },
                events: {
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
				},
				callback: function(result) {
                    // create custom controls on the map
                    $this.map = $this.canvas.gmap3("get");
                    $this.addControl(new MoreControl($this));
      			}
            }
        });
        this.markCenter();
	},
	
	/**
	 * Add menu item to the context menu.
	 */
	initContextMenu: function() {
		var $this = this;
        this.contextMenu.add("Draw Circle", "drawCircle", 
            function() {
                $this.map.unbind("click");
                $this.canvas.gmap3({
                    map: {
                        events: {
                            // on clicking, draw a pre-defined circle with 
                            // the clicking point as the center, and 50 meters as radius
                            click: function(sender, event, context) {
                                $this.reset(false);
                                $this.recenter(event.latLng);
                                $this.drawCircle(event.latLng.lat(), event.latLng.lng(), 50);
                            }                        
                        }
                    }
                });
                $this.reset(false);
                $this.contextMenu.close();
            });
        this.contextMenu.add("Draw Rectangle", "drawRectangle", 
            function() {
                $this.map.unbind("click");
                $this.canvas.gmap3({
                    map: {
                        events: {
                            // on clicking, draw a pre-defined rectangle with 
                            // the clicking point as the center, and 100 meters as diagonal
                            click: function(sender, event, context) {
                            	var center = event.latLng;
                            	var spherical = google.maps.geometry.spherical;
                            	var northernWest = spherical.computeOffset(center, 50, -45);
								var southernEast = spherical.computeOffset(center, 50, 135);
                                $this.reset(false);
                                $this.recenter(center);
                                $this.drawRectangle(southernEast.lat(), southernEast.lng(), northernWest.lat(), northernWest.lng());
                            }                        
                        }
                    }
                });
                $this.reset(false);
                $this.contextMenu.close();
            });
        this.contextMenu.add("Draw Polygon", "drawPolygon separator", 
            function() {
                $this.canvas.gmap3({
                    map: {
                        events: {
                            // on clicking, draw a pre-defined equilateral triangle (minimal polygon) with 
                            // the clicking point as the center, and 50 meters as distance to each vertex
                            click: function(sender, event, context) {
                            	//{polygonZones: [{key: name1, points: [{lat: lat1, lng: lng1}, {lat: lat2, lng: lng2}, ...]}, ...]}
                                var center = event.latLng;
                                var spherical = google.maps.geometry.spherical;
                                var pointA = spherical.computeOffset(center, 50, 0);
                                var pointB = spherical.computeOffset(center, 50, 120);
                                var pointC = spherical.computeOffset(center, 50, -120);
                                $this.reset(false);
                                $this.recenter(center);
                                $this.drawPolygon({polygonZones: [{key: "key", points: [{lat: pointA.lat(), lng: pointA.lng()}, {lat: pointB.lat(), lng: pointB.lng()}, {lat: pointC.lat(), lng: pointC.lng()}]}]});
                            }                        
                        }
                    }
                });
                $this.reset(false);
                $this.contextMenu.close();
            });        
        this.contextMenu.add("Show All Locates", "showAllLocate", 
            function() {
            	$this.filterLocatePoints(LOCATE_MODE.ALL);
                $this.contextMenu.close();
            });
        this.contextMenu.add("Show Last 3 Locates", "showLast3Locate", 
            function() {
            	$this.filterLocatePoints(LOCATE_MODE.LAST3);
                $this.contextMenu.close();
            });
        this.contextMenu.add("Show Last Locate", "showLastLocate", 
            function() {
            	$this.filterLocatePoints(LOCATE_MODE.LAST);
                $this.contextMenu.close();
            });             
        this.contextMenu.add("Clear Markers", "clearMarker separator", 
            function() {
                $this.reset(true);
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
				$this.filterCoCs(COC_MODE.ALL);
				$this.contextMenu.close();
			});
		this.contextMenu.add("Show Last CoC", "showLastCoC", 
			function() {
				$this.filterCoCs(COC_MODE.LAST);
				$this.contextMenu.close();
			});
		this.contextMenu.add("Hide CoC", "hideCoC separator", 
			function() {
				$this.filterCoCs(COC_MODE.NONE);
				$this.contextMenu.close();
			});
		this.contextMenu.add("View Address", "viewAddress", 
			function() {
				$this.clear({tag: TAG_GROUP.ADDRESS});
				$this.geocoder.geocode({'latLng': $this.currentClickEvent.latLng}, function(results, status) {
					if (status == google.maps.GeocoderStatus.OK) {
						if (results[0]) {
							$this.canvas.gmap3({
            					marker: {
                					tag: TAG_GROUP.ADDRESS,
                					latLng: $this.currentClickEvent.latLng,
                					options: {
                    					icon: ICON_HOST_PATH + "red_dot.png"
                					},
                					callback: function(marker) {
                						$this.showInfoWindow(
                							marker, 
                							results[0].formatted_address, 
                							function() {$this.clear({tag: TAG_GROUP.ADDRESS});})
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
			 	CENTER_ICON.url, 
			 	null, 
			 	null, 
			 	new google.maps.Point(Math.floor(CENTER_ICON.width / 2), Math.floor(CENTER_ICON.height / 2))),
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
        // Always store the latest copy
    	this.poiCollection = poiCollection;
    },
    
	/**
	 * Refresh the map. Clear all objects before showing.
	 * 
	 * @param poiCollection
	 */    
    refreshMap: function(poiCollection) {
    	var $this = this;
        var mapMarkers = [];
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
        this.reset(false);
	    
	    if (mapMarkers.length > 0) {
	    	mapObjects["marker"] = {
                values: mapMarkers,
                options: {
                    draggable: false
                },
                events: {
                	click: function(marker, event, context) {
                		$this.showInfoWindow(marker, context.data);
            		}
                }
            }
	    }
	    
	    if (locationMarkers.cocs.length > 0) {
	    	mapObjects["circle"] = {values: locationMarkers.cocs};
	    }
	    
	    if (locationMarkers.routes.length > 0) {
            mapObjects["polyline"] = {};
            mapObjects["polyline"]["values"] = [];
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
	    
        this.canvas.gmap3(mapObjects);
        this.bestFit();
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
		var markers = [],
            cocs = [],
            routes = [];
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
                var segment = [];
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
                    if (this.withMarkerLabel) {
                        marker = {
                            tag: [label, TAG_GROUP.LOCATION],
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
                            tag: [label, TAG_GROUP.LOCATION],
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
                    if (this.currentCocMode == COC_MODE.ALL || this.currentCocMode == COC_MODE.LAST && i == szLocatePoints - 1) {
                        var circle = {
                            tag: TAG_GROUP.COC,
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

	    if (this.currentLocateFilterMode == LOCATE_MODE.LAST3) {
	        if (szLocatePoints > 2) {
           	 	initialIndex = szLocatePoints - 3;
	        }
	    } else if (this.currentLocateFilterMode == LOCATE_MODE.LAST) {
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
		var markers = [];
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
                    tag: [label, TAG_GROUP.LANDMARK],
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
		var markers = [];
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
                    	tag: [label, TAG_GROUP.JOB],
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
	 * Show InfoWindow of a marker on the map
	 *
	 * @param marker
	 * @param content
	 * @param onClose a callback function when user clicks close(x) icon
	 */
	showInfoWindow: function(marker, content, onClose) {
		var infowindow = this.canvas.gmap3({get:{name:"infowindow"}});
		if (infowindow) {
			infowindow.open(marker.getMap(), marker);
			infowindow.setContent(content);
		} else {
			this.canvas.gmap3({
				infowindow: {
					anchor: marker,
					options: {content: content},
					events: {
						closeclick: function(infowindow) {
							if (typeof onClose == "function") {
								onClose.call();
							}
						}
					}
				}
			});
		}
	},
	
	/**
	 * Filters locate markers on the map, based on the mode selected
	 * from the JavaScript layer.
	 *
	 * @param mode  If the mode is 1, all locate points are shown for each 
	 *              beacon.  If the mode is 2, only the last three most recent
	 *              points are shown.  If the mode is 3, only the most recent
	 *              point is shown.  By default, all locate points are shown.
	 */
	filterLocatePoints : function(mode) {
	    if (this.poiCollection) {
	        this.currentLocateFilterMode = mode;
	        this.refreshMap(this.poiCollection);
	    }
	},
	
	/**
	 * Changes the current Circle of Certainty (CoC) filter mode, and forces a
	 * redraw based on the new filter mode at the current zoom level.
	 *
	 * @param mode  The mode, as a Number, where 1 = "most recent point only",
	 *              2 = "all points", and 3 = "no points".
	 */
	filterCoCs : function(mode) {
		this.currentCocMode = mode;
		this.canvas.gmap3({
			get: {
				tag: TAG_GROUP.COC,
				all: true,
				callback: function(circles) {
					$.each(circles, function(i, circle) {
						circle.setVisible((mode == COC_MODE.LAST) ? (i == circles.length - 1) : (mode == COC_MODE.ALL ? true : false));
					});	
        		}
      		}
    	});
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
                tag: TAG_GROUP.CIRCLE_ZONE,
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
     * @param lng1 The longitude of the first coordinate, in decimal degrees.
     * @param lat2 The latitude of the second coordinate, in decimal degrees.
     * @param lng2 The longitude of the second coordinate, in decimal degrees.
     */ 
    drawRectangle : function(lat1, lng1, lat2, lng2) {    
        this.canvas.gmap3({
            rectangle: {
                tag: TAG_GROUP.RECTANGLE_ZONE,
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
	drawPolygon : function(polygonZoneCollection) {
        var szPolygons = 0;
        var polygons = [];
        if (polygonZoneCollection) {
			var polygonZones = polygonZoneCollection.polygonZones;
            if (polygonZones) {
            	szPolygons = polygonZones.length;
                for (var i = 0; i < szPolygons; i++) {
            		var polygonInfo =  polygonZones[i];
                    var zoneName = polygonInfo.key;
                    var vertices = [];
                    for (var j = 0; j < polygonInfo.points.length; j++) {
                    	var point = polygonInfo.points[j];
                    	vertices.push([polygonInfo.points[j].lat, polygonInfo.points[j].lng]);
                    }

                    var polygon = {
                    	tag: TAG_GROUP.POLYGON_ZONE,
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
	 * Center the map to a particular latitude/longitude.
	 * 
	 * @param latLng the lat/lng of a point
	 */
	recenter : function (latLng) {
	    if (latLng) {
	        this.map.setCenter(latLng);
            this.map.setZoom(17);
	    }
	},
	
	/**
	 * Clear all of objects on the map, and empty the poi collection.
	 */
	reset: function(backToDefault) {
		//this.poiCollection = {};
		this.clear({name: ["marker", "polyline", "circle", "rectangle", "polygon"]});
		if (backToDefault) {
			this.map.setCenter(DEFAULT.CENTER_COORDINATE);
			this.map.setZoom(DEFAULT.ZOOM_LEVEL);
		}
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
	 * Resize the map.
	 * 
	 * @param width
	 * @param height
	 */
	resize : function(width, height) {
        var $this = this;
		this.canvas.width(width).height(height).gmap3({
            trigger: {
                eventName: "resize", 
                callback: function() {
                    $this.refreshMap($this.poiCollection);
                }
            }
        });
	},
    
    /**
     * Fit all of markers, rectangles, circles, polygons to be visible on the map.
     */
    bestFit : function() {
        var $this = this;
        //  Create a new viewpoint bound
        var bounds = new google.maps.LatLngBounds();
        var shapeTypes = ["marker", "circle", "rectangle", "polygon"];
        for (var i = 0; i < shapeTypes.length; i++) {
        	this.canvas.gmap3({
            	get: {
                	name: shapeTypes[i],
					all: true,
					callback: function(shapes) {
						$.each(shapes, function(j, shape) {
							if (typeof shape.getPosition == "function") {
                                // for marker or markerWithLabel
								bounds = bounds.extend(shape.getPosition());
							} else {
								bounds = bounds.union(shape.getBounds());
							}
						});
                        $this.map.fitBounds(bounds); 
        			}
      			}
    		});
        }
       
    },
    
    /**
     * Set withMarkerLabel property.
     *
     * @param withMarkerLabel
     */
    setWithMarkerLabel : function(withMarkerLabel) {
        this.withMarkerLabel = withMarkerLabel;
    },
    
    /**
     * Create a DOM element to represent the custom control.
     *
     * @param options an object holds related properties of the control.
     */
    createControl: function(options) {
        var control = document.createElement('div');
        var highlightElm = control;
        switch (options.type) {
        case "select":
            var innerContainer = document.createElement('div');
            innerContainer.className = "select_dropdown";
            if (options.content) {
                innerContainer.innerHTML = options.content;
            }
            var arrow = document.createElement('img');
            arrow.src = IMG_HOST_PATH + "arrow-down.png";
            arrow.className = "select_arrow";
            innerContainer.appendChild(arrow);
            control.appendChild(innerContainer);
            highlightElm = innerContainer;
            break;
        case "checkbox":
            var span = document.createElement('span');
            span.className = 'uncheckbox_span';
            span.role = 'checkbox';
            var checkbox = document.createElement('div');
            checkbox.className = 'uncheckbox_image_container';
            //checkbox.id = "uncheckbox_image_container";
            var image = document.createElement('img');
            image.className = "uncheckbox_image";
            image.src = IMG_HOST_PATH + "imgs8.png";
            var label = document.createElement('label');
            label.className = 'uncheckbox_label';
            label.innerHTML = options.content;
            checkbox.appendChild(image);
            span.appendChild(checkbox);
            control.appendChild(span);
            control.appendChild(label);
            break;
        case "option":
        default:
            if (options.content) {
                control.innerHTML = options.content;
            }
            break;
        }
        if (options.id) {
            control.id = options.id;
        }          
        if (options.children) {
            for (i = 0; i < options.children.length; i++) {
                control.appendChild(options.children[i]);
            }
        }

        control.style.cursor = 'pointer';
        for (var option in options.style) {
            control.style[option] = options.style[option];
        }
        if (options.title) {
            control.title = options.title;
        }
        if (options.classes) {
            control.className = options.classes;
        }
        
        if (options.type == "checkbox") {
            (function(object, name) {
                google.maps.event.addDomListener(object, name, function() {
                    $(checkbox).is(":visible") ? $(checkbox).hide() : $(checkbox).show();
                });
            })(control, "click");
        }
        if (options.highlight == true) {
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
        }
        
        for (var event in options.events) {
            (function(object, name) {
                google.maps.event.addDomListener(object, name, function() {
                    options.events[name].apply(this, [this]);
                });
            })(control, event);
        }
        control.index = 1;
        return control;
    },
    
    /**
     * Add custom control to the map. Gmap3 is lack of this feature.
     *
     * @param options an object holds related properties of the control.
     */
    addControl: function(options) {
        var position = google.maps.ControlPosition[options.position.toUpperCase()];
        delete options.position;
        var control = this.createControl(options);
        this.controls.push(control);
        this.map.controls[position].push(control);
        return control;
    },
    
    /**
     * Detect if the checkbox option in a dropdown menu is checked or not.
     *
     * @param checkboxOption a checkbox option object
     */
    idOptionChecked: function(checkboxOption) {
        return $(checkboxOption).find('.uncheckbox_image_container:first').is(':visible');
    }
}