import React, { useState, useEffect, useRef } from "react";
import usePlacesAutocomplete from "use-places-autocomplete";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLocationArrow } from "@fortawesome/free-solid-svg-icons";
import "../css/OfferRideModal.css";

const containerStyle = { width: "100%", height: "100%" };
const defaultCenter = { lat: 39.7107, lng: -75.121 }; // Rowan University

// Hook to detect if Google Maps is loaded
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

const OfferRideModal = ({ onClose, signedIn, navigate }) => {
  const mapInstance = useRef(null);
  const directionsRenderer = useRef(null);
  const mapRef = useRef(null);

  const [departure, setDeparture] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [seats, setSeats] = useState(1); // Start with 1 seat, not empty string
  const [activeInput, setActiveInput] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [distanceInfo, setDistanceInfo] = useState("");
  const [tripValue, setTripValue] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const isMapsLoaded = useGoogleMapsLoaded();

  const {
    ready,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    debounce: 300,
    enabled: isMapsLoaded,
  });

  // Initialize map
  useEffect(() => {
    if (!isMapsLoaded || !mapRef.current) return;
    const googleMap = new window.google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 13,
    });
    mapInstance.current = googleMap;
    const directionsDisplay = new window.google.maps.DirectionsRenderer();
    directionsDisplay.setMap(googleMap);
    directionsRenderer.current = directionsDisplay;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          googleMap.setCenter(userLocation);
          const userMarker = new window.google.maps.Marker({
            position: userLocation,
            map: googleMap,
            title: "You are here",
          });
          setMarkers((prev) => [...prev, userMarker]);
        },
        (err) => console.warn("Geolocation error:", err)
      );
    }
  }, [isMapsLoaded]);

  const handleInput = (e, field) => {
    const newValue = e.target.value;
    if (field === "departure") setDeparture(newValue);
    if (field === "destination") setDestination(newValue);
    setValue(newValue);
    setActiveInput(field);
  };

  const handleSelect = (description, field) => {
    setValue(description, false);
    clearSuggestions();
    if (field === "departure") setDeparture(description);
    if (field === "destination") setDestination(description);
    setActiveInput(null);
  };

  const handleBlur = () => {
    setTimeout(() => setActiveInput(null), 150);
  };

  // Function to get current GPS location and update departure field
  const handleGetCurrentLocation = async () => {
    if (!navigator.geolocation || !isMapsLoaded) {
      alert("Geolocation is not available or the Maps API hasn't loaded yet.");
      return;
    }
    setIsGettingLocation(true); // Show loading state

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const latLng = { lat: latitude, lng: longitude };
        try {
          // Use Geocoder to convert lat/lng to address
          const geocoder = new window.google.maps.Geocoder();
          const { results } = await geocoder.geocode({ location: latLng });

          if (results && results[0]) {
            const bestAddress = results[0].formatted_address;
            setDeparture(bestAddress); // Update the departure input state
            setValue(bestAddress, false); // Update the Places Autocomplete hook's value
            
            // Center the map on the new location
            if (mapInstance.current) {
              mapInstance.current.setCenter(latLng);
            }
            
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
        console.error("Error getting geolocation:", error);
        let errorMsg = "Unable to retrieve your location.";
        if (error.code === 1) errorMsg += " Please ensure location permissions are enabled for this site.";
        alert(errorMsg);
        setIsGettingLocation(false); // Hide loading state
      }
    );
  };

  const handleSubmit = () => {
    if (!signedIn) {
      navigate('/login?redirect=/dashboard');
      return;
    }
    // Handle the ride offer submission logic here
    console.log('Submitting ride offer...');
    onClose();
  };

  // Draw route and calculate distance (only when departure/destination change)
  useEffect(() => {
    setDistanceInfo("");
    setTripValue(null);

    if (!departure || !destination || !directionsRenderer.current) return;

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route({
        origin: departure,
        destination: destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },(result, status) => {
        if (status === "OK") {
          directionsRenderer.current.setDirections(result);
        }
      }
    );

    const distanceService = new window.google.maps.DistanceMatrixService();
    distanceService.getDistanceMatrix({
        origins: [departure],
        destinations: [destination],
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem: window.google.maps.UnitSystem.IMPERIAL,
      },(response, status) => {
        if (status === "OK" && response.rows[0].elements[0].status === "OK") {
            const element = response.rows[0].elements[0];
            setDistanceInfo(`${element.distance.text} (${element.duration.text})`);
        }
      }
    );
  }, [departure, destination]); // Remove seats from dependency

  // Calculate price based on distance and seats (separate effect)
  useEffect(() => {
    if (!distanceInfo || !seats) return;

    const distanceText = distanceInfo.split('(')[0].trim(); // Extract distance part
    const miles = parseFloat(distanceText.replace(' mi', ''));
    
    if (!isNaN(miles) && seats > 0) {
      // New pricing structure: $1.00 for 1 person, $1.50 for 2, $2.00 for 3+
      let pricePerMile;
      switch (seats) {
        case 1: pricePerMile = 1.00; break;
        case 2: pricePerMile = 1.50; break;
        case 3: 
        default: pricePerMile = 2.00; break; // 3 or more passengers
      }
      setTripValue(miles * pricePerMile);
    } else {
      setTripValue(null);
    }
  }, [distanceInfo, seats]); // This will only recalculate price, not distance

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-button" onClick={onClose}>&times;</button>
        <h2>Offer a Ride</h2>
        <p>Share your trip details and pick up fellow students along the way.</p>
        <div className="form-map-container">
          <div className="form-container">
            <form className="offer-ride-form" onSubmit={(e) => e.preventDefault()}>
              {isMapsLoaded && (
                <>
                  <label htmlFor="departure-location">Departure Location *</label>
                  <div className="autocomplete-container input-with-icon" onBlur={handleBlur}>
                    <input id="departure-location" value={departure} onChange={(e) => handleInput(e, "departure")} onFocus={(e) => handleInput(e, "departure")} placeholder="e.g., Rowan University" autoComplete="off"/>
                    <FontAwesomeIcon 
                      icon={faLocationArrow} 
                      className={`location-icon ${isGettingLocation ? 'getting-location' : ''}`}
                      onClick={handleGetCurrentLocation}
                      title={isGettingLocation ? "Getting location..." : "Use current location"}
                    />
                    {activeInput === "departure" && status === "OK" && (
                      <div className="autocomplete-dropdown">
                        {data.map(({ place_id, description }) => (<div key={place_id} className="suggestion-item" onClick={() => handleSelect(description, "departure")}>{description}</div>))}
                      </div>
                    )}
                  </div>
                  <label htmlFor="destination">Destination *</label>
                  <div className="autocomplete-container" onBlur={handleBlur}>
                    <input id="destination" value={destination} onChange={(e) => handleInput(e, "destination")} onFocus={(e) => handleInput(e, "destination")} placeholder="e.g., Cherry Hill Mall" autoComplete="off"/>
                    {activeInput === "destination" && status === "OK" && (
                      <div className="autocomplete-dropdown">
                        {data.map(({ place_id, description }) => (<div key={place_id} className="suggestion-item" onClick={() => handleSelect(description, "destination")}>{description}</div>))}
                      </div>
                    )}
                  </div>
                </>
              )}

              <label htmlFor="date">Date of Travel *</label>
              <input type="date" id="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <label htmlFor="time">Time of Departure *</label>
              <input type="time" id="time" value={time} onChange={(e) => setTime(e.target.value)} />
              <label htmlFor="seats">Available Seats *</label>
              <div className="seats-selector">
                <div className="seats-controls">
                  <button 
                    type="button" 
                    onClick={() => setSeats(s => Math.max(1, s - 1))} 
                    disabled={seats <= 1}
                  >
                    −
                  </button>
                  <span>{seats}</span>
                  <button 
                    type="button" 
                    onClick={() => setSeats(s => Math.min(3, s + 1))} 
                    disabled={seats >= 3}
                  >
                    +
                  </button>
                </div>
              </div>

              {distanceInfo && tripValue && (
                <div className="distance-cost-card">
                  <div className="distance">Distance: {distanceInfo}</div>
                  <div className="cost">${tripValue?.toFixed(2)}</div>
                </div>
              )}

              <button type="button" onClick={handleSubmit} className="submit-button">Submit Offer</button>
            </form>
          </div>
          <div className="map-container">
            {isMapsLoaded && <div ref={mapRef} style={containerStyle}></div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfferRideModal;