var map;
var markers = [];
var directionsDisplay;
var directionsService;

var start; // start place
var end; // end place (optional)
var waypoint = []; // array for holding places objects of each travel stopping point (between start and stop)

var MAX_WAYPOINTS = 25;

document.getElementById("loc2").placeholder =
  "Enter up to " + MAX_WAYPOINTS + " waypoints";

//called after the google maps api is loaded
function initMap() {
  //create map object
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 37.09024, lng: -100.712891 }, //initially centered in the middle of the US, quickly replaced with current location
    zoom: 4,
    //        mapTypeId: google.maps.MapTypeId.ROADMAP
  });

  const trafficLayer = new google.maps.TrafficLayer();
  trafficLayer.setMap(map);

  // attempt to get user location with W3C Geolocation (Preferred). see: tinyurl.com/gmproj3
  var initialLocation;
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function (position) {
      initialLocation = new google.maps.LatLng(
        position.coords.latitude,
        position.coords.longitude
      );
      map.setCenter(initialLocation);
      map.setZoom(11);
    });
  }

  //DIRECTIONS based on directions-panel.html from tinyurl.com/gmproj2
  //automatically updated when a new route is set
  directionsService = new google.maps.DirectionsService();
  directionsDisplay = new google.maps.DirectionsRenderer();
  directionsDisplay.setMap(map);
  directionsDisplay.setPanel(document.getElementById("directionsPanel"));

  // Create the searchBoxes and link them to the UI element. from: tinyurl.com/gmproj1
  var searchBox0 = new google.maps.places.SearchBox(
    document.getElementById("loc1")
  );
  var searchBox1 = new google.maps.places.SearchBox(
    document.getElementById("loc2")
  );
  var searchBox2 = new google.maps.places.SearchBox(
    document.getElementById("loc3")
  );

  // Bias the SearchBox results towards current map's viewport.
  map.addListener("bounds_changed", function () {
    searchBox0.setBounds(map.getBounds());
    searchBox1.setBounds(map.getBounds());
    searchBox2.setBounds(map.getBounds());
  });

  //if searchBox0 is used
  searchBox0.addListener("places_changed", function () {
    document.getElementById("loc1").value = ""; //clear searchbox
    addPoint(searchBox0.getPlaces()[0], "start");
  });

  //if searchBox1 is used
  searchBox1.addListener("places_changed", function () {
    document.getElementById("loc2").value = "";
    addPoint(searchBox1.getPlaces()[0], "waypoint");
  });

  //if searchBox2 is used
  searchBox2.addListener("places_changed", function () {
    addPoint(searchBox2.getPlaces()[0], "end");
  });
  toggleSearchBoxes(true);

  // now that google APIs are loaded:
  //const placesService = new google.maps.places.PlacesService(map);
  const geocoder = new google.maps.Geocoder();
  loadFromUrl(geocoder);
}

function calcRoute(routeStart) {
  updateUrl(); // update URL (because start/end/waypoint state just changed)

  if (typeof start == "undefined" || typeof waypoint[0] == "undefined") {
    var pan = document.getElementById("directionsPanel");
    if ((" " + pan.className + " ").indexOf(" disabled ") == -1) {
      pan.className += " disabled";
      document.getElementById("ham").src = "images/grey-hamburger.png";
    }

    directionsDisplay.setMap(null); //in case the map was previously drawn
    for (var i = 0; i < markers.length; i++)
      if (typeof markers[i] != "undefined") markers[i].setMap(map); //redraw the points that were previously turned off
    return; //don't calculate route if all needed points aren't set
  }

  directionsDisplay.setMap(map);
  const actualWaypoints = waypoint.map((w) => ({
    location: w.geometry.location, //latlng object
    stopover: true,
  }));

  const request = {
    origin: start.geometry.location, //latlng object
    destination: end ? end.geometry.location : start.geometry.location, // if no end, use start as destination
    waypoints: actualWaypoints,
    optimizeWaypoints: true, ///VERY IMPORTANT!!! WOW example: tinyurl.com/gmproj6
    travelMode: google.maps.TravelMode.DRIVING,
  };

  directionsService.route(request, function (result, status) {
    if (status == google.maps.DirectionsStatus.OK) {
      clearMarkers();
      directionsDisplay.setDirections(result);

      const route = result.routes[0];
      let totalDistance = 0;
      let totalDuration = 0;

      // Calculate distance and duration
      const legs = route.legs;
      for (let i = 0; i < legs.length; i++) {
        // Only count the legs if end is defined, else skip the last leg
        if (end || i < legs.length - 1) {
          totalDistance += legs[i].distance.value; // in meters
          totalDuration += legs[i].duration.value; // in seconds
        }
      }

      totalDistance /= 1000; // Convert to kilometers
      totalDuration /= 60; // Convert to minutes

      // Display total distance and duration
      document.getElementById(
        "totalInfo"
      ).innerHTML = `Total Distance: ${totalDistance.toFixed(
        2
      )} km, Total Duration: ${totalDuration.toFixed(2)} minutes`;
    }
  });

  var pan = document.getElementById("directionsPanel");
  if ((" " + pan.className + " ").indexOf(" disabled ") != -1) {
    pan.className = ""; //make panel visible
    document.getElementById("ham").src = "images/hamburger.png";
  }
}

