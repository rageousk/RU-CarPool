import React, { useState, useRef, useEffect } from "react";
import usePlacesAutocomplete from "use-places-autocomplete";
import "../css/UserDashboard.css"; // Reuse UserDashboard CSS
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse as farHouse,
  faCalendarDays as farCalendarDays,
  faMessage as farMessage,
  faClockRotateLeft as fasHistory,
  faCircleQuestion as fasCircleQuestion,
  faLocationArrow as fasLocationArrow,
  faCar as fasCar, 
  faMagnifyingGlass as fasSearch, 
  faPlus as fasPlus 
} from "@fortawesome/free-solid-svg-icons";
import RiderCurrentRide from "./RiderCurrentRide.jsx";
import RiderRideHistory from "./RiderRideHistory.jsx";
import { useRides } from "../context/RideContext.jsx"; // Assuming context exists
import { GoogleMap, DirectionsRenderer, Marker } from "@react-google-maps/api";

// --- Constants ---
const containerStyle = { width: "100%", height: "100%" };
const defaultCenter = { lat: 39.7107, lng: -75.121 }; // Rowan University
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5050";

// Pricing function based on number of passengers
const calculatePricePerMile = (passengers) => {
  switch (passengers) {
    case 1: return 1.00;
    case 2: return 1.50;
    case 3: return 2.00;
    default: return 1.00; // Default to 1 passenger rate
  }
};

// --- Hook to check if Google Maps API is loaded ---
const useGoogleMapsLoaded = () => {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      // Check for necessary Google Maps objects
      if (
        window.google &&
        window.google.maps &&
        window.google.maps.places && // For Autocomplete
        window.google.maps.DirectionsService && // For routes
        window.google.maps.DistanceMatrixService && // For distance/time
        window.google.maps.Geocoder // For reverse geocoding
      ) {
        setLoaded(true);
        clearInterval(interval); // Stop checking once loaded
      }
    }, 100); // Check every 100ms
    return () => clearInterval(interval); // Cleanup on component unmount
  }, []);
  return loaded;
};

