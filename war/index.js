var map = L.map('map').setView([45.762858, 4.855000], 13);
        mapLink = 
            '<a href="http://openstreetmap.org">OpenStreetMap</a>';
        L.tileLayer('http://{s}.tiles.mapbox.com/v3/kevinlecocq.jfk00chc/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery &copy <a href="http://mapbox.com">Mapbox</a>',
            maxZoom: 20
        	}).addTo(map);
				
	/* Initialize the SVG layer */
	map._initPathRoot();
 
	/* We simply pick up the SVG from the map object */
	var svg = d3.select("#map").select("svg"),
	g = svg.append("g");
	
	d3.json("wherearethebikes?q=Lyon", function(stations) {
		/* Add a LatLng object to each item in the dataset */
		stations.forEach(function(d) {
			d.LatLng = new L.LatLng(d.position.lat, d.position.lng);
		})
		
		/*var vertices = d3.range(stations.length).map(function(d, i) {
			return [stations[i].LatLng.lat, stations[i].LatLng.lng];
		});*/
		
		var voronoi = d3.geom.voronoi()
			.x(function(d) {
					return d.LatLng[0]; 
				})
			.y(function(d) { 
					return d.LatLng[1]; 
				});
		
		voronoi(stations).forEach(function(d) { d.point.cell = d; });
		
		//var voronoiGraph = d3.geom.voronoi(vertices);
		
		var stationCircles = g.selectAll("circle")
			.data(stations)
			.enter().append("circle")
			.style("stroke", "black")  
			.style("opacity", .6) 
			.style("fill", function(d, i) {
				if(d.available_bikes) return "green";
				else return "red";
				})
			.attr("r", 3);
		
		/*var stationPaths = g.selectAll("path")
			.data(voronoi)
			.enter().append("svg:path")
			.attr("class", function(d, i) {
					return i ? "q" + (i % 9) + "-9" : null; 
				})
			.attr("d", function(d) { 
					return "M" + d.join("L") + "Z";
					//return "M" + d.source.LatLng.lat
				});*/
		var stationPaths = g.selectAll("path")
			.data(stations)
			.enter().append("svg:path")
			.attr("class", function(d, i) {
					return i ? "q" + (i % 9) + "-9" : null; 
				})
			.attr("d", function(d) { 
					return "M" + d.join("L") + "Z";
				});
		
		map.on("viewreset", update);
		update();
		
		function update() {
			stationCircles.attr("transform", 
			function(d) { 
				return "translate("+ 
					map.latLngToLayerPoint(d.LatLng).x +","+ 
					map.latLngToLayerPoint(d.LatLng).y +")";
				}
			)
			
			stationPaths.attr("transform",
					function(d) {
						return "translate(" + 
							map.latLngToLayerPoint(new L.LatLng(d[0], d[1])).x +","+ 
							map.latLngToLayerPoint(new L.LatLng(d[0], d[1])).y +")";
					}
				)
		}
	})