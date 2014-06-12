var DRAWING_ZONE_KEY = 'drawingZone';
var STRETCHING_LINE_KEY = 'stretchingLine';
var RECTANGLE_ZONE_COLLECTION_KEY = 'rectangleZoneCollection';
var CIRCLE_ZONE_COLLECTION_KEY = 'circleZoneCollection';
var POLY_ZONE_COLLECTION_KEY = 'polygonZoneCollection';
var TEMP_DRAWING_COLLECTION_KEY = 'tempDrawingCollection';
ContigoMap.prototype.radius = 0;
ContigoMap.prototype.maxCircleZoneRadiusMetres = Number.POSITIVE_INFINITY; // The maximum radius of a circular zone, in metres.
ContigoMap.prototype.maxPolygonalZoneVertices = 5
ContigoMap.prototype.maxPolygonalZoneNumber = 10;
ContigoMap.prototype.contigoPolyZoneCnt = 1;
ContigoMap.prototype.polygonalZoneCount = 0; // the number of polygons on the map
ContigoMap.prototype.polygonVertices = [];
ContigoMap.prototype.boundingBox = [];
ContigoMap.prototype.plottingPolygonZoneInProgress = false; // in progress of drawing polygon
ContigoMap.prototype.prevDraggingVertexLL = null; // LL of starting dragging vertex of a polygon, to allow to rollback if final LL causes self-intersecting polygon 

/**
 * Removes all overlays currently displayed on the map. However, if it is for polygon zone,
 * only will the incomplete zone be removed. 
 */
ContigoMap.prototype.clearZones = function() {  
	var polyZoneCollection = this.getShapeCollection(POLY_ZONE_COLLECTION_KEY, false);
	var tempDrawingCollection = this.getShapeCollection(TEMP_DRAWING_COLLECTION_KEY, false);
	
	this.removeShapeCollection(RECTANGLE_ZONE_COLLECTION_KEY);
	this.removeShapeCollection(CIRCLE_ZONE_COLLECTION_KEY);
	
	if (tempDrawingCollection) {
		this.clearIncompletePolygonZone()
	}
	
	if (this.mostRecentLocateCoord) {
		if (!this.plottingPolygonZoneInProgress) {
			this.mostRecentLocateCoord = null;
		}
	}
}

/**
 * Set plottingPolygonZoneInProgress property
 * @param inProgress
 * @returns
 */
ContigoMap.prototype.setPlottingPolygonZoneInProgress = function(inProgress) {
	this.plottingPolygonZoneInProgress = inProgress;
}

/**
 * Clear incomplete drawing polygon zone on the map.
 */
ContigoMap.prototype.clearIncompletePolygonZone = function() {
	this.removeShapeCollection(TEMP_DRAWING_COLLECTION_KEY);
	
	this.resetAfterClearZone();
	
	this.plottingPolygonZoneInProgress = false;
	this.mapControl.mapControlInPlottingMode(this.plottingPolygonZoneInProgress);
}

/**
 *
 */
ContigoMap.prototype.resetAfterClearZone = function() {
	// TODO
}

/**
 * Initialize tasks for drawing zone.
 * 
 * @returns
 */
ContigoMap.prototype.initZoneDrawing = function() {
	// remove any rectangular shape on map
	this.removeZoomRectShape();

	//remove any address poi on map
	this.removeCurrentAddressPoi();
	
	// set the mode of map
	this.currentMapMode = MAP_MODE_ZONE_DRAWING;
}

/**
 * Performs the necessary actions and clean-up to switch to draw rectangle.
 */
ContigoMap.prototype.switchToDrawRectMode = function() { 
	this.initZoneDrawing();		
	this.createSilencer(this.drawRectSilencerHandler);
}

/**
 * Performs the necessary actions and clean-up to switch to draw circle.
 */
ContigoMap.prototype.switchToDrawCircleMode = function() { 
	this.initZoneDrawing();
	this.createSilencer(this.drawCircleSilencerHandler);
}

/**
 * Performs the necessary actions and clean-up to switch to draw polygon.
 *
 * @param maxZoneNumber the maximum number of polygon zone allowed
 * @param maxZoneVertices the maximum number of vertices of a polygon zone allowed
 */
ContigoMap.prototype.switchToDrawPolygonMode = function(maxZoneNumber, maxZoneVertices) { 
	this.initZoneDrawing();	
	// set the max number of polygon zone allowed
	this.maxPolygonalZoneNumber = maxZoneNumber;      
	// set the max number of polygon zone vertices allowed
	this.maxPolygonalZoneVertices = maxZoneVertices; 
	this.createSilencer(this.drawPolygonSilencerHandler);
}

/**
 * The handler to handle mousedown event when the map is in draw rect mode.
 */
