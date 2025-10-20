// src/components/DriverDashboard.jsx
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
  faPlus as fasPlus,
} from "@fortawesome/free-solid-svg-icons";
import { useRides } from "../context/RideContext.jsx";

const containerStyle = { width: "100%", height: "400px" };
const defaultCenter = { lat: 39.7107, lng: -75.121 }; // Rowan University

// Detects when Google Maps API is ready
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

function DriverDashboard({ user, signedIn, navigate, setRole }) {
  const mapInstance = useRef(null);
  const mapRef = useRef(null);
  const directionsRenderer = useRef(null);

  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [seats, setSeats] = useState(1);
  const [ridesOffered, setRidesOffered] = useState([]);
  const [activeInput, setActiveInput] = useState(null);
  const [distanceInfo, setDistanceInfo] = useState("");
  const [totalCost, setTotalCost] = useState(null);

  const { rideRequests, updateRideRequest } = useRides();
  const isMapsLoaded = useGoogleMapsLoaded();

  // Google Places Autocomplete
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

  // Initialize Google Map
  useEffect(() => {
    if (!isMapsLoaded || !mapRef.current) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 14,
    });
    mapInstance.current = map;

    const directionsDisplay = new window.google.maps.DirectionsRenderer();
    directionsDisplay.setMap(map);
    directionsRenderer.current = directionsDisplay;
  }, [isMapsLoaded]);

  // Handle input and selection
  const handleInput = (e, field) => {
    const val = e.target.value;
    if (field === "pickup") setPickup(val);
    if (field === "dropoff") setDropoff(val);
    setValue(val);
    setActiveInput(field);
  };

  const handleSelect = (desc, field) => {
    setValue(desc, false);
    clearSuggestions();
    if (field === "pickup") setPickup(desc);
    if (field === "dropoff") setDropoff(desc);
    setActiveInput(null);
  };

  const handleBlur = () => setTimeout(() => setActiveInput(null), 150);

  // Calculate route and distance/cost
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
            setTotalCost(miles * 1); // $1 per mile
          }
        }
      }
    );
  }, [pickup, dropoff]);

  // Offer a ride
  const handleOfferRide = () => {
    if (!pickup || !dropoff || !date || !time) {
      alert("Please complete all fields before offering a ride.");
      return;
    }

    const newRide = {
      id: ridesOffered.length + 1,
      pickup,
      destination: dropoff,
      date,
      time,
      status: "Pending",
      seatsAvailable: seats,
    };

    setRidesOffered([...ridesOffered, newRide]);
    setPickup("");
    setDropoff("");
    setDate("");
    setTime("");
    setSeats(1);
    setDistanceInfo("");
    setTotalCost(null);
  };

  const iconStyle = { color: "#050505" };

  return (
    <div className="rider-dashboard-content">
      {/* Sidebar */}
      <aside className="sidebar">
        <nav className="nav-menu">
          <ul>
            <li className="active">
              <FontAwesomeIcon icon={farHouse} style={iconStyle} /> Home
            </li>
            <li>
              <FontAwesomeIcon icon={fasHistory} style={iconStyle} /> History
            </li>
            <li>
              <FontAwesomeIcon icon={farCalendarDays} style={iconStyle} /> Schedule
            </li>
            <li>
              <FontAwesomeIcon icon={farMessage} style={iconStyle} /> Message
            </li>
            <li>
              <FontAwesomeIcon icon={fasCircleQuestion} style={iconStyle} /> Help
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="title-area">
            <h2>Offer a Ride</h2>
          </div>
        </header>

        <div className="request-section">
          {/* Left Form Section */}
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
                                new window.google.maps.Marker({
                                  position: latLng,
                                  map: mapInstance.current,
                                  title: "Your Location",
                                });
                                mapInstance.current.setCenter(latLng);
                                mapInstance.current.setZoom(15);
                              }
                            });
                          });
                        } else alert("Geolocation not supported.");
                      }}
                    />
                  </div>
                  {activeInput === "pickup" && status === "OK" && (
                    <div className="autocomplete-dropdown">
                      {data.map(({ place_id, description }) => (
                        <div key={place_id} onClick={() => handleSelect(description, "pickup")}>
                          {description}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <label>Drop-off Location</label>
                <div className="autocomplete-wrapper" onBlur={handleBlur}>
                  <input
                    value={dropoff}
                    onChange={(e) => handleInput(e, "dropoff")}
                    onFocus={(e) => handleInput(e, "dropoff")}
                    placeholder="Ex: Philadelphia Airport"
                  />
                  {activeInput === "dropoff" && status === "OK" && (
                    <div className="autocomplete-dropdown">
                      {data.map(({ place_id, description }) => (
                        <div key={place_id} onClick={() => handleSelect(description, "dropoff")}>
                          {description}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            <label>Departure Date & Time</label>
            <div className="datetime-input-wrapper">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>

            <label>Seats Available</label>
            <input
              type="number"
              min="1"
              max="6"
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              className="seats-input"
            />

            {pickup && dropoff && (
              <div className="ride-estimate">
                <p>Distance: {distanceInfo.split("(")[0] || "—"}</p>
                <p className="cost">Est. Cost: ${totalCost?.toFixed(2) || "—"}</p>
              </div>
            )}

            <button className="new-offer-button" onClick={handleOfferRide}>
              <FontAwesomeIcon icon={fasPlus} /> Offer Ride
            </button>
          </div>

          {/* Map Section */}
          <div className="map-area">
            {isMapsLoaded && <div ref={mapRef} style={containerStyle}></div>}
          </div>
        </div>

        {/* Rides Offered Table */}
        {ridesOffered.length > 0 && (
          <div className="rides-list">
            <h3>Your Offered Rides</h3>
            <table className="rides-offered-table">
              <thead>
                <tr>
                  <th>Pickup</th>
                  <th>Destination</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Seats</th>
                </tr>
              </thead>
              <tbody>
                {ridesOffered.map((ride) => (
                  <tr key={ride.id}>
                    <td>{ride.pickup}</td>
                    <td>{ride.destination}</td>
                    <td>{ride.date}</td>
                    <td>{ride.time}</td>
                    <td>{ride.status}</td>
                    <td>{ride.seatsAvailable}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Incoming Ride Requests */}
        {rideRequests.length > 0 && (
          <div className="rides-list">
            <h3>Incoming Ride Requests</h3>
            <table className="rides-requested-table">
              <thead>
                <tr>
                  <th>Pickup</th>
                  <th>Drop-off</th>
                  <th>Passengers</th>
                  <th>Departure</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rideRequests.map((ride) => (
                  <tr key={ride.id}>
                    <td>{ride.pickup}</td>
                    <td>{ride.dropoff}</td>
                    <td>{ride.passengers}</td>
                    <td>{ride.datetime}</td>
                    <td>{ride.status}</td>
                    <td>
                      {ride.status === "pending" && (
                        <>
                          <button
                            onClick={() =>
                              updateRideRequest(ride.id, { status: "accepted" })
                            }
                          >
                            Accept
                          </button>
                          <button
                            onClick={() =>
                              updateRideRequest(ride.id, { status: "declined" })
                            }
                          >
                            Decline
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default DriverDashboard;