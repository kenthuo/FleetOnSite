/*
 * JS Library for Fleet On Site.
 */
function ContigoMap() {
    this.map = null;
    this.contextMenu = null;
    this.current = null; // current click event (used to save as start / end position)
    this.m1 = null;
    this.m2 = null;
}

ContigoMap.prototype = {
	/**
	 * Initialize and show the map with the default central position and zoom level, and
	 * also initialize the context menu.
	 * 
	 */
	init: function() {
		var that = this;
		this.map = $('#map');
		this.contextMenu = new Gmap3Menu(this.map);
		this.initContextMenu();
        this.map.gmap3({
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
						that.current = event;
						that.contextMenu.open(that.current);
					},
					click: function() {
						that.contextMenu.close();
					},
					dragstart: function() {
						that.contextMenu.close();
					},
					zoom_changed: function() {
						that.contextMenu.close();
					}
				}
            }
        });
	},
	
	/**
	 * Add menu item to the context menu.
	 */
	initContextMenu: function() {
		var that = this;
		this.contextMenu.add("Zoom in", "zoomIn", 
			function() {
				var map = that.map.gmap3("get");
				map.setZoom(map.getZoom() + 1);
				that.contextMenu.close();
			});
		that.contextMenu.add("Zoom out", "zoomOut",
			function() {
				var map = that.map.gmap3("get");
				map.setZoom(map.getZoom() - 1);
				that.contextMenu.close();
			});
		this.contextMenu.add("Center here", "centerHere", 
			function() {
				that.map.gmap3("get").setCenter(that.current.latLng);
				that.contextMenu.close();
			});
	}
}

$(document).ready(function() {
    var map = new ContigoMap();
    map.init();
});