ContigoMap.prototype.drawRectSilencerHandler = function(event) {
	var self = event.data.self;
	var shape = null;
	var rectZoneCollection = self.getShapeCollection(RECTANGLE_ZONE_COLLECTION_KEY, false);
	if (rectZoneCollection) {
		shape = rectZoneCollection.getByKey(DRAWING_ZONE_KEY);
		if (shape && self.isDrawingComplete) {
			// clear the previous zone
			self.clearZones();
			shape = null;
		}
	}
	if (!shape) {
		// the first click to create the anchor point of the rectangle
		var cursorll1 = self.cursorLL(event);
		shape = self.createShape('rectangle', '#C80000', 0.18, '#F00000', 1, 2, DRAWING_ZONE_KEY);
		shape.shapePoints = [cursorll1['lat'], cursorll1['lng']];
		self.silencer.bind('mousemove', {self: self}, function(event) {
			var cursorll2 = self.cursorLL(event);
			shape.setShapePoints([
				// make sure to get upper left and lower right points set correctly.
				cursorll1.lat > cursorll2.lat ? cursorll1.lat : cursorll2.lat,
				cursorll1.lng < cursorll2.lng ? cursorll1.lng : cursorll2.lng,
				cursorll1.lat < cursorll2.lat ? cursorll1.lat : cursorll2.lat,
				cursorll1.lng > cursorll2.lng ? cursorll1.lng : cursorll2.lng
			]);
		});
		rectZoneCollection = self.getShapeCollection(RECTANGLE_ZONE_COLLECTION_KEY, true);
		rectZoneCollection.add(shape);
		self.isDrawingComplete = false;
	} else {
		// the second click to complete the rectangle
		var ul = new MQA.LatLng(shape.shapePoints[0], shape.shapePoints[1]);
		var lr = new MQA.LatLng(shape.shapePoints[2], shape.shapePoints[3]);
		var ll = new MQA.LatLng(shape.shapePoints[2], shape.shapePoints[1]);              
		var ur = new MQA.LatLng(shape.shapePoints[0], shape.shapePoints[3]);
		var lngDist = ul.distanceFrom(ur);
		var latDist = ul.distanceFrom(ll);
		var boundingBox = null;

		if (self.mapControl.beaconEvent != "zone_rect_tt") {			              
			if (latDist >= 150 && lngDist >= 150) {
				boundingBox = [shape.shapePoints[0].round(5), shape.shapePoints[1].round(5), shape.shapePoints[2].round(5), shape.shapePoints[3].round(5)];
			} else {
				alert(self.i18n.strargs(self.i18n.gettext('alert.body.zone.rect'), 150));
			}
		} else {
			// adjust the drawn rectangle for TrimTrac 1.5 devices
			var adjustedHeight = latDist.roundToNearestHundred();
            var adjustedWidth = lngDist.roundToNearestHundred();
			if (adjustedWidth >= 100 && adjustedHeight >= 100) {
				var midpoint = ul.midPoint(lr);
				var halfHeight = adjustedHeight / 2.0;
				var halfWidth = adjustedWidth / 2.0;
				var distToNewCoordKm = Math.sqrt(halfHeight * halfHeight + halfWidth * halfWidth) / 1000.0;
				var incidentAngle = Math.atan2(halfHeight, halfWidth);
				var upperLeftBearing = 270 * Math.PI / 180.0 + incidentAngle;
				var lowerRightBearing = 90 * Math.PI / 180.0 + incidentAngle;
				var adjustedUpperLeft = midpoint.destPoint(distToNewCoordKm, upperLeftBearing);
				var adjustedLowerRight = midpoint.destPoint(distToNewCoordKm, lowerRightBearing);
	
				boundingBox = [adjustedUpperLeft.lat.round(5), adjustedUpperLeft.lng.round(5), adjustedLowerRight.lat.round(5), adjustedLowerRight.lng.round(5)];
			} else {
				alert(self.i18n.strargs(self.i18n.gettext('alert.body.zone.rect'), 100));
			}
		}
		
		if (boundingBox != null) {			
			rectZoneCollection.removeItem(shape);
			shape.shapePoints = boundingBox;
			rectZoneCollection.add(shape);
			self.silencer.unbind('mousemove');
			self.updateRectZoneCoords(boundingBox[0], boundingBox[1], boundingBox[2], boundingBox[3]); // lat1, lng1, lat2, lng2
			// set the centre of the map to be the middle point of this zone
			self.mostRecentLocateCoord = ContigoMapUtil.getMidPoint(new MQA.LatLng(boundingBox[0], boundingBox[1]), new MQA.LatLng(boundingBox[2], boundingBox[3]));
			self.isDrawingComplete = true;
		}
	}
}

/**
 * The handler to handle mousedown event when the map is in draw circle mode.
 */
