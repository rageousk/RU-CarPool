import React, { useState, useRef, useEffect } from "react";
import usePlacesAutocomplete from "use-places-autocomplete";
import "../css/UserDashboard.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse as farHouse,
  faCalendarDays as farCalendarDays,
  faMessage as farMessage,
} from "@fortawesome/free-regular-svg-icons";
import {
  faClockRotateLeft as fasHistory,
  faCircleQuestion as fasCircleQuestion,
  faLocationArrow as fasLocationArrow,
} from "@fortawesome/free-solid-svg-icons";

import { useRides } from "../context/RideContext.jsx";

const containerStyle = { width: "100%", height: "100%" };
const defaultCenter = { lat: 39.7107, lng: -75.121 };

const useGoogleMapsLoaded = () => {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      if (
        window.google &&
        window.google.maps &&
        window.google.maps.places &&
        window.google.maps.DirectionsService
      ) {
        setLoaded(true);
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);
  return loaded;
};

function RiderDashboard({ user, signedIn, navigate, setRole }) {
  const mapInstance = useRef(null);
  const mapRef = useRef(null);
  const directionsRenderer = useRef(null);
  const currentLocationMarker = useRef(null);

  const [pickup, setPickup] = useState("");
  const [pickupInfo, setPickupInfo] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [activeInput, setActiveInput] = useState(null);
  const [distanceInfo, setDistanceInfo] = useState("");
  const [totalCost, setTotalCost] = useState(null);
  const [passengers, setPassengers] = useState(1);
  const [datetime, setDatetime] = useState("");

  const { addRideRequest, rideRequests } = useRides();

  const isMapsLoaded = useGoogleMapsLoaded();

  const {
    ready,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    debounce: 300,
    enabled: isMapsLoaded,
    requestOptions: { componentRestrictions: { country: "us" } },
    types: ["cities"],
  });

  useEffect(() => {
    if (!isMapsLoaded || !mapRef.current) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 14,
      restriction: {
        latLngBounds: {
          north: 49.384358,
          south: 24.396308,
          west: -125.0,
          east: -66.93457,
        },
        strictBounds: false,
      },
    });

    mapInstance.current = map;

    const directionsDisplay = new window.google.maps.DirectionsRenderer();
    directionsDisplay.setMap(map);
    directionsRenderer.current = directionsDisplay;
  }, [isMapsLoaded]);

  const handleInput = (e, field) => {
    const val = e.target.value;
    if (field === "pickup" && currentLocationMarker.current) {
      currentLocationMarker.current.setMap(null);
      currentLocationMarker.current = null;
    }
    if (field === "pickup") setPickup(val);
    if (field === "dropoff") setDropoff(val);
    setValue(val);
    setActiveInput(field);
  };

  const handleSelect = (desc, field) => {
    setValue(desc, false);
    clearSuggestions();
    if (field === "pickup" && currentLocationMarker.current) {
      currentLocationMarker.current.setMap(null);
      currentLocationMarker.current = null;
    }
    if (field === "pickup") setPickup(desc);
    if (field === "dropoff") setDropoff(desc);
    setActiveInput(null);
  };

  const handleBlur = () => setTimeout(() => setActiveInput(null), 150);

  useEffect(() => {
    if (!pickup || !dropoff || !mapInstance.current) return;

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: pickup,
        destination: dropoff,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK") directionsRenderer.current.setDirections(result);
      }
    );

    const distanceService = new window.google.maps.DistanceMatrixService();
    distanceService.getDistanceMatrix(
      {
        origins: [pickup],
        destinations: [dropoff],
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem: window.google.maps.UnitSystem.IMPERIAL,
      },
      (response, status) => {
        if (status === "OK") {
          const element = response.rows[0].elements[0];
          if (element.status === "OK") {
            const miles = parseFloat(element.distance.text.replace(" mi", ""));
            setDistanceInfo(`${element.distance.text} (${element.duration.text})`);
            setTotalCost(miles * 1);
          }
        }
      }
    );
  }, [pickup, dropoff]);

  const handleRequestRide = () => {
    if (!pickup || !dropoff) return alert("Please fill in pick-up and drop-off locations");
    const newRide = {
      id: Date.now(),
      pickup,
      dropoff,
      pickupInfo,
      passengers,
      datetime,
      status: "pending", // driver status: pending, accepted, declined
      driverOffer: null,
    };
    addRideRequest(newRide);
    setPickup(""); setDropoff(""); setPickupInfo(""); setPassengers(1); setDatetime(""); setDistanceInfo(""); setTotalCost(null);
  };

  const iconStyle = { color: "#050505" };

  return (
    <div className="rider-dashboard-content">
      <aside className="sidebar">
        <nav className="nav-menu">
          <ul>
            <li className="active"><FontAwesomeIcon icon={farHouse} style={iconStyle} /> Home</li>
            <li><FontAwesomeIcon icon={fasHistory} style={iconStyle} /> History</li>
            <li><FontAwesomeIcon icon={farCalendarDays} style={iconStyle} /> Schedule</li>
            <li><FontAwesomeIcon icon={farMessage} style={iconStyle} /> Message</li>
            <li><FontAwesomeIcon icon={fasCircleQuestion} style={iconStyle} /> Help</li>
          </ul>
        </nav>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="title-area"><h2>Request Carpool</h2></div>
        </header>

        <div className="request-section">
          <div className="form-area">
            {isMapsLoaded && (
              <>
                <label>Pick-up Location</label>
                <div className="autocomplete-wrapper" onBlur={handleBlur}>
                  <div className="input-with-icon">
                    <input
                      value={pickup}
                      onChange={(e) => handleInput(e, "pickup")}
                      onFocus={(e) => handleInput(e, "pickup")}
                      placeholder="Ex: Rowan University"
                    />
                    <FontAwesomeIcon
                      icon={fasLocationArrow}
                      className="location-icon"
                      onClick={() => {
                        if (navigator.geolocation && mapInstance.current) {
                          navigator.geolocation.getCurrentPosition((position) => {
                            const { latitude, longitude } = position.coords;
                            const latLng = { lat: latitude, lng: longitude };
                            const geocoder = new window.google.maps.Geocoder();
                            geocoder.geocode({ location: latLng }, (results) => {
                              if (results[0]) {
                                setPickup(results[0].formatted_address);
                                if (currentLocationMarker.current) currentLocationMarker.current.setMap(null);
                                currentLocationMarker.current = new window.google.maps.Marker({
                                  position: latLng,
                                  map: mapInstance.current,
                                  title: "Your Location",
                                });
                                mapInstance.current.setCenter(latLng);
                                mapInstance.current.setZoom(15);
                              }
                            });
                          });
                        } else alert("Geolocation not supported by your browser.");
                      }}
                    />
                  </div>
                  {activeInput === "pickup" && status === "OK" && (
                    <div className="autocomplete-dropdown">
                      {data.map(({ place_id, description }) => (
                        <div key={place_id} onClick={() => handleSelect(description, "pickup")}>{description}</div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pickup-info-wrapper">
                  <span className="pickup-info-text">Pick-up Info:</span>
                  <input
                    type="text"
                    value={pickupInfo}
                    onChange={(e) => setPickupInfo(e.target.value)}
                    className="pickup-info-input"
                    placeholder="Ex: Left side of Business Hall"
                  />
                </div>

                <label>Drop-off Location</label>
                <div className="autocomplete-wrapper" onBlur={handleBlur}>
                  <input
                    value={dropoff}
                    onChange={(e) => handleInput(e, "dropoff")}
                    onFocus={(e) => handleInput(e, "dropoff")}
                    placeholder="Philadelphia Airport"
                  />
                  {activeInput === "dropoff" && status === "OK" && (
                    <div className="autocomplete-dropdown">
                      {data.map(({ place_id, description }) => (
                        <div key={place_id} onClick={() => handleSelect(description, "dropoff")}>{description}</div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="passenger-date-row">
                  <div className="passenger-selector">
                    <label>No. of passengers</label>
                    <div className="passenger-controls">
                      <button onClick={() => setPassengers((p) => Math.max(1, p - 1))} disabled={passengers <= 1}>−</button>
                      <span>{passengers}</span>
                      <button onClick={() => setPassengers((p) => Math.min(3, p + 1))} disabled={passengers >= 3}>+</button>
                    </div>
                  </div>
                  <div className="datetime-input-wrapper">
                    <label>Departure Date & Time</label>
                    <input type="datetime-local" value={datetime} onChange={(e) => setDatetime(e.target.value)} />
                  </div>
                </div>

                <button className="request-ride-btn" onClick={handleRequestRide}>Request Ride</button>
              </>
            )}

            {pickup && dropoff && distanceInfo && (
              <div className="ride-estimate">
                <p>Trip miles: {distanceInfo.split("(")[0] || "25 miles"}</p>
                <p className="cost">Cost: ${totalCost?.toFixed(2) || "25"}</p>
              </div>
            )}
          </div>

          <div className="map-area">
            {isMapsLoaded && <div ref={mapRef} style={containerStyle}></div>}
          </div>
        </div>
      </main>
    </div>
  );
}

export default RiderDashboard;