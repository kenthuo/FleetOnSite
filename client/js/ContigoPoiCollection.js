/*******************************************************************************
 ContigoPoiCollection class definition
 *******************************************************************************/

/**
 * Constructor.
 * 
 * The optional parameter object contains two optional values:
 * 
 * 1) "landmarks": an array of ContigoPoi objects 2) "beaconItems": an
 * associated list mapping beacon IDs to arrays of ContigoBeaconItems 3)
 * "measurementUnit": The subscriber/organization country associated with the
 * collection of POIs.
 * 
 * 4) "zones": an associative array mapping beacon IDs to arrays of Zone objects
 * 
 */
function ContigoPoiCollection(params) {

	if (params == null) {
		this.landmarks = [];
		this.beaconItems = {};
		this.measurementUnit = "ft";
		this.zones = {};
		this.polygonZones = {};
		this.jobs = {};
	} else {
		this.landmarks = params.landmarks || [];
		this.beaconItems = params.beaconItems || {};
		this.measurementUnit = params.measurementUnit || "ft";
		this.zones = params.zones || {};
		this.polygonZones = params.polygonZones || {};
		this.jobs = params.jobs || {};
	}

}

/*******************************************************************************
 ContigoBeaconItem class definition
 *******************************************************************************/
/**
 * Constructor.
 * 
 * The optional parameter object contains two optional values:
 * 
 * 1) "isPointsConnected": a boolean value indicating whether all locate points
 * are to be visually connected
 * 
 * 2) "locatePoints": an array of ContigoBeaconPoi objects that are sorted in
 * ascending timestamp order
 * 
 * 3) "showInputOutputColor": a boolean value indicate whether to change color 
 * of line segment for input output status in the map of route log
 * 
 */
function ContigoBeaconItem(params) {

	if (params == null) {
		this.locatePoints = [];
		this.isPointsConnected = false;
		this.showInputOutputColor = false;
	} else {
		this.locatePoints = params.locatePoints || [];
		this.isPointsConnected = params.isPointsConnected || false;
		this.showInputOutputColor = params.showInputOutputColor || false;
	}

}

/*******************************************************************************
 Icon class definition
 *******************************************************************************/

/**
 * Constructor.
 * 
 * The optional parameter object contains 3 optional values:
 * 
 * 1) "name": a string value 2) "width": a numeric value; pixel size 3) "width":
 * a numeric value; pixel size
 * 
 * Default values of: empty string for name and 16 px for width/height
 */
function Icon(params) {
	if (params == null) {
		this.name = "";
		this.width = 16;
		this.height = 16;
	} else {
		this.name = params.name || "";
		this.width = params.width || 16;
		this.height = params.height || 16;
	}
}

/*******************************************************************************
 Coordinate class definition
 *******************************************************************************/

/**
 * Constructor.
 * 
 * The optional parameter object contains two optional values:
 * 
 * 1) "lat": a numeric value 2) "lng": a numeric value
 * 
 * Default values of 0 will be assigned if no lat/lngs are specified.
 */
function Coordinate(params) {
	if (params == null) {
		this.lat = 0;
		this.lng = 0;
	} else {
		this.lat = params.lat || 0;
		this.lng = params.lng || 0;
	}
}

/*******************************************************************************
 Address class definition
 *******************************************************************************/

/**
 * Constructor.
 * 
 * The optional parameter object contains five optional values:
 * 
 * 1) "street": a string value 2) "city": a string value 3) "county": a string
 * value 4) "postalCode": a string value 5) "country": a string value
 * 
 * A default values of "" is assigned if particular property is not specified.
 */
function Address(params) {
	if (params == null) {
		this.street = "";
		this.city = "";
		this.county = "";
		this.state = "";
		this.postalCode = "";
		this.country = "";
	} else {
		this.street = params.street || "";
		this.city = params.city || "";
		this.county = params.county || "";
		this.state = params.state || "";
		this.postalCode = params.postalCode || "";
		this.country = params.country || "";
	}
}

/*******************************************************************************
 ContigoPoi class definition
 *******************************************************************************/

/**
 * Constructor.
 * 
 * The optional parameter object contains three optional values:
 * 
 * 1) "icon": a string value 2) "label": a string value 3) "coord": a Coordinate
 * object
 * 
 * A default Coordinate is assigned if none is specified.
 */
function ContigoPoi(params) {
	if (params == null) {
		this.coord = new Coordinate();
	} else {
		this.icon = params.icon || new Icon();
		this.label = params.label;
		this.coord = params.coord || new Coordinate();
		this.userNote = params.userNote || "";
	}
}

/*******************************************************************************
 ContigoLmkPoi class definition
 *******************************************************************************/

/**
 * Constructor.
 * 
 * The optional parameter object contains five optional values:
 * 
 * 1) "icon": a string value 2) "label": a string value 3) "coord": a Coordinate
 * object 4) "lmkAddress": a string value 5) "content": a string value
 * 
 * A default Coordinate is assigned if none is specified.
 */
function ContigoLmkPoi(params) {
	if (params == null) {
		this.coord = new Coordinate();
	} else {
		this.icon = params.icon || new Icon();
		this.label = params.label;
		this.coord = params.coord || new Coordinate();
		this.lmkAddress = params.lmkAddress;
		this.content = params.content;
		this.category = params.category;
		this.userNote = params.userNote || "";
		this.dispatch = params.dispatch || null;
	}
}

/*******************************************************************************
 ContigoBeaconPoi class definition
 *******************************************************************************/