ContigoMap.prototype.drawCircleSilencerHandler = function(event) {
	var self = event.data.self;
	var shape = null;
	var circleZoneCollection = self.getShapeCollection(CIRCLE_ZONE_COLLECTION_KEY, false);
	if (circleZoneCollection) {
		shape = circleZoneCollection.getByKey(DRAWING_ZONE_KEY);
		if (shape && self.isDrawingComplete) {
			// clear the previous zone
			self.clearZones();
			shape = null;
		}
	}
	
	if (!shape) {
		// the first click to pinpoint the centre of the circle
		self.radius = 0;
		var centre = self.cursorLL(event);
		shape = self.createShape('circle', '#C80000', 0.18, '#F00000', 1, 2, DRAWING_ZONE_KEY);
		shape = self.UpdateCircleOverlay(shape, centre, self.radius);
		self.silencer.bind('mousemove', function(event) {
			// mouse moving to cover the area
			self.radius = centre.distanceFrom(self.cursorLL(event));
			shape = self.UpdateCircleOverlay(shape, centre, self.radius);
		});
		circleZoneCollection = self.getShapeCollection(CIRCLE_ZONE_COLLECTION_KEY, true);
		circleZoneCollection.add(shape);
		self.isDrawingComplete = false;
	} else {
		// the second click to complete the circle
		if (self.mapControl.beaconEvent == "zone_circle" && self.radius < 150) {
			alert(self.i18n.gettext('alert.body.zone.circle.small.sendum')); 
		} else if (self.radius < 75) {
			alert(self.i18n.gettext('alert.body.zone.circle.small'));
		} else {
			if (self.radius <= self.maxCircleZoneRadiusMetres) {				
				self.silencer.unbind('mousemove');
				var ul = new MQA.LatLng(shape.shapePoints[0].round(5), shape.shapePoints[1].round(5));
				var lr = new MQA.LatLng(shape.shapePoints[2].round(5), shape.shapePoints[3].round(5));
				var centre = ul.midPoint(lr);
				self.updateCircleZoneCoords(centre.lat.round(5), centre.lng.round(5), self.radius.round()); // lat1, lng1, radius
				// set the centre of the map to be the centre of this zone
				self.mostRecentLocateCoord = centre;
				self.isDrawingComplete = true;
			} else {
				if (self.maxCircleZoneRadiusMetres != Number.POSITIVE_INFINITY) {
					var maxCircleZoneRadiusKm = self.maxCircleZoneRadiusMetres / 1000;
					alert(self.i18n.strargs(self.i18n.gettext('alert.body.zone.circle.large'), maxCircleZoneRadiusKm.round()));
				}
			}
		}
	}
}

/**
 * The handler to handle mousedown event when the map is in draw polygon mode.
 *
 * @param event
 */
ContigoMap.prototype.drawPolygonSilencerHandler = function(event) {
	var self = event.data.self;
	var currentLL = self.cursorLL(event);
	if (self.polygonalZoneCount < self.maxPolygonalZoneNumber) {
		// polygonal zone counter is less than max allowed zone number
		
		var tempDrawingCollection = self.getShapeCollection(TEMP_DRAWING_COLLECTION_KEY, true);
		if (!self.plottingPolygonZoneInProgress) {
			// create a poi obj for the first clicking point of the polygon shape.
			self.polygonVertices.length = 0;
			self.boundingBox.length = 0;
			
			self.polygonVertices.push(currentLL);
			self.boundingBox.push(currentLL);
			var firstPoi = new MQA.Poi(currentLL);
			firstPoi = self.constructCustomPoiIcon(firstPoi, null, null);
			firstPoi.key = 'fisrtPoi';
			firstPoi.setRolloverContent("<div class='poi_rollover'>" + "Click here To close zone plotting" + '</div>');				
			MQA.EventManager.addListener(firstPoi, 'click', self.closePolygon, self);
			
			self.silencer.bind('mousemove', {self: self, anchorLL: currentLL}, self.moveDrawingPolygon);

			tempDrawingCollection.add(firstPoi);
			
			// turn on this flag to make sure that the map will not switch to panning mode
			self.plottingPolygonZoneInProgress = true;
			self.mapControl.mapControlInPlottingMode(self.plottingPolygonZoneInProgress);
		} else {
			// the rest of clicking to complete the polygon shape until closing the polygon 
			var prevLL = self.polygonVertices[self.polygonVertices.length - 1];
			
			self.polygonVertices.push(currentLL);
			self.boundingBox.push(currentLL);
			
			if (self.polygonVertices.length == (self.maxPolygonalZoneVertices)) {
				// close the polygonal zone if it reach the max allowed number of vertices
				if (ContigoMapUtil.checkLastPointIntersection(self.boundingBox)) {
					self.polygonVertices.pop();
					self.boundingBox.pop();
					alert("The number of vertices of the polygonal zone has reached the max allowed number. The zone will be closed automatically. But this point has intersection with the existing line segment, so the zone cannot be closed. Please plot another point!");
				} else {
					// close the zone here
					self.completePolygonDrawing('The number of vertices of the polygonal zone has reached the max allowed number. The zone will be closed automatically.');
				}
			} else if (ContigoMapUtil.checkIntersection(self.boundingBox, false)) {
				// detect intersection of points and line segment
	 			// find intersect => pop out the latlng from  boundingBox
				self.polygonVertices.pop();
				self.boundingBox.pop();
				alert("This point has intersection with the existing line segment. Please plot another point!");
			} else {
				// no intersect find => draw this line
				var edge = new MQA.LineOverlay();
				edge.shapePoints = [prevLL.lat, prevLL.lng, currentLL.lat, currentLL.lng];
				edge.colorAlpha = 1;
				edge.borderWidth = 3;
				edge.key = 'polyEdge_' + self.boundingBox.length;
				tempDrawingCollection.add(edge);
				self.silencer.unbind('mousemove');
				self.silencer.bind('mousemove', {self: self, anchorLL: currentLL}, self.moveDrawingPolygon); // re-register mousemove event
			}
		}
	}	
}

