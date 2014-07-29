require({
    paths: {
        jqueryui: "jquery-ui/ui"
    }
}, ["jqueryui/tabs"], function() {
    $(document).ready(function() {
        var tabs = $("#tabs").tabs({
            heightStyle: "fill"
        });

        $("#tabs_mapview").append("<iframe name='mapview' id='mapview'>");
        $("iframe#mapview").attr("src", "fleet_on_site.html");
    });
});