/**
 * Constructor.
 * 
 * The optional parameter object contains ten optional values:
 * 
 * 1) "icon": a Icon object 
 * 2) "label": a string value 
 * 3) "coord": a Coordinate object 
 * 4) "eventType": a string value 
 * 5) "address": a string value
 * 6) "circleCertaintyRadius": a string value 
 * 7) "speed": a string value (e.g. "25km/h" or "45mi/h") 
 * 8) "direction": a string value 
 * 9) "stopDuration": a string value 
 * 10) "timestamp": a string value (format) 
 * 11) "landmark": a string value (refers to the closest landmark to this POI) 
 * 12) "numberLabel": an integer value to be merged with icon if exist 
 * 13) "id": a string value that uniquely identifies a point on the map 
 * 14) "userNote": a string value provided by users to describe about the point
 * 15) "status": PND connect status
 * 16) "driverID": dispatch driver ID
 * 17) "driverStatus": Dispatch driver status
 * 18) "beaconID": beacon ID
 * 19) "guardianID": guardian ID
 * 20) "ioprt1Scenario": Input #1 Scenario
 * 21) "ioprt2Scenario": Input #2 Scenario
 * 22) "ioprt3Scenario": Input #3 Scenario
 * 23) "ioprt4Scenario": Input #4 Scenario
 * 24) "lineColor": line segment color for showing input status color of route log
 * 25) "dispatch": information for dispatch
 * 26) "postedSpeed": string value of posted speed if there is any. (e.g., Posted Speed: 50KPH)
 * 27) "loginID": login ID for driver with iButton assigned
 * 28) "driverName": name of driver with iButton assigned
 * 29) "tripID" : trip ID of the trip in combined trip report
 * 30) "vehicleStatus": the status of vehicle ("stop", "idle")
 * 31) "temperature": temperature reading
 * 
 * A default Coordinate is assigned if none is specified.
 */
function ContigoBeaconPoi(params) {
	if (params == null) {
		this.coord = new Coordinate();
	} else {
		this.icon = params.icon || new Icon();
		this.label = params.label;
		this.coord = params.coord || new Coordinate();
		this.eventType = params.eventType;
		this.address = params.address;
		this.circleCertaintyRadius = params.circleCertaintyRadius;
		this.speed = params.speed;
		this.direction = params.direction;
		this.stopDuration = params.stopDuration;
		this.timestamp = params.timestamp;
		this.landmark = params.landmark;
		this.numberLabel = params.numberLabel || 0;
		this.id = params.id || "";
		this.userNote = params.userNote || "";
		this.status = params.status || "";
		this.driverID = params.driverID || "";
		this.driverStatus = params.driverStatus || "";
		this.beaconID = params.beaconID || "";
		this.guardianID = params.guardianID || "";
		this.ioprt1Scenario = params.ioprt1Scenario || "";
		this.ioprt2Scenario = params.ioprt2Scenario || "";
		this.ioprt3Scenario = params.ioprt3Scenario || "";
		this.ioprt4Scenario = params.ioprt4Scenario || "";
		this.lineColor = params.lineColor || "";
		this.dispatch = params.dispatch || null;
		this.postedSpeed = params.postedSpeed || "";
		this.loginID = params.loginID || "";
		this.driverName = params.driverName || "";		
		this.tripID = params.tripID || "";
		this.vehicleStatus = params.vehicleStatus || "";
		this.temperature = params.temperature || "";
	}
}

function ContigoJobPoi(params) {
  
  if (params == null) {
    this.coord = new Coordinate();
  } else {
    this.id = params.id || "";
    this.coord = params.coord || new Coordinate();
    this.icon = params.icon || new Icon();
    this.label = params.label;
    this.destination = params.destination;
    this.landmark = params.landmark;
    this.priority = params.priority;
    this.status = params.status;
    this.sentTimestamp = params.sentTimestamp;
    this.ackTimestamp = params.ackTimestamp;
    this.etaTimestamp = params.etaTimestamp;
    this.doneTimestamp = params.doneTimestamp || null;
    this.deletedTimestamp = params.deletedTimestamp || null;
    this.deletedBy = params.deletedBy || "";
    this.description = params.description; 
    this.numberLabel = params.numberLabel || 0;
  }
  
}

/*******************************************************************************
 Zone class definition
 *******************************************************************************/
function Zone(params) {

	if (params) {

		this.type = params.type || null;
		this.points = params.points || null;
		this.name = params.name || "";

	}

}

Zone.RECT = 1;
Zone.CIRCLE = 2;

/*******************************************************************************
Polygon Zone class definition
*******************************************************************************/
/**
* Constructor.
* 
* 1) "key": a String value for the key/name of a polygonal overlay obj on map
* 
* 2) "points": an array of Coordinate objects
* 
*/
function PolygonZone(params) {

	if (params == null) {
		this.key = null;
		this.points = [];
	} else {
		this.key = params.key || null;
		this.points = params.coords || [];
	}
}

/*******************************************************************************
PolygonZoneCollection class definition
*******************************************************************************/

/**
* Constructor.
* 
* 
* 1) "polygonZones": an array of PolygonZone objects 
* 
*/
function PolygonZoneCollection(params) {

	if (params == null) {
		this.polygonZones = [];
	} else {
		this.polygonZones = params.polygonZones || [];
	}

}

/*******************************************************************************
Dispatch class definition
*******************************************************************************/
/**
* Constructor.
* 
* 1) "type": a String value to represent either "driver", "beacon", or "landmark"
* 
* 2) "id": id of guardian or beacon
* 
*/
function Dispatch(params) {
	if (params == null) {
		this.type = null;
		this.id = null;
	} else {
		this.type = params.type || null;
		this.id = params.id || [];
	}
}
