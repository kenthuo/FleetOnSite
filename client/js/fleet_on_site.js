/*
 * JS Library for Fleet On Site.
 */
function ContigoMap() {
    this.map = null;
}

ContigoMap.prototype = {
	/**
	 * Initialize and show the map with the default central position and zoom level.
	 * 
	 */
	init : function() {
		this.map = $('#map');
        $('#map').gmap3({
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
                }
            }
        });
	}
}

$(document).ready(function() {
    var map = new ContigoMap();
    map.init();
});