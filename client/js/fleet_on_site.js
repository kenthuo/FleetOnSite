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
        type: 'checkbox',
        position: 'top_right',
        content: 'Live Traffic',
        title: 'Show live traffic information',
        classes: 'select_checkbox_option',
        highlight: true,
        events: {
            click: function() {
                contigoMap.idOptionChecked(this) ? contigoMap.canvas.gmap3('trafficlayer') : contigoMap.clear({name: ['trafficlayer']});
            }
        }    
    });
    var bestFitOption = contigoMap.createControl({
        type: 'option',
        content: 'Best Fit',
        title: 'Best fit',
        classes: 'select_option',
        highlight: true,
        events: {
            click: function() {
                contigoMap.bestFit();
            }            
        }
    });
    var centerMapOption = contigoMap.createControl({
        type: 'option',
        content: 'Center Map',
        title: 'Center map',
        classes: 'select_option',
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
        checked: true,
        events: {
            click: function() {
                contigoMap.enableItemStatus(contigoMap.idOptionChecked(this));
            }       
        }
    });
    var tabularDataOption = contigoMap.createControl({
        type: 'checkbox',
        id: 'tabular_data_option',
        title: 'Show tabular data',
        content: 'Tabular Data',
        classes: 'select_checkbox_option',
        highlight: true,
        events: {
            click: function() {
                contigoMap.isTabularDataActive = contigoMap.idOptionChecked(this);
                if (contigoMap.isTabularDataActive) {
                    contigoMap.canvas.gmap3({
                        panel: {
                            options: {
                                content: 
                                    '<div id="tabs">\
                                        <ul>\
                                            <li><a href="#tabs_locate">Event Location</a></li>\
                                            <li><a href="#tabs_landmark">Landmark</a></li>\
                                            <li><a href="#tabs_job">Job</a></li>\
                                        </ul>\
                                        <div id="tabs_locate"></div>\
                                        <div id="tabs_landmark"></div>\
                                        <div id="tabs_job"></div>\
                                    </div>',
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
                                            var locationTable = $("<table id='location_table'></table>");
                                            var locationThead = $("<thead></thead>").append("<tr>" + _.reduce(["", "Date/Time", "Nearest Address", "Latitude", "Longitude", "Event", "Dir", "Speed", "Type/Age"], function(memo, column){ return memo + "<td>" + column + "</td>"; }, "") + "</tr>");
                                            var locationTbody = $("<tbody></tbody>");
                                            _.each(markers, function(marker, j) {
                                                var dateTime = landmark = address = "";
                                                var html = $(marker.data);
                                                landmark = html.find(".landmark").html();
                                                dateTime = html.find(".date_time").html().match(/^(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}[A|P]M [a-zA-Z]*)(.*\(GPS Age: |)([a-zA-Z0-9 ]+|)(\)|)/); // "08/21/2012 02:17:24PM EDT " || 08/20/2012 08:05:01PM EDT <br>(GPS Age: 0h 05m 01s)
                                                
                                                address = _.reduce([
                                                    html.find(".street_address").html(), 
                                                    html.find(".city").html(), 
                                                    html.find(".county").html(), 
                                                    html.find(".state_province").html(), 
                                                    html.find(".country").html(), 
                                                    html.find(".postal_code").html()], function(memo, part) { return memo ? (memo + (part ? ", " + part : "")) : part;}, "");

                                                address = address ? ("<a id='" + marker.id + "'>" + address + "</a>") : "";
                                                address = landmark ? ("<b>" + landmark + "</b>" + address) : address;
                                                
                                                locationTbody.append("<tr>" + _.reduce([
                                                    "[" + ++j + "]", 
                                                    dateTime[1], 
                                                    address,
                                                    marker.object.getPosition().lat().toFixed(5),
                                                    marker.object.getPosition().lng().toFixed(5),
                                                    html.find(".event_type").html(), 
                                                    html.find(".direction").html(), 
                                                    html.find(".speed").html(), 
                                                    dateTime[3]], function(memo, data){ return memo + "<td>" + (data ? data : "") + "</td>"; }, "") + "</tr>");
                                                $(locationTbody).on("click", "#" + marker.id, function() {
                                                    // due to 'full' property is true, the real marker object is stored in marker.object property
                                                    google.maps.event.trigger(marker.object, 'click');
                                                });
                                            });
                                            locationTable.append(locationThead);                                            
                                            locationTable.append(locationTbody);
                                            $("#tabs_locate").append(locationTable);                                            
                                        }
                                    }
                                });
                                contigoMap.canvas.gmap3({
                                    get: {
                                        tag: TAG_GROUP.LANDMARK,
                                        all: true,
                                        full: true,
                                        callback: function(landmarks) {
                                            var landmarkTable = $("<table id='landmark_table'></table>");
                                            var landmarkThead = $("<thead></thead>").append("<tr>" + _.reduce(["", "Name", "Category", "Address", "Latitude", "Longitude", "Notes"], function(memo, column){ return memo + "<td>" + column + "</td>"; }, "") + "</tr>");
                                            var landmarkTbody = $("<tbody></tbody>");
                                            _.each(landmarks, function(landmark, j) {
                                                var html = $(landmark.data), address = "";
                                                landmarkInfo = landmark.object.title.match(/^(.*)\((.*)\)$/); // "Office (Company)"
                                                address = html.find(".landmark_address").html();
                                                address = address ? ("<a id='" + landmark.id + "'>" + address + "</a>") : "";
                                                landmarkTbody.append("<tr>" + _.reduce([
                                                    "[" + ++j + "]", 
                                                    landmarkInfo[1], 
                                                    landmarkInfo[2],
                                                    address,
                                                    landmark.object.getPosition().lat().toFixed(5),
                                                    landmark.object.getPosition().lng().toFixed(5),
                                                    html.find(".landmark_content").html()], function(memo, data){ return memo + "<td>" + (data ? data : "") + "</td>"; }, "") + "</tr>");
                                                $(landmarkTbody).on("click", "#" + landmark.id, function() {
                                                    // due to 'full' property is true, the real marker object is stored in marker.object property
                                                    google.maps.event.trigger(landmark.object, 'click');
                                                });
                                            });
                                            landmarkTable.append(landmarkThead);                                            
                                            landmarkTable.append(landmarkTbody);
                                            $("#tabs_landmark").append(landmarkTable);  
                                        }
                                    }
                                });
                                contigoMap.canvas.gmap3({
                                    get: {
                                        tag: TAG_GROUP.JOB,
                                        all: true,
                                        full: true,
                                        callback: function(jobs) {
                                            var jobTable = $("<table id='job_table'></table>");
                                            var jobThead = $("<thead></thead>").append("<tr>" + _.reduce(["Priority", "Status", "Destination", "Latitude", "Longitude", "Description"], function(memo, column){ return memo + "<td>" + column + "</td>"; }, "") + "</tr>");
                                            var jobTbody = $("<tbody></tbody>");
                                            _.each(jobs, function(job) {
                                                var html = $(job.data), destination = "";
                                                priority = html.find(".job_priority").html();
                                                status = html.find(".job_status").html();
                                                destination = html.find(".job_destination").html();
                                                destination = destination ? ("<a id='" + job.id + "'>" + destination + "</a>") : "";
                                                jobTbody.append("<tr>" + _.reduce([
                                                    html.find(".job_priority").html(), 
                                                    html.find(".job_status").html(), 
                                                    destination,
                                                    job.object.getPosition().lat().toFixed(5),
                                                    job.object.getPosition().lng().toFixed(5),
                                                    html.find(".job_description_content").html()], function(memo, data){ return memo + "<td>" + (data ? data : "") + "</td>"; }, "") + "</tr>");
                                                $(jobTbody).on("click", "#" + job.id, function() {
                                                    // due to 'full' property is true, the real marker object is stored in marker.object property
                                                    google.maps.event.trigger(job.object, 'click');
                                                });
                                            });
                                            jobTable.append(jobThead);                                            
                                            jobTable.append(jobTbody);
                                            $("#tabs_job").append(jobTable);  
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
            displayItemStatusOption,
            contigoMap.createControl({
                classes: "option_separator"
            }),
            tabularDataOption
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

function ContigoMap(mapId, mapType) {
    this.mapId = mapId ? mapId : 'map'; // the identity of the DOM element to hold the map
    this.mapType = mapType ? mapType : '';
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
            var decorated = {
                        icon: {
                            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                            strokeColor: 'black',
                            strokeOpacity: 1.0,
                            strokeWeight: 1.0,
                            fillColor: 'yellow',
                            fillOpacity: 1.0,
                            scale: 3
                        },
                        offset: '50%'
                    };
            var plain = {};
            _.each(locationMarkers.routes, function(route) {
                mapObjects["polyline"]["values"].push({
                    options: {
                        strokeColor: route.color,
                        strokeOpacity: 1.0,
                        strokeWeight: 2,
                        path: route.segment,
                        icons: [!_.isEqual(route.segment[0], route.segment[1]) ? decorated : plain]
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
	        var lastIndex = szLocatePoints;
	        
	        // determine the starting and ending index to display location points
	        if (szLocatePoints > 0) {
		        var minNetworkTs = Util.toUTC(locatePoints[0]['timestamp']);
                var maxNetworkTs = Util.toUTC(locatePoints[szLocatePoints - 1]['timestamp']);
                var isDescOrder = (minNetworkTs > maxNetworkTs);
                if (isDescOrder) {
                    locatePoints = locatePoints.reverse();
                }
		        initialIndex = $this.determineInitialIndex(locatePoints);
	        }
	        
            _.each(locatePoints, function(point, i) {
                var segment = [];
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

	            if (label) {
	            	var infoContent = $this.buildLocationInfoWindowContents(
		                            label, coord, eventType, address, stopDuration, speed, 
		                            direction, timestamp, landmark, circleCertaintyRadius, 
		                            status, userNote, driverID, driverStatus, beaconID,
		                            guardianID, ioprt1Scenario, ioprt2Scenario, ioprt3Scenario, ioprt4Scenario, lineColor, 
		                            dispatch, isMetric, driverNameInItemMode);
		                            
					if (!(!isPointsConnected || (isPointsConnected && (i == szLocatePoints - 1))) || $this.mapType == "cp_rpt_routetrip") {
						markerLabel = '';
					}
                    var labelInfo = $this.generateMarkerLabelInfoByMapType(markerLabel, $this.mapType, isPointsConnected, szLocatePoints, i, speed, direction, vehicleStatus);
                                    
                    if (i == szLocatePoints - 1) {
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
                                //labelStyle: {opacity: 0.75},
                                labelContent: labelInfo.content}};
						markers.push(marker);
                    }
		            
	            }
                
                circleCertaintyRadius = parseInt(circleCertaintyRadius, 10);
                if (circleCertaintyRadius > 0) {
                    if ($this.currentCocMode == COC_MODE.ALL || $this.currentCocMode == COC_MODE.LAST && i == szLocatePoints - 1) {
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
	        }); // _.each(locatePoints, function(currentPoint, i)
	    }); // _.each(beaconItems, function(beacon)
	    return new ContigoMarkers(markers, cocs, routes);
	},
    
    /**
     * Generate the label information of a marker based on the map type and other criteria.
     *
     * @param label
     * @param mapType
     * @param szLocatePoints
     * @param indexOfMarker
     * @param speed
     * @param direction
     * @param itemStatus
     */
    generateMarkerLabelInfoByMapType : function(label, mapType, isPointsConnected, szLocatePoints, indexOfMarker, speed, direction, itemStatus) {
        var anchor = classes = content = title = statusClass = '';

        if (label) {
        	if (mapType == 'cp_fleet' && indexOfMarker == szLocatePoints - 1) {
            	if (!this.isItemStatusActive) {
					statusClass = 'item_status_disabled';
					anchor = new google.maps.Point(Math.floor(label.length * 2.5), 25);
				} else {
					anchor = new google.maps.Point(18, 18);
            		switch (itemStatus) {
            		case "stop":
                		statusClass = 'stop_status'; break;
            		case "idle":
                		statusClass = 'idle_status'; break;
            		case "move":
						if (!_.isEmpty(speed)) {
							// for the case of an item with speed and direction
							if (!direction) {
								switch (direction) {
                        		case "E":
                            		statusClass = 'move_to_east'; break;
                        		case "W":                            
                            		statusClass = 'move_to_west'; break;
                        		case "S":
                            		statusClass = 'move_to_south'; break;
                        		case "N":                            
                            		statusClass = 'move_to_north'; break;
                        		case "NE":                            
                            		statusClass = 'move_to_northeast'; break;
                        		case "NW":                            
                            		statusClass = 'move_to_northwest'; break;
                        		case "SE":                            
                            		statusClass = 'move_to_southeast'; break;
                        		case "SW":                           
                            		statusClass = 'move_to_southwest'; break;
                        		default:
                            		statusClass = '', anchor = new google.maps.Point(Math.floor(label.length * 2.5), 25); break;
								}				
							} else {
								// for the case of an item with speed but not direction
                        		statusClass = 'move_status';                        
							}			
						} else {
                    		anchor = new google.maps.Point(Math.floor(label.length * 2.5), 25);
						}
                		break;
                	default:
                		anchor = new google.maps.Point(Math.floor(label.length * 2.5), 25);
                		break;                
            		}
            	}
            	var compiled = _.template("<div class='item_status <%= statusClass %>'><div class='labels item_status_label'><%= label %></div></div>");
            	content = $(compiled({label: label, statusClass: statusClass}))[0]; // get DOM object
        	} else if ((mapType == 'cp_rpt_stop_map_multi' && indexOfMarker == szLocatePoints - 1) || mapType == 'address_to_map') {

        	} else {
            	anchor = new google.maps.Point(Math.floor(label.length * 2.5), -10);
            	classes = "labels";
            	content = label;
        	}
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
			if (label) {
                var infoContent = $this.buildLmkInfoWindowContents(label, userNote, lmkAddress, content, dispatch);
                var marker = {
                    id: TAG_GROUP.LANDMARK + "_" + i,
                    tag: [label, TAG_GROUP.LANDMARK],
                    latLng: [coord.lat, coord.lng], 
                    data: infoContent,    
                    options: {
                        title: label,
                        icon: {url: $this.constructMarkerIconName(icon, numberLabel)},
                        labelAnchor: new google.maps.Point(Math.floor(label.length * 2.5), -2),
                        labelClass: "labels",
                        labelStyle: {opacity: 0.75},
                        labelContent: label}};
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
			infoContent += (userNote) ? this.createMarkerInfoWindowPara("<span class='user_note'>" + userNote + "</span>") : "";
	    
			// landmark's address
			infoContent += (lmkAddress) ? this.createMarkerInfoWindowPara("<span class='landmark_address'>" + lmkAddress + "</span>") : "";
	    
			// landmark's content
			infoContent += (content) ? this.createMarkerInfoWindowPara("<span class='landmark_content'>" + content + "</span>") : "";
			infoContent += "</div>";
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
	 * Toggle item status feature of markers on the map.
	 * 
	 * @param boolean enabled true to show the icon of item status for markers on the map, vice versa.
	 */
	enableItemStatus : function(enabled) {
		this.isItemStatusActive = enabled;
		$('.item_status').each(function(index, value) {
			if (enabled) {
				$(this).removeClass("item_status_disabled");
			} else {
				$(this).addClass("item_status_disabled");
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
                        $this.map.fitBounds(bounds); 
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
     * Create a DOM element to represent the custom control.
     *
     * @param options an object holds related properties of the control.
     */
    createControl: function(options) {
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
        _.each(options.events, function(event, name) {
            (function(object, name) {
                google.maps.event.addDomListener(object, name, function() {
                    event.apply(this, [this]);
                });
            })(control[0], name);
        });

        return control[0];
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
        return $(checkboxOption).find('.checkbox_image_container:first').is(':visible');
    }
}