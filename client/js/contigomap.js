/*
 * TODO Issues:
 */

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
 * Indicates that Panning mode is currently selected.
 */
var MAP_MODE_PANNING = 0;
/**
 * Indicates that View Address mode is currently selected.
 */
var MAP_MODE_VIEW_ADDR = 1;
/**
 * Indicates that View Address mode is currently selected with adding job enabled.
 */
var MAP_MODE_VIEW_ADDR_ADD_JOB = 2;
/**
 * Indicates that Zoom to Rectangle mode is currently selected.
 */
var MAP_MODE_ZOOM_TO_RECT = 3;
/**
 * Indicates that the map is on zone drawing mode.
 */
var MAP_MODE_ZONE_DRAWING = 4;

/**
 * Best fit min zoom level.
 */
var BESTFIT_MIN_ZOOM = 1;
/**
 * Best fit min zoom level.
 */
var BESTFIT_MAX_ZOOM = 16;

var MAP_BORDER_PADDING = 16;

var DEFAULT_ROUTE_COLOR = "#FF0000";

var DEFAULT_ROUTE_ARROW_COLOR = "#0000FF";

var ICON_HOST_PATH = "../../icons/";

var NUMBERS_ICON_HOST_PATH = "../../icons/numbers/";

var IMG_HOST_PATH = "../../img/";

var RIGHT_CLICK_ICON = {'name' : 'red_dot', 'width' : 16, 'height' : 16};

var LANDMARK_INPUT_ICON = {'name' : 'red_dot', 'width' : 16, 'height' : 16};

var SHAPE_COLLECTION_COCS = "cocs";
var SHAPE_COLLECTION_JOB_POI = "jobPoi";
var SHAPE_COLLECTION_LANDMARK_INPUT_POI = "landmarkInputPoi";
var SHAPE_COLLECTION_LANDMARK_POI = "landmarkPoi";
var SHAPE_COLLECTION_LOCATION_POI = "locationPoi";
var SHAPE_COLLECTION_ROUTE_SEGMENTS = "routeSegments";

function ContigoMap(mapControl, i18n, callback) {
	this.i18n = i18n;
	this.mapControl = null;
	this.viewControl = null;
	this.zoomControl = null;
	this.mapDiv = null;
	// this is the layer on the map mapquest put its logo 
	// put controls in this layer to avoid user to drag the map, but POIs are still clickable, and zoom control still works properly.
	this.mapquestLogoLayer = null;
	this.map = null;
	this.width = 0;
	this.height = 0;
	this.directionArrowsEnabled = true; // by default, enable direction arrows
	this.decluttered = null;
	this.declutteredActivated = null; // necessary for the proper decluttering state to work
	this.latLonDisplayed = false; // if lat/lon information should be shown on the InfoWindow of each poi object
	this.currentLocateFilterMode = LOCATES_SHOW_ALL;
	this.currentCocMode = COC_SHOW_NONE;
	this.poiCollection = {};
	this.isMetric = false;
	this.isAutoCenteringActive = false;
	this.isAutoBestFitActive = false;
	this.mostRecentLocateCoord = null; // The coordinate (MQA.LntLng) of the most recent locate point of all beacon locate points currently displayed on the map.
	this.mostRecentLocateTimeMillis = -1; // The time (in milliseconds) of the most recent locate point of all beacon locate points currently displayed on the map.
	this.currentMapMode = MAP_MODE_PANNING;
	this.offsetX = 0;
	this.offsetY = 0;
	this.silencer = $('<div/>', {id: 'silencer'});
	this.crosshair = $('<div/>', {id: 'crosshair'});
	this.isDrawingComplete = true;
	this.isShowLabelMode = false;
	this.hasPoiCollection = false;
	
	this.rightClickLat = 0;
	this.rightClickLng = 0;
	this.createLandmarkHtml = '';

	this.tripStartPoiIndex = 0;
	this.tripEndPoiIndex = 0;
	this.routePoiImage = 'small_dot_icon.gif';
	this.routeTripImage = '';
	this.tripBoundingBox = '';
	this.selectTripID = '';
	
	
	this.init(mapControl, callback);
}		
		
