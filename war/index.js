d3.select("#map-loading").style("display", "block");

var map = L.map('map', {zoomControl: false}).setView([20, 0], 2);
map.addControl(L.control.zoom({position: 'topright'}));

mapLink = 
    '<a href="http://openstreetmap.org">OpenStreetMap</a>';
L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, bike sharing system data from <a href="http://api.citybik.es">CityBikes</a>',
	minZoom:1,
    maxZoom: 19
}).addTo(map);

fetch('https://dept-quiz.herokuapp.com/stat?feature=wherearethebikes')

// Initialize the SVG layer
map._initPathRoot();

var colorScale = d3.scale.linear()
	.range(["red", "yellow", "green"])
	.domain([0, 0.5, 1]);

// svg selection
var svg = d3.select("#map").select("svg"),
	stationAreaGroup = svg.append("g"),
	stationPointGroup = svg.append("g"),
	stationAreas = [],
	stationPoints = [],
	currentStations = [],
	network,
	citySelector = d3.select("#cityselector").on("change", onCitySelectChange),
	cityOptions = [],
	methodSelector = d3.select("#methodselector").on("change", onMethodSelectChange),
	method = 0;

map.on("viewreset", onMapUpdate);

var stationTooltip = d3.select("#station-tooltip"),
	stationTooltipName = d3.select("#station-tooltip-name"),
	stationTooltipBikeNumber = d3.select("#station-tooltip-bike-number"),
	stationTooltipSlotNumber = d3.select("#station-tooltip-slot-number"),
	stationTooltipBonus = d3.select("#station-tooltip-bonus")

var networkParam = getURLParameter("network");

d3.json("data?q=networks", function(networks) {
	console.log("networks loaded");
	d3.select("#cityselector").attr("disabled", null);
	d3.select("#selector-loading").text("Choose a city");
	d3.select("#map-loading").style("display", "none");

	networks.networks.forEach(function(d) {
		d.label = d.location.country + " " + d.location.city + " (" + d.name + ")"
	})
	
	function sortByCity(array, key) {
		return array.sort(function(a, b) {
			var x = a[key]; var y = b[key]
			return ((x < y) ? -1 : ((x > y) ? 1 : 0))
		})
	}
			
	networks = sortByCity(networks.networks, "label")
	
	cityOptions = citySelector.selectAll("option")
	  .data(networks)
	  .enter()
	  .append("option")
	  .attr("value", function(d) {
		  	return "option-" + d.id;
		  })
	  .text(function(d) {
		  	return d.label;
		  });
	
	if(networkParam != "null") {
		d3.select("#map-loading").style("display", "block");
		networks.forEach(function(d) {
			if(d.id === networkParam) {
				network = d;
				cityOptions.property("value", d); // TODO...
				changeNetwork();
				return;
			}
		});
	}
});

function getURLParameter(name) {
    return decodeURI(
        (RegExp(name + '=' + '(.+?)(&|$)').exec(location.search)||[,null])[1]
    );
}

function setURLParameter(name, value) {
	var title = "Wherearethebikes? " + value;
	window.history.pushState(title, title, "/?" + name + "=" + value);
}

function onCitySelectChange() {
	var selectedIndex = citySelector.property('selectedIndex');
	if(selectedIndex === "default") {
		return;
	}
    network = cityOptions[0][selectedIndex].__data__;
    setURLParameter("network", network.id);
	changeNetwork();
}
		
function onMethodSelectChange() {
	method = methodSelector.property('selectedIndex');
    console.log("new method:" + method);
    render();
    onMapUpdate(); // la carte ne bouge pas, donc il faut forcer la mise à jour
}

