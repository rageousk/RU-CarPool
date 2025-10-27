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
  const { rideRequests, updateRideRequest } = useRides() || {
    rideRequests: [],
    updateRideRequest: (id, data) => console.warn("updateRideRequest called without RideProvider:", id, data),
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
            // Log all results to console for potential accuracy debugging
            console.log("Geocoding results:", results);
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
      console.log("Ride offered successfully:", result);
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

  // --- Icon Style for Sidebar ---
  const iconStyle = { color: "#555", width: "20px", textAlign: "center", marginRight: "10px" };

  // --- Render Logic for Different Views ---
  // This function returns the JSX for the main content area based on 'activeView' state
  const renderActiveView = () => {
    switch (activeView) {
      case 'home':
        return (
          <>
            <header className="dashboard-header"><div className="title-area"><h2>Offer a Ride</h2></div></header>
            <div className="request-section"> {/* Main container for form + map */}
              <div className="form-area"> {/* Left side form container */}
                <form onSubmit={handleOfferRide} className="offer-ride-form-driver"> {/* Added specific class */}

                  {/* Pick-up Location */}
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

                  {/* Pick-up Info (Optional - matches Figma) */}
                  <label htmlFor="pickup-info">Pick-up info :</label>
                  <input
                      id="pickup-info"
                      type="text"
                      placeholder="Ex: infront of Business Hall"
                      className="pickup-info-input-driver" // Specific class if needed
                  />


               {/* Drop-off Location */}
                  <label htmlFor="dropoff-location">Drop-off Location</label>
                  {/* --- CORRECTED: Use BOTH autocomplete-wrapper AND input-with-icon --- */}
                  <div className="autocomplete-wrapper" onBlur={handleBlur}>
                    <div className="input-with-icon"> {/* <<< THIS DIV WAS MISSING */}
                      <input
                        id="dropoff-location"
                        value={dropoff}
                        onChange={(e) => handleInput(e, "dropoff")}
                        onFocus={(e) => handleInput(e, "dropoff")}
                        placeholder="Ex: Philadelphia Airport"
                        disabled={!ready}
                        autoComplete="off"
                      />
                      {/* Dropoff doesn't need the location arrow icon */}
                    </div> {/* <<< THIS DIV WAS MISSING */}
                    {/* --- Ensure dropdown renders correctly --- */}
                    {activeInput === "dropoff" && status === "OK" && (
                      <div className="autocomplete-dropdown">
                        {data.map(({ place_id, description }) => (
                          <div key={place_id} onClick={() => handleSelect(description, "dropoff")}>{description}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Departure Date & Time - In a Row */}
                   <div className="form-row"> {/* Wrapper for inline elements */}
                       <div className="form-group">
                          <label htmlFor="date">Departure Date & Time</label>
                           <div className="datetime-input-wrapper-driver"> {/* Specific class */}
                              <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required/>
                              <input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required/>
                           </div>
                       </div>
                   </div>


                   {/* Seats Available */}
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
                          className="seats-input-driver" // Specific class
                          required
                        />
                      </div>
                   </div>


                  {/* Ride Estimate */}
                  {pickup && dropoff && distanceInfo && (
                    <div className="ride-estimate">
                      <p>Trip: {distanceInfo || "—"}</p>
                      <p className="cost">Suggest: ${suggestedCost?.toFixed(2) || "—"}</p>
                    </div>
                  )}

                  {/* Manual Price Input */}
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


                  {/* Submit Button */}
                  <button type="submit" className="new-offer-button" disabled={isGettingLocation || !isMapsLoaded}>
                    <FontAwesomeIcon icon={fasPlus} /> Offer Ride
                  </button>
                </form>
              </div> {/* End of form-area */}

              {/* Map Area */}
              <div className="map-area">
                {isMapsLoaded && (
                  <GoogleMap mapContainerStyle={containerStyle} center={mapCenter} zoom={12} options={{ disableDefaultUI: true, zoomControl: true }}>
                    {directions && <DirectionsRenderer directions={directions} />}
                    {userMarkerPosition && <Marker position={userMarkerPosition} title="Your Location"/>}
                  </GoogleMap>
                )}
                 {!isMapsLoaded && <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}>Loading Map...</div>}
              </div> {/* End of map-area */}
            </div> {/* End of request-section */}
          </>
        ); // End of case 'home' return
      case "currentRide":
        // Placeholder for Current Ride view
        // --- TODO: Fetch and display current/accepted rides for the driver ---
        return <div className="content-placeholder"><h2>Current Ride</h2><p>Display rides the driver has accepted or confirmed here...</p></div>;
      case "requestedRides":
        // Display Incoming Ride Requests Table
        return (
             <div className="rides-list content-placeholder">
               <h3>Incoming Ride Requests</h3>
               {rideRequests && rideRequests.length > 0 ? (
                 <table className="rides-requested-table">
                   <thead><tr><th>Pickup</th><th>Drop-off</th><th>Passengers</th><th>Departure</th><th>Status</th><th>Action</th></tr></thead>
                   <tbody>
                     {/* Filter to show only pending requests */}
                     {rideRequests.filter(ride => ride.status === 'pending').map((ride) => (
                       <tr key={ride.id}>
                         <td>{ride.pickup || 'N/A'}</td>
                         <td>{ride.dropoff || 'N/A'}</td>
                         <td>{ride.passengers || 'N/A'}</td>
                         {/* Format date/time nicely if available */}
                         <td>{ride.datetime ? new Date(ride.datetime).toLocaleString() : 'N/A'}</td>
                         <td>{ride.status || 'N/A'}</td>
                         <td>
                            {/* Actions only available for pending requests */}
                           <button className="action-button accept" onClick={() => updateRideRequest(ride.id, { status: "accepted" })}>Accept</button>
                           <button className="action-button decline" onClick={() => updateRideRequest(ride.id, { status: "declined" })}>Decline</button>
                         </td>
                       </tr>
                     ))}
                     {/* Show message if there are requests but none are pending */}
                     {rideRequests.filter(ride => ride.status === 'pending').length === 0 && (
                         <tr><td colSpan="6" style={{textAlign: 'center', padding: '10px'}}>No pending requests found.</td></tr>
                     )}
                   </tbody>
                 </table>
               ) : ( <p style={{textAlign: 'center', padding: '10px'}}>No incoming ride requests right now.</p> )}
             </div>
        );
      case "history":
        // Placeholder for History view
        // --- TODO: Fetch and display past rides ---
        return <div className="content-placeholder"><h2>History</h2><p>Display completed or canceled rides here...</p></div>;
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