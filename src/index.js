import {
  Map,
  NavigationControl,
  MercatorCoordinate,
} from "https://cdn.jsdelivr.net/npm/maplibre-gl@6.16.0/dist/maplibre-gl.mjs";

// d3 v7 is loaded as a global by index.html

// CityBikes sends `Access-Control-Allow-Origin: *`, so it is called directly.
var CITYBIKES_API = "https://api.citybik.es/v2/networks";

var METHODS = [
  function (d) {
    return d.bikeAvailability;
  }, // 0: bike availability
  function (d) {
    return d.slotAvailability;
  }, // 1: slot availability
  function (d) {
    return d.opening;
  }, // 2: station opening
  function (d) {
    return d.bonus;
  }, // 3: bonus stations
  function (d) {
    return d.banking;
  }, // 4: banking stations
];

var NO_DATA_COLOR = "#888";

var colorScale = d3
  .scaleLinear()
  .range(["red", "yellow", "green"])
  .domain([0, 0.5, 1]);

var mapLoading = d3.select("#map-loading").style("display", "block");

var map = new Map({
  container: "map",
  center: [0, 20],
  zoom: 1,
  minZoom: 0,
  maxZoom: 19,
  style: {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        maxzoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, bike sharing system data from <a href="https://api.citybik.es">CityBikes</a>',
      },
    },
    layers: [{ id: "osm", type: "raster", source: "osm" }],
  },
});
map.addControl(new NavigationControl({ showCompass: false }), "top-right");

var mapReady = new Promise(function (resolve) {
  map.on("load", function () {
    var empty = { type: "FeatureCollection", features: [] };
    map.addSource("cells", { type: "geojson", data: empty });
    map.addSource("stations", { type: "geojson", data: empty });
    map.addLayer({
      id: "cells",
      type: "fill",
      source: "cells",
      paint: {
        "fill-color": ["get", "color"],
        "fill-opacity": 0.5,
        "fill-antialias": false,
      },
    });
    map.addLayer({
      id: "stations",
      type: "circle",
      source: "stations",
      paint: {
        "circle-radius": 3,
        "circle-color": ["get", "color"],
        "circle-opacity": 0.5,
        "circle-stroke-color": "black",
        "circle-stroke-width": 1,
        "circle-stroke-opacity": 0.5,
      },
    });
    resolve();
  });
});

var currentStations = [],
  network,
  networks = [],
  citySelector = d3.select("#cityselector").on("change", onCitySelectChange),
  methodSelector = d3
    .select("#methodselector")
    .on("change", onMethodSelectChange),
  method = 0;

var stationTooltip = d3.select("#station-tooltip"),
  stationTooltipName = d3.select("#station-tooltip-name"),
  stationTooltipBikeNumber = d3.select("#station-tooltip-bike-number"),
  stationTooltipSlotNumber = d3.select("#station-tooltip-slot-number"),
  stationTooltipBonus = d3.select("#station-tooltip-bonus");

var networkParam = getURLParameter("network"),
  methodParam = getURLParameter("method");

d3.json(CITYBIKES_API).then(function (ns) {
  console.log("networks loaded");
  citySelector.attr("disabled", null);
  d3.select("#selector-loading").text("Choose a city");
  mapLoading.style("display", "none");

  ns.networks.forEach(function (d) {
    d.label = d.location.country + " " + d.location.city + " (" + d.name + ")";
  });
  networks = ns.networks.sort(function (a, b) {
    return d3.ascending(a.label, b.label);
  });

  citySelector
    .selectAll("option.network")
    .data(networks)
    .join("option")
    .attr("class", "network")
    .attr("value", function (d) {
      return d.id;
    })
    .text(function (d) {
      return d.label;
    });

  if (networkParam !== null) {
    applyNetworkParam();
  }
});

addEventListener("popstate", function () {
  networkParam = getURLParameter("network");
  methodParam = getURLParameter("method");
  console.log("popstate: network=" + networkParam + " method=" + methodParam);
  if (!network || networkParam !== network.id) {
    applyNetworkParam();
  } else {
    applyMethodParam();
    render();
  }
});

function applyNetworkParam() {
  var found = networks.find(function (d) {
    return d.id === networkParam;
  });
  if (found) {
    network = found;
    citySelector.property("value", found.id);
    changeNetwork();
  }
}

function applyMethodParam() {
  if (methodParam !== null) {
    var m = parseInt(methodParam, 10);
    if (m >= 0 && m < METHODS.length) {
      method = m;
      methodSelector.property("selectedIndex", method);
    }
  }
}

function getURLParameter(name) {
  return new URLSearchParams(location.search).get(name);
}

function updateURL() {
  if (network) {
    var title = "Wherearethebikes";
    window.history.pushState(
      title,
      title,
      "/?network=" + encodeURIComponent(network.id) + "&method=" + method,
    );
  }
}

function onCitySelectChange() {
  var id = citySelector.property("value");
  var found = networks.find(function (d) {
    return d.id === id;
  });
  if (!found) return;
  network = found;
  updateURL();
  changeNetwork();
}