/**
 * The handler when user clicking the first vertex poi of a incomplete polygon to 
 * finishing drawing. Self-intersecting polygon is not allowed.
 *
 * @param event
 */
ContigoMap.prototype.closePolygon = function(event) {
	if (this.boundingBox.length > 2) {
		if (ContigoMapUtil.checkIntersection(this.boundingBox, true)) {
			alert("The last point has intersection with the existing line segment. Please plot another point to close the shape again!");
		} else {
			this.completePolygonDrawing('');
		}
	}
}

/**
 * The drawing polygon process is complete, so show the polygon shape on the map 
 * based on the points clicked by user, and prompt user to give the polygon a name.
 * 
 * @param message the message will be shown in the prompt
 */
ContigoMap.prototype.completePolygonDrawing = function(message) {
	this.removeShapeCollection(TEMP_DRAWING_COLLECTION_KEY);
	var tmpZoneName = 'zn_' + Math.uuid();
	this.buildStretchablePolygon(this.boundingBox, tmpZoneName, false);
	this.silencer.unbind('mousemove');
	
	// set the center point of polygon zones for center map
	this.mostRecentLocateCoord = this.getPolyZonesCenterPoint();
					
	this.contigoPolyZoneCnt++;
	this.polygonalZoneCount++;
	
	this.mapControl.askForZoneNameFromUser(tmpZoneName, message);	
		
	// finish the polygon, reset temp holders
	this.polygonVertices.length = 0;
	this.boundingBox.length = 0;
	
	//reset this flag and allow the map switch to panning mode now
	this.plottingPolygonZoneInProgress = false;
	this.mapControl.mapControlInPlottingMode(this.plottingPolygonZoneInProgress);
}

/**
 * Move the cursor when drawing a polygon. The anchor point is fixed, and the other point 
 * will be position of the cursor. A line will be drawn between the anchor and the 
 * event's point. The previous line should be removed.
 *
 * @param event
 */
ContigoMap.prototype.moveDrawingPolygon = function(event) {
	var self = event.data.self;
	var anchorLL = event.data.anchorLL;
	var cursorll = self.cursorLL(event);
	var tempDrawingCollection = self.getShapeCollection(TEMP_DRAWING_COLLECTION_KEY, true);
	var stretchingLine = tempDrawingCollection.getByKey(STRETCHING_LINE_KEY);
	if (!stretchingLine) {
		stretchingLine = new MQA.LineOverlay();
		stretchingLine.key = STRETCHING_LINE_KEY;
		stretchingLine.color = DEFAULT_ROUTE_COLOR;
		stretchingLine.borderWidth = 1;	
		tempDrawingCollection.add(stretchingLine);	
	}

	stretchingLine.setShapePoints([anchorLL.lat, anchorLL.lng, cursorll.lat, cursorll.lng]);
}

/**
 * Build a stretchable polygon overlay by using the given vertices, show 
 * the label in the first vertex poi if necessary.
 * 
 * @param vertices
 * @param name the key of the polygon overlay.
 * @param showLabel true to show label (key of the polygon) in the first vertex poi of the polygon.
 */
ContigoMap.prototype.buildStretchablePolygon = function(vertices, name, showLabel) {
	if (vertices && vertices.length > 0) {
		var polygon = this.createShape('polygon', '#C80000', 0.18, '#F00000', 1, 2, name);
		polygon.shapePoints = ContigoMapUtil.flattenLatLngs(vertices);
		var polygonZones = this.getShapeCollection(POLY_ZONE_COLLECTION_KEY, true);		
		polygonZones.add(polygon);
		this.buildVertexPoisOfStretchablePolygon(polygon, showLabel); 		
	}
}

