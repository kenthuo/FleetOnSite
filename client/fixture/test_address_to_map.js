$(document).ready(function() {
    var map = new ContigoMap({showLabelWithLandmark: false, showCentralMarker: false});

    var poi = new ContigoLmkPoi({
        icon: new Icon ({
            name: "push_pin_40", width: 40, height: 40  
        }),
        label: "Address",
        coord: new Coordinate({
            lat: "49.26072",
            lng: "-123.11635"
        }),
        lmkAddress: "553 W 12th Ave, Vancouver, BC, V5Z 3X7, CANADA"
    });

    map.sendPoints(new ContigoPoiCollection({landmarks: [poi], beaconItems: {}}), true);	
    
    $(window).on('resize', function(){
        map.resize("100%", "100%");
    });
});