function changeNetwork() {
	d3.json("data?q=" + network.id, function(res) {
		console.log(res.network.name + " station data loaded")

		if(window.location.origin.indexOf('herokuapp.com') > 0) {
			fetch('https://dept-quiz.herokuapp.com/stat?feature=wherearethebikes-' + network.id)
		}
		
		d3.select("#map-loading").style("display", "none");
		currentStations = res.network.stations;
		
		currentStations.forEach(function(d) {
			d.LatLng = new L.LatLng(d.latitude, d.longitude);
			d.slots = d.free_bikes + d.empty_slots;
			d.bikeAvailability = d.free_bikes / d.slots;
			d.slotAvailability = d.empty_slots / d.slots;
			d.opening = (d.extra.status.toLowerCase().startsWith('o') ? 1 : 0) // "Operative" pour velib', "OPEN" pour bicloo ou velov
			d.bonus = d.extra.bonus ? 1 : 0
			d.banking = d.extra.banking ? 1 : 0
		});
		
		render();
	});
}

function render() {
	// clear the svg
	stationPointGroup.selectAll("circle").remove();
	stationAreaGroup.selectAll("polygon").remove();
	
	// create station circles
	stationPoints = stationPointGroup.selectAll("circle")
		.data(currentStations)
		.enter().append("circle")
		.style("stroke", "black")
		.style("stroke-width", 1)
		.style("opacity", .5)
		.style("fill", function(d) {
				if(method === 0) {
					if(d.bikeAvailability == 0) return "red"
					else return "green"
				} else if(method === 1) {
					if(d.slotAvailability == 0) return "red"
					else return "green"
				} else if(method === 2) {
					if(d.extra.status.toLowerCase().startsWith('o')) return "green"
					else return "red"
				} else if(method === 3) {
					if(d.extra.bonus) return "green"
					else return "red"
				} else if(method === 4) {
					if(d.extra.banking) return "green"
					else return "red"
				}
			})
		.attr("r", 3);
	
	// create station polygons
	stationAreas = stationAreaGroup.selectAll("path")
		.data(currentStations)
		.enter().append("svg:polygon")
		.attr("id", function(d) {
				return "station-" + d.id;
			})
		.attr("stroke-width", "0px")
		.attr("fill-opacity", "0.5")
		.attr("fill", function(d) {
				if(method === 0) {
					return colorScale(d.bikeAvailability)
				} else if(method === 1) {
					return colorScale(d.slotAvailability)
				} else if(method === 2) {
					return colorScale(d.opening)
				} else if(method === 3) {
					return colorScale(d.bonus)
				} else if(method === 4) {
					return colorScale(d.banking)
				}
			});
	
	stationAreas.on('mouseover', function(d) {
			stationTooltip.transition()
						.duration(200)
						.style("opacity", .9);
			stationTooltip.style("left", (d3.event.pageX) + "px")
						.style("top", (d3.event.pageY - 28 + "px"));
			stationTooltipName.html(d.name);
			stationTooltipBikeNumber.html(d.free_bikes);
			stationTooltipSlotNumber.html(d.empty_slots);
			stationTooltipBonus.html(d.extra.bonus ? "(bonus)" : "")
		})
		.on('mouseout', function(d) {
			stationTooltip.transition()
						.duration(500)
						.style("opacity", 0);
		});
	
	// apply changes on the map
    console.log("zooming on " + network.city);
    var networkLatLng = new L.LatLng(network.location.latitude, network.location.longitude);
    map.setView(networkLatLng, 14); // call onMapUpdate()
}

function onMapUpdate() {
	console.log("onMapUpdate")
	
	// Data reprojection
	currentStations.forEach(function(d) {
		var stationPoint = map.latLngToLayerPoint(d.LatLng)
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

	voronoi(currentStations).forEach(function(d) { 
			d.point.cell = d;
		});

	stationPoints.attr("transform", function(d) { 
		return "translate("+ d.x +","+ d.y +")";
		}
	);
	
	stationAreas.attr("points", function(d) {
		var polygon = "";
		var first = true;
		if(typeof d.cell === 'undefined') {
			return null;
		}
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