/**
 * Add MQA.HtmlPoi objects on top of each vertices of all polygon overlays, 
 * show the label in the first vertex poi if necessary.
 *
 * @param polygon a given polygon.
 * @param showLabel true to show label (key of the polygon) in the first vertex poi of the polygon.
 */
ContigoMap.prototype.buildVertexPoisOfStretchablePolygon = function(polygon, showLabel) {
	if (polygon && polygon.shapePoints) {
		var key = polygon.key;
		var vertexCollection = this.getShapeCollection(key, true);
		var szPoints = polygon.shapePoints.length;
		for (var i = 0, no = 0; i < szPoints; i += 2, no++) {
			var lat = polygon.shapePoints[i];
			var lng = polygon.shapePoints[i + 1];
			if (!isNaN(lat) && !isNaN(lng)) {
				var keyOfVertex = key + "|" + no;
				var vertexPoi = this.constructDragHandlePoi(keyOfVertex, new MQA.LatLng(lat, lng), ((showLabel && i == 0 && key) ? key : null));
				
				// bind events to the poi
				MQA.EventManager.addListener(vertexPoi, 'dragstart', this.startDragVertexPoi, this);
				MQA.EventManager.addListener(vertexPoi, 'drag', this.startDragVertexPoi, this);
				MQA.EventManager.addListener(vertexPoi, 'dragend', this.stopDragVertexpPoi, this);
				
				vertexCollection.add(vertexPoi);
			}
		}
	}
}

/**
 * Construct a MQA.HtmlPoi object to represent the vertex of polygon.
 *
 * @param keyOfVertex
 * @param latLng
 * @param label
 *
 * @return an MQA.HtmlPoi object
 */
ContigoMap.prototype.constructDragHandlePoi = function(keyOfVertex, latLng, label) {
	var poi = new MQA.HtmlPoi({lat: latLng.lat, lng: latLng.lng});
	poi.key = keyOfVertex;
	poi.draggable = true;
	poi.setHtml("<div class='handle'>&nbsp;</div>" + ((label) ? ("<div class='label'>" + label + "</div>") : ""), -13, -13, 'polygon_drag_handle');
	return poi;
}

/**
 * Construct a MQA.HtmlPoi object to represent the vertices of polygon.
 *
 * @param dragHandlePoi
 * @param key
 * @param latLng
 * @param label
 *
 * @return an MQA.HtmlPoi object
 */
ContigoMap.prototype.updateDragHandlePoi = function(dragHandlePoi, key, latLng, label) {
	if (dragHandlePoi) {
		if (key) {
			dragHandlePoi.key = key;
		}
		if (latLng) {
			dragHandlePoi.latLng = latLng;
		}
		dragHandlePoi.setHtml("<div class='handle'>&nbsp;</div>" + ((label) ? ("<div class='label'>" + label + "</div>") : ""), -13, -13, 'polygon_drag_handle');
	}
	return dragHandlePoi;
}

/**
 * Start Dragging and dragging a vertex POI of a polygon zone.
 *
 * @param event
 */	
ContigoMap.prototype.startDragVertexPoi = function(event) {		
	var currentPoi = event.srcObject;
	 
	// keeps track of the original position in case intersection of line segments exists
	if (this.prevDraggingVertexLL == null) {
		this.prevDraggingVertexLL = new MQA.LatLng(currentPoi.latLng.lat, currentPoi.latLng.lng);
	}

	this.redrawPolygon(currentPoi.key, currentPoi.latLng.lat, currentPoi.latLng.lng);
}

/**
 * Stop dragging of a vertex POI of a polygon zone.
 *
 * @param event
 */	
ContigoMap.prototype.stopDragVertexpPoi = function(event) {
	var poi = event.srcObject;
	var latLngOfStopPoint = poi.latLng;
	var poiKey = poi.key;

	var poiInfo = poiKey.split("|");

	var zoneKey = poiInfo[0];
	var poiIndex = poiInfo[1];
	 		 
	// get reference to shape object 
	var poly = this.getPolygonByName(zoneKey);	
		
	var boundingBox = poly.shapePoints;
		
	// check intersection of the line segment
	if (ContigoMapUtil.isSelfIntersectingPolygon(ContigoMapUtil.groupLatLngs(boundingBox), poiIndex)) {
		//find intersect => pop out the latlng from  boundingBox
		alert("Intersection of line segments is detected. Please re-define your polygonal zone.");
		// rollback the stop point to the original point before dragging
		latLngOfStopPoint = this.prevDraggingVertexLL;
		this.redrawVertexPoi(poiKey, latLngOfStopPoint.lat, latLngOfStopPoint.lng);
	}
	
	// resets to null
	this.prevDraggingVertexLL = null;

	this.redrawPolygon(poiKey, latLngOfStopPoint.lat, latLngOfStopPoint.lng);
}

