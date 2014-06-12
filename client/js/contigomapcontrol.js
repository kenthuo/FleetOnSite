var MAP_BORDER_PADDING = 16;
var POINTS_ALL = 1;
var POINTS_LAST_THREE = 2;
var POINTS_LAST = 3;

/**
 * Initializes the layout, controls, and map object once the DOM is ready to
 * be manipulated by the browser.
 * 
 * @param mapElemId the identity of DOM element which contains the contigo map.
 * @param an instance of Gettext class.
 * @param callback the callback function will be executed at the last of the initialization process.
 */
function ContigoMapControl(mapElemId, i18n, callback) {
    this.mapInitialized = false;
	this.contigoMap = null;
	this.mapElemId = null;
	this.maxNumOfZones = 10;
	this.maxNumOfVertices = 25;
	this.plottingPolygonZoneInProgress = false;
	this.currentMapPoints = null;
	this.currentMapType = null;
	this.beaconDevice = null;
	this.beaconEvent = null;
	this.zoomLevel = null;
	this.mapWidth = 0;
	this.mapHeight = 0;
	this.ifrmDataPuller = null;
	this.locale = "en";
	this.showLatLon = false;
	this.tmpZoneName = '';
	this.onAddJobFromMap = null; // a callback method provided by host page
	this.onDeleteJob = null; // a callback method provided by host page
	this.onReorderJob = null; // a callback method provided by host page
	this.onReassignJob = null; // a callback method provided by host page
	this.onShowSendJob = null; // a callback method provided by host page
	this.onViewJobs = null; // a callback method provided by host page
	this.onShowSendMessage = null; // a callback method provided by host page
	this.setItemDriverIDs = null; // a callback method provided by host page
	this.setRectZoneCoords = null; // a callback method provided by host page
	this.setCircleZoneCoords = null; // a callback method provided by host page
	this.askForZoneName = null; // a callback method provided by host page
	this.activatePolygonZoneSettings = null; // a callback method provided by host page
	this.clearAllPolygonZones = null; // a callback method provided by host page
	this.setPolygonCoordinates = null; // a callback method provided by host page
	this.showCreatedLandmarkOnMap = null; // a callback method provided by fleetview
	this.reloadReportAfterCreatedLmkOnMap = null; // reload report to show landmark created on report summary
	this.restartMapviewTimer = null; // reload report to show landmark created on report summary
	this.finishTripDrawing = null; // change the poi icon after trip segment is created on combined trip report
	
	this.init(mapElemId, i18n, callback);
}		

