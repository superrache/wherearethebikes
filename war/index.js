var map = L.map('map').setView([45.762858, 4.855000], 13);
mapLink = 
    '<a href="http://openstreetmap.org">OpenStreetMap</a>';
L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
	minZoom:1,
    maxZoom: 19
}).addTo(map);
				
// Initialize the SVG layer
	map._initPathRoot();

	// svg selection
var svg = d3.select("#map").select("svg"),
	stationAreaGroup = svg.append("g"),
	stationPointGroup = svg.append("g");

d3.json("wherearethebikes?q=Lyon", function(stations) {
	
	stations.forEach(function(d) {
		d.LatLng = new L.LatLng(d.position.lat, d.position.lng);
	})
	
	var stationPoints = stationPointGroup.selectAll("circle")
		.data(stations)
		.enter().append("circle")
		.style("stroke", "black")  
		.style("opacity", .6) 
		.style("fill", function(d, i) {
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
		.attr("id", function(d, i) {
				return "station-" + i;
			})
		.attr("stroke-width", "0px")
		.attr("fill-opacity", "0.5")
		.attr("fill", function(d, i) {
				var bikeAvailability = d.available_bikes / d.bike_stands;
				var standAvailability = d.available_bike_stands / d.bike_stands;
				return colorScale(standAvailability);
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
				
				//var latLngPoint = new L.LatLng(d.cell[i][0], d.cell[i][1]);
				//var screenPoint = map.latLngToLayerPoint(latLngPoint);
				if(first) {
					first = false;
				} else {
					polygon += " ";
				} 
				//polygon += screenPoint.x + "," + screenPoint.y;
				
				polygon += d.cell[i][0] + "," + d.cell[i][1];
			}
			return polygon;
		});

	}
});