function onMethodSelectChange() {
  method = methodSelector.property("selectedIndex");
  console.log("new method selected: " + method);
  updateURL();
  render();
}

function changeNetwork() {
  mapLoading.style("display", "block");
  Promise.all([
    d3.json(CITYBIKES_API + "/" + encodeURIComponent(network.id)),
    mapReady,
  ]).then(function (results) {
    var res = results[0];
    console.log(res.network.name + " station data loaded");

    mapLoading.style("display", "none");
    currentStations = res.network.stations;

    currentStations.forEach(function (d) {
      d.slots = d.free_bikes + d.empty_slots;
      d.bikeAvailability = d.slots > 0 ? d.free_bikes / d.slots : null;
      d.slotAvailability = d.slots > 0 ? d.empty_slots / d.slots : null;
      d.opening = isOpened(d) ? 1 : 0;
      d.bonus = isBonus(d) ? 1 : 0;
      d.banking = isBanking(d) ? 1 : 0;
    });

    computeCells(currentStations);
    applyMethodParam();
    render();

    console.log("zooming on " + network.location.city);
    map.jumpTo({
      center: [network.location.longitude, network.location.latitude],
      zoom: 14,
    });
  });
}

function isOpened(d) {
  return (
    !!d.extra &&
    typeof d.extra.status === "string" &&
    d.extra.status.toLowerCase().startsWith("o")
  ); // "Operative" pour velib', "OPEN" pour bicloo ou velov
}

function isBonus(d) {
  return !!d.extra && !!d.extra.bonus;
}

function isBanking(d) {
  return !!d.extra && !!d.extra.banking;
}

// Voronoi diagram computed once per network in Web Mercator space, so that
// cell edges stay straight on the map, then converted back to lng/lat.
// Coordinates are scaled to zoom-20 pixels because d3-delaunay clips with a
// fixed epsilon that is too coarse for Mercator units in [0, 1].
var MERCATOR_SCALE = 256 * Math.pow(2, 20);

function computeCells(stations) {
  var points = stations.map(function (d) {
    var m = MercatorCoordinate.fromLngLat([d.longitude, d.latitude]);
    return [m.x * MERCATOR_SCALE, m.y * MERCATOR_SCALE];
  });
  if (points.length === 0) return;

  var x0 = d3.min(points, function (p) {
      return p[0];
    }),
    x1 = d3.max(points, function (p) {
      return p[0];
    }),
    y0 = d3.min(points, function (p) {
      return p[1];
    }),
    y1 = d3.max(points, function (p) {
      return p[1];
    }),
    pad = Math.max(x1 - x0, y1 - y0, 1000) * 0.5;

  var voronoi = d3.Delaunay.from(points).voronoi([
    x0 - pad,
    y0 - pad,
    x1 + pad,
    y1 + pad,
  ]);

  stations.forEach(function (d, i) {
    var polygon = voronoi.cellPolygon(i); // null for duplicated points
    d.cell =
      polygon &&
      polygon.map(function (p) {
        return new MercatorCoordinate(
          p[0] / MERCATOR_SCALE,
          p[1] / MERCATOR_SCALE,
          0,
        )
          .toLngLat()
          .toArray();
      });
  });
}

function render() {
  if (!network) return;
  console.log("render");

  var value = METHODS[method];

  var cells = [],
    points = [];
  currentStations.forEach(function (d, i) {
    var v = value(d);
    var properties = {
      name: d.name,
      free_bikes: d.free_bikes,
      empty_slots: d.empty_slots,
      bonus: d.bonus,
    };
    points.push({
      type: "Feature",
      id: i,
      properties: Object.assign({ color: v > 0 ? "green" : "red" }, properties),
      geometry: { type: "Point", coordinates: [d.longitude, d.latitude] },
    });
    if (d.cell) {
      cells.push({
        type: "Feature",
        id: i,
        properties: Object.assign(
          { color: v === null ? NO_DATA_COLOR : colorScale(v) },
          properties,
        ),
        geometry: { type: "Polygon", coordinates: [d.cell] },
      });
    }
  });

  map
    .getSource("cells")
    .setData({ type: "FeatureCollection", features: cells });
  map
    .getSource("stations")
    .setData({ type: "FeatureCollection", features: points });
}

// station tooltip
map.on("mousemove", "cells", function (e) {
  var p = e.features[0].properties;
  map.getCanvas().style.cursor = "pointer";
  stationTooltip
    .interrupt()
    .style("opacity", 0.9)
    .style("left", e.originalEvent.pageX + "px")
    .style("top", e.originalEvent.pageY - 28 + "px");
  stationTooltipName.text(p.name);
  stationTooltipBikeNumber.text(p.free_bikes);
  stationTooltipSlotNumber.text(p.empty_slots);
  stationTooltipBonus.text(p.bonus ? "(bonus)" : "");
});

map.on("mouseleave", "cells", function () {
  map.getCanvas().style.cursor = "";
  stationTooltip.transition().duration(500).style("opacity", 0);
});