/**
 * Redraw poly zone on map after moving one zone or changing the vertex of the zone
 * 
 * @param poiKey
 * @param lat
 * @param lng
 */		
ContigoMap.prototype.redrawPolygon = function(poiKey, lat, lng) {
	var poiInfo = poiKey.split("|");
	var zoneKey = poiInfo[0];
	var poiIndex = poiInfo[1];
		
	// get reference to zone overlay 
	var poly = this.getPolygonByName(zoneKey);		
	var boundingBox = poly.shapePoints;
	
	// adjust points in current shape
   	for (var i = 0; i < boundingBox.length ; i++) {  
		if ((poiIndex * 2) == i) {			
			boundingBox[i] = lat; // lat of new point
		} else if (((poiIndex * 2) + 1) == i) {
			boundingBox[i] = lng; // lng of new point
		}	
    }
    poly.shapePoints = boundingBox;
    
    var polygonShapeCollection = this.getShapeCollection(POLY_ZONE_COLLECTION_KEY, true);
    polygonShapeCollection.removeItem(poly);
    polygonShapeCollection.add(poly);
    this.mapControl.setPolygonCoordinates(this.getPolygonZone(zoneKey));
}

/**
 * Redraw a POI representing the vertex of a polygon on map with a new lat/lng coordinate
 * 
 * @param poiKey
 * @param lat
 * @param lng
 */		
ContigoMap.prototype.redrawVertexPoi = function(poiKey, lat, lng) {
	var poiInfo = poiKey.split("|");
	var zoneKey = poiInfo[0];
	var poiIndex = poiInfo[1];
	
	var vertexPoiCollection = this.getShapeCollection(zoneKey, true);
	var poi = vertexPoiCollection.getByKey(poiKey);
	vertexPoiCollection.removeItem(poi); // remove the old one
	poi.latLng = new MQA.LatLng(lat, lng);
	// for some reasons, after change the lat/lng of an HtmlPoi object, icon is reset back to default icon, and html contents disappear
	// let's add it back
	poi.setHtml("<div class='handle'>&nbsp;</div>" + ((zoneKey && poiIndex == 0) ? ("<div class='label'>" + zoneKey + "</div>") : ""), -13, -13, 'polygon_drag_handle');
	poi.setIcon(null);
	vertexPoiCollection.add(poi); // add the new one
}

/**
 * Update the name of a polygon zone and rebuild the stretchable pois of vertices of the
 * polygon with the new name.
 * 
 * @param oldKey
 * @param newKey
 */ 
ContigoMap.prototype.updatePolygonZoneKey = function(oldKey, newKey) {
	var polygonZones = this.map.getShapeCollection(POLY_ZONE_COLLECTION_KEY);
	var polygon = polygonZones.getByKey(oldKey);

	polygon.key = newKey;
	
	var dragHandlePoiCollection = this.getShapeCollection(oldKey, false);
	if (dragHandlePoiCollection) {
		dragHandlePoiCollection.collectionName = newKey;
		// update the key of all vertex pois with new key, show labe for the first vertex poi
		var szPois = dragHandlePoiCollection.getSize();
		for (var i = 0; i < szPois; i++) {
			var poi = dragHandlePoiCollection.getAt(i);
			var poiKey = poi.key;
			if (poiKey) {
				var keyParts = poiKey.split('|');
				keyParts[0] = newKey;
				var newPoiKey = keyParts.join('|'), newLatLng = null, newLabel = ((i == 0) ? newKey : null);
				this.updateDragHandlePoi(poi, newPoiKey, newLatLng, newLabel);
			}
		}
	}			
}

/**
 * Reset the name of a zone with the new name provided by the external source,
 * and return a set of lat/lng representing the vertices of the polygon back 
 * to host page. 
 *
 * @param oldKey
 * @param newKey
 */
ContigoMap.prototype.resetZoneKeyFromUser = function(oldKey, newKey){
	this.updatePolygonZoneKey(oldKey, newKey);
    this.mapControl.setPolygonCoordinates(this.getPolygonZone(newKey));
}

/**
 * Get the polygon shape by a given key from the polygon shape collection.
 *
 * @param zoneName the name of a polygon
 * @return a polygon overlay
 */
ContigoMap.prototype.getPolygonByName = function(zoneName) {
	var polygonZones = this.getShapeCollection(POLY_ZONE_COLLECTION_KEY, false);
	var polygon = polygonZones.getByKey(zoneName);
	return polygon;
}
/**
 * Get the polygon by a given key, and return an object with key and coordinates 
 * of its vertices.
 *
 * @param zoneName the name of a polygon
 * @return {key: key, points: [{lat: lat1, lng: lng1}, ...]}
 */