function setMarker(n, plc) {
  //sets markers[n] to the latlng object loc, creates a new marker if it doesn't exist

  if (n == 0) var link = "http://www.googlemapsmarkers.com/v1/00FF00";
  if (n == 1) var link = "http://www.googlemapsmarkers.com/v1/FF0000";
  if (n > 1) var link = "http://www.googlemapsmarkers.com/v1/FFA500";

  if (typeof markers[n] == "undefined") {
    //if it doesn't exist
    markers[n] = new google.maps.Marker({
      //create new marker
      position: plc.geometry.location, //a latlng object
      map: map,
      //            label: n.toString(),
      animation: google.maps.Animation.DROP,
      icon: link,
      title: n.toString(),
      draggable: false, //make true later if the loc is retrieved from the marker
    });
  } else {
    markers[n].setPosition(plc.geometry.location);
  }
}

function clearMarkers() {
  for (var i = 0; i < markers.length; i++)
    if (typeof markers[i] != "undefined") markers[i].setMap(null); //turn markers off but don't delete in case directionsDisplay is turned off
  // console.log("***markers cleared");
}

/**
 * disable or enable all searchboxes.
 */
function toggleSearchBoxes(enabled) {
  document.getElementById("loc1").disabled = !enabled;
  document.getElementById("loc2").disabled = !enabled;
  document.getElementById("loc3").disabled = !enabled;
  if (enabled) {
    document.getElementById("loading-info").className = "hidden";
  } else {
    document.getElementById("loading-info").className = "";
  }
}

/**
 * replace waypoints, start, stop using data in URL
 * TODO: set a window.onpopstate listener as well to call this?
 */
async function loadFromUrl(geocoder) {
  console.log("loading from url");
  toggleSearchBoxes(false); // disable searchboxes
  const queryParams = new URLSearchParams(window.location.search);
  let request;

  const startPlaceId = queryParams.get("start");
  const endPlaceId = queryParams.get("end");
  const waypointIds = queryParams.get("waypoint")
    ? queryParams.get("waypoint").split(",")
    : [];
  console.log("waypointIds = ");
  console.log(waypointIds);

  let promises = [];

  if (startPlaceId) {
    promises.push(
      expandPlaceId(geocoder, startPlaceId, (place) => {
        addPoint(place, "start", false);
      })
    );
  }
  if (endPlaceId) {
    promises.push(
      expandPlaceId(geocoder, endPlaceId, (place) => {
        addPoint(place, "end", false);
      })
    );
  }

  for (const waypointId of waypointIds) {
    promises.push(
      expandPlaceId(geocoder, waypointId, (place) => {
        addPoint(place, "waypoint", false);
      })
    );
  }

  console.log(`waiting for ${promises.length} promises...`);
  await Promise.all(promises);
  if (promises.length > 0) {
    console.log("recalculating route");
    calcRoute();
  }

  toggleSearchBoxes(true); // enable searchboxes
}

/**
 * given a google placeId, convert it to a place object and pass it to the provided callback.
 * returns a promise.
 * based on https://developers.google.com/maps/documentation/javascript/examples/geocoding-place-id#maps_geocoding_place_id-javascript
 *   and https://developers.google.com/maps/documentation/javascript/geocoding
 */
