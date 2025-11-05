import React, { useState, useEffect, useRef } from "react";
import usePlacesAutocomplete from "use-places-autocomplete";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLocationArrow } from "@fortawesome/free-solid-svg-icons";
import "../css/RequestRideModal.css";

const containerStyle = { width: "100%", height: "100%" }; // Use 100% to fill the container
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

const RequestRideModal = ({ onClose, signedIn, navigate }) => {
  const mapInstance = useRef(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [passengers, setPassengers] = useState(1); // Add passenger count state
  const [activeInput, setActiveInput] = useState(null);
  const [markers, setMarkers] = useState([]);
  const directionsRenderer = useRef(null);
  const [distanceInfo, setDistanceInfo] = useState("");
  const [totalCost, setTotalCost] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false); // Loading state for location button
  const mapRef = useRef(null); // Ref for the map container DIV

  const isMapsLoaded = useGoogleMapsLoaded();

  // Pricing function based on number of passengers
  const calculatePricePerMile = (passengerCount) => {
    switch (passengerCount) {
      case 1: return 1.00;
      case 2: return 1.50;
      case 3: return 2.00;
      default: return 1.00; // Default to 1 passenger rate
    }
  };

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
      center: mapCenter,
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
  }, [isMapsLoaded, mapCenter]);

  const handleInput = (e, field) => {
    const newValue = e.target.value;
    if (field === "pickup") setPickup(newValue);
    if (field === "destination") setDestination(newValue);
    setValue(newValue);
    setActiveInput(field);
  };

  const handleSelect = (description, field) => {
    setValue(description, false);
    clearSuggestions();
    if (field === "pickup") setPickup(description);
    if (field === "destination") setDestination(description);
    setActiveInput(null);
  };

  const handleBlur = () => {
    setTimeout(() => setActiveInput(null), 150);
  };

  // Function to get current GPS location and update pickup field
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
            setPickup(bestAddress); // Update the pickup input state
            setValue(bestAddress, false); // Update the Places Autocomplete hook's value
            setMapCenter(latLng); // Center the map on this location
            
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

  // Route + distance calculation
  useEffect(() => {
    if (!pickup || !destination || !mapInstance.current || !directionsRenderer.current) return;

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: pickup,
        destination: destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK") {
          directionsRenderer.current.setDirections(result);
        }
      }
    );

    const distanceService = new window.google.maps.DistanceMatrixService();
    distanceService.getDistanceMatrix(
      {
        origins: [pickup],
        destinations: [destination],
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem: window.google.maps.UnitSystem.IMPERIAL,
      },
      (response, status) => {
        if (status === "OK") {
          const element = response.rows[0].elements[0];
          if (element.status === "OK") {
            setDistanceInfo(`${element.distance.text} (${element.duration.text})`);
            const miles = parseFloat(element.distance.text.replace(" mi", ""));
            const pricePerMile = calculatePricePerMile(passengers);
            setTotalCost(miles * pricePerMile); // Use new pricing structure
          } else {
            setDistanceInfo("Distance not available");
          }
        }
      }
    );
  }, [pickup, destination, passengers]); // Re-run when pickup, destination, or passengers change

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-button" onClick={onClose}>
          &times;
        </button>
        <h2>Request a Ride</h2>
        <p>
          Fill out your trip details and we'll match you with drivers going your
          way.
        </p>

        <div className="form-map-container">
          <div className="form-container">
            <form
              className="request-ride-form"
              onSubmit={(e) => e.preventDefault()}
            >
              {isMapsLoaded && (
                <>
                  <label htmlFor="pickup-location">Pickup Location *</label>
                  <div className="autocomplete-container input-with-icon" onBlur={handleBlur}>
                    <input
                      id="pickup-location"
                      value={pickup}
                      onChange={(e) => handleInput(e, "pickup")}
                      onFocus={(e) => handleInput(e, "pickup")}
                      placeholder="e.g., Holly Pointe Commons"
                      autoComplete="off"
                    />
                    <FontAwesomeIcon 
                      icon={faLocationArrow} 
                      className={`location-icon ${isGettingLocation ? 'getting-location' : ''}`}
                      onClick={handleGetCurrentLocation}
                      title={isGettingLocation ? "Getting location..." : "Use current location"}
                    />
                    {activeInput === "pickup" && status === "OK" && (
                      <div className="autocomplete-dropdown">
                        {data.map(({ place_id, description }) => (
                          <div
                            key={place_id}
                            className="suggestion-item"
                            onClick={() => handleSelect(description, "pickup")}
                          >
                            {description}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <label htmlFor="destination">Destination *</label>
                  <div className="autocomplete-container" onBlur={handleBlur}>
                    <input
                      id="destination"
                      value={destination}
                      onChange={(e) => handleInput(e, "destination")}
                      onFocus={(e) => handleInput(e, "destination")}
                      placeholder="e.g., Cherry Hill Mall"
                      autoComplete="off"
                    />
                    {activeInput === "destination" && status === "OK" && (
                      <div className="autocomplete-dropdown">
                        {data.map(({ place_id, description }) => (
                          <div
                            key={place_id}
                            className="suggestion-item"
                            onClick={() =>
                              handleSelect(description, "destination")
                            }
                          >
                            {description}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              <label htmlFor="departure-time">Preferred Departure Time *</label>
              <input type="datetime-local" id="departure-time" />

              <label htmlFor="passengers">Number of Passengers *</label>
              <div className="passenger-selector">
                <div className="passenger-controls">
                  <button 
                    type="button" 
                    onClick={() => setPassengers(p => Math.max(1, p - 1))} 
                    disabled={passengers <= 1}
                  >
                    −
                  </button>
                  <span>{passengers}</span>
                  <button 
                    type="button" 
                    onClick={() => setPassengers(p => Math.min(3, p + 1))} 
                    disabled={passengers >= 3}
                  >
                    +
                  </button>
                </div>
              </div>

              {pickup && destination && distanceInfo && (
                <div className="distance-cost-card">
                  <div className="distance">Distance: {distanceInfo}</div>
                  <div className="cost">${totalCost?.toFixed(2)}</div>
                </div>
              )}

              <button
                type="submit"
                className="submit-button"
                onClick={(e) => {
                  e.preventDefault();

                  // <-- Check if user is signed in here
                  if (!signedIn) {
                    navigate("/login?redirect=/dashboard"); // redirect to login and then dashboard
                    return;
                  }
                }}
              >
                Request Ride
              </button>
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

export default RequestRideModal;