ContigoMapControl.prototype = {
	/**
	 * Initialize the contigo map and map control options based on the request URL.
	 * 
	 * @param mapElemId the identity of DOM element which contains the contigo map.
	 * @param i18n an instance of Gettext class.
	 * @param callback the callback function will be executed at the last of the initialization process.
	 *        It is to make sure all of necessary modules from MapQuest have been loaded before any other
	 *        initialization tasks. 
	 */
	init : function(mapElemId, i18n, callback) {
		var self = this;
		var sizeArray = this.getUrlParamValue("mapSize").split("+");

		this.mapElemId = mapElemId;
		this.mapWidth = sizeArray[0] * 1;
		this.mapHeight = sizeArray[1] * 1;
	
		this.ifrmDataPuller = this.getUrlParamValue("dataPullerURL");
		this.currentMapType = this.getUrlParamValue("mapName");
		this.beaconDevice = this.getUrlParamValue("bmDevice").toLowerCase();
		this.beaconEvent = this.getUrlParamValue("event");
		this.zoomLevel = this.getUrlParamValue("zoom");
		this.showLatLon = (this.getUrlParamValue("ll") == "1") ? true : false;
	
		var urlPathArray = window.location.pathname.split("/");
		this.locale = urlPathArray[3];
	
		this.maxNumOfZones = this.getUrlParamValue("maxZones");
		this.maxNumOfVertices = this.getUrlParamValue("maxVertices");
	
		$("#" + mapElemId).height(this.mapHeight);
		$("#" + mapElemId).width(this.mapWidth);
		//$("#header").width(this.mapWidth + MAP_BORDER_PADDING);
		
		this.positionKmlExport(this.mapWidth + MAP_BORDER_PADDING - 100, this.mapHeight);			
		
		if (this.dataPullerUrl) {
			$("#ifrmDataPuller").attr("src", decodeURIComponent(this.dataPullerUrl));
		}

	    this.contigoMap = new ContigoMap(self, i18n, function() {
	    	setTimeout(function() {self.internalInit(callback);},300);
		});
	},
	
	positionKmlExport : function(width, height) {
		if ((this.currentMapType == "cp_rpt_routelog") || (this.currentMapType == "cp_rpt_routetrip") || (this.currentMapType == "cp_rpt_stop_map")) {
            $("#header").width(width-300);
            $("#header").css("top", height);
            $("#header").css("left", "300px");
        } else {
            $("#header").width(width);
        }

	},
	
	internalInit : function(callback) {
		this.revealControls(this.currentMapType, this.beaconDevice);
		this.registerControls(this.currentMapType, this.beaconDevice);
		if (this.zoomLevel) {	 
			this.setZoomLevel(this.zoomLevel);	    
		}
		this.resetControls(this.currentMapType, this.maxNumOfZones, this.maxNumOfVertices);
		this.mapInitialized = true;
		callback.apply();
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
		this.contigoMap.setZoomLevel(zoomLevel);
	},
	
	/**
	 * Retrieves the value of the specified GET parameter in the window's URL.
	 */
	getUrlParamValue : function(name) {
	    name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
	    var regexS = "[\\?&]"+name+"=([^&#]*)";
	    var regex = new RegExp(regexS);
	    var url = window.location.href;
	    var results = regex.exec(url);
	    return (results) ? results[1] : "";
	},
	
	/**
	 * Set a new URL to data puller iframe. 
	 * NOTE: eventually, we need to remove data puller totally to avoid dependency
	 * between frames. 
	 * 
	 * @param newDataPullerUrl
	 */
	setDataPullerUrl : function(newDataPullerUrl) {
		if (newDataPullerUrl) {
			$("#ifrmDataPuller").attr("src", newDataPullerUrl);
			this.dataPullerUrl = newDataPullerUrl;
		}
	}, 

	/**
	* Defines a function for the portals to send a series of points to be
	* displayed on a map. If there are already points on the map, only those
	* points that differ from those already on the map will be added and
	* displayed.
	*
	* @param poiCollection The ContigoPoiCollection containing the point data
	* to be shown on the map.
	*
	* @param isRefreshMap A flag indicating whether the map needs to be
	* refreshed.
	*/ 
	sendPoints : function(poiCollection, isRefreshMap) {
		this.contigoMap.sendPoints(poiCollection, isRefreshMap, this.showLatLon);
		this.currentMapPoints = poiCollection;
		$("input[type='radio'][name!='default']").removeAttr("disabled");
	},
	
	/**
	 * Performs a radial search around a central point on the map for all the 
	 * closest beacon items within a particular radius, in miles.  These points,
	 * along with the central point, then replace whatever points are currently
	 * shown on the map.  
	 *
	 * @param centralPoint  The ContigoPoi object around which a radial search
	 *                      of the closest beacon locate points will be performed.
	 *
	 * @param beaconItems   The associative list, whose (key, value) pairs consist
	 *                      of (beaconId, ContigoBeaconItem) values.
	 *
	 * @param radiusMiles   The radius, in miles, to search.  If no radius is
	 *                      specified or if a value of 0 is supplied, 
	 *                      a value of 499 miles will be assumed.
	 *
	 * @param maxResults    The maximum number of locate points, excluding the
	 *                      central point, to display.  
	 *
	 * @param measurementUnit  The unit of measurement (either "ft" or "m").
	 */
	radialSearchAndDisplay : function(centralPoint, beaconItems, radiusMiles, maxResults, measurementUnit) {    
		var radiusMetres = radiusMiles * 1609.344;
		var radius = (radiusMetres == 0) ? 499 * 1609.344 : radiusMetres;
	    
		this.contigoMap.radialSearchAndDisplay(centralPoint, beaconItems, radius, maxResults, measurementUnit);
	},
	
	/**
	 * Initializes a map that is centred at a specified lat/long coordinate.
	 * 
	 * @param lat
	 * @param lng
	 */
	setCenterLocation : function(lat, lng) {
		this.contigoMap.removeIncompleteZone();
		this.contigoMap.setNewCenterLocation(lat, lng, 17);
	},
	
	/**
	 * Centres an existing map at the specified lat/long coordinate, at the 
	 * current zoom level.
	 */
	recenterToLatLng : function(lat, lng) {
		this.setCenterLocation(lat, lng);			
	},
	
	/**
	 * Resizes the map and adjusts the embedded controls accordingly.
	 */
	onWindowResize : function(mapWidth, mapHeight) {
	    this.contigoMap.resize(mapWidth - 100,  mapHeight - 70);	    
		this.positionKmlExport(mapWidth - 85, mapHeight - 40);
	},
	
	/**
	 * Enable clear zone control.
	 */
	enableClearZoneControl : function() {
		$("#clear_zone").show();
		$("#clear_zone_disabled").hide();
	},

	/**
	 * Disable clear zone control.
	 */
	disableClearZoneControl : function() {
		$("#clear_zone").hide();
		$("#clear_zone_disabled").show();	
	},
	
	/**
	 * Calls the host page's method to display the rect zone info on the page.
	 *
	 * @param lat1
	 * @param lng1
	 * @param lat2
	 * @param lng2
	 */
	updateRectZoneCoords : function(lat1, lng1, lat2, lng2) {  
		if (this.setRectZoneCoords) {
			this.setRectZoneCoords(lat1, lng1, lat2, lng2);
		}  
	},

	/**
	 * Call the host page's method to display the circle zone info on the page.
	 *
	 * @param lat
	 * @param lng
	 * @param radiusInMetres
	 */
	updateCircleZoneCoords : function(lat, lng, radiusInMetres) {
		if (this.setCircleZoneCoords) {
			this.setCircleZoneCoords(lat, lng, radiusInMetres);
		}  
	},
	
	/**
	 * Initializes a map with a rectangular zone with the specified upper left
	 * lat/long coordinate corner and the lower right lat/long coordinate corner.
	 */
	setRectCoordinates : function(lat1, lng1, lat2, lng2) {
		this.contigoMap.addRectangularOverlay(lat1, lng1, lat2, lng2);
		// Call the host page's method to display the zone info on the page
		this.updateRectZoneCoords(lat1, lng1, lat2, lng2);    
    },
	
	/**
	 * Initializes a map with a circular zone with the specified lat/long 
	 * coordinate centre and a particular radius, in metres.
	 */
	setCircleCoordinates : function(lat1, lng1, radius) {
		this.contigoMap.addCircularOverlay(lat1, lng1, radius);
		// Call the host page's method to display the zone info on the page
		this.updateCircleZoneCoords(lat1, lng1, radius);    
    },
    
    /**
     * Delegate to the map to clean up incomplete polygonal zone.
     * @returns
     */
    clearIncompletePolygonZone : function() {
    	this.contigoMap.clearIncompletePolygonZone();
    },
	
	/**
	 * Clean zones.
	 *
	 * @param mapType
	 */
	clearZones : function(mapType) {
		this.contigoMap.clearZones();		
		if (mapType == "cp_zone_circle") {
			this.contigoMap.switchToDrawCircleMode();
			if (this.setCircleZoneCoords) {
				this.setCircleZoneCoords("", "", "");
			}
		} else if (mapType == "cp_zone_polygon") {
			this.contigoMap.switchToDrawPolygonMode(this.maxNumOfZones, this.maxNumOfVertices);
			
		} else {
			this.contigoMap.switchToDrawRectMode();
			if (this.setRectZoneCoords) {
				this.setRectZoneCoords("", "", "", "");
			}
		}
		// reset map operations if user selects non-drawing operation
		var mapOperations = $("input[type='radio'][name='default']:checked").val();
		if (mapOperations == "panning") {
			this.contigoMap.switchToPanningMode();
		} else if (mapOperations == "view_addr") {
			this.contigoMap.switchToViewAddrMode();
		} else if (mapOperations == "zoom_rect") {
			this.contigoMap.switchToZoomRectMode();
		}
	},
	
	/**
	 * Invoke the clear all polygon zone JS function in the host page
	 * 
	 */
	removeAllPolygonZones : function() {	
		if (this.clearAllPolygonZones) {		
			this.clearAllPolygonZones();
		}
	},
	
	/**
	 * Enable/disable map control if drawing polygon zone is in progress.
	 */
	mapControlInPlottingMode : function(inProgress) {	
		if (!inProgress){
			// not in the progress of plotting polygon zones
			this.plottingPolygonZoneInProgress = false;
			// activate map control		
			$("#centre_map").show();
			$("#centre_map_disabled").hide();
			this.disableClearZoneControl();
			$("#panning").attr('disabled', false);
			$("#view_addr").attr('disabled', false);
			$("#zoom_rect").attr('disabled', false);

			if (this.activatePolygonZoneSettings) {
				this.activatePolygonZoneSettings(true);
			}
		} else {
			// in the progress of plotting polygon zones
			this.plottingPolygonZoneInProgress = true;
			// disable map control
			$("#centre_map").hide();
			$("#centre_map_disabled").show();
			this.enableClearZoneControl();
			$("#panning").attr('disabled', true);
			$("#view_addr").attr('disabled', true);
			$("#zoom_rect").attr('disabled', true);

			if (this.activatePolygonZoneSettings) {
				this.activatePolygonZoneSettings(false);
			}
		}
	},
	
		/**
	 * Ask the user to provide the name of a zone.
	 * 
	 * @param oldZoneName the existing name of a zone.
	 * @param alertMsg an alert message to user
	 */
	askForZoneNameFromUser : function(oldZoneName, alertMsg) {
		if (this.askForZoneName) {
			this.askForZoneName(alertMsg);
		} 
  		this.tmpZoneName = oldZoneName;
	},

	/**
	 * Update the name of a zone to the map.
	 *
	 * @param newZoneKey the new name of a zone.
	 */
	submitZoneName : function(newZoneKey) {	
	
		// replace tmpZoneName with user input zone name	
		if (this.tmpZoneName != ''){
			this.contigoMap.resetZoneKeyFromUser(this.tmpZoneName, newZoneKey);
		}
	
		// reset tmpZoneName
		this.tmpZoneName = '';
	},
	
	/**
	 * Check the name of a zone provided by user is unique among all of zones on the map
	 *
	 * @param zoneKey the name of a zone provided by user
	 */
	checkZoneKeyUnique : function(zoneKey) {
		if (this.contigoMap.checkZoneKeyUnique) {
			return this.contigoMap.checkZoneKeyUnique(zoneKey);
		} else {
			alert("checkZoneKeyUnique() is undefined.");
		}
	},
	
	/**
	 * Set information of a polygon to the host page from the map.
	 * 
	 * @param polygonZoneObj
	 */
	setPolygonCoordinates : function(polygonZoneObj) {
		if (this.setPolygonCoordinates) {
			this.setPolygonCoordinates(polygonZoneObj);
		}
		if (this.contigoMap.checkPanningAfterPolyZoneChanging) {
			this.contigoMap.checkPanningAfterPolyZoneChanging();
		}
	},
	
	/**
	 * Re-register controls when getting a new map in the scenario.
	 * 
	 * @param mapType
	 */
	registerControlsOnHideShowScenario : function(mapType) {
		this.registerControls(mapType);
		
		// Re-enable click event
	    $("#view_addr, #panning, #zoom_rect, #circ_zone, #poly_zone, #rect_zone").each(function() {
	        var self = this;
	        if ($(self).attr("checked")) {
	        	$(self).click();
	        }
	    });
	},
	
	/**
	 * Show a list of polygon collection on the map.
	 *
	 * @param polygonZoneCollection
	 */
	configurePolygonZones : function(polygonZoneCollection) {	
		if (this.contigoMap.configurePolygonZones) {
			this.contigoMap.configurePolygonZones(polygonZoneCollection);	
		}
	},
	
	/**
	 * Delete individual polygon zone by using the key of polygonal overlay 
	 * 
	 * @param zoneKey the name of a zone provided by the external source. 
	 */
	deletePolygonZone : function(zoneKey) {
		this.contigoMap.deletePolygonZone(zoneKey);
	},
	
	/**
	 * Update individual polygon zone key 
	 *
	 * @param oldZoneKey
	 * @param newZoneKey
	 */
	updatePolygonZoneKey : function(oldZoneKey, newZoneKey) {
		this.contigoMap.updatePolygonZoneKey(oldZoneKey, newZoneKey);
	},
	
	/**
	 * To allow to create a dispatch job when users clicking the map on view address mode.
	 */
	enableCreateJobOnMapMode : function() {
		var self = this;
		var isViewAddrCurrentlySelected = $("#view_addr:checked").val() != null;
		$("#view_addr").unbind();  
		$("#view_addr_label").css('display', 'none');
		$("#select_destination_label").css('display', 'inline');

		$("#view_addr").click(function() {
			self.contigoMap.enableCreateJobOnMapMode();
		});
  
		if (isViewAddrCurrentlySelected) {
			this.contigoMap.enableCreateJobOnMapMode();
		}  
	},
	
	/**
	 * To disallow to create a dispatch job when users clicking the map on view address mode.
	 */
	disableCreateJobOnMapMode : function() {
		var self = this;
		var isViewAddrCurrentlySelected = $("#view_addr:checked").val() != null;
		$("#view_addr_label").css('display', 'inline');
		$("#select_destination_label").css('display', 'none');
		
		$("#view_addr").click(function() {
			self.contigoMap.switchToViewAddrMode();      
		});
		
		this.contigoMap.disableCreateJobOnMapMode();
    
		if (isViewAddrCurrentlySelected) {
			this.contigoMap.switchToViewAddrMode();
		}
	},
	
	/**
	 * Open a window to load KML help page. 
	 */
	openKmlHelp : function() {
		window.open("support/kmlHelp.html", "", "height=480,width=640,left=0,screenX=200,top=100,screenY=200,menubar=no,status=no,toolbar=no,resizable=yes,scrollbars=yes");
	},
	
	/**
	 * Clear all of shapes on the map.
	 *
	 * @param backToDefault true to reset back the default zoom level 
	 */
	resetMap : function(backToDefault) {
		this.contigoMap.reset(backToDefault);
	},

	/**
	 * reset MostRecentLocate variable
	 * 
	 */
	 resetMostRecentLocate : function() {
		this.contigoMap.resetMostRecentLocate();
	},
	
	/**
	 * Best fit the map.
	 */
	bestFit : function() {
		this.contigoMap.bestFit();
	},
	
	showAllPoints : function() {
        $("#locates_all").click();
    },

    showLastPoint : function() {
        $("#locates_last").click();
    },

	/**
	 * Return mode of the map.
	 */
	getMapMode : function() {
		return this.contigoMap.currentMapMode;
	},
	
	/**
	 * Return map type. E.g. (cp_fleet, cp_rpt_stop_map_multi, cp_rpt_incident, cp_rpt_routelog, cp_rpt_stop_map)
	 */
	getMapType : function() {
		return this.contigoMap.currentMapType;
	},
	
	/**
	 * Show landmark input poi on map
	 */
	 showLandmarkInputPoi : function() {
				
		var requestTimeout = 30000;
		var inputHtml = '';
		
		var mapObj = this.contigoMap;
		
        $.ajax({
            url: '../../server/show_create_landmark.php',
            type: 'post',
            dataType: 'json',
            data: '',
            timeout: requestTimeout,
            beforeSend: function() {
        		
                //$("body").addClass("curWait");
            },
            error: function() {
            },
            success: function(response) {
            	
            	//$("body").removeClass("curWait");
            	inputHtml = response.LANDMARK_INPUT_HTML;
            	
            	//console.log('CCCCCCCCC= ' + mapObj.rightClickLat + ' | ' + mapObj.rightClickLng);
            	            	
            	mapObj.showLandmarkInputPoi(mapObj.rightClickLat, mapObj.rightClickLng, inputHtml);
            	
            	applyCharsLimit($('.map_landmark_note'), 199);
            	
            }
        });
				
	},
	
	/**
	 * Show landmark input poi on map
	 */
	 createLandmarkFromRightClick : function(mapType) {
		
		var requestTimeout = 30000;
		
		var latValue = this.contigoMap.rightClickLat.toFixed(5); 
		var lngValue = this.contigoMap.rightClickLng.toFixed(5);

		var mapObj = this.contigoMap;
		
	    var landmarkInfo = {
	        	from: 'lat_lon',
	        	radius: $('#landmark_radius').val(),
	        	department: $('#landmark_department').val(),
	        	landmark_category: $('#landmark_category').val(),
	        	landmark_name: $('#landmark_name').val(),
	        	lat: latValue,
	        	lon: lngValue,
	            street: '',
	            city: '',
	            state: '',
	            country: '',
	            zip_code: '',
	            notes: $('#map_landmark_note').val()
	        };

	    var landmarkVals = '|' + latValue + '|' + lngValue + '|';
	    
	    
	    show_progress_dialog();
	    
	    $.ajax({
	        url: '/subscriber/dispatch-pnd/common/map_controls/create_landmark.php',
	        type: 'post',
	        dataType: 'json',
	        data: landmarkInfo,
	        timeout: requestTimeout,
	        beforeSend: function() {
	        },
	        error: function() {
	        },
	        success: function(response) {
	        	hide_progress_dialog();

	            if (response.RETURN_CODE == 1) {
	            	mapObj.removeCurrentAddressPoi();
	            	
	            	//console.log(mapType);
	            	
	            	if (mapType == 'cp_fleet') {
	            		// show landmark created on fleet view
		            	landmarkVals = response.LMKID + landmarkVals + response.DEPTID;		            	
		            	mapObj.showLandmarkAfterCreatedOnMap(landmarkVals);
	            	} else if ((mapType == 'cp_rpt_routelog') || (mapType == 'cp_rpt_stop_map_multi') || (mapType == 'cp_rpt_incident') || (mapType == 'cp_rpt_stop_map') || (mapType == 'cp_rpt_routetrip')) {
	            		
	            		mapObj.reloadReportAfterCreatedLmkOnMap();
	            	}
	            	
	            } else {
	            	createLmkErrorHandler('create_lmk', response);
	            }
	        }
	    });
		
		
		
	},

	/**
	 * Draw trip segment on map.
	 * 
	 * @param startPoiIndex - index of poi when trip starts
	 * @param endPoiIndex - index of poi when trip ends
	 * @param tripID - ID of the trip segment
	 * 
	 */
	 showTripSegments : function(startPoiIndex, endPoiIndex, tripID) {
		
		this.contigoMap.redrawTripSegments(startPoiIndex, endPoiIndex, tripID);
				
	},

	
	/**
	 * Draw trip segment on map.
	 * 
	 * @param tripID - ID of the trip segment
	 * @param tripIcon - name of the trip icon
	 * @param routeIcon - Original icon for the other POI of hte route
	 * 
	 */
	 changeTripIcon : function(tripID, tripIcon, routeIcon) {
		
//		var tripIcon = '';
//		
//		switch (color)
//		{
//			case 'blue':
//				tripIcon = 'SP00001.png';
//				break;
//				
//			case 'green':
//				tripIcon = 'SP00002.png';
//				break;
//				
//			case 'yellow':
//				tripIcon = 'SP00003.png';
//				break;
//				
//			case 'orange':
//				tripIcon = 'SP00004.png';
//				break;
//				
//		}

		
		$('div.poiImg').html('<img width="16" height="16" src="../../icons/' + routeIcon + '">');
		$('div.trip' + tripID).html('<img width="16" height="16" src="../../icons/' + tripIcon + '.png">');
		
	},
	
	
	
	/**
	 * Reset options of map control based on the map type.
	 *
	 * @param mapType
	 */
	resetControls : function(mapType, maxNumOfZones, maxNumOfVertices) {
		if (mapType == "cp_zone_circle" || mapType == "cp_zone_rectangle" || mapType == "cp_zone_polygon") {
			if (mapType == "cp_zone_circle") {
				$("#circ_zone").attr("checked", "checked");
				this.contigoMap.switchToDrawCircleMode();
			} else if (mapType == "cp_zone_polygon") {
				$("#poly_zone").attr("checked", "checked");
				this.contigoMap.switchToDrawPolygonMode(maxNumOfZones, maxNumOfVertices);
				this.disableClearZoneControl();
			} else {
				$("#rect_zone").attr("checked", "checked");
				this.contigoMap.switchToDrawRectMode();
			}
		}
	},

	/**
	 * Reveals the controls associated with the supplied map type.
	 *
	 * @param mapType  The type of map 
	 */
	revealControls : function(mapType, beaconDevice) {
		var trLocates = document.getElementById("tr_locates");
		var trCoC = document.getElementById("tr_coc");
		
		//$("#default_controls").css("display", "block");
		
		if (mapType != "cp_zone_rectangle" && mapType != "cp_zone_circle") {
			$("input[type='radio'][name!='default']").attr("disabled", "disabled");
		}

		if (mapType == "address_to_map") {
			// click address link to show map
			// trun off all of map operations
			$("#map_controls").hide();
			$("#custom_controls").hide();
		} else if (mapType == "cp_zone_rectangle") {
			
			//$("#rect_zone_control").css("display", "inline");
			//$("#rect_zone_control_text").css("display", "inline");
			var ctrlRectZone = document.getElementById("rect_zone_control");
			var textRectZone = document.getElementById("rect_zone_control_text");
			ctrlRectZone.style.display = '';
			textRectZone.style.display = '';
			
			$("#centre_map").css("display", "block");
			$("#clear_zone").css("display", "block");
			
		} else if (mapType == "pp_beacon_test") {
		
			//trLocates.style.display = '';
			$("#centre_map").css("display", "block");
		
		} else if (mapType == "pp_incident_history" 
				|| mapType == "cp_rpt_stop_map" 
				|| mapType == "cp_rpt_stop_map_multi"
				|| mapType == "cp_rpt_incident") {
		
			//$("#locates").css("display", "block");
			trLocates.style.display = '';
			
			$("#centre_map").css("display", "block");
			$("#best_fit").css("display", "block");
			$("#declutter").css("display", "block");
			
		} else if (mapType == "pp_incident" || mapType == "pp_recovery") {
			
			//$("#locates").css("display", "block");
			trLocates.style.display = '';
			
			$("#centre_map").css("display", "block");
			$("#best_fit").css("display", "block");
			$("#centre_last").css("display", "block");
			$("#declutter").css("display", "block");
			
			$("#centre_last dd input").attr("checked", "checked");
	
			if (beaconDevice == "generic_handset" || beaconDevice == "anydata" || beaconDevice == "sendum" || beaconDevice == "dewalt" || beaconDevice == "blackberry") {
				//$("#coc").css("display", "block");
				trCoC.style.display = '';
			}
			
		} else if (mapType == "cp_fleet_landmark") {
		
			$("#centre_map").css("display", "block");
		
		} else if (mapType == "cp_fleet") {
		
			$("#centre_map").css("display", "block");
			$("#best_fit").css("display", "block");
			//$("#declutter").css("display", "block");
			$("#declutter_mapview").css("display", "block");
			$("#centre_last").css("display", "block");
			$("#auto_best_fit").css("display", "block");
			$("#direction_arrows").css("display", "block");
		
			if (beaconDevice == "generic_handset" || beaconDevice == "anydata" || beaconDevice == "sendum" || beaconDevice == "dewalt" || beaconDevice == "blackberry") {
				//$("#coc").css("display", "block");
				trCoC.style.display = '';
			}
		
		} else if (mapType == "cp_continuous_track"
				|| mapType == "cp_loctrack_print"
				|| mapType == "cp_single_locate") {
	
			$("#centre_map").css("display", "block");
			$("#best_fit").css("display", "block");
			$("#centre_last").css("display", "block");
			$("#declutter").css("display", "block");
			
			$("#centre_last dd input").attr("checked", "checked");
			
			if (beaconDevice == "generic_handset" || beaconDevice == "anydata" || beaconDevice == "sendum" || beaconDevice == "dewalt" || beaconDevice == "blackberry") {
				//$("#coc").css("display", "block");
				trCoC.style.display = '';
			}
		
		} else if (mapType == "cp_rpt_routelog" || mapType == "rp_rpt_routelog") {
		
			$("#centre_map").css("display", "block");
			$("#best_fit").css("display", "block");
			$("#declutter").css("display", "block");
		
			if (beaconDevice == "generic_handset" || beaconDevice == "anydata" || beaconDevice == "sendum" || beaconDevice == "dewalt" || beaconDevice == "blackberry") {
			
				//$("#coc").css("display", "block");
				trCoC.style.display = '';
				
			} else {
                        
                //$("#locates").css("display", "block");
                trLocates.style.display = '';
            }
			
		} else if (mapType == "cp_rpt_routetrip") {

			$("#centre_map").css("display", "block");
			$("#best_fit").css("display", "block");
			
		} else if (mapType == "cp_zone_circle") {
		
			$("#centre_map").css("display", "block");
			$("#clear_zone").css("display", "block");
	
			//$("#circ_zone_control").css("display", "inline");
			//$("#circ_zone_control_text").css("display", "inline");		
		    var ctrlCircleZone = document.getElementById("circ_zone_control");
		    var textCircleZone = document.getElementById("circ_zone_control_text");
			ctrlCircleZone.style.display = '';
			textCircleZone.style.display = '';
		
		} else if (mapType == "cp_zone_polygon") {
			$("#centre_map").css("display", "block");
			$("#clear_zone").css("display", "block");
	
		    var ctrlPolyZone = document.getElementById("poly_zone_control");
		    var textPolyZone = document.getElementById("poly_zone_control_text");
		    ctrlPolyZone.style.display = '';
		    textPolyZone.style.display = '';		
		}
		
		// Show the "Export to Google Earth link" if necessary
		if (mapType == "pp_incident_history"
			|| mapType == "cp_rpt_stop_map"
			|| mapType == "cp_rpt_stop_map_multi"
			|| mapType == "cp_rpt_routelog"
			|| mapType == "rp_rpt_routelog"
			|| mapType == "cp_rpt_routetrip"
			|| mapType == "cp_rpt_incident"
			|| mapType == "pp_incident"
			|| mapType == "pp_recovery"
			|| mapType == "cp_fleet"
			|| mapType == "cp_single_locate"
			|| mapType == "cp_loctrack_print"
			|| mapType == "cp_continuous_track") {
			
			$("#googleEarthExport").css("display", "block");
		}
	},

	/**
	 * Registers the behaviour of all map controls.
	 */
	registerControls : function(mapType, beaconDevice) {
		var self = this;
		// Declutter Control
		$("input[name='declutter']").click(function() {
			var isDeclutter = $(this).attr("checked") ? true : false;
			self.contigoMap.declutterMap(isDeclutter);
		});
		
	    // Trigger Google Earth export
	    if (mapType == "pp_incident_history"
	        || mapType == "cp_rpt_stop_map"
			|| mapType == "cp_rpt_stop_map_multi"
	        || mapType == "cp_rpt_routelog"
	        || mapType == "rp_rpt_routelog"
	        || mapType == "cp_rpt_routetrip"
	        || mapType == "cp_rpt_incident"
	        || mapType == "pp_incident"
	        || mapType == "pp_recovery"
	        || mapType == "cp_fleet"
	        || mapType == "cp_single_locate"
	        || mapType == "cp_loctrack_print"
	        || mapType == "cp_continuous_track") {
	        
	        $("#kml_export_help").bind('click', this.openKmlHelp);
			
			$("#kml_export").click(function() {
				if (self.currentMapPoints) {
					//$("#kml_export_data").attr("value", JSON.stringify(self.currentMapPoints));
					//$("#kml_export_form").submit();

					$("#kmlExportFrame").get(0).contentWindow.setExportData(JSON.stringify(self.currentMapPoints), mapType);
					$("#kmlExportFrame").get(0).contentWindow.submitExport();

				} else {
					alert($("#kml_export_error").text());
				}
			});
		
	  	}
	    
	    $("#panning").click(function() {
	    	self.contigoMap.switchToPanningMode();
	    	if (mapType == "cp_zone_polygon"){
				self.disableClearZoneControl();
			}
	    });
	    
	    // Register "Click to View Address" behaviour
	   	$("#view_addr").click(function() {
	    	self.contigoMap.switchToViewAddrMode();
	    	if (mapType == "cp_zone_polygon"){
				self.disableClearZoneControl();
			}
	    });
		
	    $("#zoom_rect").click(function() {
	    	self.contigoMap.switchToZoomRectMode();
	    	if (mapType == "cp_zone_polygon"){
				self.disableClearZoneControl();
			}
	    });
	  
	    /*
	     * Register behaviors for clicking on the radio buttons for filtering
	     * the Circles of Certainty (CoC).
	     */
	
	    if (beaconDevice == "generic_handset" 
	    	|| beaconDevice == "sendum" 
	    	|| beaconDevice == "anydata" 
	    	|| beaconDevice == "dewalt" 
	    	|| beaconDevice == "blackberry") {
	    	
	    	// Circle of Certainty Controls
	    	$("#coc_last").click(function() {
	    		self.contigoMap.changeCocFilterMode(1);
	    	});
	
	    	$("#coc_all").click(function() {
	    		self.contigoMap.changeCocFilterMode(2);
	    	});
	
	    	$("#coc_none").click(function() {
	    		self.contigoMap.changeCocFilterMode(3);
	    	});
	    }
	    
	    // Register behaviour for manually centering a map (i.e. "Center map").
	    $("#centre_map dd a").click(function() {
	    	self.contigoMap.centreMap();
	    });
	    
	    // register behaviour for auto centering on the most recent point
	    if (mapType == "pp_incident" 
	        || mapType == "pp_recovery" 
	        || mapType == "cp_fleet"
	        || mapType == "cp_continuous_track"
	        || mapType == "cp_loctrack_print"
	        || mapType == "cp_single_locate") {
	      
	    	// if Centre Last is already checked when the map is initialized, enable    
	    	if ($("#centre_last dd input").attr("checked")) {
	        
	    		// disable auto best fit
	    		$("#auto_best_fit dd input").removeAttr("checked"); 
	    		this.contigoMap.enableAutoCentering(true);
	    	}
	      
	    	// Else, enable when the user takes explicit action
	    	$("#centre_last dd input").click(function(event) {
	    		if ($(this).attr("checked")) {        
	    			// disable auto best fit
	    			$("#auto_best_fit dd input").removeAttr("checked");
	    			self.contigoMap.enableAutoCentering(true);        
	    		} else {        
	    			self.contigoMap.enableAutoCentering(false);        
	    		}
	    	});
	    }
	
	    // register for best fit
	    if (mapType == "pp_incident_history"
	        || mapType == "cp_rpt_stop_map"
			|| mapType == "cp_rpt_stop_map_multi"
	        || mapType == "cp_rpt_incident"
	        || mapType == "pp_incident"
	        || mapType == "pp_recovery"
	        || mapType == "cp_fleet"
	        || mapType == "cp_continuous_track"
	        || mapType == "cp_loctrack_print"
	        || mapType == "cp_single_locate"
	        || mapType == "cp_rpt_routelog"
	        || mapType == "cp_rpt_routetrip"
	        || mapType == "rp_rpt_routelog") {
	    	
	    	$("#best_fit dd a").click(function(event) {
	    		self.contigoMap.bestFit();
	    	});
	    }
	    
	    // register auto best fit
	    if (mapType == "cp_fleet") {
	    	
			$("#declutter_mapview_check").click(function() {
				var isDeclutter = $(this).attr("checked") ? true : false;
				self.contigoMap.declutterMap(isDeclutter);
			});	
			
			$("#direction_arrows_check").click(function() {
				var enabled = $(this).attr("checked") ? true : false;
				self.contigoMap.enableDirection(enabled);
			});
	    	
	        $("#auto_best_fit dd input").click(function(event) {      
	        	if ($(this).attr("checked")) {        
	        		// disable center last control
	        		$("#centre_last dd input").removeAttr("checked");
	        		self.contigoMap.enableAutoBestFit(true);        
	            } else {        
	            	self.contigoMap.enableAutoBestFit(false);        
	            }
	        });    
	    }
	        
	    // register "Display Locates" feature`  
	    if (mapType == "pp_incident_history"
	        || mapType == "cp_rpt_stop_map"
			|| mapType == "cp_rpt_stop_map_multi"
	        || ((mapType == "cp_rpt_routelog" || mapType == "rp_rpt_routelog") && beaconDevice != "sendum" && beaconDevice != "anydata" && beaconDevice != "generic_handset" && beaconDevice != "dewalt" && beaconDevice != "blackberry")
	        || mapType == "cp_rpt_incident"
	        || mapType == "pp_incident"
	        || mapType == "pp_recovery") {
	    	
	    	$("#locates_all").click(function() {
	    		self.contigoMap.filterLocatePoints(POINTS_ALL);
	    	});
	    
	    	$("#locates_last_three").click(function() {
	    		self.contigoMap.filterLocatePoints(POINTS_LAST_THREE);
	    	});
	    
	    	$("#locates_last").click(function() {
	    		self.contigoMap.filterLocatePoints(POINTS_LAST);
	    	});
	    }
		
		// register zone behaviours
		if (mapType == "cp_zone_circle" || mapType == "cp_zone_rectangle" || mapType == "cp_zone_polygon") {
    
			// register clear zone
			$("#clear_zone dd a").click(function() {      
				self.clearZones(mapType);      
			});
    
			// register circle zone 
			if (mapType == "cp_zone_circle") {      
				$("#circ_zone").click(function() {
					self.contigoMap.switchToDrawCircleMode();
				});
			}
    
			if (mapType == "cp_zone_rectangle") {      
				$("#rect_zone").click(function() {
					self.contigoMap.switchToDrawRectMode();
				});
			}

			if (mapType == "cp_zone_polygon") {
				$("#poly_zone").click(function() {
					self.contigoMap.switchToDrawPolygonMode(self.maxNumOfZones, self.maxNumOfVertices);
				});       
			}          
		}

	    // turn on traffic control for mapview and locate/track
	    if (mapType == "pp_incident" 
	    	|| mapType == "pp_recovery" 
	    	|| mapType == "cp_fleet" 
	    	|| mapType == "cp_continuous_track" 
	    	|| mapType == "cp_single_locate" 
	    	|| mapType == "cp_loctrack_print" 
	    	|| mapType == "rp_rpt_routelog") {
	
	    	this.contigoMap.turnOnTrafficControl();
	    }
	}

};