ContigoMap.prototype = {
		
	/**
	 * Initialize the map and load all of MQA modules used by Contigo map.
	 * 
	 * @param mapElemId the identity (id) of the map element in the document
	 * @param callback the callback function will be executed after the end of the init() method completed
	 */
	init : function(mapControl, callback) {
		var self = this;
		this.mapControl = mapControl;
		this.mapDiv = document.getElementById(mapControl.mapElemId);
		this.offsetX = this.mapDiv.offsetLeft - this.mapDiv.scrollLeft;
		this.offsetY = this.mapDiv.offsetTop - this.mapDiv.scrollTop;

		this.map = new MQA.TileMap({
			elt: this.mapDiv,                           /* ID of element on the page where you want the map added */
			zoom: 3,                                    /* initial zoom level of map between 2-18 */
			latLng: {lat: 48.16700, lng: -100.16700},   /* center of map in latitude/longitude */
			mtype: 'map'                                /* map type (map) */
	    });
	    var mapSize = this.map.getSize();
	    this.width = mapSize.width;
	    this.height = mapSize.height;
	    
	    // register map's event handlers
		
		if (this.mapControl.currentMapType == 'cp_rpt_routetrip') {
			MQA.EventManager.addListener(this.map, 'zoomend', this.redrawTripSegmentsHandler, this);
		} else {
			MQA.EventManager.addListener(this.map, 'zoomend', this.redrawRouteSegmentsHandler, this);
		}
		
		MQA.EventManager.addListener(this.map, 'zoomend', this.redrawCoCHandler, this);
		MQA.EventManager.addListener(this.map, 'zoomend', this.showAddressPoiAfterZoom, this);
		MQA.EventManager.addListener(this.map, "rightclick", this.rightClickOnMapHandler, this);
		
		// load all of modules used by Contigo map
	    MQA.withModule('largezoom', 'viewoptions', 'mousewheel', 'shapes', 'geocoder', 'traffictoggle', 'htmlpoi', function() {
	    	self.map.addControl(new MQA.LargeZoom(), new MQA.MapCornerPlacement(MQA.MapCorner.TOP_LEFT, new MQA.Size(5, 5)));
	    	self.map.addControl(new MQA.ViewOptions());
	    	self.map.enableMouseWheelZoom();
	    	
	    	// POI constructed as right-clicking
	    	MQA.Geocoder.constructPOI = function(location) {
				var lat = location.latLng.lat, lng = location.latLng.lng, street = location.street, city = location.adminArea5, county = location.adminArea4, state = location.adminArea3, country = location.adminArea1, postalCode = location.postalCode, line1 = line2 = line3 = line4 = line5 = html = "";
				line1 = (street) ? "<div class='street'>" + street + "</div>" : "";
				line2 = (city) ? city : "";
				line2 = (county) ? ((line2) ? line2 + ", " + county : county) : line2;
				line2 = (state) ? ((line2) ? line2 + ", " + state : state) : line2;
				line2 = (line2) ? "<div class='city'>" + line2 + "</div>" : "";
				line3 = (postalCode) ? "<div class='postal_code'>" + postalCode + "</div>" : "";
				line4 = (country) ? "<div class='country'>" + country + "</div>" : "";
				line5 = "<div class='latlng'>Lat/Long: (" + lat.round(5) + ", " + lng.round(5) + ")</div>";
				html = "<div class='address'>" + line1 + line2 + line3 + line4 + line5 + "</div>";

				poi = new MQA.Poi({lat:lat, lng:lng});
				poi = self.constructCustomPoiIcon(poi, RIGHT_CLICK_ICON, null);
				poi.key = 'newAddressPoi';
				if (self.currentMapMode == MAP_MODE_VIEW_ADDR_ADD_JOB) {
					html += "<div class='address_toolbar'>";
					html += "<input id='add_job' type='button' class='job_button' value='" + self.i18n.gettext('button.infowindow.dispatch.add') + "' />";
					html += "</div>";
					
					var attachedEvent = ContigoUtil.isMobile.any() ? "touchstart" : "click";
					MQA.EventManager.addListener(poi, 'infowindowopen', function(event) {
					    //alert(event.srcObject.infoContentHTML);
					    $("#add_job").bind(attachedEvent, function(e) {
					    	var coord = {lat: lat.round(5), lng: lng.round(5)};
					    	var address = {
					    		street: street,
					    		city: city,
					    		county: county,
					    		state: state,
					    		postalCode: postalCode,
					    		country: country
					    	}
					    	jobLocation = {address: address, coord: coord};
					    	self.addJobFromMap(JSON.stringify(jobLocation));
					    	self.map.removeShape(poi);
					    	/* Cancels events from proprogating up */ 
							MQA.EventUtil.stop(e);
					    }).button();
					});
				}
				poi.setInfoContentHTML(html);
				return poi;
			};
	    	MQA.Geocoder.processResults = self.getLocationByReverseGeocoding;
	    	
			//console.log($('#' + mapControl.mapElemId)[0].childNodes[0].childNodes[0].childNodes[2]); // the layer to add the canvas to draw
			self.mapquestLogoLayer = $('#' + mapControl.mapElemId).children('div').eq(0).children('div').eq(0).children('div').eq(2);
	    	self.createCrosshairControl(); // a custom control to indicate centre of map
	    	
	    	callback.apply(); // call the callback function in the caller	    		    	
	    });		    
	},
	
	/**
	 * Clear all of shapes on the map.
	 *
	 * @param backToDefault true to reset back the default zoom level 
	 */
	reset : function(backToDefault) {
		this.tripStartPoiIndex = 0;
		this.tripEndPoiIndex = 0;
		this.mostRecentLocateCoord = null;
		this.mostRecentLocateTimeMillis = -1;
		this.poiCollection = {};
		this.hasPoiCollection = false;
		this.map.removeAllShapes(); // remove shapes from the map
		if (backToDefault) {
			this.setZoomLevel(3);
			this.centreMap(new MQA.LatLng(48.16700, -100.16700));
		}
	},	
	
    /**
     * Sends points to be displayed on the map.
     *
     * @param poiCollection A JSON string of the ContigoPoiCollection 
     *                      containing the data for the points to be shown on 
     *                      the map.
     *
     * @param isRefreshMap  A boolean indicating if the entire map should be 
     *                      refreshed when executing this method.  Generally,
     *                      the map should be refreshed whenever a new business
     *                      operation is performed.
     * 
     * @param showLatLon if need to show lat/lng on the InfoWindow of each point.
     */
	sendPoints : function(poiCollection, isRefreshMap, showLatLon) {
		var isBestFitRequired = false;
	
	    this.latLonDisplayed = showLatLon;	    
	    
		if (this.mapControl.currentMapType == 'cp_fleet') {
			if (this.declutteredActivated == null && this.decluttered != null) {
                this.decluttered = null;
                this.refreshMap({});
            }
		} else if ((this.mapControl.currentMapType == 'cp_rpt_stop_map_multi') || (this.mapControl.currentMapType == 'cp_rpt_routetrip') ) {
			if (this.decluttered == null) {
				this.decluttered = false;
			}
		}
    
    	this.refreshMap(poiCollection);
    	
    	if (isRefreshMap || !this.poiCollection) {	            
            isBestFitRequired = true;	            
        }
    	
    	// Always store the latest copy
    	this.poiCollection = poiCollection;
    	this.hasPoiCollection = true;
    	
        if (isBestFitRequired || this.isAutoBestFitActive) {	      	  
        	//this.map.bestFit();
        	this.customBestFit(false, BESTFIT_MIN_ZOOM, BESTFIT_MAX_ZOOM);
        }
        
        if (this.isAutoCenteringActive && this.mostRecentLocateCoord) {
        	this.recenterToLatLng(this.mostRecentLocateCoord);
        }

		this.redrawRouteSegmentsHandler();	
	},
	
	/**
	 * Sets the map at a specific zoom level.
	 *
	 * The zoom levels are defined according the following map scale:
	 *
	 * 16 == 1000
	 * 15 == 1500
	 * 14 == 2500
	 * 13 == 4700
	 * 12 == 9000
	 * 11 == 18,000
	 * 10 == 36,004
	 *  9 == 74,999
	 *  8 == 154,950
	 *  7 == 324,767
	 *  6 == 701,289
	 *  5 == 1,504,475
	 *  4 == 3,520,471
	 *  3 == 9,779,086
	 *  2 == 29,337,258
	 *  1 == 88,011,773
	 */
	setZoomLevel : function(zoomLevel) {
		this.map.setZoomLevel(zoomLevel);
	},
	
	/**
	 * Draw crosshair as the center of the map.
	 * NOTE: if the map type is address to map, then no crosshair on the map.
	 */
	createCrosshairControl : function() {
		if (this.mapControl.currentMapType != 'address_to_map') {
			this.crosshair.remove();
			this.crosshair.css({position: 'absolute', width: '41px', height: '41px', top: ((this.map.height / 2) - 20) + 'px', left: ((this.map.width / 2) - 20) + 'px', 'background-image': 'url(' + ICON_HOST_PATH + 'crosshair.png)', 'background-repeat': 'no-repeat'});
			// It is a hack, to make POI clickable within the crosshair image
			if (this.mapquestLogoLayer) {
				this.mapquestLogoLayer.append(this.crosshair); // same layer as the mapquest logo
			}
		}
	},
	
	/**
	 * A callback method to handle the return results from the web service call for reverse geocoding.
	 * 
	 * @param response
	 * @param map
	 */
	getLocationByReverseGeocoding : function(response, map) {
		if (response && response.info && response.info.statuscode == 0 && response.results) {
			var resultLength = response.results.length;
			for (var i = 0 ; i < resultLength; i++) {
				var locations = response.results[i].locations, locationsLength = locations.length;
				/* If you have more than one location here, it was ambiguous or a geodiff */
				/* Just pick the first one */
				if (locationsLength > 0) {
					var location = locations[0];
					if (location) {
						map.addShape(this.constructPOI(location));
					}
				}
			}
            //map.bestFit();
		}
	},
	
	/**
	 * The event handler when user right-clicks on the map.
	 * 
	 * @param event
	 */
	rightClickOnMapHandler : function(event) {
		
		if (event) {	
			//this.showAddressPoi(event.ll.lat, event.ll.lng);
			
			this.rightClickLat = event.ll.lat;
			this.rightClickLng = event.ll.lng;
			
		}
		return false;
	},
	
	/**
	 * Remove current address Poi if exists.
	 */
	removeCurrentAddressPoi : function() {
		var poi = this.map.getByKey('addressPoi');
		if (poi) {
    		this.map.removeShape(poi);
    		poi = null;
    	}
	},
	
	/**
	 * Show the address POI from a given lat/lng.
	 * 
	 * @param lat
	 * @param lng
	 */
	showAddressPoi : function(lat, lng) {
		var self = this;
		this.map.reverseGeocodeAndAddLocation({lat: lat, lng: lng}, function(data) {
		    self.removeCurrentAddressPoi();
		    // Rename the key of the new POI
		    poi = self.map.getByKey('newAddressPoi');
		    if (poi) {
		    	poi.key = 'addressPoi';
			    MQA.EventManager.addListener(poi, 'infowindowclose', function(event) {
			    	self.map.removeShape(poi);
			    });
			    poi.toggleInfoWindow();				    	
		    }
		});
	},

	/**
	 * Show the address POI to create landmark.
	 *
	 * 
	 */
	showLandmarkInputPoi : function(lat, lng, htmlString) {
		
		var self = this;
		
		this.createLandmarkHtml = htmlString;
		
		this.map.reverseGeocodeAndAddLocation({lat: lat, lng: lng}, function(data) {
		    self.removeCurrentAddressPoi();
		    // Rename the key of the new POI
		    poi = self.map.getByKey('newAddressPoi');
		    if (poi) {
		    	poi.key = 'addressPoi';
		    	poi.setInfoContentHTML(htmlString);
		    	
			    MQA.EventManager.addListener(poi, 'infowindowclose', function(event) {
			    	self.map.removeShape(poi);
			    	self.restartMapviewTimer();			    	
			    });
			    poi.toggleInfoWindow();				    	
		    }
		});
				
	},

	/**
	 * Show the landmark created on Map
	 *
	 * 
	 */
	showLandmarkAfterCreatedOnMap : function(landmarkVals) {
				
		if (this.mapControl.showCreatedLandmarkOnMap) {
			this.mapControl.showCreatedLandmarkOnMap(landmarkVals);
		}
	},
	
	/**
	 * restart refresh timer of mapview
	 *
	 * 
	 */
	 restartMapviewTimer : function() {
				
		if (this.mapControl.restartMapviewTimer) {
			this.mapControl.restartMapviewTimer();
		}
	},

	/**
	 * Reload report to show landmark created on report summary
	 *
	 * 
	 */
	 reloadReportAfterCreatedLmkOnMap : function() {
				
		if (this.mapControl.reloadReportAfterCreatedLmkOnMap) {
			this.mapControl.reloadReportAfterCreatedLmkOnMap();
		}
	},
	
	/**
	 * Show the address POI after refresh map
	 * 
	 */
	showAddressPoiAfterRefresh : function() {
		var self = this;		
		var poi = self.map.getByKey('addressPoi');
		
		if (poi) {
			
			var addressPoiLat = poi.latLng.lat;
			var addressPoiLng = poi.latLng.lng;

			if (this.currentMapMode == MAP_MODE_PANNING) {
				this.showLandmarkInputPoi(addressPoiLat, addressPoiLng, this.createLandmarkHtml);
			} else {
				this.showAddressPoi(addressPoiLat, addressPoiLng);
			}
			
			
		}
	},

	/**
	 * Show the address POI after zooming map
	 * 
	 */
	showAddressPoiAfterZoom : function() {
		this.showAddressPoiAfterRefresh();
	},
	
	
	/**
	 * Refresh the map.
	 * 
	 * @param poiCollection
	 */
	refreshMap : function(poiCollection) {
	    var landmarks = poiCollection.landmarks;
	    var beaconItems = poiCollection.beaconItems;
	    var jobCollection = poiCollection.jobs;    
	    var measurementUnit = poiCollection.measurementUnit;
	    this.isMetric = (measurementUnit && measurementUnit.toLowerCase() == "m") ? true : false;

		// reset
		this.resetMostRecentLocate();

	    var locationPois = this.buildMQALocationPois(beaconItems, this.isMetric);
	    var landmarkPois = this.buildMQALandmarkPois(landmarks, this.isMetric);
	    var jobPois = this.buildMQAJobPois(jobCollection, this.isMetric);

	    if (locationPois.getSize() > 0) {
	        this.map.addShapeCollection(locationPois);
	    }
	    
	    if (landmarkPois.getSize() > 0) {
	        this.map.addShapeCollection(landmarkPois);
	    }
	    
	    if (jobPois.getSize() > 0) {
	        this.map.addShapeCollection(jobPois);
	    }

	    // the route segments have to be done after bestfit due to the drawing of directional arrows.
	    // route segments will be drawn by redrawRouteSegmentsHandler() and other event handlers
	    
	    // if there is address poi on map, turn on the infoWindow
	    this.showAddressPoiAfterRefresh();
	    
	},
	
	/**
	 * Draw the route segments including of directional arrows on the map.
	 * 
	 * @param poiCollection
	 */
	drawRouteSegments : function(poiCollection) {
		var beaconItems = poiCollection.beaconItems;
	    var routeSegments = this.buildRouteSegments(beaconItems);
	    if (routeSegments.getSize() > 0) {
	    	this.map.addShapeCollection(routeSegments);
	    }
	},

	/**
	 * Draw the trip segments including of directional arrows on the map for combined trip report.
	 * 
	 * @param poiCollection
	 * @param startPoi - index of Poi when trip starts
	 * @param endPoi - index of Poi when trip ends
	 * 
	 */
	drawTripSegments : function(poiCollection, startPoi, endPoi) {		
		var beaconItems = poiCollection.beaconItems;
	    var routeSegments = this.buildTripSegments(beaconItems, startPoi, endPoi);
	    
	    if (routeSegments.getSize() > 0) {
	    	this.map.addShapeCollection(routeSegments);
	    }
	},
	
	
	/**
	 * Redraw the route segments including of directional arrows on the map.
	 * It will remove the previous route segments first.
	 * 
	 * @param poiCollection
	 */
	redrawRouteSegments : function(poiCollection) {
	    this.map.removeShapeCollection(SHAPE_COLLECTION_ROUTE_SEGMENTS); 
		this.drawRouteSegments(poiCollection);
	},

	/**
	 * Redraw the trip segments including of directional arrows on the map for combined trip report.
	 * It will remove the previous trip segments first.
	 * 
	 * @param startPoi - index of Poi when trip starts
	 * @param endPoi - index of Poi when trip ends
	 * 
	 */
	redrawTripSegments : function(startPoi, endPoi, tripID) {
		
		this.tripStartPoiIndex = startPoi;
		this.tripEndPoiIndex = endPoi;
		
	    this.map.removeShapeCollection(SHAPE_COLLECTION_ROUTE_SEGMENTS); 
		this.drawTripSegments(this.poiCollection, startPoi, endPoi);
		
		if (tripID) {
			
			//save selected trip ID for declutter 
			this.selectTripID = tripID;

			// change route icon to trip icon
			this.mapControl.changeTripIcon(tripID, this.routeTripImage.name, this.routePoiImage);

			// zoom to trip
			this.map.zoomToRect(this.tripBoundingBox);
			
			//callback to php side when finishing the trip drawing
			if (this.mapControl.finishTripDrawing) {				
				this.mapControl.finishTripDrawing();
			}
		}
	},
	
	
	/**
	 * Filters the beacon locate points on the map, based on the mode selected
	 * from the JavaScript layer.
	 *
	 * @param mode  If the mode is 1, all locate points are shown for each 
	 *              beacon.  If the mode is 2, only the last three most recent
	 *              points are shown.  If the mode is 3, only the most recent
	 *              point is shown.  By default, all locate points are shown.
	 */
	filterLocatePoints : function(mode) {
	    if (this.poiCollection) {
	        switch (mode) {
	        case 2:
	            this.currentLocateFilterMode = LOCATES_SHOW_LAST_THREE; break;
	        case 3:
	            this.currentLocateFilterMode = LOCATES_SHOW_LAST; break;
	        default:
	            this.currentLocateFilterMode = LOCATES_SHOW_ALL; break;
	        }
	        this.refreshMap(this.poiCollection);
	        this.redrawRouteSegments(this.poiCollection);
	    }
	},

	/**
	 * Removes a shape collection {jobPoi, landmarkPoi, locationPoi, routeSegments, cocs} from the map.
	 * In addition, we want to disable the decluttering mode for the shape collection.  Not doing so will introduce odd behaviours to the decluttering feature.
	 * 
	 * @param jobCollection a list of jobs
	 * @param is metric system applied
	 * 
	 * @returns nothing
	 */
	removeShapeCollectionFromMap : function(shapeCollectionName) {
		// properly clear the shape collection from map
		var shapeCollection = this.map.getShapeCollection(shapeCollectionName);
		if (shapeCollection != null) {
			if (this.decluttered != null && !this.decluttered) {
				shapeCollection.removeAll();
			}

			shapeCollection.declutter = false;
			this.map.removeShapeCollection(shapeCollectionName);
		}
	},
	
	/**
	 * Redraws all Circles of Certainty (CoC) on the map, based on the current 
	 * CoC filter setting.
	 */
	redrawAllCoCs : function(poiCollection) {
	    
	    // remove all CoCs currently on the map
	    this.map.removeShapeCollection(SHAPE_COLLECTION_COCS);
	  
	    if (this.currentCocMode != COC_SHOW_NONE && poiCollection) {
	    	var cocOverlays = new MQA.ShapeCollection();
	    	cocOverlays.collectionName = SHAPE_COLLECTION_COCS;
	        cocOverlays.declutter = false;
	        
	        var beaconItems = poiCollection.beaconItems;
	        for (var x in beaconItems) {
	        	var locatePoints = beaconItems[x].locatePoints;
	        	var szLocatePoints = locatePoints.length;
	        	var circle = null;
	        	if (szLocatePoints > 0) {
	        		if (this.currentCocMode == COC_SHOW_LAST) {
	        			circle = this.createCircleOfCertainty(locatePoints[szLocatePoints - 1]);
	        			if (circle) {
	        	            cocOverlays.add(circle);
	        			}
	        		} else if (this.currentCocMode == COC_SHOW_ALL) {
	        			for (var j = this.determineInitialIndex(locatePoints); j < szLocatePoints; j++) {
	        	            circle = this.createCircleOfCertainty(locatePoints[j]);
	        	            if (circle) {
	        	            	cocOverlays.add(circle);
	        	            }
	        			}
	        		} else {
	        			// do nothing
	        		}
	        	}
	        } // for (var x in beaconItems)
	        
	        if (cocOverlays.getSize() > 0) {
	        	this.map.addShapeCollection(cocOverlays);
	        }
	    }
	},


	/**
	 * Changes the current Circle of Certainty (CoC) filter mode, and forces a
	 * redraw based on the new filter mode at the current zoom level.
	 *
	 * @param mode  The mode, as a Number, where 1 = "most recent point only",
	 *              2 = "all points", and 3 = "no points".
	 */
	changeCocFilterMode : function(mode) {
		switch (mode) {
		case 1:
			this.currentCocMode = COC_SHOW_LAST; break;
		case 2:
			this.currentCocMode = COC_SHOW_ALL; break;
		default:
			this.currentCocMode = COC_SHOW_NONE; break;
		}
		this.redrawAllCoCs(this.poiCollection);
	},
	
	/**
	 * Creates an EllipseOverlay representing a circle of certainty (CoC), 
	 * assuming the supplied point has a CoC value that's greater than 0.
	 *
	 * @param point  The ContigoBeaconPoi object containing a CoC value that's
	 *               greater than 0.
	 *
	 * @return       Returns the EllipseOverlay representing the CoC, or null
	 *               if the point does not contain a CoC value.
	 */
	createCircleOfCertainty : function(point) {
		var circle = this.createCircleOverlay(new MQA.LatLng(point.coord.lat, point.coord.lng), point.circleCertaintyRadius);
		return circle;
	},
	
	/**
	 * Creates a circle overlay with just the shape points set; it is up to
	 * the caller to set the visual properties, such as colour, fill colour, 
	 * etc.  
	 *
	 * @param centre The centre coordinate of the circle. It is an MQA.LatLng object.
	 * @param radius The radius of the circle, in metres.
	 *
	 * @return Returns an EllipseOverlay of the circle, or null if the radius
	 *         is not a positive, non-zero value.
	 */
	createCircleOverlay : function(centre, radius) {  
		var circle = null;
		if (radius > 0) {
			var distToCorner = radius * Math.SQRT2;  
			var upperLeft = centre.latLonOf(distToCorner, 7 * Math.PI / 4);
			var lowerRight = centre.latLonOf(distToCorner, 3 * Math.PI / 4);
			var circle = this.createShape('circle', '#C80000', 0.18, '#F00000', 1, 1, 'circleZone');
			circle.setShapePoints([upperLeft.lat, upperLeft.lng, lowerRight.lat, lowerRight.lng]);
		}
		return circle;
	},
	
	/**
	 * Update an existing circle (actually it is ellipse) overlay with just the shape points set based on 
	 * the new center coordinate and new radius.  
	 *
	 * @param circle An existing circle (actually it is ellipse) shape.
	 * @param centre The centre coordinate of the circle. It is an MQA.LatLng object.
	 * @param radius The radius of the circle, in metres.
	 *
	 * @return   Returns an EllipseOverlay of the circle, or null if the radius
	 *           is not a positive, non-zero value.
	 */
	UpdateCircleOverlay : function(circle, centre, radius) {  
		if (radius > 0) {
			var distToCorner = radius * Math.SQRT2;  
			var upperLeft = centre.latLonOf(distToCorner, 7 * Math.PI / 4);
			var lowerRight = centre.latLonOf(distToCorner, 3 * Math.PI / 4);
			circle.setShapePoints([upperLeft.lat, upperLeft.lng, lowerRight.lat, lowerRight.lng]);
		}
		return circle;	    
	},
	
	/**
	 * Convert from a list of contigo's job poi objects into MQA's poi objects.
	 * 
	 * @param jobCollection a list of jobs
	 * @param is metric system applied
	 * 
	 * @returns a list of MQA's poi objects
	 */
	buildMQAJobPois : function(jobCollection, isMetric) {
		var self = this;
		this.map.removeShapeCollection(SHAPE_COLLECTION_JOB_POI);
	    var pois = new MQA.ShapeCollection();
	    pois.collectionName = SHAPE_COLLECTION_JOB_POI;
		pois.declutter = false;
		
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
					var mqaPoi = new MQA.Poi(new MQA.LatLng(coord.lat, coord.lng));						
					mqaPoi = this.constructCustomPoiIcon(mqaPoi, icon, numberLabel);
					mqaPoi.key = "jobpoi_" + beaconId + "_" + jobId;
					mqaPoi.setRolloverContent("<div class='poi_rollover'>" + label + ' &raquo;</div>');
		            var infoContent = this.buildJobInfoWindowContents(
		            		beaconId, jobId, label, description, landmark, destination, 
		            		priority, status, sentTimestamp, ackTimestamp, 
		            		etaTimestamp, doneTimestamp, deletedTimestamp, 
		            		deletedBy, isDeleted, isDone);
					mqaPoi.setInfoContentHTML(infoContent);
					mqaPoi.setDeclutterMode(this.decluttered);
					
					var attachedEvent = ContigoUtil.isMobile.any() ? "touchstart" : "click";
					MQA.EventManager.addListener(mqaPoi, attachedEvent, function(event) {
						// propagate click event to the silencer, or silencer will miss this event if in drawing mode
						self.silencer.trigger(new $.Event(attachedEvent));
					});
					
					MQA.EventManager.addListener(mqaPoi, 'infowindowopen', function(event) {
					    //alert(event.srcObject.infoContentHTML);
						var key = event.srcObject.key.split("_"); // poi's key: jobpoi_xxx_yyy
						var beaconId = key[1];
						var jobId = key[2];						
					    $("#delete_job_" + beaconId + "_" + jobId).bind(attachedEvent, function(e) {
					    	var id = $(this).attr('id').split("_"); // delete_job_xxx_yyy
					    	self.deleteJob(id[2], id[3]); // beaconId, jobId
					    	/* Cancels events from proprogating up */ 
							MQA.EventUtil.stop(e);
					    }).button();
					    $("#reorder_job_" + beaconId + "_" + jobId).bind(attachedEvent, function(e) {
					    	var id = $(this).attr('id').split("_"); // reorder_job_xxx_yyy
					    	self.reorderJob(id[2], id[3]); // beaconId, jobId
					    	/* Cancels events from proprogating up */ 
							MQA.EventUtil.stop(e);
					    }).button();
					    $("#reassign_job_" + beaconId + "_" + jobId).bind(attachedEvent, function(e) {
					    	var id = $(this).attr('id').split("_"); // reassign_job_xxx_yyy
					    	self.reassignJob(id[2], id[3]); // beaconId, jobId
					    	/* Cancels events from proprogating up */ 
							MQA.EventUtil.stop(e);
					    }).button();

					});
					
					pois.add(mqaPoi);
				}
			}				
		}
		return pois;
	},
	
	/**
	 * Convert from a list of contigo's landmark poi objects into MQA's poi objects.
	 * 
	 * @param landmarks a list of landmarks
	 * @param is metric system applied
	 * 
	 * @returns a list of MQA's poi objects
	 */
	buildMQALandmarkPois : function(landmarks, isMetric) {
		var self = this;
		this.map.removeShapeCollection(SHAPE_COLLECTION_LANDMARK_POI);
	    var pois = new MQA.ShapeCollection();
	    pois.collectionName = SHAPE_COLLECTION_LANDMARK_POI;

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
			
			var landmarkLabel = label;
			if (this.mapControl.currentMapType == 'address_to_map') {
				landmarkLabel = '';
			}
			
			if (category) {
				label += " (" + category + ")";
			}
			if (label) {
				var mqaPoi = new MQA.Poi(new MQA.LatLng(coord.lat, coord.lng));
				//mqaPoi = this.constructCustomPoiIcon(mqaPoi, icon, numberLabel);				
				mqaPoi = this.constructHTMLPoi(landmarkLabel, new MQA.LatLng(coord.lat, coord.lng), icon, numberLabel, null, null, null, null);
				
				if (dispatch) {
					mqaPoi.key = "dispatchpoi_" + dispatch['type'] + "_" + dispatch['id'];
				}					
				mqaPoi.setRolloverContent("<div class='poi_rollover'>" + label + ' &raquo;</div>');
				var infoContent = this.buildLmkInfoWindowContents(label, userNote, lmkAddress, content, dispatch);
				mqaPoi.setInfoContentHTML(infoContent);
				mqaPoi.setDeclutterMode(this.decluttered);
					
				var attachedEvent = ContigoUtil.isMobile.any() ? "touchstart" : "click";
				MQA.EventManager.addListener(mqaPoi, attachedEvent, function(event) {
					// propagate click event to the silencer, or silencer will miss this event
					self.silencer.trigger(new $.Event(attachedEvent));
				});
				
				MQA.EventManager.addListener(mqaPoi, 'infowindowopen', function(event) {
					//alert(event.srcObject.infoContentHTML);
					if (event.srcObject.key) {
						// so far only poi with dispatch information has "key"
						var key = event.srcObject.key.split("_"); // poi's key: dispatchpoi_xxx_yyy
						var type = key[1];
						var id = key[2]; // 11903|1008 Homer Street, Vancouver, BC, Canada, V6B 2X1|49.27727|-123.12019|407|1008 Homer Street
						var landmarkInfo = id.split('|'); 
						var landmarkId = landmarkInfo[0];
						$("a#sendjob_" + type + "_" + landmarkId).bind(attachedEvent, function(e) {
							self.onShowSendJob({type: type, id: id}); // send job
							/* Cancels events from proprogating up */ 
							MQA.EventUtil.stop(e);
						});
					}
				});
				pois.add(mqaPoi);
			}				
		}
		
		return pois;
	},
	
	/**
	 * Convert from a list of contigo's poi objects into MQA's poi objects.
	 * 
	 * @param beaconItems a list of beacon items
	 * @param is metric system applied
	 * 
	 * @returns a list of MQA's poi objects
	 */
	buildMQALocationPois : function(beaconItems, isMetric) {
		var self = this;
		
		// properly clear the 'locationPoi' shape collection from map
		// htmlPoi is culprit for decluttering off slowness; we need this proper clearing of all shapes otherwise leading lines with no icon will appear.
		if (this.mapControl.currentMapType == 'cp_fleet' || this.mapControl.currentMapType == 'cp_rpt_stop_map_multi' || this.mapControl.currentMapType == 'cp_rpt_routetrip' ) {
			this.removeShapeCollectionFromMap(SHAPE_COLLECTION_LOCATION_POI);
		} else {
			this.map.removeShapeCollection(SHAPE_COLLECTION_LOCATION_POI);
		}
	
	    var pois = new MQA.ShapeCollection();
	    pois.collectionName = SHAPE_COLLECTION_LOCATION_POI;
	    
	    if ((this.mapControl.currentMapType != 'cp_fleet') &&
            (this.mapControl.currentMapType != 'cp_rpt_stop_map_multi') && (this.mapControl.currentMapType != 'cp_rpt_routetrip')) {
			pois.declutter = false;
         } else {
	     	pois.declutter = true;
	    	if (this.decluttered == null || this.decluttered) {
	       		pois.declutter = true;
				if (this.decluttered == null) {
					this.decluttered = false;
				}
       		} else {
        		pois.declutter = false;
			}
		}
	    
	    
	    for (var x in beaconItems) {
	        //var beaconId = x; // 3994
	    	
	        var locatePoints = beaconItems[x].locatePoints;
	        var isPointsConnected = beaconItems[x].isPointsConnected;
	        var szLocatePoints = locatePoints.length;
	        var initialIndex = 0;
	        var lastIndex = szLocatePoints;
	        
	        // determine the starting and ending index to display location points
	        if (szLocatePoints > 0) {
		        var minNetworkTs = this.convertToUnixTime(locatePoints[0]['timestamp']);
                var maxNetworkTs = this.convertToUnixTime(locatePoints[szLocatePoints - 1]['timestamp']);
                
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
	            var postedSpeed = currentPoint.postedSpeed;
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
	            var loginID = currentPoint.loginID;
	            var driverName = currentPoint.driverName;	            
	            var ioprt1Scenario = currentPoint.ioprt1Scenario;
	            var ioprt2Scenario = currentPoint.ioprt2Scenario;
	            var ioprt3Scenario = currentPoint.ioprt3Scenario;
	            var ioprt4Scenario = currentPoint.ioprt4Scenario;
	            var lineColor = currentPoint.lineColor;
	            var numberLabel = currentPoint.numberLabel;
				var dispatch = currentPoint.dispatch;
				var htmlLabel = label;
				var driverNameInItemMode = '';
				var tripID = currentPoint.tripID;
				var vehicleStatus = currentPoint.vehicleStatus;
				var temperature = currentPoint.temperature;
				
	            // show driver Id with vehicle name for dispatch driver mode
	            if (driverID) {
	            	label = driverID + ' (' + label + ')';
	            	htmlLabel = driverID;
	            } else if (loginID) {
	            	label = driverName + '<br/>(' + label + ')';
	            	htmlLabel = driverName;	            	
	            } else {
	            	if ((this.mapControl.currentMapType == 'cp_fleet') || (this.mapControl.currentMapType == "cp_rpt_routelog") || (this.mapControl.currentMapType == "cp_rpt_stop_map") || (this.mapControl.currentMapType == "cp_rpt_routetrip")) {
	            		driverNameInItemMode = driverName;
	            	}	            	
	            }
	            	            
	            
	            if (label) {
	            	
	            	var mqaPoi = null;

					if (!(!isPointsConnected || (isPointsConnected && (i == szLocatePoints - 1)))) {
                     	htmlLabel = '';
                  	}

					if ((this.mapControl.currentMapType == 'cp_fleet') && (i == szLocatePoints - 1)) {
						mqaPoi = this.constructHTMLPoi(htmlLabel, new MQA.LatLng(coord.lat, coord.lng), icon, numberLabel, speed, direction, null, vehicleStatus);
						
					} else if ((this.mapControl.currentMapType == 'cp_rpt_stop_map_multi') && (i == szLocatePoints - 1)) { 
						mqaPoi = this.constructHTMLPoi(htmlLabel, new MQA.LatLng(coord.lat, coord.lng), icon, numberLabel, null, null, null, null);
					} else if (this.mapControl.currentMapType == 'address_to_map') {
						mqaPoi = this.constructHTMLPoi(htmlLabel, new MQA.LatLng(coord.lat, coord.lng), icon, numberLabel, null, null, null, null);
					} else if (this.mapControl.currentMapType == 'cp_rpt_routetrip') {
						mqaPoi = this.constructHTMLPoi('', new MQA.LatLng(coord.lat, coord.lng), icon, numberLabel, null, null, tripID, null);						
					} else {
						mqaPoi = new MQA.Poi(new MQA.LatLng(coord.lat, coord.lng));
                        mqaPoi = this.constructCustomPoiIcon(mqaPoi, icon, numberLabel);
						mqaPoi.setDeclutterMode(this.decluttered);
					}	
					
					if (dispatch) {
                    	mqaPoi.key = "dispatchpoi_" + dispatch['type'] + "_" + dispatch['id'];
                    }
					
		            mqaPoi.setRolloverContent("<div class='poi_rollover'>" + label + ' &raquo;</div>');
		            var infoContent = this.buildLocationInfoWindowContents(
		                            label, coord, eventType, address, stopDuration, speed, direction, postedSpeed, temperature, timestamp, landmark,
		                            circleCertaintyRadius, status, userNote, driverID, driverStatus, beaconID,
		                            guardianID, ioprt1Scenario, ioprt2Scenario, ioprt3Scenario, ioprt4Scenario, lineColor, dispatch, isMetric, driverNameInItemMode);	
		            mqaPoi.setInfoContentHTML(infoContent);
		            
		            
		            if (i == (szLocatePoints - 1)) {
		            	this.setMostRecentLocate(currentPoint);
		            }
					
					var attachedEvent = ContigoUtil.isMobile.any() ? "touchstart" : "click";
					MQA.EventManager.addListener(mqaPoi, attachedEvent, function(event) {
						// propagate click event to the silencer, or silencer will miss this event if in drawing mode
						self.silencer.trigger(new $.Event(attachedEvent));
					});
					
					MQA.EventManager.addListener(mqaPoi, 'infowindowopen', function(event) {
					    //alert(event.srcObject.infoContentHTML);
						if (event.srcObject.key) {
							// so far only poi with dispatch information has "key"
							var key = event.srcObject.key.split("_"); // poi's key: dispatchpoi_xxx_yyy
							var type = key[1];
							var id = key[2];
							$("a#sendjob_" + type + "_" + id).bind(attachedEvent, function(e) {
								self.onShowSendJob({type: type, id: id}); // send job
								/* Cancels events from proprogating up */ 
								MQA.EventUtil.stop(e);
							});
							$("a#viewjob_" + type + "_" + id).bind(attachedEvent, function(e) {
								self.onViewJobs({type: type, id: id}); // view jobs
								/* Cancels events from proprogating up */ 
								MQA.EventUtil.stop(e);
							});
							$("a#sendmessage_" + type + "_" + id).bind(attachedEvent, function(e) {
								self.onShowSendMessage({type: type, id: id}); // send message
								/* Cancels events from proprogating up */ 
								MQA.EventUtil.stop(e);
							});
						}
					});

		            pois.add(mqaPoi);
	            }

	        } // for (var i = 0; i < szLocatePoints; i++)

	    } // for (var x in beaconItems)
	    return pois;
	},

	/**
	 * Construct a MQA.HtmlPoi object to represent the icon on mapview.
	 *
	 * @param label
	 * @param latLng
	 * @param customIcon
	 * @param numberLabel
	 * @param speed
	 * @param direction the direction of a POI (E, S, W, N, NE, SE, NW, SW, 
	 *                  or empty if no direction information)
	 * @param tripID, the trip ID of the trip of combined trip report
	 * @param vehicleStatus, vehicle status (stop, idle)
	 *
	 * @return an MQA.HtmlPoi object
	 */
	constructHTMLPoi : function(label, latLng, customIcon, numberLabel, speed, direction, tripID, vehicleStatus) {
		var poi = new MQA.HtmlPoi({lat: latLng.lat, lng: latLng.lng});
		var html = "";
		var top = -7, left = -7;
		
		if (this.mapControl.currentMapType == 'cp_rpt_routetrip') {
			
			if ((tripID != null) && tripID) 
			{
				html = "<div class='poiImg trip" + tripID + "'>";
			} else
			{
				html = "<div class='poiImg'>";
			}
			
			if (this.selectTripID && (this.selectTripID == tripID)) 
			{
				// when declutter, set the selected trip icon to the item icon 
				html += "<img width='16' height='16' src='" + ICON_HOST_PATH + this.routeTripImage.name + ".png'></div>";
			} 
			else 
			{
				html += "<img width='16' height='16' src='" + ICON_HOST_PATH + this.routePoiImage + "'></div>";
			}
			
			
			
		} else {

			var directionArrrowDisabledClass = ''; 
			
			if (!this.directionArrowsEnabled) 
			{
				directionArrrowDisabledClass = 'poiImg_direction_disabled';
			}
						
			//console.log('status: ' + vehicleStatus + ', speed: ' + speed + ', dir: ' + direction);
			
			if (vehicleStatus == 'stop') 
			{
				html = "<div class='poiImg_stop direction " + directionArrrowDisabledClass + "'>", top = -17, left = -17;
			} 
			else if (vehicleStatus == 'idle')
			{
				html = "<div class='poiImg_idle direction " + directionArrrowDisabledClass + "'>", top = -17, left = -17;
				
			} else if (vehicleStatus == 'move') {
			
				// check speed
				if (speed != null && speed != "") 
				{
					// for the case of an item with speed and direction
					if ((direction != null) && direction) 
					{
						switch (direction) {
							case "E":
								html = "<div class='poiImg_east direction " + directionArrrowDisabledClass + "'>", top = -17, left = -17;
								break;
							case "W":
								html = "<div class='poiImg_west direction " + directionArrrowDisabledClass + "'>", top = -17, left = -17;
								break;
							case "S":
								html = "<div class='poiImg_south direction " + directionArrrowDisabledClass + "'>", top = -17, left = -17;
								break;
							case "N":
								html = "<div class='poiImg_north direction " + directionArrrowDisabledClass + "'>", top = -17, left = -17;
								break;
							case "NE":
								html = "<div class='poiImg_northeast direction " + directionArrrowDisabledClass + "'>", top = -17, left = -17;
								break;
							case "NW":
								html = "<div class='poiImg_northwest direction " + directionArrrowDisabledClass + "'>", top = -17, left = -17;
								break;
							case "SE":
								html = "<div class='poiImg_southeast direction " + directionArrrowDisabledClass + "'>", top = -17, left = -17;
								break;
							case "SW":
								html = "<div class='poiImg_southwest direction " + directionArrrowDisabledClass + "'>", top = -17, left = -17;
								break;
							default:
								html = "<div class='poiImg'>";
								break;
						}				
					} else {
						// for the case of an item with speed but not direction
						html = "<div class='poiImg_move direction " + directionArrrowDisabledClass + "'>", top = -17, left = -17;				
					}			
				} else {
					html = "<div class='poiImg'>";
				}
	
			} else {
				html = "<div class='poiImg'>";
			}

			
			html += "<img width='" + customIcon.width + "' height='" + customIcon.height + "' src='" + this.constructPoiIconName(customIcon, numberLabel, direction) + "'></div>";
			
		}
		
        if (label) {
        	html += "<div class='htmlLabel'>" + label + "</div>";
        }
        poi.setHtml(html, top, left, 'htmlPoi');
		return poi;
	},
	
	/**
	 * Get icon name for Poi 
	 * 
	 * @param customIcon
	 * @param numberLabel
	 * @returns
	 */
	constructPoiIconName : function(customIcon, numberLabel) {
		 
		 var iconName = ICON_HOST_PATH + "blank.png";
		 if (customIcon) {

			if (numberLabel && numberLabel > 0) {
				iconName = NUMBERS_ICON_HOST_PATH + customIcon.name + "-" + numberLabel + ".png";
			} else {
				iconName = ICON_HOST_PATH + customIcon.name + ".png";        		
			}
		 }
		 
		 return iconName;
	},
	
	
	/**
	 * Add a custom icon into a MQA POI object.
	 * 
	 * @param mqaPoi
	 * @param customIcon
	 * @param numberLabel
	 * @returns
	 */
	constructCustomPoiIcon : function(mqaPoi, customIcon, numberLabel) {
        if (customIcon && customIcon.name) {
			var mqaIcon = null;
        	if (numberLabel && numberLabel > 0) {
				mqaIcon = new MQA.Icon(NUMBERS_ICON_HOST_PATH + customIcon.name + "-" + numberLabel + ".png", customIcon.height, customIcon.width);
        	} else {
				mqaIcon = new MQA.Icon(ICON_HOST_PATH + customIcon.name + ".png", customIcon.height, customIcon.width);        		
        	}
			mqaPoi.setIcon(mqaIcon);

			// the following two lines are the trick to remove shadow of marker
			var shadow = new MQA.Icon(ICON_HOST_PATH + "blank.png", 0, 0);
			mqaPoi.setShadow(shadow);
		}
        return mqaPoi;
	},

	/**
	 * Build the route segments with decorated directional arrows to connect points if necessary.
	 * 
	 * @param beaconItems
	 * @returns MQA.ShapeCollection object contains a list of MQA.LineOverlay objects
	 */
	buildRouteSegments : function(beaconItems) {
	    var routeSegments = new MQA.ShapeCollection();
	    routeSegments.collectionName = SHAPE_COLLECTION_ROUTE_SEGMENTS;
	    routeSegments.declutter = false;

	    for (var x in beaconItems) {
	        //var beaconId = x;
	        var locatePoints = beaconItems[x].locatePoints;
	        var isPointsConnected = beaconItems[x].isPointsConnected;
	        var showInputOutputColor = beaconItems[x].showInputOutputColor;
	        var szLocatePoints = locatePoints.length;
	        var segmentPoints = new Array();

	        var initialIndex = this.determineInitialIndex(locatePoints);
	        for (var i = initialIndex; i < szLocatePoints; i++) {
	            var currentPoint = locatePoints[i];
	            var coord = currentPoint.coord;

	            if (isPointsConnected) {
	                segmentPoints.push(coord.lat);
	                segmentPoints.push(coord.lng);

	                // decorate directional arrow for the route segments
	                
	                // change the color of line segment of the route log if the showInputOutputColor flag is turned on
	                if (showInputOutputColor) {
	                	var nextPoint = null;
	                	var nextCoord = null;
	                	if (i != szLocatePoints - 1) {
							// not last point
							nextPoint = locatePoints[i + 1];
							nextCoord = nextPoint.coord;
						}
	                	
						var lineColor = currentPoint.lineColor;
						
						lineColor = lineColor.replace("0x", "#"); // convert from flash color to html color

						if (nextPoint) {
							// create a line segment
							var inputOutputsegmentPoints = new Array();
							inputOutputsegmentPoints.push(coord.lat);
							inputOutputsegmentPoints.push(coord.lng);
							inputOutputsegmentPoints.push(nextCoord.lat);
							inputOutputsegmentPoints.push(nextCoord.lng);

							var routeSegment = new MQA.LineOverlay();
				            routeSegment.color = lineColor;
				            routeSegment.borderWidth = 1;
				            routeSegment.shapePoints = inputOutputsegmentPoints;
				            routeSegments.add(routeSegment);
						}
	                	
	                	if (i < szLocatePoints - 1) {
	                        arrow = this.buildDirectionalArrow(currentPoint, locatePoints[i + 1], lineColor);
	                        if (arrow) {
	                            routeSegments.add(arrow);
	                        }
	                    }
	                } else {
	                    if (i < szLocatePoints - 1) {
	                        arrow = this.buildDirectionalArrow(currentPoint, locatePoints[i + 1], DEFAULT_ROUTE_ARROW_COLOR);
	                        if (arrow) {
	                            routeSegments.add(arrow);
	                        }
	                    }
	                }

	                
	    	        if (!showInputOutputColor) {
			            var routeSegment = new MQA.LineOverlay();
			            routeSegment.color = DEFAULT_ROUTE_COLOR;
			            routeSegment.borderWidth = 1;
			            routeSegment.shapePoints = segmentPoints;
			            routeSegments.add(routeSegment);
	    	        }
	                
	            }
	        } // for (var i = initialIndex; i < szLocatePoints; i++)
	        	
		} // for (var x in beaconItems)

	    return routeSegments;
	},

	/**
	 * Build the trip segments with decorated directional arrows to connect points if necessary for combined trip report.
	 * 
	 * @param beaconItems
	 * @param startPoi - start Poi of the trip
	 * @param endPoi - end Poi of the trip
	 * 
	 * @returns MQA.ShapeCollection object contains a list of MQA.LineOverlay objects
	 */
	buildTripSegments : function(beaconItems, startPoi, endPoi) {
		
		
	    var routeSegments = new MQA.ShapeCollection();
	    routeSegments.collectionName = SHAPE_COLLECTION_ROUTE_SEGMENTS;
	    routeSegments.declutter = false;

	    for (var x in beaconItems) {
	        //var beaconId = x;
	        var locatePoints = beaconItems[x].locatePoints;
	        var isPointsConnected = beaconItems[x].isPointsConnected;
	        var showInputOutputColor = beaconItems[x].showInputOutputColor;
	        var szLocatePoints = locatePoints.length;
	        
	        var segmentPoints = new Array();

	        //var initialIndex = this.determineInitialIndex(locatePoints);

	        
			var tripBound = new MQA.RectLL();
			var maxLat = 0;
			var maxLng = 0;
			var minLat = 0;
			var minLng = 0;
	        
	        for (var i = startPoi; i <= endPoi; i++) {
	        	
	            var currentPoint = locatePoints[i];
	            var coord = currentPoint.coord;

	            this.routeTripImage = currentPoint.icon;
	            
                segmentPoints.push(coord.lat);
                segmentPoints.push(coord.lng);
                
				if (i == startPoi) {
					
					maxLat = coord.lat;
					maxLng = coord.lng;
					minLat = coord.lat;
					minLng = coord.lng;
					
				} else {
                
	                if (coord.lat > maxLat) {
	                	maxLat = coord.lat;
	                }
	
	                if (coord.lng > maxLng) {
	                	maxLng = coord.lng;
	                }
	
	                if (coord.lat < minLat) {
	                	minLat = coord.lat;
	                }
	
	                if (coord.lng < minLng) {
	                	minLng = coord.lng;
	                }
				}	            
                
                // decorate directional arrow for the route segments
                
                if (i < endPoi) {
                    arrow = this.buildDirectionalArrow(currentPoint, locatePoints[i + 1], DEFAULT_ROUTE_ARROW_COLOR);
                    if (arrow) {
                        routeSegments.add(arrow);
                    }
                }

	            var routeSegment = new MQA.LineOverlay();
	            routeSegment.color = DEFAULT_ROUTE_COLOR;
	            routeSegment.borderWidth = 1;
	            routeSegment.shapePoints = segmentPoints;
	            routeSegments.add(routeSegment);

	        } // for (var i = startPoi; i <= endPoi; i++)
	        	
	        //prepare the bounding box for trip	        	
			tripBound.ul = new MQA.LatLng(maxLat, maxLng);
			tripBound.lr = new MQA.LatLng(minLat, minLng);				

			this.tripBoundingBox = tripBound;
	        	
		} // for (var x in beaconItems)

	    return routeSegments;
	},

	
	/**
	 * Creates and returns the string to be used in a job POI's info window.
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
	    var infoContent = "<div class='poi_infowindow'>";
	    infoContent += "<div class='poi_infowindow_title'>" + label + "</div>";
	    
	    jobDescription = "<div class='job_description'>";
		jobDescription += "<div class='job_description_title'>" + this.i18n.gettext('text.infowindow.dispatch.description') + "</div>";
		jobDescription += "<div class='job_description_content'>" + description + "</div>";
		jobDescription += "</div>";
		
		jobLocation = "<div class='job_location'>";
		jobLocation += "<div class='job_location_title'>" + this.i18n.gettext('text.infowindow.dispatch.location') + "</div>";
		jobLocation += ((landmark) ? "<div clas='job_landmark'>(" + landmark + ")</div>" : "");
		jobLocation += "<div class='job_destination'>" + destination + "</div>";
		jobLocation += "</div>";
		
		jobDetails = "<table class='job_details'>";
		jobDetails += "<tr><td class='job_details_title'>" + this.i18n.gettext('text.infowindow.dispatch.priority') + "</td><td>" + ((priority == -1) ? "-" : priority) + "</td></tr>";
		jobDetails += "<tr><td class='job_details_title'>" + this.i18n.gettext('text.infowindow.dispatch.status') + "</td><td>" + ((status) ? status : "-") + "</td></tr>";
		jobDetails += "<tr><td class='job_details_title'>" + this.i18n.gettext('text.infowindow.dispatch.time.sent') + "</td><td>" + ((sentTimestamp) ? sentTimestamp : "-") + "</td></tr>";
		jobDetails += "<tr><td class='job_details_title'>" + this.i18n.gettext('text.infowindow.dispatch.time.ack') + "</td><td>" + ((ackTimestamp) ? ackTimestamp : "-") + "</td></tr>";
		jobDetails += "<tr><td class='job_details_title'>" + this.i18n.gettext('text.infowindow.dispatch.time.eta') + "</td><td>" + ((etaTimestamp) ? etaTimestamp : "-") + "</td></tr>";
		jobDetails += (isDone) ? "<tr><td class='job_details_title'>" + this.i18n.gettext('text.infowindow.dispatch.time.done') + "</td><td>" + doneTimestamp + "</td></tr>" : "";
		jobDetails += (isDeleted) ? "<tr><td class='job_details_title'>" + this.i18n.gettext('text.infowindow.dispatch.time.deleted') + "</td><td>" + ((deletedTimestamp) ? deletedTimestamp : "") + " " + ((deletedBy) ? deletedBy : "") + "</td></tr>" : "";
		jobDetails += "</table>";
		
		infoContent += jobDescription + jobLocation + jobDetails;
			    
	    infoContent += "<div class='job_toolbar'>";
	    infoContent += "<input id='delete_job_" + beaconId + "_" + jobId + "' type='button' class='job_button' value='" + this.i18n.gettext('button.infowindow.dispatch.delete') + "' />&nbsp;";
	    infoContent += "<input id='reorder_job_" + beaconId + "_" + jobId + "' type='button' class='job_button button_reorder_job' value='" + this.i18n.gettext('button.infowindow.dispatch.reorder') + "'" + ((isDeleted || isDone) ? " disabled='disabled'" : "") + " />&nbsp;";
	    infoContent += "<input id='reassign_job_" + beaconId + "_" + jobId + "' type='button' class='job_button button_reassign_job' value='" + this.i18n.gettext('button.infowindow.dispatch.reassign') + "'" + ((!isDeleted && isDone) ? " disabled='disabled'" : "") + " />";
	    infoContent += "</div>";
		infoContent += "</div>";
		return infoContent;	    
	},
	
	/**
	 * Creates and returns the string to be used in a landmark POI's info window.
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
	  
	    var infoContent = "<div class='poi_infowindow'>";
	    infoContent += "<div class='poi_infowindow_title'>" + label + "</div>";
	    
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
			infoContent += (userNote) ? this.createPoiInfoWindowPara(userNote) : "";
	    
			// landmark's address
			infoContent += (lmkAddress) ? this.createPoiInfoWindowPara(lmkAddress) : "";
	    
			// landmark's content
			infoContent += (content) ? this.createPoiInfoWindowPara(content) : "";
			infoContent += "<br></div>";
	    }
	    infoContent += "</div>";
		return infoContent;	    
	},
	
	/**
	 * Construct the content of InfoWindow for each location Poi object.
	 * 
	 * @returns string the content of InfoWindow
	 */
	buildLocationInfoWindowContents : function(
	                label, coord, eventType, address, stopDuration, speed, direction, postedSpeed, temperature, timestamp, landmark,
	                circleCertaintyRadius, status, userNote, driverID, driverStatus, beaconID,
	                guardianID, ioprt1Scenario, ioprt2Scenario, ioprt3Scenario, ioprt4Scenario, lineColor, dispatch, isMetric, driverName) {

	    var infoContent = "<div class='poi_infowindow'>";
	    infoContent += "<div class='poi_infowindow_title'>" + label + "</div>";
	    
		infoContent += "<div class='event_time'>";
		
		//Show driver ID if it is mapview
		if (this.mapControl.currentMapType == 'cp_fleet' || this.mapControl.currentMapType == 'cp_rpt_routelog' || this.mapControl.currentMapType == 'cp_rpt_stop_map' || this.mapControl.currentMapType == 'cp_rpt_routetrip')
		{
			infoContent += (driverName) ? this.createPoiInfoWindowPara(this.i18n.strargs(this.i18n.gettext('text.infowindow.driver'), driverName)) : "";
		}
		
		
	    infoContent += this.createPoiInfoWindowPara(timestamp);

	    infoContent += (speed) ? this.createPoiInfoWindowPara(speed + " " + direction) : "";
	    
	    infoContent += (postedSpeed) ? this.createPoiInfoWindowPara(postedSpeed) : "";

	    infoContent += (temperature) ? this.createPoiInfoWindowPara(temperature) : "";
	    
		infoContent += "</div>";
	    infoContent += "<div class='event_location'>";
	    infoContent += this.createPoiInfoWindowPara(address.street);

	    var secondAddressLine = "";
	    var city = address.city;
	    var county = address.county;
	    var stateProvince = address.state;
	    secondAddressLine += (city) ? city : "";
	    secondAddressLine += (county) ? ((secondAddressLine) ? ", " + county : county) : "";
	    secondAddressLine += (stateProvince) ? ((secondAddressLine) ? ", " + stateProvince : stateProvince) : "";
	    secondAddressLine += " " + address.postalCode;
	    infoContent += this.createPoiInfoWindowPara(secondAddressLine);

	    infoContent += this.createPoiInfoWindowPara(address.country);
	    infoContent += (stopDuration) ? this.createPoiInfoWindowPara(stopDuration) : "";

	    if (!isMetric) {
	        var cocValueFeet = Math.round(circleCertaintyRadius) * 3.2808399;
	        infoContent += (cocValueFeet > 0) ? this.createPoiInfoWindowPara(this.i18n.strargs(this.i18n.gettext('text.infowindow.coc.accuracy.ft'), cocValueFeet)) : "";
	    } else {
	        var cocValueMetres = circleCertaintyRadius;
	        infoContent += (cocValueMetres > 0) ? this.createPoiInfoWindowPara(this.i18n.strargs(this.i18n.gettext('text.infowindow.coc.accuracy.m'), cocValueMetres)) : "";
	    }
	    infoContent += (coord && this.latLonDisplayed) ? this.createPoiInfoWindowPara(this.i18n.strargs(this.i18n.gettext('text.infowindow.coord'), coord.lat, coord.lng)) : "";
	    infoContent += (eventType) ? this.createPoiInfoWindowPara(this.i18n.strargs(this.i18n.gettext('text.infowindow.event_type'), eventType)) : "";
	    infoContent += (landmark) ? this.createPoiInfoWindowPara(this.i18n.strargs(this.i18n.gettext('text.infowindow.landmark'), landmark)) : "";
	    infoContent += "</div>";
		if (driverStatus || status || userNote || ioprt1Scenario || ioprt2Scenario || ioprt3Scenario || ioprt4Scenario || dispatch) {
			infoContent += "<div class='event_driver_info'>";		
			// Driver status
			infoContent += (driverStatus) ? this.createPoiInfoWindowPara(this.i18n.strargs(this.i18n.gettext('text.infowindow.driver_status'), driverStatus)) : "";
			// PND status
			infoContent += (status) ? this.createPoiInfoWindowPara(this.i18n.strargs(this.i18n.gettext('text.infowindow.pnd_status'), status)) : "";
			// user note
			infoContent += (userNote) ? this.createPoiInfoWindowPara(userNote) : "";
			// dispatch toolbar
			if (dispatch) {
				var type = dispatch.type;
				var id = dispatch.id;
				infoContent += "<div class='dispatch_toolbar'>";
				infoContent += "<div><a href='#' id='sendjob_" + type + "_" + id + "'><img src='" + ICON_HOST_PATH + "send_job.png'></a></div>";
				infoContent += "<div><a href='#' id='viewjob_" + type + "_" + id + "'><img src='" + ICON_HOST_PATH + "view_job.png'></a></div>";
				infoContent += "<div><a href='#' id='sendmessage_" + type + "_" + id + "'><img src='" + ICON_HOST_PATH + "send_message.png'></a></div>";
				infoContent += "</div>";
			}
			// input #1 scenario
			infoContent += (ioprt1Scenario) ? this.createPoiInfoWindowPara(ioprt1Scenario) : "";
			// input #2 scenario
			infoContent += (ioprt2Scenario) ? this.createPoiInfoWindowPara(ioprt2Scenario) : "";
			// input #3 scenario
			infoContent += (ioprt3Scenario) ? this.createPoiInfoWindowPara(ioprt3Scenario) : "";
			// input #4 scenario
			infoContent += (ioprt4Scenario) ? this.createPoiInfoWindowPara(ioprt4Scenario) : "";
			infoContent += "</div>";
		}
		
	    infoContent += "</div>";
		return infoContent;
	},

	/**
	 * Construct a paragraph for the content of InfoWindow of Poi object.
	 * 
	 * @param paragraph
	 * @returns string the decorated paragraph
	 */
	createPoiInfoWindowPara : function(paragraph) {
	    return "<p>" + paragraph + "</p>";
	},
	
	/**
	 * Create a MQA shape overlay. It only supports rectangle, circle, and polygon types.
	 *
	 * @param type
	 * @param fillColor
	 * @param fillColorAlpha
	 * @param color
	 * @param colorAlpha
	 * @param borderWidth
	 * @param key
	 * 
	 * @returns a MQA's shape overlay.
	 */
	createShape : function(type, fillColor, fillColorAlpha, color, colorAlpha, borderWidth, key) {
		var shape = null;
		switch (type) {
			case "rectangle":
				shape = new MQA.RectangleOverlay();
				break;
			case "circle":
				//shape = new MQA.CircleOverlay();
				shape = new MQA.EllipseOverlay(); // use EllipseOverlay to simulate CircleOverlay for now due to the bug in V7.0
				break;
			case "polygon":
				shape = new MQA.PolygonOverlay();
				break;
		}
		shape.fillColor = fillColor;
		shape.fillColorAlpha = fillColorAlpha;
		shape.color = color;
		shape.colorAlpha = colorAlpha;
		shape.borderWidth = borderWidth;
		if (key) {
			shape.key = key;
		}
		return shape;
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
	 * Constructs a directional arrow polygon overlay, given two locate points.
	 * 
	 * The arrow is an isoceles triangle with a height and base of 10 pixels
	 * each.  It is placed such that the arrow's tip will always be facing
	 * towards the second locate point, and that the arrow's midpoint is placed
	 * on the midpoint of the line between the two locate points.
	 *
	 * @param locatePoint1  A ContigoPoi object.
	 * @param locatePoint2  A ContigoPoi object that has a larger timestamp than
	 *                      locatePoint1.
	*
	* @return Returns a MQ PolygonOverlay for the arrow, or null if the 
	*         distance between the locate points is less than 18 pixels.
	*/
	buildDirectionalArrow : function(locatePoint1, locatePoint2, lineColor) {

		var vertices = new Array();
		var arrow = null;
		var firstCoord = new MQA.LatLng(locatePoint1.coord.lat, locatePoint1.coord.lng);
		var secondCoord = new MQA.LatLng(locatePoint2.coord.lat, locatePoint2.coord.lng);

		var firstPoint = this.map.llToPix(firstCoord);
		var secondPoint = this.map.llToPix(secondCoord);

		var xDist = firstPoint.x - secondPoint.x;
		var yDist = firstPoint.y - secondPoint.y;

		var distance = Math.sqrt(xDist * xDist + yDist * yDist);

		/*
		 * Minimum distance is at least 18 pixels (10 pixels for the
		 * height of the arrow + 4 pixels for spacing on either side
		 * of the arrow on the line).
		 */
		if (distance >= 18.0) {
			var arrowTip;
			/*
			 * Assuming a vertical arrow (with the tip pointing in a 
			 * positive y-direction), this corner is to the left of the
			 * arrow tip.
			 */
			var arrowCorner1;
			/*
			 * Assuming a vertical arrow (with the tip pointing in a 
			 * positive y-direction), this corner is to the right of the
			 * arrow tip.
			 */
			var arrowCorner2;
			var midpoint = new MQA.Point((firstPoint.x + secondPoint.x) / 2, (firstPoint.y + secondPoint.y) / 2);
			if (xDist == 0.0) {
				// we have a vertical arrow      
				if (firstPoint.y > secondPoint.y) {
					// arrow is pointing down        
					arrowTip = new MQA.Point(midpoint.x, midpoint.y - 5);
					arrowCorner1 = new MQA.Point(midpoint.x + 5, midpoint.y + 5);
					arrowCorner2 = new MQA.Point(midpoint.x - 5, midpoint.y + 5);
				} else {
					// arrow is pointing up        
					arrowTip = new MQA.Point(midpoint.x, midpoint.y + 5);
					arrowCorner1 = new MQA.Point(midpoint.x - 5, midpoint.y - 5);
					arrowCorner2 = new MQA.Point(midpoint.x + 5, midpoint.y - 5);
				}
			} else if (yDist == 0.0) {
				// we have a horizontal arrow      
				if (firstPoint.x > secondPoint.x) {
					// arrow is pointing to the left        
					arrowTip = new MQA.Point(midpoint.x - 5, midpoint.y);
					arrowCorner1 = new MQA.Point(midpoint.x + 5, midpoint.y - 5);
					arrowCorner2 = new MQA.Point(midpoint.x + 5, midpoint.y + 5);
				} else {
					// arrow is pointing to the right        
					arrowTip = new MQA.Point(midpoint.x + 5, midpoint.y);
					arrowCorner1 = new MQA.Point(midpoint.x - 5, midpoint.y + 5);
					arrowCorner2 = new MQA.Point(midpoint.x - 5, midpoint.y - 5);
				}
			} else {
				/*
				 * The arrow is at an angle; the easiest way to calculate
				 * the three corner coordinates for the directional arrow 
				 * is to use polar coordinates, which are then translated
				 * back to standard Cartesian coordinates.
				 *
				 * Because the arrow will always be facing towards the
				 * second point, as it always has a larger timestamp, all
				 * calculations will be performed relative to the first 
				 * point with the smaller timestamp.
				 */
				var midXDiff = midpoint.x - firstPoint.x;
				var midYDiff = midpoint.y - firstPoint.y;
				var midLength = Math.sqrt(midXDiff * midXDiff + midYDiff * midYDiff);
				/*
				 * The length of the line from the first point to the
				 * arrow's tip.
				 */
				var tipLength = (midLength + 5);
				// The arrow tip's angle of rotation from 0 degrees      
				var theta = Math.atan2(secondPoint.y - firstPoint.y, secondPoint.x - firstPoint.x);
				/*
				 * The length of the line extending from the coords of the 
				 * first point to one of the coords of the arrow corner
				 * points.
				 */
				var cornerLength = Math.sqrt(5 * 5 + (midLength - 5) * (midLength - 5));
				/*
				 * The angle of rotation, relative to theta, for the two
				 * arrow corners from the first point.
				 */
				var rho = Math.asin(5 / cornerLength);
				/*
				 * The polar coords for each of the arrow's corners can
				 * now be determined as follows:
				 *
				 * 1) arrowTip = (tipLength, theta)
				 * 2) arrowCorner1 = (cornerLength, theta - rho)
				 * 3) arrowCorner2 = (cornerLength, theta + rho)
				 *
				 * Now, we convert those polar coords back to Cartesian
				 * coords for display on the map and translate to their proper
				 * positions relative to the first point.
				 */
				arrowTip = new MQA.Point(firstPoint.x + tipLength * Math.cos(theta), firstPoint.y + tipLength * Math.sin(theta));
				arrowCorner1 = new MQA.Point(firstPoint.x + cornerLength * Math.cos(theta - rho), firstPoint.y + cornerLength * Math.sin(theta - rho));
				arrowCorner2 = new MQA.Point(firstPoint.x + cornerLength * Math.cos(theta + rho), firstPoint.y + cornerLength * Math.sin(theta + rho));
			}

			// create the polygon overlay using all three corners           
			vertices.push(this.map.pixToLL(arrowTip).lat);
			vertices.push(this.map.pixToLL(arrowTip).lng);
			vertices.push(this.map.pixToLL(arrowCorner1).lat);
			vertices.push(this.map.pixToLL(arrowCorner1).lng);
			vertices.push(this.map.pixToLL(arrowCorner2).lat);
			vertices.push(this.map.pixToLL(arrowCorner2).lng);
			
			arrow = this.createShape('polygon', "#FF0000", 1, lineColor, 1, 2, "");
			arrow.shapePoints = vertices;
		}
		return arrow;
	},

	/**
	 * Event handler that redraws the Circles of Certainty (CoCs) once a 
	 * ZOOM_END event is fired by the map.
	 */
	redrawCoCHandler : function(event) {
		this.redrawAllCoCs(this.poiCollection);
	},
	
	/**
	 * Event handler that redraws the route segments once a 
	 * ZOOM_END event is fired by the map.
	 */
	redrawRouteSegmentsHandler : function (event) {
		this.redrawRouteSegments(this.poiCollection);
	},

	/**
	 *  Trip segment redraw handlerwhen the map zoom
	 *  
	 * 
	 */
	redrawTripSegmentsHandler : function (event) {
		this.redrawTripSegments(this.tripStartPoiIndex, this.tripEndPoiIndex, '');
	},	
	
	/**
	 * Enables the "auto best fit" feature.  If the "auto centering" feature
	 * is already enabled, it will be disabled.
	 *
	 * @param isEnabled  Whether the "auto best fit" feature is to be enabled.
	 */
	enableAutoBestFit : function(isEnabled) {  
		if (isEnabled) {    
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
	 * @param isEnabled  Whether the "auto centering" feature is to be enabled.
	 */
	enableAutoCentering : function(isEnabled) {  
		if (isEnabled) {    
			if (this.isAutoBestFitActive) {
				this.isAutoBestFitActive = false;
			}    
			this.isAutoCenteringActive = true;    
		} else {
			this.isAutoCenteringActive = false;
		}
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
		var date = this.parseTimestampString(locatePoint.timestamp);
		
		if (this.mostRecentLocateTimeMillis == -1 || date > this.mostRecentLocateTimeMillis) {        
			this.mostRecentLocateTimeMillis = date;
			this.mostRecentLocateCoord = new MQA.LatLng(locatePoint.coord.lat, locatePoint.coord.lng);
		}
	},
	
	/**
	 * Reset the mostRecentLocateCoord variable to null
	 *
	 */
	resetMostRecentLocate : function() {
		this.mostRecentLocateTimeMillis = -1;
		this.mostRecentLocateCoord = null;
	},
	
	
	
	/**
	 * Parses a timestamp string and returns the millisecond representation of
	 * it.
	 *
	 * @param timestamp  The timestamp string  (e.g. 12/13/2007 10:59:56AM PST).
	 *
	 * @return   Returns the millisecond representation of the timestamp.
	 */
	parseTimestampString : function(timestamp) {  
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
	  
		if (timeZone == this.i18n.gettext('string.infowindow.timezone.pacific')) {
			revampedTimeZone = "UTC-0800";    
		} else if (timeZone == this.i18n.gettext('string.infowindow.timezone.pacific.dst') || timeZone == this.i18n.gettext('string.infowindow.timezone.mountain')) {
			revampedTimeZone = "UTC-0700";
	    } else if (timeZone == this.i18n.gettext('string.infowindow.timezone.mountain.dst') || timeZone == this.i18n.gettext('string.infowindow.timezone.central')) {
	    	revampedTimeZone = "UTC-0600";    
	    } else if (timeZone == this.i18n.gettext('string.infowindow.timezone.central.dst') || timeZone == this.i18n.gettext('string.infowindow.timezone.eastern')) {
	    	revampedTimeZone = "UTC-0500";    
	    } else if (timeZone == this.i18n.gettext('string.infowindow.timezone.eastern.dst') || timeZone == this.i18n.gettext('string.infowindow.timezone.atlantic')) {    
	    	revampedTimeZone == "UTC-0400";
	    } else if (timeZone == this.i18n.gettext('string.infowindow.timezone.atlantic.dst')) {    
	    	revampedTimeZone == "UTC-0300";    
	    } else if (timeZone == this.i18n.gettext('string.infowindow.timezone.newfoundland')) {    
	    	revampedTimeZone = "UTC-0330";    
	    } else if (timeZone == this.i18n.gettext('string.infowindow.timezone.newfoundland.dst')) {    
	    	revampedTimeZone = "UTC-0230";    
	    } else {
	    	// do nothing    
	    }
	  
		var revampedTimestamp = datePortion + " " + revampedTimePortion;
	  
		if (revampedTimeZone != null) {
			revampedTimestamp += " " + revampedTimeZone;
		}
	  
		var date = Date.parse(revampedTimestamp);
	  
		return date;
	  
	},

	/**
	 * Center the map to a particular latitude/longitude.
	 * 
	 * @param latLng the lat/lng of a point
	 */
	recenterToLatLng : function (latLng) {
	    if (latLng) {
	        this.map.setCenter(latLng, 17);
	    }
	},

	/**
	 * Toggle declutter feature of tile map.
	 * 
	 * @param isDeclutter
	 */
	declutterMap : function(isDeclutter) {
		// declutter activated; i.e. the checkbox was clicked.
		this.declutteredActivated = true;
		this.decluttered = isDeclutter;
		this.refreshMap(this.poiCollection);
	},
	
	/**
	 * Toggle direction arrows feature of tile map.
	 * 
	 * @param enabled
	 */
	enableDirection : function(enabled) {
		this.directionArrowsEnabled = enabled;
		$('[class^="poiImg_"]').each(function(index, value) {
			if (enabled) {
				$(this).removeClass("poiImg_direction_disabled");
			} else {
				$(this).addClass("poiImg_direction_disabled");
			}
		});
	},
	
	/**
	 * Triggers a best fit of the map.
	 */
	bestFit : function()  {    	
		this.map.bestFit();
	},

	/**
	 * A custom best fit method to be restricted with certain zoom levels.
     *
	 * @param keepCenter
	 * @param minZoom
	 * @param maxZoom
	 */
	customBestFit: function(keepCenter, minZoom, maxZoom) {
		
		this.map.bestFit(keepCenter, minZoom, maxZoom);
		
		//alert('zoom level= ' + this.map.zoom);
		
	},

	/**
	 * Centres the map to the most recent locate point of all locate points on
	 * the map.
	 */
	centreMap : function() {		
		if (this.mostRecentLocateCoord) {
			this.recenterToLatLng(this.mostRecentLocateCoord);
			this.bestFit();
		}  
	},
	
	/**
	 * Create a silencer layer to disable dragging on the map and register the click event handler.
	 */
	createSilencer : function(clickEventHandler) {
		this.removeSilencer();
		this.silencer.css({position: 'absolute', width: this.width + 'px', height: this.height + 'px', top: '0', left: '0', 'background-image': 'url(' + IMG_HOST_PATH + 'spacer.gif)'});
		this.mapquestLogoLayer.append(this.silencer);
		// use jquery's bind method to bind event in order to pass "this" object to the event handler
		// it has to be done after the node inserted into document's DOM tree
		// @see http://api.jquery.com/bind/
		this.silencer.bind('mousedown', {self: this}, clickEventHandler);
		//this.silencer.bind(event, {self: this}, clickEventHandler);
		MQA.EventUtil.unselectable(this.silencer[0]); // make the silencer element unselectable as dragging 		
	},
	
	/**
	 * Remove silencer layer from DOM, all of data and events associated with the 
	 * silencer layer will be removed, so the map will be reset to the 
	 * original operation.
	 */
	removeSilencer : function() {
		this.silencer.remove();		
	},
	
	/**
	 * Remove the silencer layer from DOM, all of data and events associated with the 
	 * silencer layer will be kept, so the map will be reset to the 
	 * original operation.
	 */
	detatchSilencer : function() {
		this.silencer.detach();
	},
	
	/** 
	 * Switches to Panning mode.
	 */
	switchToPanningMode : function() {
		this.currentMapMode = MAP_MODE_PANNING;  

		//remove any address poi on map
		this.removeCurrentAddressPoi();
		
		// remove any rectangular shape on map
		this.removeZoomRectShape();

		this.removeIncompleteZone();
		
		// remove silencer so map can be panned
		this.removeSilencer();
	},
	
	/**
	 * Performs the necessary actions and clean-up to switch to View Address 
	 * mode.
	 */
	switchToViewAddrMode : function() {
		this.currentMapMode = MAP_MODE_VIEW_ADDR;
		
		// remove any rectangular shape on map
		this.removeZoomRectShape();
		
		this.removeIncompleteZone();
		
		this.createSilencer(this.viewAddressSilencerHandler);		
	},
	
	/**
	 * The handler to handle mousedown event when the map is in view address mode.
	 */
	viewAddressSilencerHandler : function(event) {
		var self = event.data.self;
		var ll = self.cursorLL(event);
		if (ll) {	
			self.showAddressPoi(ll.lat, ll.lng);
		}
		return false;
	},
	
	/**
	 * Performs the necessary actions and clean-up to switch to zoom to rectangle.
	 */
	switchToZoomRectMode : function() {
		this.currentMapMode = MAP_MODE_ZOOM_TO_RECT; 
		
		//remove any address poi on map
		this.removeCurrentAddressPoi();

		this.removeIncompleteZone();
		
		this.createSilencer(this.zoomRectSilencerHandler);
	},
	
	/**
	 * The handler to handle mousedown event when the map is in zoom to rect mode.
	 */
	zoomRectSilencerHandler : function(event) {
		var self = event.data.self;
		var cursorll1 = self.cursorLL(event);
		var shape = self.map.getByKey('drawingShape');
		if (!shape) {
			// the first click to create the anchor point of the rectangle
			shape = self.createShape('rectangle', '#C80000', 0.0, '#F00000', 1, 1, 'drawingShape');

			shape.shapePoints = [cursorll1.lat, cursorll1.lng];
			self.silencer.bind('mousemove', {self: self}, self.moveHandlerOfZoomRectSilencer);
			self.map.addShape(shape);
		} else {
			// the second click to complete the rectangle
			if (shape.shapePoints.length == 4) {
				var bound = new MQA.RectLL();
				bound.ul = new MQA.LatLng(shape.shapePoints[0], shape.shapePoints[1]);
				bound.lr = new MQA.LatLng(shape.shapePoints[2], shape.shapePoints[3]);				
				self.map.zoomToRect(bound);
			}
			self.map.removeShape(shape);
			self.silencer.unbind('mousemove');
		}
	},

	/**
	 * A handler to handle mouse movement of zoom to rectangle action.
	 *
	 * @param event
	 */
	moveHandlerOfZoomRectSilencer : function(event) {
		var self = event.data.self;
		var shape = self.map.getByKey('drawingShape');
		if (shape) {
			var cursorll1 = {lat: shape.shapePoints[0], lng: shape.shapePoints[1]};
			var cursorll2 = self.cursorLL(event);
			shape.setShapePoints([
				/*
				make sure to get upper left and lower right points set correctly.
				*/
				cursorll1.lat > cursorll2.lat ? cursorll1.lat : cursorll2.lat,
				cursorll1.lng < cursorll2.lng ? cursorll1.lng : cursorll2.lng,
				cursorll1.lat < cursorll2.lat ? cursorll1.lat : cursorll2.lat,
				cursorll1.lng > cursorll2.lng ? cursorll1.lng : cursorll2.lng
			]);
		}
	},

	/**
	 * Remove zoom to rectangular shape on map
	 */
	removeZoomRectShape : function() {
		var shape = this.map.getByKey('drawingShape');
		if (shape) {
    		this.map.removeShape(shape);
    		shape = null;
    	}		
	},	
	
	/**
	 * Remove incomplete zone (applies to all shape types) from map when map operation is clicked
	 */
	removeIncompleteZone : function() {
		if (!this.isDrawingComplete || this.plottingPolygonZoneInProgress) {
        	this.clearZones();
        }
    },
     
	/**
	 * Convert window's point to lat/lon.
	 * 
	 * @param event
	 * @returns
	 */
	cursorLL : function(event) { // get cursor offsets
		var x = (MQA.Util.getBrowserInfo().name == "msie") ? window.event.clientX - this.offsetX : event.pageX - this.offsetX;
		var y = (MQA.Util.getBrowserInfo().name == "msie") ? window.event.clientY - this.offsetY : event.pageY - this.offsetY; // funky if scrolling in IE
		return this.map.pixToLL(new MQA.Point(x, y));
	},
	
    /**
     * Performs a radial search around a central point on the map for all the 
     * closest beacon items within a particular radius, in miles.  These points,
     * along with the central point, then replace whatever points are currently
     * shown on the map.  
     *
     * @param centralPoint  The ContigoPoi object around which a radial search
     *                      of the closest beacon locate points will be 
     *                      performed.
     *
     * @param itemsList     The associative list, whose (key, value) pairs 
     *                      consist of (beaconId, ContigoBeaconItem) values.
     *
     * @param radius        The radius, in metres, to search.  
     *
     * @param maxResults    The maximum number of locate points, excluding the
     *                      central point, to display.  
     *
     * @param measurementUnit  The measurement unit to be used (either "ft" 
     *                         or "m").
     */
	radialSearchAndDisplay : function(centralPoint, beaconItems, radius, maxResults, measurementUnit) {
		var distanceList = new Array();
		var beaconIDArr = new Array();
	    var guardianIDArr = new Array();
	    var loginIDArr = new Array();
	    
		var centralCoord = new MQA.LatLng(centralPoint.coord.lat, centralPoint.coord.lng);
	    /*
	     * Figure out all the distances between the central point and a locate 
	     * point.
	     */
		for (var beaconId in beaconItems) {
			var locatePoints = beaconItems[beaconId].locatePoints;
			var szLocatePoints = locatePoints.length;
			for (var i = 0; i < szLocatePoints; i++) {
				var currentLocate = locatePoints[i];
				var distMetres = centralCoord.distanceFrom(new MQA.LatLng(currentLocate.coord.lat, currentLocate.coord.lng));
				if (distMetres <= radius) {  
		            var radialObj = {dist : distMetres, locate : currentLocate, beaconId : beaconId};
		            distanceList.push(radialObj);			            
				}
			} // for (var i = 0; i < szLocatePoints; i++)
		} // for (var beaconId in beaconItems)
		
		// sort the distance array according to distances
		distanceList.sort(function(a, b) {
			if (a.dist < b.dist) {
				return -1;
			}
			if (a.dist > b.dist) {
				return 1;
			}
			return 0;
		});

		// create a new ContigoPoiCollection object with the results
		var szDistanceList = distanceList.length;
		var landmarks = [centralPoint];
		var items = {};
		for (var j = 0; j < szDistanceList; j++) {
			if (j < maxResults) {
				var currentDistObj = distanceList[j];
				beaconIDArr.push(currentDistObj.locate.beaconID);
		        guardianIDArr.push(currentDistObj.locate.guardianID);
		        loginIDArr.push(currentDistObj.locate.loginID);
		        
		        if (items[currentDistObj.beaconId]) {			            
		            items[currentDistObj.beaconId].locatePoints.push(currentDistObj.locate);			          
		        } else {
		            var locates = [currentDistObj.locate];			          
		            var beaconItem = {locatePoints: locates, isPointsConnected: false, showInputOutputColor: false}; // ContigoBeaconItem object
		            items[currentDistObj.beaconId] = beaconItem;			          
		        }
			}
		}

		/*
	     * Need to go through each list of locate points and sort them according
	     * to ascending timestamp.
	     */
		for (var id in items) {		        
	        var currentBeaconItem = items[id];
	        currentBeaconItem.locatePoints.sort(function(a, b) {
	        	// a and b are ContigoBeaconPoi object
	        	var aDate = self.parseTimestampString(a.timestamp);
	        	var bDate = self.parseTimestampString(b.timestamp);
				if (aDate < bDate) {
					return -1;
				}
				if (aDate > bDate) {
					return 1;
				}
				return 0;
			});
		}
	      
	    var poiCollection = {landmarks : landmarks, beaconItems : items, measurementUnit : measurementUnit}; // ContigoPoiCollection object
	    this.poiCollection = poiCollection;
	    this.refreshMap(poiCollection);
	    
	    this.customBestFit(false, BESTFIT_MIN_ZOOM, BESTFIT_MAX_ZOOM);
	    this.customBestFit(false, BESTFIT_MIN_ZOOM, BESTFIT_MAX_ZOOM);
	    
	    this.setItemDriverId(beaconIDArr.toString(), guardianIDArr.toString(), loginIDArr.toString());
	},
	
    /**
     * Turn on the traffic control of the map 
     */
	turnOnTrafficControl : function() {
		this.map.addControl(new MQA.TrafficToggle());
	},
	
    /**
     * Sets a new centre lat/lng for the current map.
     *
     * @param lat   The new centre's latitude
     * @param lng   The new centre's longitude
     * @param zoomLevel
     */
	setNewCenterLocation : function(lat, lng, zoomLevel) {
		if (lat && lng) {
			zoomLevel = zoomLevel ? zoomLevel : 1;
	        var coord = new MQA.LatLng(lat, lng);
	        this.map.setCenter(coord, zoomLevel);
	    }
	},
	
	/**
	 * Resize the map.
	 * 
	 * @param width
	 * @param height
	 */
	resize : function(width, height) {
		this.width = width;
		this.height = height;
		this.map.setSize(new MQA.Size(width, height));
		// also need to resize silencer
		this.silencer.height(this.height);
		this.silencer.width(this.width);
	    this.createCrosshairControl();
	},
	
	/**
	 * To handle mousedown event when the map is in view address mode with job creation enabled.
	 */
	enableCreateJobOnMapMode : function() {
		this.removeCurrentAddressPoi();
      
		this.currentMapMode = MAP_MODE_VIEW_ADDR_ADD_JOB;
		this.createSilencer(this.addJobOnMapSilencerHandler);
	},
	
	/**
	 * The handler to handle mousedown event when the map is in view address mode with job creation enabled.
	 */
	addJobOnMapSilencerHandler : function(event) {
		var self = event.data.self;
		var ll = self.cursorLL(event);
		if (ll) {	
			self.showAddressPoi(ll.lat, ll.lng);
		}
		return false;
	},
    
	/**
	 * Disable to create job on map mode.
	 */
    disableCreateJobOnMapMode : function() {       
		this.removeCurrentAddressPoi();
		this.removeSilencer();
 	},
	
	/**
	 * Delegate the call to the map control to pass the selected location for a job.
	 * 
	 * @param jobLocation
	 */
	addJobFromMap : function(jobLocation) {
		if (this.mapControl.onAddJobFromMap) {
			this.mapControl.onAddJobFromMap(jobLocation);
		}
	},
	
	/**
	 * Delegate the call to the map control to delete a job.
	 * 
	 * @param beaconId
	 * @param jobId
	 */
	deleteJob : function(beaconId, jobId) {
		if (this.mapControl.onDeleteJob) {
			this.mapControl.onDeleteJob(beaconId, jobId);
		}
	},
	
	/**
	 * Delegate the call to the map control to reorder a job.
	 * 
	 * @param beaconId
	 * @param jobId
	 */
	reorderJob : function(beaconId, jobId) {
		if (this.mapControl.onReorderJob) {
			this.mapControl.onReorderJob(beaconId, jobId);
		}
	},
	
	/**
	 * Delegate the call to the map control to reassign a job.
	 * 
	 * @param beaconId
	 * @param jobId
	 */
	reassignJob : function(beaconId, jobId) {
		if (this.mapControl.onReassignJob) {
			this.mapControl.onReassignJob(beaconId, jobId);
		}
	},
	
	/**
	 * Delegate the call to the map control to send a job to beacon or driver.
	 * 
	 * @param receiverInfo contains type and id properties
	 */
	onShowSendJob : function(receiverInfo) {
		if (this.mapControl.onShowSendJob) {
			this.mapControl.onShowSendJob(receiverInfo);
		}
	},	
	
	/**
	 * Delegate the call to the map control to view jobs.
	 * 
	 * @param receiverInfo contains type and id properties
	 */
	onViewJobs : function(receiverInfo) {
		if (this.mapControl.onViewJobs) {
			this.mapControl.onViewJobs(receiverInfo);
		}
	},
	
	/**
	 * Delegate the call to the map control to send a message to beacon or driver.
	 * 
	 * @param receiverInfo contains type and id properties
	 */
	onShowSendMessage : function(receiverInfo) {
		if (this.mapControl.onShowSendMessage) {
			this.mapControl.onShowSendMessage(receiverInfo);
		}
	},	
	
	/**
	 * Delegate the call to the map control to pass back the beacon IDs/guardian IDs 
	 * selecting after radialSearchAndDisplay.
	 * 
	 * @param beaconIds
	 * @param guardianIds
	 * @param loginIds
	 */
	setItemDriverId : function(beaconIds, guardianIds, loginIds) {
		if (this.mapControl.setItemDriverIDs) {
			this.mapControl.setItemDriverIDs(beaconIds, guardianIds, loginIds);
		}
	},

    convertToUnixTime : function (timestamp) {
        var tsDate = timestamp.split(" ");
        var date = tsDate[0];
        var time = tsDate[1];
        var timeInfo = time.split(":");
        var tempPosition = time.length - 2;
        //var timeAmPm = time.substr(-2);
        var timeAmPm = time.substr(tempPosition);
                
        var hh = parseInt(timeInfo[0]);
        
        if (timeAmPm == "PM") {
            if (hh < 12) {
            	hh += 12;
    		}
        } else if (timeAmPm == "AM") {
        	if (hh == 12) {
        		hh = 0;
        	}
        }
        
        
        
        var mm = parseInt(timeInfo[1]);
        var ss = parseInt(timeInfo[2]);

                
        //Subtract 1 from month to accomodate the month start from 0 in the function
        var datetime= new Date(date.substring(6, 10), ((date.substring(0, 2) * 1) - 1), date.substring(3, 5), hh, mm, ss).getTime() / 1000;
        //alert(timestamp + " = " + datetime);
        return datetime;
    }
	
};