// --- Main RiderDashboard Component ---
function RiderDashboard({ user }) { // Assuming 'user' prop has user info (like user.id)
  // Form State
  const [pickup, setPickup] = useState("");
  const [pickupInfo, setPickupInfo] = useState(""); // Specific pickup instructions
  const [dropoff, setDropoff] = useState("");
  const [passengers, setPassengers] = useState(1); // Default 1, max 3
  const [datetime, setDatetime] = useState(""); // Combined date & time input
  const [activeInput, setActiveInput] = useState(null); // Tracks 'pickup' or 'dropoff' focus
  const [isGettingLocation, setIsGettingLocation] = useState(false); // Loading state for location button

  // Map & Calculation State
  const [mapCenter, setMapCenter] = useState(defaultCenter); // Current center of the map
  const [userMarkerPosition, setUserMarkerPosition] = useState(null); // Position for 'current location' marker
  const [directions, setDirections] = useState(null); // Result from Directions API
  const [distanceInfo, setDistanceInfo] = useState(""); // Formatted distance/duration string
  const [totalCost, setTotalCost] = useState(null); // Calculated ride cost

  // View State
  const [activeView, setActiveView] = useState('home'); // Options: 'home', 'currentRide', 'availableRides', etc.

  // Context & API Status
  // Provide default empty array/function if context is unavailable
  const { addRideRequest, rideRequests } = useRides() || {
    addRideRequest: (ride) => console.warn("addRideRequest called without RideProvider:", ride),
    rideRequests: [],
  };
  const isMapsLoaded = useGoogleMapsLoaded(); // Check if Google Maps script is ready

  // Autocomplete Hook Setup
  const {
    ready, // Boolean: Is the Places library ready?
    suggestions: { status, data }, // Autocomplete suggestions { status: 'OK'|'ZERO_RESULTS', data: [...] }
    setValue, // Function to update the hook's internal value (triggers suggestions)
    clearSuggestions, // Function to manually clear suggestions dropdown
  } = usePlacesAutocomplete({
    debounce: 300, // Wait 300ms after user stops typing before fetching suggestions
    enabled: isMapsLoaded, // Only run the hook if Google Maps is loaded
  });

  // --- Effect for calculating route, distance ---
  useEffect(() => {
    // If either pickup or dropoff is missing, clear previous results
    if (!pickup || !dropoff) {
      setDirections(null);
      setDistanceInfo("");
      setTotalCost(null);
      return; // Stop execution
    }
    // Safety check: ensure Google Maps API objects are available
    if (!window.google || !window.google.maps || !window.google.maps.DirectionsService || !window.google.maps.DistanceMatrixService) {
        console.error("Google Maps services not available for route/distance calculation.");
        return;
    }

    // --- Calculate Route using Directions Service ---
    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      { origin: pickup, destination: dropoff, travelMode: window.google.maps.TravelMode.DRIVING },
      (result, routeStatus) => {
        if (routeStatus === "OK") setDirections(result); // Store route result
        else { console.error(`Directions request failed: ${routeStatus}`); setDirections(null); }
      }
    );

    // --- Calculate Distance & Duration using Distance Matrix Service ---
    const distanceService = new window.google.maps.DistanceMatrixService();
    distanceService.getDistanceMatrix(
      { origins: [pickup], destinations: [dropoff], travelMode: window.google.maps.TravelMode.DRIVING, unitSystem: window.google.maps.UnitSystem.IMPERIAL },
      (response, matrixStatus) => {
        if (matrixStatus === "OK" && response?.rows?.[0]?.elements?.[0]?.status === "OK") {
          const element = response.rows[0].elements[0];
          const miles = parseFloat(element.distance.text.replace(" mi", ""));
          setDistanceInfo(`${element.distance.text} (${element.duration.text})`); // Format display string
          
          // Calculate cost based on number of passengers and new pricing structure
          const pricePerMile = calculatePricePerMile(passengers);
          setTotalCost(miles * pricePerMile);
        } else {
          console.error(`Distance Matrix failed: ${matrixStatus} or element status: ${response?.rows?.[0]?.elements?.[0]?.status}`);
          setDistanceInfo("Calculation failed"); setTotalCost(null);
        }
      }
    );
  }, [pickup, dropoff, passengers]); // Re-run effect when pickup, dropoff, OR passengers change

  // --- Automatically get user's current location when Google Maps loads ---
  useEffect(() => {
    if (!isMapsLoaded || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const userLocation = { lat: latitude, lng: longitude };
        
        // Set the user marker position to show current location
        setUserMarkerPosition(userLocation);
        // Center the map on user's current location
        setMapCenter(userLocation);
      },
      (error) => {
        console.warn("Could not get user's current location:", error);
        // If geolocation fails, keep the default center (Rowan University)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  }, [isMapsLoaded]); // Run when Google Maps API loads

  // --- Function to get current GPS location and update pickup field ---
  const handleGetCurrentLocation = async () => {
    if (!navigator.geolocation || !isMapsLoaded) {
      alert("Geolocation is not available or the Maps API hasn't loaded yet."); return;
    }
    setIsGettingLocation(true); setUserMarkerPosition(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const latLng = { lat: latitude, lng: longitude };
        try {
          const geocoder = new window.google.maps.Geocoder();
          const { results } = await geocoder.geocode({ location: latLng });
          if (results && results[0]) {
            const bestAddress = results[0].formatted_address;
            setPickup(bestAddress); setValue(bestAddress, false);
            setMapCenter(latLng); setUserMarkerPosition(latLng);
            clearSuggestions();
          } else { alert("Could not find address for your location."); }
        } catch (error) { console.error("Error reverse geocoding:", error); alert("Error fetching address.");
        } finally { setIsGettingLocation(false); }
      },
      (error) => {
        console.error("Error getting location:", error);
        let errorMsg = "Unable to retrieve location.";
        if (error.code === 1) errorMsg += " Please ensure location permissions are enabled.";
        alert(errorMsg); setIsGettingLocation(false);
      }
    );
  };

  // --- Input Handlers ---
  const handleInput = (e, field) => {
    const val = e.target.value;
    if (field === "pickup") setPickup(val);
    if (field === "dropoff") setDropoff(val);
    setValue(val);
    setActiveInput(field);
  };
  const handleSelect = (desc, field) => {
    setValue(desc, false); clearSuggestions();
    if (field === "pickup") setPickup(desc);
    if (field === "dropoff") setDropoff(desc);
    setActiveInput(null);
  };
  const handleBlur = () => setTimeout(() => setActiveInput(null), 150);

  // --- Request Ride Submission Handler ---
  const handleRequestRide = async (e) => {
    e.preventDefault();
    if (!pickup || !dropoff || !datetime) {
      alert("Please fill in Pickup, Dropoff, Date, and Time."); return;
    }

    // Returns {x,y} coordinates from an address or null if it failed
    async function getAddressCoords(address) {
      try {
        const geocoder = new window.google.maps.Geocoder();
        const { results } = await geocoder.geocode({ address });
        if (results && results[0]) {
          const coords = {
            x: results[0].geometry.location.lng(), y: results[0].geometry.location.lat()
          };
          return coords;
        } else { alert("Could not find the coordinates for your address."); }
      } catch (error) {
        console.error("Error geocoding:", error); alert("Error fetching coordinates.");
      }
      return null;
    }

    // Convert {x,y} coordinates to point notation
    function convertCoordsToPoint(coords) {
      return coords ? `(${coords.x}, ${coords.y})` : null;
    }

    const rideRequestData = {
      rider_id: user?.id, // Get rider ID from user prop
      origin: pickup,
      origin_coords: convertCoordsToPoint(await getAddressCoords(pickup)), // 
      notes: pickupInfo, // Include specific pickup details
      destination: dropoff,
      destination_coords: convertCoordsToPoint(await getAddressCoords(dropoff)), // 
      departure_time: datetime, // Use combined datetime state
      seats_needed: parseInt(passengers, 10),
      estimated_cost: totalCost ? parseFloat(totalCost.toFixed(2)) : null,
    };

    if (!rideRequestData.rider_id) { alert("Authentication Error: User ID not found."); return; }
    if (rideRequestData.estimated_cost === null) { alert("Ride estimate could not be calculated."); return; }

    try {
      // --- IMPORTANT: Verify '/api/ride-requests' is your correct backend endpoint for CREATING requests ---
      const response = await fetch(`${apiBase}/api/demands`, { // <<< VERIFY THIS URL
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // Add Authorization header if needed
            'Authorization': `Bearer ${localStorage.getItem('ru_token')}`
        },
        body: JSON.stringify(rideRequestData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const newRide = await response.json(); // Assuming backend returns the created ride
      console.log("Ride requested successfully:", newRide);
      alert("Ride requested successfully!");

      // Add to local state via context OR refetch from backend
      addRideRequest(newRide); // Update context if using it

      // Reset form
      setPickup(""); setDropoff(""); setPickupInfo(""); setPassengers(1); setDatetime("");
      setDistanceInfo(""); setTotalCost(null); setDirections(null); clearSuggestions();

      // Optionally navigate to 'Current Ride' view
      setActiveView('currentRide');

    } catch (error) {
      console.error("Failed to request ride:", error);
      alert(`Failed to request ride: ${error.message}`);
    }
  };

  // --- Icon Style for Sidebar ---
  const iconStyle = { color: "#555", width: '20px', textAlign: 'center', marginRight: '10px' };

  // --- Render Logic for Rider Views ---
  const renderActiveView = () => {
    switch (activeView) {
    case 'home': // Request a Ride Form
        return (
          <>
            <header className="dashboard-header"><div className="title-area"><h2>Request Carpool</h2></div></header>
            <div className="request-section"> {/* Main container form + map */}
              <div className="form-area"> {/* Left side form */}
                <form onSubmit={handleRequestRide} className="offer-ride-form-driver"> {/* Added consistent class */}

                  {/* Pickup Location */}
                  <label htmlFor="pickup-location-rider">Pick-up Location</label>
                  <div className="autocomplete-wrapper" onBlur={handleBlur}>
                    <div className="input-with-icon"> {/* Wrapper for input + icon */}
                      <input
                        id="pickup-location-rider"
                        value={pickup}
                        onChange={(e) => handleInput(e, "pickup")}
                        onFocus={(e) => handleInput(e, "pickup")}
                        placeholder="Ex: Rowan University"
                        disabled={!ready}
                        autoComplete="off"
                      />
                      <FontAwesomeIcon
                        icon={fasLocationArrow}
                        className="location-icon"
                        title="Use current location"
                        onClick={handleGetCurrentLocation} // Make sure this function exists and works
                        style={{ cursor: 'pointer', opacity: isGettingLocation ? 0.5 : 1 }}
                        disabled={isGettingLocation}
                      />
                    </div>
                    {/* Autocomplete Dropdown */}
                    {activeInput === "pickup" && status === "OK" && (
                       <div className="autocomplete-dropdown"> {data.map(({ place_id, description }) => (<div key={place_id} onClick={() => handleSelect(description, "pickup")}>{description}</div>))} </div>
                     )}
                  </div>

                  {/* Pickup Info */}
                  <label htmlFor="pickup-info-rider">Pick-up Info:</label>
                  <input
                    id="pickup-info-rider"
                    type="text"
                    value={pickupInfo}
                    onChange={(e) => setPickupInfo(e.target.value)}
                    placeholder="Ex: Left side of Business Hall"
                    className="pickup-info-input-driver" // Reusing style class
                  />

                  {/* Dropoff Location */}
                  <label htmlFor="dropoff-location-rider">Drop-off Location</label>
                  <div className="autocomplete-wrapper" onBlur={handleBlur}>
                    <div className="input-with-icon">
                      <input
                        id="dropoff-location-rider"
                        value={dropoff}
                        onChange={(e) => handleInput(e, "dropoff")}
                        onFocus={(e) => handleInput(e, "dropoff")}
                        placeholder="Ex: Philadelphia Airport"
                        disabled={!ready}
                        autoComplete="off"
                      />
                      {/* Dropoff doesn't need the location arrow icon */}
                    </div>
                    {/* Autocomplete Dropdown */}
                    {activeInput === "dropoff" && status === "OK" && (
                      <div className="autocomplete-dropdown">
                        {data.map(({ place_id, description }) => (
                          <div key={place_id} onClick={() => handleSelect(description, "dropoff")}>{description}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* --- Use form-row and form-group for layout --- */}
                  <div className="form-row">
                    {/* DateTime Input */}
                    <div className="form-group">
                          <label htmlFor="datetime-rider-date">Departure Date & Time</label>
                          {/* Use wrapper with specific class */}
                          <div className="datetime-input-wrapper">
                             <input id="datetime-rider-date" type="date" value={datetime.split('T')[0] || ''} onChange={(e) => setDatetime(`${e.target.value}T${datetime.split('T')[1] || '00:00'}`)} required/>
                             <input id="datetime-rider-time" type="time" value={datetime.split('T')[1] || ''} onChange={(e) => setDatetime(`${datetime.split('T')[0] || new Date().toISOString().split('T')[0]}T${e.target.value}`)} required/>
                          </div>
                      </div>
                      {/* Passenger Selector */}
                      <div className="passenger-selector form-group">
                          <label htmlFor="passengers-rider">No. of passengers: </label>
                          <div className="passenger-controls">
                              <button type="button" onClick={() => setPassengers(p => Math.max(1, p - 1))} disabled={passengers <= 1}>−</button>
                              <span>{passengers}</span>
                              <button type="button" onClick={() => setPassengers(p => Math.min(3, p + 1))} disabled={passengers >= 3}>+</button>
                          </div>
                      </div>
                  </div>


                  {/* Ride Estimate */}
                  {pickup && dropoff && distanceInfo && (
                    <div className="ride-estimate">
                      <p>Trip: {distanceInfo || "—"}</p>
                      <p className="cost">Est. Cost: ${totalCost?.toFixed(2) || "—"}</p>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button type="submit" className="new-offer-button" // Reuse driver button style
                     disabled={isGettingLocation || !isMapsLoaded}>
                     <FontAwesomeIcon icon={fasPlus} /> Request Ride
                  </button>

                </form>
              </div> {/* End form-area */}

              {/* Map Area */}
              <div className="map-area">
                {isMapsLoaded && (
                  <GoogleMap mapContainerStyle={containerStyle} center={mapCenter} zoom={12} options={{ disableDefaultUI: true, zoomControl: true }}>
                    {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: false /* Show A/B markers */ }}/>}
                    {userMarkerPosition && <Marker position={userMarkerPosition} title="Your Location"/>}
                  </GoogleMap>
                )}
                {!isMapsLoaded && <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100%'}}>Loading Map...</div>}
              </div> {/* End map-area */}
            </div> {/* End request-section */}
          </>
        ); // End case 'home'

      case 'currentRide':
        return <RiderCurrentRide user={user} token={localStorage.getItem('ru_token')} />;
      case 'history':
        return <RiderRideHistory user={user} token={localStorage.getItem('ru_token')} />;
      case 'schedule': return <div className="content-placeholder"><h2>Schedule</h2><p>Display your upcoming scheduled rides here...</p></div>;
      case 'message': return <div className="content-placeholder"><h2>Messages</h2><p>Implement messaging here...</p></div>;
      case 'help': return <div className="content-placeholder"><h2>Help</h2><p>Display help info here...</p></div>;
      default: return <div>Select an option.</div>;
    }
  };


  // --- Main Component Render ---
  return (
    <div className="rider-dashboard-content">
      <aside className="sidebar">
        <nav className="nav-menu">
          <ul>
            {/* --- UPDATED Rider Sidebar Menu --- */}
            <li className={activeView === 'home' ? 'active' : ''} onClick={() => setActiveView('home')}>
              <FontAwesomeIcon icon={farHouse} style={iconStyle} /> Home
            </li>
            <li className={activeView === 'currentRide' ? 'active' : ''} onClick={() => setActiveView('currentRide')}>
              <FontAwesomeIcon icon={fasCar} style={iconStyle} /> Current Ride
            </li>
            <li className={activeView === 'history' ? 'active' : ''} onClick={() => setActiveView('history')}>
              <FontAwesomeIcon icon={fasHistory} style={iconStyle} /> History
            </li>
            <li className={activeView === 'schedule' ? 'active' : ''} onClick={() => setActiveView('schedule')}>
              <FontAwesomeIcon icon={farCalendarDays} style={iconStyle} /> Schedule
            </li>
            <li className={activeView === 'message' ? 'active' : ''} onClick={() => setActiveView('message')}>
              <FontAwesomeIcon icon={farMessage} style={iconStyle} /> Message
            </li>
            <li className={activeView === 'help' ? 'active' : ''} onClick={() => setActiveView('help')}>
              <FontAwesomeIcon icon={fasCircleQuestion} style={iconStyle} /> Help
            </li>
          </ul>
        </nav>
      </aside>
      <main className="dashboard-main">
        {/* Render content based on view, only after maps are loaded */}
        {isMapsLoaded ? renderActiveView() : <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100%'}}>Loading Dashboard...</div>}
      </main>
    </div>
  );
}

export default RiderDashboard;