ContigoMap.prototype.getPolygonZone = function(zoneName) {		
	var polygonData = null;
	var polygon = this.getPolygonByName(zoneName);
	if (polygon) {
		var szPoints = polygon.shapePoints.length;
		var points = new Array();
		for (var j = 0; j < szPoints; j += 2) {
			var lat = polygon.shapePoints[j];
			var lng = polygon.shapePoints[j + 1];
			if (!isNaN(lat) && !isNaN(lng)) {
				points.push({lat: lat, lng: lng});
			}
		}
		polygonData = {key: zoneName, points: points};
	}		
	return polygonData;		
}

/**
 * Check if the zone key is unique among the shape collection
 *
 * @param zoneKey the name of a zone provided by the external source. 
 */
ContigoMap.prototype.checkZoneKeyUnique = function(zoneKey) {
	return !this.isZoneKeyExist(zoneKey);
}

/**
 * Check if the zone key already exists among the polygon shape collection
 *
 * @param zoneKey the name of a zone provided by the external source. 
 */
ContigoMap.prototype.isZoneKeyExist = function(zoneKey) {
	var polygonZones = this.getShapeCollection(POLY_ZONE_COLLECTION_KEY, true);
	return (polygonZones.getByKey(zoneKey)) ? true : false;
}

/**
 * Delete individual polygonal overlay in shapeCollection of map and its associated
 * vertex POIs.
 * 
 * @param zoneKey the name of a zone provided by the external source. 
 */
ContigoMap.prototype.deletePolygonZone = function(zoneKey) {			
	//current ShapeCollection on the map
	var polygonZones = this.getShapeCollection(POLY_ZONE_COLLECTION_KEY, true);
			
	//get zone to delete
	var zoneToDelete = polygonZones.getByKey(zoneKey);
	
	//remove the polygonal overlay from shapeCollection
	if (zoneToDelete) {
		polygonZones.removeItem(zoneToDelete);
	}

	//remove all polygon vertices
	this.removeShapeCollection(zoneKey);
	
	this.polygonalZoneCount--;	
			
	this.mostRecentLocateCoord = this.getPolyZonesCenterPoint();
}

/**
 * Plot all polygonal overlays to map
 * 
 * @param polygonZoneCollection a list of polygon collection
 */
ContigoMap.prototype.configurePolygonZones = function(polygonZoneCollection) {
	// plot polygon zones to map and get the number of polygon zones
	this.polygonalZoneCount = this.setPolygonZones(polygonZoneCollection);
	this.contigoPolyZoneCnt = this.polygonalZoneCount + 1;
		
	this.mostRecentLocateCoord = this.getPolyZonesCenterPoint();

 	this.bestFit();
}

/**
 * Add an array of polygons on the map.
 *
 * @param polygonZoneCollection an array of polygon information.
 *        {polygonZones: [{key: name1, points: [{lat: lat1, lng: lng1}, {lat: lat2, lng: lng2}, ...]}, ...]}
 */
ContigoMap.prototype.setPolygonZones = function(polygonZoneCollection) {		
	var szPolygons = 0;
	if (polygonZoneCollection) {
		var polygonZones = polygonZoneCollection.polygonZones;		
		if (polygonZones) {
			szPolygons = polygonZones.length;
			for (var i = 0; i < szPolygons; i++) {				
				var polygonInfo =  polygonZones[i];
				var zoneName = polygonInfo.key;
				var vertices = polygonInfo.points;
				this.buildStretchablePolygon(vertices, zoneName, true);
			}
		}
	}
	return szPolygons;	
}

/**
 * Get the shape collection from the map by a given key. 
 *
 * @param key the key of a shape collection
 * @param created true if the collection does not exist, it will be created 
 *        and added into the map; otherwise it won't.
 * @return the shape collection
 */
ContigoMap.prototype.getShapeCollection = function(key, created) {
	var shapeCollection = this.map.getShapeCollection(key);
	if (!shapeCollection && created) {
		shapeCollection = new MQA.ShapeCollection();
		shapeCollection.collectionName = key;
		shapeCollection.declutter = false;
		this.map.addShapeCollection(shapeCollection);
	}
	return shapeCollection;
}

/**
 * Remove a shape collection from the map.
 *
 * @param key the name of a collection.
 */
ContigoMap.prototype.removeShapeCollection = function(key) {
	var collection = this.getShapeCollection(key, false);
	if (collection) {
		collection.removeAll();
		this.map.removeShapeCollection(key);
	}
}

/**
 * Find the central point of all polygon zones on the map.
 *
 * @return the central point of all polygon zones on the map. {lat: lat, lng: lng}
 */