function expandPlaceId(geocoder, placeId, callback) {
  return geocoder
    .geocode({ placeId: placeId })
    .then(({ results }) => {
      if (!results[0]) {
        console.warn(`unable to find result for place_id '${placeId}'`);
        return;
      }
      const res = results[0]; //should have fields res.geometry.location and res.formatted_address;
      callback(res);
    })
    .catch((e) => console.error("Geocoder failed due to: " + e));

  // note that the result won't have the 'name' field
  // we could lookup the 'name' for this place with an additional API call, but not sure its worth it:
  // or we could store the lat/lng in the URL instead so we can just query the places API below (skipping the geocode step)
  /*
    // https://developers.google.com/maps/documentation/javascript/reference/places-service#PlacesService.findPlaceFromQuery
    request = { query: queryParams.get('start'), fields: ['geometry.location', 'name', 'formatted_address'] };
    placesService.findPlaceFromQuery(request, function(result, status) {
        console.log('result = '); console.log(result);
        console.log('status='); console.log(status);
    });
    */
}

/**
 * update URL to store waypoints/start/stop locations.
 */
function updateUrl() {
  console.log("updating url");
  let params = { waypoint: waypoint.map((p) => p.place_id) };
  if (start) params.start = start.place_id;
  if (end) params.end = end.place_id;

  params = new URLSearchParams(params);
  window.history.pushState({}, "", `${window.location.pathname}?${params}`);
}

/**
 * add a place as the start, end, or a waypoint on the route.
 *
 * @param place the place to be added
 * @param pointType (str) 'start' | 'end' | 'waypoint'
 * @param computeDirections (bool) whether to call calcRoute() after adding the point (default true)
 */

