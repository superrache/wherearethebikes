var map = L.map('map').setView([20, 0], 2);
mapLink = 
    '<a href="http://openstreetmap.org">OpenStreetMap</a>';
L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, bike sharing system data from <a href="http://api.citybik.es">CityBikes</a>',
	minZoom:1,
    maxZoom: 19
}).addTo(map);
				
// Initialize the SVG layer
map._initPathRoot();

	// svg selection
var svg = d3.select("#map").select("svg"),
	stationAreaGroup = svg.append("g"),
	stationPointGroup = svg.append("g"),
	citySelector = d3.select("#cityselector").on("change", onCityChange),
	cityOptions = [];

d3.json("data?q=networks", function(networks) {
	cityOptions = citySelector.selectAll("option")
	  .data(networks)
	  .enter()
	  .append("option")
	  .attr("value", function(d) {
		  	return "option-" + d.id;
		  })
	  .text(function(d) {
		  	return d.city;
		  });
});

function getURLParameter(name) {
    return decodeURI(
        (RegExp(name + '=' + '(.+?)(&|$)').exec(location.search)||[,null])[1]
    );
}

function onCityChange() {
	var selectedIndex = citySelector.property('selectedIndex');
    var city = cityOptions[0][selectedIndex].__data__;
    
	d3.json("data?q=" + city.tag, function(stations) {
		
		stations.forEach(function(d) {
			d.LatLng = new L.LatLng(d.lat / 1000000, d.lng / 1000000);
		});
		
		var stationPoints = stationPointGroup.selectAll("circle")
			.data(stations)
			.enter().append("circle")
			.style("stroke", "black")
			.style("opacity", .6)
			.style("fill", function(d) {
				if(d.available_bikes) return "green";
				else return "red";
				})
			.attr("r", 2);
		
		var colorScale = d3.scale.linear()
								.range(["red", "yellow", "green"])
								.domain([0, 0.5, 1]);
		
		var stationAreas = stationAreaGroup.selectAll("path")
			.data(stations)
			.enter().append("svg:polygon")
			.attr("id", function(d) {
					return "station-" + d.idx;
				})
			.attr("stroke-width", "0px")
			.attr("fill-opacity", "0.5")
			.attr("fill", function(d) {
					var slots = d.bikes + d.free;
					var bikeAvailability = d.bikes / slots;
					var slotAvailability = d.free / slots;
					return colorScale(bikeAvailability);
				});
		
		map.on("viewreset", update);
		update();
		
		function update() {
			// Data reprojection
			stations.forEach(function(d, i) {
					var stationPoint = map.latLngToLayerPoint(d.LatLng);
					d.x = stationPoint.x;
					d.y = stationPoint.y;
				});
			
			//var pixelBounds = map.getPixelBounds();
			
			// Voronoi computation, clipped by the new map frame
			var voronoi = d3.geom.voronoi()
			.x(function(d) {
					return d.x; 
				})
			.y(function(d) { 
					return d.y; 
				});
			//.clipExtent([[pixelBounds.min.x, pixelBounds.min.y], [pixelBounds.max.x, pixelBounds.max.y]]);
		
			voronoi(stations).forEach(function(d) { 
					d.point.cell = d;
				});
		
			stationPoints.attr("transform", function(d) { 
				return "translate("+ d.x +","+ d.y +")";
				}
			);
			
			stationAreas.attr("points", function(d) {
				var polygon = "";
				var first = true;
				for(var i = 0; i < d.cell.length; i++) {
					if(isNaN(d.cell[i][0]) || isNaN(d.cell[i][1])) return "";
					
					if(first) {
						first = false;
					} else {
						polygon += " ";
					}
					
					polygon += d.cell[i][0] + "," + d.cell[i][1];
				}
				return polygon;
			});

		}
	});

}

