import React, { useState, useRef, useEffect } from "react";
import usePlacesAutocomplete from "use-places-autocomplete";
import "../css/UserDashboard.css"; // Continue using UserDashboard CSS
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse as farHouse,
  faCalendarDays as farCalendarDays,
  faMessage as farMessage,
  faClockRotateLeft as fasHistory,
  faCircleQuestion as fasCircleQuestion,
  faLocationArrow as fasLocationArrow,
  faPlus as fasPlus,
  faCar as fasCar,
  faListCheck as fasListCheck,
} from "@fortawesome/free-solid-svg-icons";
import { useRides } from "../context/RideContext.jsx"; // Assuming you have this context for requests
import { GoogleMap, DirectionsRenderer, Marker } from "@react-google-maps/api";

// --- Constants ---
const containerStyle = { width: "100%", height: "100%" };
const defaultCenter = { lat: 39.7107, lng: -75.121 }; // Rowan University, Glassboro, NJ
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5050";
const BASE_RATE_PER_MILE = 1.00; // Base cost per mile for 1 passenger

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

// --- Main DriverDashboard component ---
function DriverDashboard({ user }) { // Assuming 'user' prop contains logged-in user info (like user.id)
  // State for form fields
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [seats, setSeats] = useState(1); // Default to 1 seat, max 3
  const [manualPrice, setManualPrice] = useState(""); // For optional driver-set price
  const [activeInput, setActiveInput] = useState(null); // Tracks 'pickup' or 'dropoff' focus for dropdown
  const [isGettingLocation, setIsGettingLocation] = useState(false); // Loading state for location button

  // State for map and calculations
  const [mapCenter, setMapCenter] = useState(defaultCenter); // Current center of the map
  const [userMarkerPosition, setUserMarkerPosition] = useState(null); // Position for the 'current location' marker
  const [directions, setDirections] = useState(null); // Result from Directions API
  const [distanceInfo, setDistanceInfo] = useState(""); // Formatted distance/duration string like "10 mi (15 mins)"
  const [calculatedMiles, setCalculatedMiles] = useState(null); // Store just the miles number for calculation
  const [suggestedCost, setSuggestedCost] = useState(null); // Suggested cost based on miles and seats

  // State for managing which view (Home, Current Ride, etc.) is displayed
  const [activeView, setActiveView] = useState("home");

  // Get ride requests data and update function from context
  // Provide default empty array/function if context is unavailable
  const { 
    rideRequests, 
    currentRides, 
    rideHistory, 
    declinedRides,
    updateRideRequest, 
    completeRide, 
    loading, 
    error, 
    fetchRideRequests, 
    fetchCurrentRides 
  } = useRides() || {
    rideRequests: [],
    currentRides: [],
    rideHistory: [],
    declinedRides: [],
    updateRideRequest: (id, data) => console.warn("updateRideRequest called without RideProvider:", id, data),
    completeRide: (id, data) => console.warn("completeRide called without RideProvider:", id, data),
    loading: false,
    error: null,
    fetchRideRequests: () => console.warn("fetchRideRequests called without RideProvider"),
    fetchCurrentRides: () => console.warn("fetchCurrentRides called without RideProvider"),
  };
  const isMapsLoaded = useGoogleMapsLoaded(); // Check if Google Maps script is ready

  // Autocomplete Hook Setup
  const {
    ready, // Boolean: Is the Places library loaded and ready?
    suggestions: { status, data }, // Autocomplete suggestions { status: 'OK'|'ZERO_RESULTS', data: [...] }
    setValue, // Function to set the input value for the hook (triggers suggestions)
    clearSuggestions, // Function to manually clear suggestions dropdown
  } = usePlacesAutocomplete({
    debounce: 300, // Wait 300ms after user stops typing before fetching suggestions
    enabled: isMapsLoaded, // Only run the hook if Google Maps is loaded
  });

  // --- Effect for calculating route, distance, AND suggested cost ---
  useEffect(() => {
    // If either pickup or dropoff is missing, clear previous results
    if (!pickup || !dropoff) {
      setDirections(null);
      setDistanceInfo("");
      setCalculatedMiles(null);
      setSuggestedCost(null);
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
      {
        origin: pickup,
        destination: dropoff,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, routeStatus) => {
        if (routeStatus === "OK") {
          setDirections(result); // Store the route result for the map
        } else {
          console.error(`Directions request failed due to ${routeStatus}`);
          setDirections(null); // Clear route on error
        }
      }
    );

    // --- Calculate Distance & Duration using Distance Matrix Service ---
    const distanceService = new window.google.maps.DistanceMatrixService();
    distanceService.getDistanceMatrix(
      {
        origins: [pickup],
        destinations: [dropoff],
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem: window.google.maps.UnitSystem.IMPERIAL, // Request results in miles
      },
      (response, matrixStatus) => {
        // Check if the overall request and the specific route element were successful
        if (matrixStatus === "OK" && response?.rows?.[0]?.elements?.[0]?.status === "OK") {
          const element = response.rows[0].elements[0];
          const miles = parseFloat(element.distance.text.replace(" mi", ""));
          setDistanceInfo(`${element.distance.text} (${element.duration.text})`); // Format display string
          setCalculatedMiles(miles); // Store raw miles

          // --- Calculate suggested price based on seats using new pricing structure ---
          const pricePerMile = calculatePricePerMile(seats);
          setSuggestedCost(miles * pricePerMile);

        } else {
          // Log error and clear info if calculation fails
          console.error(`Distance Matrix request failed: ${matrixStatus} or element status: ${response?.rows?.[0]?.elements?.[0]?.status}`);
          setDistanceInfo("Calculation failed");
          setCalculatedMiles(null);
          setSuggestedCost(null);
        }
      }
    );
  }, [pickup, dropoff, seats]); // Re-run effect when pickup, dropoff, OR seats change

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
      alert("Geolocation is not available or the Maps API hasn't loaded yet.");
      return;
    }
    setIsGettingLocation(true); // Show loading state
    setUserMarkerPosition(null); // Clear any previous marker

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const latLng = { lat: latitude, lng: longitude };
        try {
          // Use Geocoder to convert lat/lng to address
          const geocoder = new window.google.maps.Geocoder();
          const { results } = await geocoder.geocode({ location: latLng });

          if (results && results[0]) {
            const bestAddress = results[0].formatted_address; // Use the first result

            setPickup(bestAddress); // Update the pickup input state
            setValue(bestAddress, false); // Update the Places Autocomplete hook's value
            setMapCenter(latLng); // Center the map on this location
            setUserMarkerPosition(latLng); // Set the marker position on the map
            clearSuggestions(); // Clear any existing address suggestions
          } else {
            alert("Could not find a valid address for your current location.");
          }
        } catch (error) {
          console.error("Error during reverse geocoding:", error);
          alert("An error occurred while trying to fetch your address.");
        } finally {
          setIsGettingLocation(false); // Hide loading state
        }
      },
      (error) => {
        // Handle errors from getCurrentPosition (e.g., user denied permission)
        console.error("Error getting geolocation:", error);
        let errorMsg = "Unable to retrieve your location.";
        if (error.code === 1) errorMsg += " Please ensure location permissions are enabled for this site.";
        alert(errorMsg);
        setIsGettingLocation(false); // Hide loading state
      }
    );
  };

  // --- Input Handlers ---
  // Called when typing in pickup or dropoff input fields
  const handleInput = (e, field) => {
    const val = e.target.value;
    if (field === "pickup") setPickup(val);
    if (field === "dropoff") setDropoff(val);
    setValue(val); // Update Places Autocomplete to fetch suggestions
    setActiveInput(field); // Mark which input is active (for showing dropdown)
  };
  // Called when selecting a suggestion from the dropdown
  const handleSelect = (desc, field) => {
    setValue(desc, false); // Set the value without re-fetching suggestions
    clearSuggestions(); // Hide the dropdown
    if (field === "pickup") setPickup(desc); // Update the state for the correct field
    if (field === "dropoff") setDropoff(desc);
    setActiveInput(null); // No input is active anymore
  };
  // Called when the input field or its dropdown container loses focus
  const handleBlur = () => {
    // Use a small delay so a click on a suggestion can register before hiding
    setTimeout(() => setActiveInput(null), 150);
  };

  // --- Form Submission Handler ---
  // Called when clicking the "Offer Ride" button
  /* COMMENTED OUT - OFFER RIDE FUNCTIONALITY REMOVED
  const handleOfferRide = async (e) => {
    e.preventDefault(); // Prevent default browser form submission
    // Basic validation
    if (!pickup || !dropoff || !date || !time) {
      alert("Please complete Pickup, Dropoff, Date, and Time.");
      return;
    }

    // Determine the final price: use manual if valid, otherwise suggested
    const finalCost = manualPrice && !isNaN(parseFloat(manualPrice)) && parseFloat(manualPrice) >= 0
        ? parseFloat(manualPrice)
        : (suggestedCost !== null ? parseFloat(suggestedCost.toFixed(2)) : null);

    // Prepare data payload for the backend API
    const rideOfferData = {
      driver_id: user?.id, // Get user ID from the 'user' prop passed down
      pickup_location: pickup,
      dropoff_location: dropoff,
      departure_date: date,
      departure_time: time,
      available_seats: parseInt(seats, 10), // Ensure seats is a number
      estimated_cost: finalCost, // Use the final calculated or manually entered cost
      status: "available", // Set initial status for the ride offer
    };
    // Safety check for user ID
    if (!rideOfferData.driver_id) {
      alert("Authentication Error: User ID not found. Cannot offer ride.");
      return;
    }
    // Check if a price exists
    if (rideOfferData.estimated_cost === null) {
      alert("Ride price could not be determined. Please enter Pickup/Dropoff again or set a manual price.");
      return; // Don't submit without a price
    }

    try {
      // --- IMPORTANT: Verify '/api/rides' is your correct backend endpoint for CREATING rides ---
      const response = await fetch(`${apiBase}/api/rides`, { // <<< VERIFY THIS URL
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Add Authorization header if your backend requires authentication (e.g., using a JWT stored after login)
          // 'Authorization': `Bearer ${localStorage.getItem('ru_token')}`
        },
        body: JSON.stringify(rideOfferData),
      });
      // Handle non-successful responses (e.g., 4xx, 5xx errors)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown server error" })); // Try to parse error JSON
        throw new Error(errorData.error || `Failed to create ride offer. Server responded with status: ${response.status}`);
      }
      // Handle successful response
      const result = await response.json();
      alert("Ride offered successfully!");

      // Reset the form fields after successful submission
      setPickup(""); setDropoff(""); setDate(""); setTime(""); setSeats(1); setManualPrice("");
      setDistanceInfo(""); setCalculatedMiles(null); setSuggestedCost(null); setDirections(null);
      clearSuggestions();
      // Optionally switch view or show a success message permanently
      // setActiveView('schedule'); // Example: Switch to schedule view

    } catch (error) {
      // Handle errors during the fetch operation or from the backend
      console.error("Failed to offer ride:", error);
      alert(`Failed to offer ride: ${error.message}`);
    }
  };
  */

  // --- Icon Style for Sidebar ---
  const iconStyle = { color: "#555", width: "20px", textAlign: "center", marginRight: "10px" };

  // --- Render Logic for Different Views ---
  // This function returns the JSX for the main content area based on 'activeView' state
  const renderActiveView = () => {
    switch (activeView) {
      case 'home':
        return (
          <>
            {/* COMMENTED OUT - OFFER RIDE SECTION REMOVED 
            <header className="dashboard-header"><div className="title-area"><h2>Offer a Ride</h2></div></header>
            <div className="request-section">
              <div className="form-area">
                <form onSubmit={handleOfferRide} className="offer-ride-form-driver">
                  <label htmlFor="pickup-location">Pick-up Location</label>
                  <div className="autocomplete-wrapper" onBlur={handleBlur}>
                    <div className="input-with-icon">
                      <input
                        id="pickup-location"
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
                        onClick={handleGetCurrentLocation}
                        style={{ cursor: 'pointer', opacity: isGettingLocation ? 0.5 : 1 }}
                        disabled={isGettingLocation}
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
                  <label htmlFor="pickup-info">Pick-up info :</label>
                  <input
                      id="pickup-info"
                      type="text"
                      placeholder="Ex: infront of Business Hall"
                      className="pickup-info-input-driver"
                  />
                  <label htmlFor="dropoff-location">Drop-off Location</label>
                  <div className="autocomplete-wrapper" onBlur={handleBlur}>
                    <div className="input-with-icon">
                      <input
                        id="dropoff-location"
                        value={dropoff}
                        onChange={(e) => handleInput(e, "dropoff")}
                        onFocus={(e) => handleInput(e, "dropoff")}
                        placeholder="Ex: Philadelphia Airport"
                        disabled={!ready}
                        autoComplete="off"
                      />
                    </div>
                    {activeInput === "dropoff" && status === "OK" && (
                      <div className="autocomplete-dropdown">
                        {data.map(({ place_id, description }) => (
                          <div key={place_id} onClick={() => handleSelect(description, "dropoff")}>{description}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="form-row">
                       <div className="form-group">
                          <label htmlFor="date">Departure Date & Time</label>
                           <div className="datetime-input-wrapper">
                              <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required/>
                              <input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required/>
                           </div>
                       </div>
                   </div>
                   <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="seats">Seats Available (1-3)</label>
                        <input
                          id="seats"
                          type="number"
                          min="1"
                          max="3"
                          value={seats}
                          onChange={(e) => setSeats(Math.max(1, Math.min(3, parseInt(e.target.value) || 1)))}
                          className="seats-input-driver"
                          required
                        />
                      </div>
                   </div>
                  {pickup && dropoff && distanceInfo && (
                    <div className="ride-estimate">
                      <p>Trip: {distanceInfo || "—"}</p>
                      <p className="cost">Suggest: ${suggestedCost?.toFixed(2) || "—"}</p>
                    </div>
                  )}
                  <div className="form-row">
                       <div className="form-group manual-price-input">
                         <label htmlFor="manual-price">Offer Price (Optional)</label>
                         <input
                           id="manual-price"
                           type="number"
                           min="0"
                           step="0.01"
                           value={manualPrice}
                           onChange={(e) => setManualPrice(e.target.value)}
                           placeholder={`Enter price (overrides suggestion)`}
                         />
                       </div>
                  </div>
                  <button type="submit" className="new-offer-button" disabled={isGettingLocation || !isMapsLoaded}>
                    <FontAwesomeIcon icon={fasPlus} /> Offer Ride
                  </button>
                </form>
              </div>
              <div className="map-area">
                {isMapsLoaded && (
                  <GoogleMap mapContainerStyle={containerStyle} center={mapCenter} zoom={12} options={{ disableDefaultUI: true, zoomControl: true }}>
                    {directions && <DirectionsRenderer directions={directions} />}
                    {userMarkerPosition && <Marker position={userMarkerPosition} title="Your Location"/>}
                  </GoogleMap>
                )}
                 {!isMapsLoaded && <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}>Loading Map...</div>}
              </div>
            </div>
            END COMMENTED OUT SECTION */}
            
            {/* PLACEHOLDER CONTENT FOR HOME VIEW */}
            <div className="content-placeholder">
              <h2>Driver Dashboard</h2>
              <p>Home view content will be implemented here.</p>
            </div>
          </>
        ); // End of case 'home' return
      case "currentRide":
        // Display Current/Accepted Rides
        return (
          <div className="rides-list" style={{ 
            padding: '20px', 
            backgroundColor: '#f8f9fa', 
            minHeight: '100vh',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '20px',
              backgroundColor: 'white',
              padding: '15px 20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ 
                margin: 0, 
                color: '#343a40', 
                fontSize: '24px', 
                fontWeight: '600' 
              }}>
                Current Rides
              </h3>
              <button 
                onClick={fetchCurrentRides}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: loading ? '#6c757d' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(40,167,69,0.2)'
                }}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            
            {error && (
              <div style={{
                backgroundColor: '#f8d7da',
                color: '#721c24',
                padding: '15px 20px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid #f5c6cb',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                <strong>Error:</strong> {error}
              </div>
            )}
            
            {loading ? (
              <div style={{
                textAlign: 'center', 
                padding: '40px 20px',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{ 
                  fontSize: '16px', 
                  color: '#6c757d', 
                  marginBottom: '10px' 
                }}>
                  Loading current rides...
                </div>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '4px solid #e9ecef',
                  borderTop: '4px solid #28a745',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto'
                }}></div>
              </div>
            ) : currentRides && currentRides.length > 0 ? (
              <div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#495057', width: '25%' }}>Pickup</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#495057', width: '25%' }}>Drop-off</th>
                      <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: '#495057', width: '10%' }}>Passengers</th>
                      <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: '#495057', width: '15%' }}>Departure</th>
                      <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: '#495057', width: '10%' }}>Status</th>
                      <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: '#495057', width: '15%' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRides.map((ride, index) => (
                      <tr key={ride.id} style={{ 
                        borderBottom: '1px solid #e9ecef',
                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                        transition: 'background-color 0.2s ease'
                      }}>
                        <td style={{ 
                          padding: '12px 8px', 
                          verticalAlign: 'top',
                          fontSize: '14px',
                          color: '#212529',
                          wordWrap: 'break-word',
                          maxWidth: '200px'
                        }}>
                          <div style={{ fontWeight: '500', marginBottom: '2px' }}>
                            {ride.pickup || 'N/A'}
                          </div>
                        </td>
                        <td style={{ 
                          padding: '12px 8px', 
                          verticalAlign: 'top',
                          fontSize: '14px',
                          color: '#212529',
                          wordWrap: 'break-word',
                          maxWidth: '200px'
                        }}>
                          <div style={{ fontWeight: '500', marginBottom: '2px' }}>
                            {ride.dropoff || 'N/A'}
                          </div>
                        </td>
                        <td style={{ 
                          padding: '12px 8px', 
                          textAlign: 'center',
                          verticalAlign: 'middle',
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#28a745'
                        }}>
                          {ride.passengers || 'N/A'}
                        </td>
                        <td style={{ 
                          padding: '12px 8px', 
                          textAlign: 'center',
                          verticalAlign: 'middle',
                          fontSize: '13px',
                          color: '#6c757d'
                        }}>
                          {ride.datetime ? (
                            <div>
                              <div style={{ fontWeight: '500', color: '#495057' }}>
                                {new Date(ride.datetime).toLocaleDateString('en-US', { timeZone: 'America/New_York' })}
                              </div>
                              <div style={{ fontSize: '12px' }}>
                                {new Date(ride.datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' })}
                              </div>
                            </div>
                          ) : 'N/A'}
                        </td>
                        <td style={{ 
                          padding: '12px 8px', 
                          textAlign: 'center',
                          verticalAlign: 'middle'
                        }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500',
                            backgroundColor: '#d4edda',
                            color: '#155724',
                            border: '1px solid #c3e6cb'
                          }}>
                            {ride.status || 'accepted'}
                          </span>
                        </td>
                        <td style={{ 
                          padding: '12px 8px', 
                          textAlign: 'center',
                          verticalAlign: 'middle'
                        }}>
                          <button 
                            onClick={() => completeRide(ride.claimId, ride)}
                            style={{
                              padding: '8px 16px',
                              fontSize: '13px',
                              fontWeight: '500',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              backgroundColor: '#007bff',
                              color: 'white',
                              transition: 'background-color 0.2s ease'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
                          >
                            Complete Ride
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            ) : ( 
              <div style={{
                textAlign: 'center', 
                padding: '40px 20px',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                color: '#6c757d'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '15px' }}>🚙</div>
                <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>No Current Rides</h4>
                <p style={{ margin: 0, fontSize: '14px' }}>You don't have any accepted rides at the moment.</p>
              </div>
            )}
          </div>
        );
      case "requestedRides":
        // Display Incoming Ride Requests Table
        return (
             <div className="rides-list" style={{ 
               padding: '20px', 
               backgroundColor: '#f8f9fa', 
               minHeight: '100vh',
               fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
             }}>
               <div style={{ 
                 display: 'flex', 
                 justifyContent: 'space-between', 
                 alignItems: 'center', 
                 marginBottom: '20px',
                 backgroundColor: 'white',
                 padding: '15px 20px',
                 borderRadius: '8px',
                 boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
               }}>
                 <h3 style={{ 
                   margin: 0, 
                   color: '#343a40', 
                   fontSize: '24px', 
                   fontWeight: '600' 
                 }}>
                   Incoming Ride Requests
                 </h3>
                 <button 
                   onClick={fetchRideRequests}
                   disabled={loading}
                   style={{
                     padding: '10px 20px',
                     backgroundColor: loading ? '#6c757d' : '#007bff',
                     color: 'white',
                     border: 'none',
                     borderRadius: '6px',
                     cursor: loading ? 'not-allowed' : 'pointer',
                     fontSize: '14px',
                     fontWeight: '500',
                     transition: 'all 0.2s ease',
                     boxShadow: '0 2px 4px rgba(0,123,255,0.2)'
                   }}
                 >
                   {loading ? 'Refreshing...' : 'Refresh'}
                 </button>
               </div>
               
               {error && (
                 <div style={{
                   backgroundColor: '#f8d7da',
                   color: '#721c24',
                   padding: '15px 20px',
                   borderRadius: '8px',
                   marginBottom: '20px',
                   border: '1px solid #f5c6cb',
                   fontSize: '14px',
                   fontWeight: '500'
                 }}>
                   <strong>Error:</strong> {error}
                 </div>
               )}
               
               {loading ? (
                 <div style={{
                   textAlign: 'center', 
                   padding: '40px 20px',
                   backgroundColor: 'white',
                   borderRadius: '8px',
                   boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                 }}>
                   <div style={{ 
                     fontSize: '16px', 
                     color: '#6c757d', 
                     marginBottom: '10px' 
                   }}>
                     Loading ride requests...
                   </div>
                   <div style={{
                     width: '40px',
                     height: '40px',
                     border: '4px solid #e9ecef',
                     borderTop: '4px solid #007bff',
                     borderRadius: '50%',
                     animation: 'spin 1s linear infinite',
                     margin: '0 auto'
                   }}></div>
                 </div>
               ) : rideRequests && rideRequests.length > 0 ? (
                 <div style={{ overflowX: 'auto' }}>
                   {/* Debug info */}
                   <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px', padding: '8px', backgroundColor: '#f1f1f1', borderRadius: '4px' }}>

                   </div>
                   <table className="rides-requested-table" style={{
                     width: '100%',
                     borderCollapse: 'collapse',
                     backgroundColor: 'white',
                     borderRadius: '8px',
                     overflow: 'hidden',
                     boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                   }}>
                     <thead>
                       <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                         <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#495057', width: '25%' }}>Pickup</th>
                         <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#495057', width: '25%' }}>Drop-off</th>
                         <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: '#495057', width: '10%' }}>Passengers</th>
                         <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: '#495057', width: '15%' }}>Departure</th>
                         <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: '#495057', width: '10%' }}>Status</th>
                         <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: '#495057', width: '15%' }}>Action</th>
                       </tr>
                     </thead>
                     <tbody>
                       {/* Filter to show only pending requests */}
                       {rideRequests.filter(ride => ride.status === 'pending').map((ride, index) => (
                         <tr key={ride.id} style={{ 
                           borderBottom: '1px solid #e9ecef',
                           backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                           transition: 'background-color 0.2s ease'
                         }}>
                           <td style={{ 
                             padding: '12px 8px', 
                             verticalAlign: 'top',
                             fontSize: '14px',
                             color: '#212529',
                             wordWrap: 'break-word',
                             maxWidth: '200px'
                           }}>
                             <div style={{ fontWeight: '500', marginBottom: '2px' }}>
                               {ride.pickup || 'N/A'}
                             </div>
                           </td>
                           <td style={{ 
                             padding: '12px 8px', 
                             verticalAlign: 'top',
                             fontSize: '14px',
                             color: '#212529',
                             wordWrap: 'break-word',
                             maxWidth: '200px'
                           }}>
                             <div style={{ fontWeight: '500', marginBottom: '2px' }}>
                               {ride.dropoff || 'N/A'}
                             </div>
                           </td>
                           <td style={{ 
                             padding: '12px 8px', 
                             textAlign: 'center',
                             verticalAlign: 'middle',
                             fontSize: '16px',
                             fontWeight: '600',
                             color: '#007bff'
                           }}>
                             {ride.passengers || 'N/A'}
                           </td>
                           <td style={{ 
                             padding: '12px 8px', 
                             textAlign: 'center',
                             verticalAlign: 'middle',
                             fontSize: '13px',
                             color: '#6c757d'
                           }}>
                             {ride.datetime ? (
                               <div>
                                 <div style={{ fontWeight: '500', color: '#495057' }}>
                                   {new Date(ride.datetime).toLocaleDateString('en-US', { timeZone: 'America/New_York' })}
                                 </div>
                                 <div style={{ fontSize: '12px' }}>
                                   {new Date(ride.datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' })}
                                 </div>
                               </div>
                             ) : 'N/A'}
                           </td>
                           <td style={{ 
                             padding: '12px 8px', 
                             textAlign: 'center',
                             verticalAlign: 'middle'
                           }}>
                             <span style={{
                               padding: '4px 8px',
                               borderRadius: '12px',
                               fontSize: '12px',
                               fontWeight: '500',
                               backgroundColor: '#fff3cd',
                               color: '#856404',
                               border: '1px solid #ffeaa7'
                             }}>
                               {ride.status || 'pending'}
                             </span>
                           </td>
                           <td style={{ 
                             padding: '12px 8px', 
                             textAlign: 'center',
                             verticalAlign: 'middle'
                           }}>
                             <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                               <button 
                                 className="action-button accept" 
                                 onClick={() => updateRideRequest(ride.id, { status: "accepted" }, ride)}
                                 style={{
                                   padding: '6px 12px',
                                   fontSize: '12px',
                                   fontWeight: '500',
                                   border: 'none',
                                   borderRadius: '4px',
                                   cursor: 'pointer',
                                   backgroundColor: '#28a745',
                                   color: 'white',
                                   transition: 'background-color 0.2s ease'
                                 }}
                                 onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
                                 onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
                               >
                                 Accept
                               </button>
                               <button 
                                 className="action-button decline" 
                                 onClick={() => updateRideRequest(ride.id, { status: "declined" }, ride)}
                                 style={{
                                   padding: '6px 12px',
                                   fontSize: '12px',
                                   fontWeight: '500',
                                   border: 'none',
                                   borderRadius: '4px',
                                   cursor: 'pointer',
                                   backgroundColor: '#dc3545',
                                   color: 'white',
                                   transition: 'background-color 0.2s ease'
                                 }}
                                 onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
                                 onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
                               >
                                 Decline
                               </button>
                             </div>
                           </td>
                         </tr>
                       ))}
                       {/* Show message if there are requests but none are pending */}
                       {rideRequests.filter(ride => ride.status === 'pending').length === 0 && (
                         <tr>
                           <td colSpan="6" style={{
                             textAlign: 'center', 
                             padding: '20px',
                             color: '#6c757d',
                             fontStyle: 'italic'
                           }}>
                             No pending requests found.
                           </td>
                         </tr>
                       )}
                     </tbody>
                   </table>
                 </div>
               ) : ( 
                 <div style={{
                   textAlign: 'center', 
                   padding: '40px 20px',
                   backgroundColor: 'white',
                   borderRadius: '8px',
                   boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                   color: '#6c757d'
                 }}>
                   <div style={{ fontSize: '48px', marginBottom: '15px' }}>🚗</div>
                   <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>No Ride Requests Available</h4>
                   <p style={{ margin: 0, fontSize: '14px' }}>There are no incoming ride requests at the moment. Check back later!</p>
                 </div>
               )}
             </div>
        );
      case "history":
        // Display Ride History (completed, declined, withdrawn rides)
        return (
          <div className="rides-list" style={{ 
            padding: '20px', 
            backgroundColor: '#f8f9fa', 
            minHeight: '100vh',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '20px',
              backgroundColor: 'white',
              padding: '15px 20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ 
                margin: 0, 
                color: '#343a40', 
                fontSize: '24px', 
                fontWeight: '600' 
              }}>
                Ride History
              </h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={fetchCurrentRides}
                  disabled={loading}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: loading ? '#6c757d' : '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(108,117,125,0.2)'
                  }}
                >
                  {loading ? 'Refreshing...' : 'Refresh'}
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm('Clear all local declined ride history?')) {
                      localStorage.removeItem('declinedRides');
                      window.location.reload();
                    }
                  }}
                  style={{
                    padding: '10px 15px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                >
                  Clear Local
                </button>
              </div>
            </div>
            
            {error && (
              <div style={{
                backgroundColor: '#f8d7da',
                color: '#721c24',
                padding: '15px 20px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid #f5c6cb',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                <strong>Error:</strong> {error}
              </div>
            )}
            
            {loading ? (
              <div style={{
                textAlign: 'center', 
                padding: '40px 20px',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{ 
                  fontSize: '16px', 
                  color: '#6c757d', 
                  marginBottom: '10px' 
                }}>
                  Loading ride history...
                </div>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '4px solid #e9ecef',
                  borderTop: '4px solid #6c757d',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto'
                }}></div>
              </div>
            ) : rideHistory && rideHistory.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#495057', width: '25%' }}>Pickup</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#495057', width: '25%' }}>Drop-off</th>
                      <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: '#495057', width: '10%' }}>Passengers</th>
                      <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: '#495057', width: '15%' }}>Departure</th>
                      <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: '#495057', width: '15%' }}>Status</th>
                      <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: '#495057', width: '10%' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rideHistory.map((ride, index) => {
                      // Define status colors
                      const getStatusStyle = (status) => {
                        switch(status) {
                          case 'completed':
                            return { backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' };
                          case 'declined':
                            return { backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' };
                          case 'withdrawn':
                            return { backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeaa7' };
                          default:
                            return { backgroundColor: '#e2e3e5', color: '#383d41', border: '1px solid #d6d8db' };
                        }
                      };
                      
                      return (
                        <tr key={ride.id} style={{ 
                          borderBottom: '1px solid #e9ecef',
                          backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                          transition: 'background-color 0.2s ease'
                        }}>
                          <td style={{ 
                            padding: '12px 8px', 
                            verticalAlign: 'top',
                            fontSize: '14px',
                            color: '#212529',
                            wordWrap: 'break-word',
                            maxWidth: '200px'
                          }}>
                            <div style={{ fontWeight: '500', marginBottom: '2px' }}>
                              {ride.pickup || 'N/A'}
                            </div>
                          </td>
                          <td style={{ 
                            padding: '12px 8px', 
                            verticalAlign: 'top',
                            fontSize: '14px',
                            color: '#212529',
                            wordWrap: 'break-word',
                            maxWidth: '200px'
                          }}>
                            <div style={{ fontWeight: '500', marginBottom: '2px' }}>
                              {ride.dropoff || 'N/A'}
                            </div>
                          </td>
                          <td style={{ 
                            padding: '12px 8px', 
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#6c757d'
                          }}>
                            {ride.passengers || 'N/A'}
                          </td>
                          <td style={{ 
                            padding: '12px 8px', 
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            fontSize: '13px',
                            color: '#6c757d'
                          }}>
                            {ride.datetime ? (
                              <div>
                                <div style={{ fontWeight: '500', color: '#495057' }}>
                                  {new Date(ride.datetime).toLocaleDateString('en-US', { timeZone: 'America/New_York' })}
                                </div>
                                <div style={{ fontSize: '12px' }}>
                                  {new Date(ride.datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' })}
                                </div>
                              </div>
                            ) : 'N/A'}
                          </td>
                          <td style={{ 
                            padding: '12px 8px', 
                            textAlign: 'center',
                            verticalAlign: 'middle'
                          }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '500',
                              textTransform: 'capitalize',
                              ...getStatusStyle(ride.status)
                            }}>
                              {ride.status || 'unknown'}
                            </span>
                          </td>
                          <td style={{ 
                            padding: '12px 8px', 
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            fontSize: '12px',
                            color: '#6c757d'
                          }}>
                            {ride.createdAt ? new Date(ride.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : ( 
              <div style={{
                textAlign: 'center', 
                padding: '40px 20px',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                color: '#6c757d'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '15px' }}>📚</div>
                <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>No Ride History</h4>
                <p style={{ margin: 0, fontSize: '14px' }}>You haven't completed or declined any rides yet.</p>
              </div>
            )}
          </div>
        );
      case "schedule":
        // Placeholder for Schedule view
        // --- TODO: Fetch and display upcoming scheduled rides ---
        return <div className="content-placeholder"><h2>Schedule</h2><p>Display future rides the driver is committed to...</p></div>;
      case "message":
        // Placeholder for Messages view
        // --- TODO: Implement messaging functionality ---
        return <div className="content-placeholder"><h2>Messages</h2><p>Implement chat/messaging between driver and riders here...</p></div>;
      case "help":
        // Placeholder for Help view
        // --- TODO: Add help/FAQ content ---
        return <div className="content-placeholder"><h2>Help</h2><p>Display FAQs or support information here...</p></div>;
      default:
        // Fallback case
        return <div>Select an option from the sidebar.</div>;
    }
  }; // <-- End of renderActiveView function

  // --- Main Component Render ---
  return (
    <div className="rider-dashboard-content"> {/* Reuse class for overall layout */}
      <aside className="sidebar">
        <nav className="nav-menu">
          <ul>
            {/* Sidebar navigation items - FULL LIST */}
            <li className={activeView === 'home' ? 'active' : ''} onClick={() => setActiveView('home')}>
              <FontAwesomeIcon icon={farHouse} style={iconStyle} /> Home
            </li>
            <li className={activeView === 'currentRide' ? 'active' : ''} onClick={() => setActiveView('currentRide')}>
              <FontAwesomeIcon icon={fasCar} style={iconStyle} /> Current Ride
            </li>
            <li className={activeView === 'requestedRides' ? 'active' : ''} onClick={() => setActiveView('requestedRides')}>
              <FontAwesomeIcon icon={fasListCheck} style={iconStyle} /> Requested Rides
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
        {/* Render the appropriate view based on activeView state */}
        {isMapsLoaded ? renderActiveView() : <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}>Loading Dashboard...</div>}
      </main>
    </div>
  );
} // <-- End of DriverDashboard component

export default DriverDashboard;