async function fetchWeather(location) {
  const apiKey = "YOUR API KEY";
  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric`
  );
  const data = await response.json();
  return data;
}

async function addPoint(place, pointType, computeDirections = true) {
  if (exists(place, false)) return; // prevent adding a duplicate place
  const placeName = place["name"] || place["formatted_address"];

  if (pointType === "start") {
    start = place; //add the first place from the search
    setMarker(0, start);
    document.getElementById("startInfo").innerHTML = "<br>" + placeName;
    document.getElementById("startInfo").title = start["formatted_address"];
    calcRoute();
  } else if (pointType === "end") {
    end = place;
    document.getElementById("loc3").value = "";
    setMarker(1, end);
    document.getElementById("endInfo").innerHTML =
      "<br>" +
      placeName +
      "<a href='javascript:void(0)' onclick='deleteEndpoint()'><img src='images/delete.png' height='10' hspace='10'></a>";
    document.getElementById("endInfo").title = end["formatted_address"];
    calcRoute();
  } else if (pointType === "waypoint") {
    if (waypoint.length >= MAX_WAYPOINTS) {
      alert(
        "Only " +
          MAX_WAYPOINTS +
          " waypoints are allowed. Please remove a waypoint before adding a new one."
      );
      return;
    }
    waypoint.push(place);
    const i = waypoint.length - 1;
    setMarker(i + 2, waypoint[i]);

    const cityName = place.address_components.find(
      (component) =>
        component.types.includes("locality") ||
        component.types.includes("administrative_area_level_1")
    ).long_name;
    console.log("cityName = " + cityName);

    const englishCityName = await translateToEnglish(
      cityName.replace(/City/i, "").trim()
    );
    console.log("Tên thành phố tiếng Anh = " + englishCityName);

    const finalCityName = englishCityName
      .replace(/City/i, "")
      .replace(/city/i, "")
      .trim();
    console.log("Tên thành phố đã làm sạch = " + finalCityName);

    const weatherData = await fetchWeather(encodeURIComponent(finalCityName));
    let weatherDescription = weatherData.weather[0].description;

    // Translate weather description to Vietnamese
    const translatedWeatherDescription = await translateToVietnamese(
      weatherDescription
    );

    const weatherInfo = weatherData.main
      ? `Nhiệt độ: ${weatherData.main.temp}°C, Thời tiết: ${translatedWeatherDescription}`
      : "Không có thông tin thời tiết";

    document.getElementById("waypointsInfo").innerHTML += `<li id='point${i}'>${
      i + 1
    }. ${placeName} <span style="font-size: small;">(${weatherInfo})</span>
                <a href='javascript:void(0)' onclick='deletePoint(this)'><img src='images/delete.png' height='10' hspace='10'></a>
                <a href='javascript:void(0)'>`;
    calcRoute();
  } else {
    console.error(`invalid pointType '${pointType}' for addPoint()`);
    return;
  }

  if (computeDirections) {
    calcRoute();
  }
}

// Function to translate text to English
async function translateToEnglish(text) {
  const apiKey = "YOUR API KEY";
  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: text,
        source: "vi",
        target: "en",
        format: "text",
      }),
    }
  );
  const data = await response.json();
  return data.data.translations[0].translatedText;
}

// Function to translate text to Vietnamese
async function translateToVietnamese(text) {
  const apiKey = "YOUR API KEY";
  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: text,
        source: "en",
        target: "vi",
        format: "text",
      }),
    }
  );
  const data = await response.json();
  return data.data.translations[0].translatedText;
}

function deletePoint(elem) {
  //tinyurl.com/gmproj8
  elem = elem.parentNode; //a ul element with id="pointn" where n is sum number. elem started as the <a> element that was clicked
  var i = parseInt(elem.id.substring(5));

  waypoint.splice(i, 1); //location i, remove 1 element
  markers[i + 2].setMap(null);
  markers.splice(i + 2, 1); //i is offset by 2 bc start and end are in front

  elem.parentNode.removeChild(document.getElementById("point" + i)); //delete element

  for (var t = i + 1; document.getElementById("point" + t) != null; t++) {
    //fix ids of the others
    document.getElementById("point" + t).id = "point" + (t - 1);
  }

  //    console.log("***removed waypoint[" + i + "]");
  //    console.log("waypoint=" + waypoint);
  calcRoute();
}

function deleteEndpoint() {
  end = undefined;
  if (markers[1]) {
    markers[1].setMap(null);
    markers.splice(1, 1);
  }
  document.getElementById("endInfo").innerHTML = "";
  calcRoute();
}

function printLocations() {
  console.log("Printing geometry.location of all locations");
  if (typeof start != "undefined")
    console.log("start=" + start.geometry.location);
  else console.log("start=UNDEFINED");
  if (typeof end != "undefined") console.log("end=" + end.geometry.location);
  else console.log("end=UNDEFINED");

  console.log("waypoint.length=" + waypoint.length);
  for (var i = 0; i < waypoint.length; i++)
    console.log(
      "waypoint[" + i + "].geometry.location=" + waypoint[i].geometry.location
    );
}

/**
 * check if a place is already in use (as a start/end spot or waypoint) to prevent duplicates.
 * @param plc: place
 * @param isEndpoint: boolean indicator if this place will be the start or stop.
 */
function exists(plc, isEndpoint) {
  for (var i = 0; i < waypoint.length; i++) {
    //loop through waypoints
    if (waypoint[i]["formatted_address"] == plc["formatted_address"]) {
      alert(
        "Address:\n" +
          "'" +
          waypoint[i]["formatted_address"] +
          "'\nis already a waypoint!\n"
      );
      return true;
    }
  }

  //check that the potential waypoint isn't the same as the start or end
  if (
    !isEndpoint &&
    ((typeof start != "undefined" &&
      start["formatted_address"] == plc["formatted_address"]) ||
      (typeof end != "undefined" &&
        end["formatted_address"] == plc["formatted_address"]))
  ) {
    alert(
      "Address:\n" +
        "'" +
        plc["formatted_address"] +
        "'\nis your start or end point!\n"
    );
    return true;
  }
  return false; //working :D!
}

//:::JQUERY:::
$(document).ready(function () {
  console.log("jquery ready");
  $("#ham").click(function () {
    var panel = $("#directionsPanel");
    console.log("ham button click");

    if (!panel.hasClass("disabled")) {
      //if not disabled
      panel.toggleClass("hidden");
    }

    //        $("#directionsPanel").animate({
    //            left: '0px'
    //        }, 200);
  });
});