ContigoMap.prototype.getPolyZonesCenterPoint = function() {
	var allLatLngCollection = [];
	var centreLatLng = null;
	var polyZoneCollection = this.getShapeCollection(POLY_ZONE_COLLECTION_KEY, true);
	for (var i = 0, szPolyZones = polyZoneCollection.getSize(); i < szPolyZones; i++) {
		var polygon = polyZoneCollection.getAt(i);
		var boundingBox = polygon.shapePoints;
		var centreOfPolygon = this.calculateCenterPoint(ContigoMapUtil.groupLatLngs(boundingBox));
		if (centreOfPolygon) {
			allLatLngCollection.push(centreOfPolygon);
		}
	}
	if (allLatLngCollection.length > 0) {
		centreLatLng = this.calculateCenterPoint(allLatLngCollection);
	}
	return centreLatLng;
}

/**
 * Calculate the central lat/lng among a collection of lat/lng(s).
 *
 * @param latLngCollection
 * @return an MQA.LatLng object
 */
ContigoMap.prototype.calculateCenterPoint = function(latLngCollection) {
	var centreLatLng = null;
	if (latLngCollection) {
		var latSum = 0.0;
		var lngSum = 0.0;
		var tmpLatLng = null;
		
		var szLatLngCollection = latLngCollection.length;
		for (var i = 0; i < szLatLngCollection; i++) {
			tmpLatLng = latLngCollection[i];
			latSum += tmpLatLng.lat;
			lngSum += tmpLatLng.lng;
		}
				
		if (szLatLngCollection > 0) {
			centreLatLng = new MQA.LatLng(latSum / szLatLngCollection, lngSum / szLatLngCollection);
		}
	}
	return centreLatLng;
}

/**
 * Calls the host page's method to display the rect zone info on the page.
 *
 * @param lat1
 * @param lng1
 * @param lat2
 * @param lng2
 */
ContigoMap.prototype.updateRectZoneCoords = function(lat1, lng1, lat2, lng2) {  
	this.mapControl.updateRectZoneCoords(lat1, lng1, lat2, lng2);
}

/**
 * Call the data puller's method to display the circle zone info on the page.
 *
 * @param lat
 * @param lng
 * @param radiusInMetres
 */
ContigoMap.prototype.updateCircleZoneCoords = function(lat, lng, radiusInMetres) {
	this.mapControl.updateCircleZoneCoords(lat, lng, radiusInMetres);
}

/**
 * Draws a rectangular overlay on the map.
 *
 * @param lat1  The latitude of the first coordinate, in decimal degrees.
 * @param lng2  The longitude of the first coordinate, in decimal degrees.
 * @param lat1  The latitude of the second coordinate, in decimal degrees.
 * @param lng2  The longitude of the second coordinate, in decimal degrees.
 */ 
ContigoMap.prototype.addRectangularOverlay = function(lat1, lng1, lat2, lng2) {
	var rectZoneCollection = this.getShapeCollection(RECTANGLE_ZONE_COLLECTION_KEY, true);
	var shape = this.createShape('rectangle', '#C80000', 0.18, '#F00000', 1, 2, DRAWING_ZONE_KEY);
	shape.shapePoints = [lat1, lng1, lat2, lng2];
	rectZoneCollection.add(shape);
      
	// set the centre to be the centre of the zone
	this.mostRecentLocateCoord = ContigoMapUtil.getMidPoint(new MQA.LatLng(lat1, lng1), new MQA.LatLng(lat2, lng2));
      
    // best fit the map to the zone
    this.map.bestFit();
}

/**
 * Draws a circular overlay on the map.
 *
 * @param lat1   The latitude of the centre coordinate, in decimal degrees.
 * @param lng2   The longitude of the centre coordinate, in decimal degrees.
 * @param radius The radius of the circle, in metres.
 */
ContigoMap.prototype.addCircularOverlay = function(lat1, lng1, radius) {
	var circleZoneCollection = this.getShapeCollection(CIRCLE_ZONE_COLLECTION_KEY, true);
    var shape = this.createShape('circle', '#C80000', 0.18, '#F00000', 1, 2, DRAWING_ZONE_KEY);
    var centre = new MQA.LatLng(lat1, lng1);
	shape = this.UpdateCircleOverlay(shape, centre, radius);
	circleZoneCollection.add(shape);
      
	// set the centre to be the centre of the zone      
	this.mostRecentLocateCoord = centre;
      
    // best fit the map to the zone
    this.map.bestFit();
    this.map.setCenter(this.mostRecentLocateCoord, 14);
}

/**
 * After the polygon is changed by user, will map become draggable.
 * NOTE: due to lacking of map locking feature, this method is not implemented yet.
 */
ContigoMap.prototype.checkPanningAfterPolyZoneChanging = function() {
}
