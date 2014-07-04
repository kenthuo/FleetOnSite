
function ContigoMarkers(markers, cocs, routes) {
    this.markers = markers ? markers : []; // an array of markers
    this.cocs = cocs ? cocs : []; // circle of certainty for each marker
    this.routes = routes ? routes : []; // routes to connect markers
}

function ContigoMap(opts) {
	var defaults = {
		mapId: "map", // the identity of the DOM element to hold the map
		controlOptions: {
			TrafficOption: true, BestFitOption: true, CenterMapOption: true, CenterLastOption: false, 
			AutoBestFitOption: false, DisplayItemStateOption: false, TabularDataOption: true, LocateOption: true, CoCOption: true
		},
		showLabel: false, showLastLabelOnly: true, drawCircle: false, drawRectangle: false, drawPolygon: false};
	this.opts = $.extend(true, {}, defaults, opts);

    this.mapType = 'cp_rpt_routelog';
    this.map = null; // the google map object
    this.canvas = null; // the canvas object of a map
    this.contextMenu = null; // the context menu of a map
    this.currentClickEvent = null;
    this.isMetric = false; // to use metric system to show information on the map or not
    this.currentLocateFilterMode = LOCATE_MODE.ALL;
    this.currentCocMode = COC_MODE.ALL;
    this.mostRecentLocate = {latLng: null, timestamp: -1};
    this.isAutoCenteringActive = false;
    this.isAutoBestFitActive = false;
    this.isItemStatusActive = true;
    this.isTabularDataActive = false;
    this.geocoder = new google.maps.Geocoder();    
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
		this.canvas = $('#' + this.opts.mapId);
		this.contextMenu = new Gmap3Menu(this.canvas);
		this.initContextMenu();
        
        this.canvas.gmap3({
            defaults:{ 
                classes:{
					InfoWindow: InfoBox,
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
						$this.redrawRouteSegments();
					}
				},
				callback: function(result) {
                    // create custom controls on the map
                    $this.map = $this.canvas.gmap3("get");
					$this.addControl(new MoreControl($this)[0], "top_right");
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
                                $this.clearMap(false);
                                $this.recenter(event.latLng);
                                $this.drawCircle(event.latLng.lat(), event.latLng.lng(), 50);
                            }                        
                        }
                    }
                });
                $this.clearMap(false);
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
                                $this.clearMap(false);
                                $this.recenter(center);
                                $this.drawRectangle(southernEast.lat(), southernEast.lng(), northernWest.lat(), northernWest.lng());
                            }                        
                        }
                    }
                });
                $this.clearMap(false);
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
                                $this.clearMap(false);
                                $this.recenter(center);
                                $this.drawPolygon({polygonZones: [{key: "key", points: [{lat: pointA.lat(), lng: pointA.lng()}, {lat: pointB.lat(), lng: pointB.lng()}, {lat: pointC.lat(), lng: pointC.lng()}]}]});
                            }                        
                        }
                    }
                });
                $this.clearMap(false);
                $this.contextMenu.close();
            });       
        this.contextMenu.add("Clear Markers", "clearMarker separator", 
            function() {
                $this.clearMap(true);
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
    sendPoints: function(poiCollection, isRefreshMap) {
        this.refreshMap(poiCollection);
        // Always store the latest copy
    	this.poiCollection = poiCollection;
        
        if ((isRefreshMap || !this.poiCollection) || this.isAutoBestFitActive) {        
        	this.bestFit();
        }
        
        if (this.isAutoCenteringActive && this.mostRecentLocate) {
        	this.recenter(this.mostRecentLocate.latLng);
        }
    },
    
	/**
	 * Refresh the map. Clear all objects before showing.
	 * 
	 * @param poiCollection
	 */    
    refreshMap: function(poiCollection) {
    	var $this = this;
        var landmarks = poiCollection.landmarks;
	    var beaconItems = poiCollection.beaconItems;
	    var jobCollection = poiCollection.jobs;    
	    var measurementUnit = poiCollection.measurementUnit;
	    this.isMetric = (measurementUnit && measurementUnit.toLowerCase() == "m") ? true : false;  
        var locationMarkers = this.buildLocationMarkers(beaconItems, this.isMetric);
        var mapMarkers = locationMarkers.markers.concat(
            this.buildLandmarkMarkers(landmarks, this.isMetric).markers).concat(
            this.buildJobMarkers(jobCollection, this.isMetric).markers);

	    var mapObjects = {};
        this.clearMap(false);
        this.resetMostRecentLocate();

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
            _.each(locationMarkers.routes, function(route) {
                mapObjects["polyline"]["values"].push({
                    options: {
                        strokeColor: route.color,
                        strokeOpacity: 1.0,
                        strokeWeight: 2,
                        path: route.segment,
                        icons: [POLYLINE_PLAIN_ICON]
                    }
                });
            });
	    }
	    
        this.canvas.gmap3(mapObjects);
        //this.bestFit();
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
		var $this = this, markers = [], cocs = [], routes = [];
        _.each(beaconItems, function(beacon, beaconId) {
	        var locatePoints = beacon.locatePoints;
	        var isPointsConnected = beacon.isPointsConnected;
	        var showInputOutputColor = beacon.showInputOutputColor;
	        var szLocatePoints = locatePoints.length;
	        var initialIndex = 0;
	        
	        // determine the starting and ending index to display location points
	        if (szLocatePoints > 0) {
                var isDescOrder = (Util.toUTC(locatePoints[0]['timestamp']) > Util.toUTC(locatePoints[szLocatePoints - 1]['timestamp']));
                if (isDescOrder) {
                    locatePoints = locatePoints.reverse();
                }
		        initialIndex = $this.determineInitialIndex(locatePoints);
	        }
	        
			for (var i = initialIndex; i < locatePoints.length; i++) {
                var segment = [];
				var point = locatePoints[i];
	            var icon = point.icon;
	            var label = point.label;
	            var coord = point.coord;
	            var eventType = point.eventType;
	            var address = point.address;
	            var stopDuration = point.stopDuration;
	            var speed = point.speed;
	            var direction = point.direction;
	            var timestamp = point.timestamp;
	            var landmark = point.landmark;
	            var circleCertaintyRadius = point.circleCertaintyRadius;
	            var status = point.status;
	            var userNote = point.userNote;
	            var driverID = point.driverID;
	            var driverStatus = point.driverStatus;
	            var beaconID = point.beaconID;
	            var guardianID = point.guardianID;
	            var loginID = point.loginID;
	            var driverName = point.driverName;	
	            var ioprt1Scenario = point.ioprt1Scenario;
	            var ioprt2Scenario = point.ioprt2Scenario;
	            var ioprt3Scenario = point.ioprt3Scenario;
	            var ioprt4Scenario = point.ioprt4Scenario;
	            var lineColor = point.lineColor;
	            var numberLabel = point.numberLabel;
				var dispatch = point.dispatch;
                var tripID = point.tripID;
				var vehicleStatus = point.vehicleStatus;
				var temperature = point.temperature;
				var markerLabel = label;
				var driverNameInItemMode = '';
				
				// show driver Id with vehicle name for dispatch driver mode
	            if (driverID) {
	            	label = driverID + ' (' + label + ')';
	            	markerLabel = driverID;
	            } else if (loginID) {
	            	label = driverName + ' (' + label + ')';
	            	markerLabel = driverName;	            	
	            } else {
	            	if ($this.mapType == 'cp_fleet' || $this.mapType == "cp_rpt_routelog" || $this.mapType == "cp_rpt_stop_map" || $this.mapType == "cp_rpt_routetrip") {
	            		driverNameInItemMode = driverName;
	            	}	            	
	            }

				var isLast = (i == szLocatePoints - 1);
	            if (label) {
	            	var infoContent = $this.buildLocationInfoWindowContents(
		                            label, coord, eventType, address, stopDuration, speed, 
		                            direction, timestamp, landmark, circleCertaintyRadius, 
		                            status, userNote, driverID, driverStatus, beaconID,
		                            guardianID, ioprt1Scenario, ioprt2Scenario, ioprt3Scenario, ioprt4Scenario, lineColor, 
		                            dispatch, isMetric, driverNameInItemMode);
		            
					if (!(!isPointsConnected || (isPointsConnected && isLast)) || $this.mapType == "cp_rpt_routetrip") {
						markerLabel = '';
					}					
                    var labelInfo = $this.generateMarkerLabelInfoByMapType(markerLabel, $this.mapType, icon, isLast, speed, direction, vehicleStatus);
                                    
                    if (isLast) {
		            	$this.setMostRecentLocate(point);
		            }

                    if (!_.isEmpty(labelInfo)) {
                        var marker = {
                            id: TAG_GROUP.LOCATION + "_" + beaconId + "_" + i,
                            tag: [label, TAG_GROUP.LOCATION],
                            latLng: [coord.lat, coord.lng], 
                            data: infoContent,                        
                            options: {
                                title: label,
                                icon: {
                                	url: $this.constructMarkerIconName(icon, numberLabel),
                                	anchor: new google.maps.Point(Math.floor(icon.width / 2), Math.floor(icon.height / 2)),
                                },
                                labelAnchor: labelInfo.anchor,
                                labelClass: labelInfo.classes,
                                labelContent: labelInfo.content}};
						markers.push(marker);
                    }
		            
	            }
                
                circleCertaintyRadius = parseInt(circleCertaintyRadius, 10);
                if (circleCertaintyRadius > 0) {
                    if ($this.currentCocMode == COC_MODE.ALL || $this.currentCocMode == COC_MODE.LAST && isLast) {
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
	        } // for (var i = initialIndex; i < locatePoints.length; i++)
	    }); // _.each(beaconItems, function(beacon)
	    return new ContigoMarkers(markers, cocs, routes);
	},
    
    /**
     * Generate the label information of a marker based on the map type and other criteria.
     *
     * @param label
     * @param mapType
	 * @param icon
     * @param isLast
     * @param speed
     * @param direction
     * @param itemStatus
     */
    generateMarkerLabelInfoByMapType : function(label, mapType, icon, isLast, speed, direction, itemStatus) {
        var classes = content = title = statusClass = '', anchor = null;
		
        if (label) {
			var anchorX = Math.floor(icon.width / 2), anchorY = -Math.floor(icon.height / 2);
        	if (mapType == 'cp_fleet' && isLast) {        		
        		var statusClass = labelClass = '';
            	if (!this.isItemStatusActive) {
					statusClass = 'item_status item_status_disabled';
				} else {
					anchorX = 17, anchorY = 18, statusClass = 'item_status item_status_enabled', labelClass = 'item_status_label_enabled';
            		switch (itemStatus) {
            		case "stop":
                		statusClass += ' stop_status'; break;
            		case "idle":
                		statusClass += ' idle_status'; break;
            		case "move":
						if (!_.isEmpty(speed)) {
							// for the case of an item with speed and direction
							if (!direction) {
								if (_.indexOf(["E", "W", "S", "N", "NE", "NW", "SE", "SW"], direction) > -1) {
									statusClass += ' move_to_' + direction; break;
								} else {
									// unknown direction
									statusClass = labelClass = '', anchorX = Math.floor(icon.width / 2), anchorY = -Math.floor(icon.height / 2);
								}				
							} else {
								// for the case of an item with speed but not direction
                        		statusClass += ' move_status';
							}			
						} else {
							// no speed
							statusClass = labelClass = '', anchorX = Math.floor(icon.width / 2), anchorY = -Math.floor(icon.height / 2);
						}
                		break;
                	default:
						// unknown status
                		statusClass = labelClass = '', anchorX = Math.floor(icon.width / 2), anchorY = -Math.floor(icon.height / 2);
                		break;                
            		}
            	}
            	var compiled = _.template("<div class='<%= statusClass %>'><div class='labels <%= labelClass %>'><%= label %></div></div>");
            	content = $(compiled({label: label, labelClass: labelClass, statusClass: statusClass}))[0]; // get DOM object
        	} else if ((mapType == 'cp_rpt_stop_map_multi' && indexOfMarker == szLocatePoints - 1) || mapType == 'address_to_map') {

        	} else {
            	classes = "labels";
            	content = label;
        	}
			anchor = new google.maps.Point(anchorX, anchorY);
        } else {
        	anchor = null;
        	content = classes = '';
        }
        return {anchor: anchor, classes: classes, content: content};
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
            iconName = numberLabel && numberLabel > 0 ? NUMBERS_ICON_HOST_PATH + icon.name + "-" + numberLabel + ".png" : ICON_HOST_PATH + icon.name + ".png";
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
	                guardianID, ioprt1Scenario, ioprt2Scenario, ioprt3Scenario, ioprt4Scenario, lineColor, dispatch, isMetric, driverName) {        
                    
	    var infoContent = "<div class='marker_infowindow'>";
	    infoContent += "<div class='marker_infowindow_title'>" + label + "</div>";
		infoContent += "<div class='marker_infowindow_content'>";
		infoContent += "<div class='event_time'>";
	    infoContent += this.createMarkerInfoWindowPara("<span class='date_time'>" + timestamp + "</span>");

	    infoContent += (speed) ? this.createMarkerInfoWindowPara("<span class='speed'>" + speed + "</span> <span class='direction'>" + direction + "</span>") : "";
		infoContent += "</div>";
	    infoContent += "<div class='event_location'>";
	    infoContent += this.createMarkerInfoWindowPara("<span class='street_address'>" + address.street + "</span>");

	    var secondAddressLine = "";
	    var city = address.city;
	    var county = address.county;
	    var stateProvince = address.state;
	    secondAddressLine += (city) ? "<span class='city'>" + city + "</span>" : "";
	    secondAddressLine += (county) ? ((secondAddressLine) ? ", <span class='county'>" + county + "</span>" : "<span class='county'>" + county + "</span>") : "";
	    secondAddressLine += (stateProvince) ? ((secondAddressLine) ? ", <span class='state_province'>" + stateProvince + "</span>" : "<span class='state_province'>" + stateProvince + "</span>") : "";
	    secondAddressLine += " <span class='postal_code'>" + address.postalCode + "</span>";
	    infoContent += this.createMarkerInfoWindowPara(secondAddressLine);

	    infoContent += this.createMarkerInfoWindowPara("<span class='country'>" + address.country + "</span>");
	    infoContent += (stopDuration) ? this.createMarkerInfoWindowPara(stopDuration) : "";

        if (!isMetric) {
            var cocValueFeet = Math.round(circleCertaintyRadius) * 3.2808399;
            infoContent += (cocValueFeet > 0) ? this.createMarkerInfoWindowPara(cocValueFeet + " ft accuracy (radius)") : "";
        } else {
            var cocValueMetres = circleCertaintyRadius;
            infoContent += (cocValueMetres > 0) ? this.createMarkerInfoWindowPara(cocValueMetres + " m accuracy (radius)") : "";
        }

        if (coord) {
            if (this.latLonDisplayed) {
                infoContent += this.createMarkerInfoWindowPara("<span class='show'>Lat/Long: (" + "<span class='latitude'>" + coord.lat + "</span>, <span class='longitude'>" + coord.lng + "</span>)</span>");
            } else {
                infoContent += this.createMarkerInfoWindowPara("<span class='hide'>Lat/Long: (" + "<span class='latitude'>" + coord.lat + "</span>, <span class='longitude'>" + coord.lng + "</span>)</span>");
            }
        }
	    infoContent += (coord && this.latLonDisplayed) ? this.createMarkerInfoWindowPara("Lat/Long: (" + "<span class='latitude'>" + coord.lat + "</span>, <span class='longitude'>" + coord.lng + "</span>)") : "";
	    infoContent += (eventType) ? this.createMarkerInfoWindowPara("Event Type: <span class='event_type'>" + eventType + "</span>") : "";
	    infoContent += (landmark) ? this.createMarkerInfoWindowPara("Landmark: <span class='landmark'>" + landmark + "</span>") : "";
	    infoContent += "</div>";
        infoContent += Util.getStreetView(coord.lat, coord.lng, direction);
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
        var $this = this;    
		var markers = [];
        _.each(landmarks, function(landmark, i) {
			var icon = landmark.icon;
			var coord = landmark.coord;
			var label = landmark.label;
			var category = landmark.category;
			var userNote = landmark.userNote;
			var lmkAddress = landmark.lmkAddress;
			var content = landmark.content;
			var numberLabel = landmark.numberLabel;
			var dispatch = landmark.dispatch;
			
			if (category) {
				label += " (" + category + ")";
			}
			var markerLabel = label;
			
			var labelInfo = $this.generateMarkerLabelInfoByMapType(markerLabel, $this.mapType, icon);
			if (label) {
                var infoContent = $this.buildLmkInfoWindowContents(label, userNote, lmkAddress, content, dispatch, coord);
                var marker = {
                    id: TAG_GROUP.LANDMARK + "_" + i,
                    tag: [label, TAG_GROUP.LANDMARK],
                    latLng: [coord.lat, coord.lng], 
                    data: infoContent,    
                    options: {
                        title: label,
                        icon: {
							url: $this.constructMarkerIconName(icon, numberLabel),
							anchor: new google.maps.Point(Math.floor(icon.width / 2), Math.floor(icon.height / 2)),
                        },
                        labelAnchor: labelInfo.anchor,
                        labelClass: labelInfo.classes,
                        labelContent: labelInfo.content}};
                markers.push(marker);
			}	        
        });
		
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
	 * @param coord 
	 *
	 * @return string the content of landmark's InfoWindow
	 */
	buildLmkInfoWindowContents : function(label, userNote, lmkAddress, content, dispatch, coord) {		
		// dispatch.id: 11903|1008 Homer Street, Vancouver, BC, Canada, V6B 2X1|49.27727|-123.12019|407|1008 Homer Street
		var compiled = _.template("\
		<div class='marker_infowindow'>\
			<div class='marker_infowindow_title'><%= label %></div>\
			<div class='marker_infowindow_content'>\
			<% if (dispatch) { %>\
				<div class='dispatch_toolbar'>\
					<div><a href='#' id='sendjob_<%= type %>_<%= landmarkId %>'><img src='<%= ICON_HOST_PATH %>send_job.png'></a></div>\
				</div>\
			<% } %>\
			<% if (userNote || lmkAddress || content) { %>\
				<div class='landmark_info'>\
				<% if (userNote) { %><p><span class='user_note'><%= userNote %></span></p><% } %>\
				<% if (lmkAddress) { %><p><span class='landmark_address'><%= lmkAddress %></span></p><% } %>\
				<% if (content) { %><p><span class='landmark_content'><%= content %></span></p><% } %>\
				</div>\
			<% } %>\
			<%= streetView %>\
			</div>\
		</div>\
		");
        content = $(compiled({label: label, dispatch: dispatch, type: dispatch ? dispatch.type : "", landmarkId: dispatch ? dispatch.id.split("|")[0] : "", 
        	ICON_HOST_PATH: ICON_HOST_PATH, userNote: userNote, lmkAddress: lmkAddress, content: content,
        	streetView: Util.getStreetView(coord.lat, coord.lng)}))[0]; // get DOM object
        return content;
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
		var $this = this, markers = [];
        _.each(jobCollection, function(jobs, beaconId) {
            _.each(jobs, function(job) {
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
                    var infoContent = $this.buildJobInfoWindowContents(
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
                            icon: {url: $this.constructMarkerIconName(icon, numberLabel)},
                            labelAnchor: new google.maps.Point(Math.floor(label.length * 2.5), -10, -2),
                            labelClass: "labels",
                            labelStyle: {opacity: 0.75},
                            labelContent: label}};
		            markers.push(marker);
				}
			});				
		});
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
		jobLocation += ((landmark) ? "<div class='job_landmark'>(" + landmark + ")</div>" : "");
		jobLocation += "<div class='job_destination'>" + destination + "</div>";
		jobLocation += "</div>";
		
		jobDetails = "<table class='job_details'>";
		jobDetails += "<tr><td class='job_details_title'>Priority</td><td class='job_priority'>" + ((priority == -1) ? "-" : priority) + "</td></tr>";
		jobDetails += "<tr><td class='job_details_title'>Status:</td><td class='job_status'>" + ((status) ? status : "-") + "</td></tr>";
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
	 * Show InfoWindow of a marker on the map. Use InfoBubble class to replace default InfoWindow class.
	 * 
	 * @param marker
	 * @param content
	 * @param onClose a callback function when user clicks close(x) icon
	 * @see https://google-maps-utility-library-v3.googlecode.com/svn/trunk/infobox/docs/reference.html
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
					options: {
						content: content, 
						maxWidth: 0, pixelOffset: new google.maps.Size(-140, 10), 
						boxStyle: { background: "url('images/tipbox.gif') no-repeat", width: "300px"}, 
						closeBoxMargin: "13px 5px 5px 5px", closeBoxURL: "images/close.gif", infoBoxClearance: new google.maps.Size(1, 1)
					},
					events: {
						closeclick: function(infowindow) {
                            if (_.isFunction(onClose)) {
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
			this.redrawRouteSegments();
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
	 * Redraw the route segments if exists. The decorated icon of the route is based on
	 * the length in point. If the length is greater a given number, then the decorated
	 * icon will be shown, otherwise just a plain line.
	 */
	redrawRouteSegments : function() {
		var $this = this;
		this.canvas.gmap3({
			get: {
				name: "polyline",
				all: true,
				callback: function(segments) {
					$.each(segments, function(i, segment) {
						var path = segment.getPath().getArray();
						var distance = Util.distanceBetween(Util.fromLatLngToPoint(path[0], $this.map), Util.fromLatLngToPoint(path[1], $this.map));
						var icon = POLYLINE_PLAIN_ICON;
						if (distance > 30) {
							icon = POLYLINE_DECORATED_ICON;
						}
						segment.setOptions({
							options: {
								icons: [icon]
							}});
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
        if (_.isObject(polygonZoneCollection)) {
			var polygonZones = polygonZoneCollection.polygonZones;
            if (_.isArray(polygonZones)) {
                _.each(polygonZones, function(polygonZone) {
                    var vertices = _.reduce(polygonZone.points, function(memo, point) {
                        memo.push(_.values(point));
                        return memo;
                    }, []);
                    
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
                });
                
            	szPolygons = polygonZones.length;
                
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
		this.poiCollection = {};
        this.mostRecentLocate = null;
		clearMap(backToDefault);
	},
    
	/**
	 * Clear all of objects on the map.
	 */
	clearMap: function(backToDefault) {
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
					$this.bestFit();
                }
            }
        });
	},
    
	/**
	 * Enables the "auto best fit" feature.  If the "auto centering" feature
	 * is already enabled, it will be disabled.
	 *
	 * @param enabled  Whether the "auto best fit" feature is to be enabled.
	 */
	enableAutoBestFit : function(enabled) {  
		if (enabled) {    
			if (this.isAutoCenteringActive) {
				this.isAutoCenteringActive = false;
			}
			this.isAutoBestFitActive = true;    
		} else {
			this.isAutoBestFitActive = false;
		}
	},
	
	/**
	 * Enables the "auto centering" feature.  If the "auto best fit" feature
	 * is already enabled, it will be disabled.
	 *
	 * @param enabled  Whether the "auto centering" feature is to be enabled.
	 */
	enableAutoCentering : function(enabled) {  
		if (enabled) {    
			if (this.isAutoBestFitActive) {
				this.isAutoBestFitActive = false;
			}    
			this.isAutoCenteringActive = true;    
		} else {
			this.isAutoCenteringActive = false;
		}
	},
	
	/**
	 * Toggle item state feature of markers on the map.
	 * 
	 * @param boolean enabled true to show the icon of item state for markers on the map, vice versa.
	 */
	enableItemState : function(enabled) {
		this.isItemStatusActive = enabled;
		$('.item_status').each(function(index, value) {
			if (enabled) {
				$(this).removeClass("item_status_disabled").addClass("item_status_enabled").children(":first").removeClass("item_status_label_disabled").addClass("item_status_label_enabled");
			} else {
				$(this).removeClass("item_status_enabled").addClass("item_status_disabled").children(":first").removeClass("item_status_label_enabled").addClass("item_status_label_disabled");
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
        _.each(["marker", "circle", "rectangle", "polygon"], function(overlay) {
            $this.canvas.gmap3({
                get: {
                	name: overlay,
					all: true,
					callback: function(shapes) {
						$.each(shapes, function(j, shape) {
                            bounds = _.isFunction(shape.getPosition) ? bounds.extend(shape.getPosition()) : bounds.union(shape.getBounds());
						});
                        $this.map.fitBounds(bounds); // this will also trigger zoom_changed of the map
        			}
      			}
            });
        });
    },
    
    /**
	 * Based on the beacon locate point passed it, this method determines
	 * whether it is the most recent locate point of all locate points
	 * currently displayed on the map.
	 *
	 * @param locatePoint  The ContigoBeaconPoi locate point object to
	 *                     be considered.
	 */
	setMostRecentLocate : function(locatePoint) {  
		var timestamp = Util.parseTimestampString(locatePoint.timestamp);
		
		if (timestamp > this.mostRecentLocate.timestamp) {        
			this.mostRecentLocate.timestamp = timestamp;
			this.mostRecentLocate.latLng = new google.maps.LatLng(locatePoint.coord.lat, locatePoint.coord.lng);
		}
	},
	
	/**
	 * Reset the mostRecentLocate variable to the default value.
	 *
	 */
	resetMostRecentLocate : function() {
        this.mostRecentLocate.latLng = null;
        this.mostRecentLocate.timestamp = -1;
	},
    
    /**
     * Add custom control to the map. Gmap3 is lack of this feature.
     *
     * @param control a DOM object representing the control.
	 * @param position one of "TOP_CENTER", "TOP_LEFT", "TOP_RIGHT", "LEFT_TOP", "RIGHT_TOP", 
	 *			"LEFT_CENTER", "RIGHT_CENTER", "LEFT_BOTTOM", "RIGHT_BOTTOM", "BOTTOM_CENTER", 
	 *			"BOTTOM_LEFT", "BOTTOM_RIGHT" on the map.
     */
    addControl: function(control, position) {
        var positionIndex = google.maps.ControlPosition[position.toUpperCase()];
        this.controls.push(control);
        this.map.controls[positionIndex].push(control);
        return control;			
    },
    
    /**
     * Detect if the checkbox option in a dropdown menu is checked or not.
     *
     * @param checkboxOption a checkbox option object
     */
    idOptionChecked: function(checkboxOption) {
        return $(checkboxOption).find('.checkbox_image_container:first').is(':visible');
    }
}