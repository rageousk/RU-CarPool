import React, { useState, useEffect, useRef } from "react";
import usePlacesAutocomplete from "use-places-autocomplete";
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
  const [seats, setSeats] = useState("");
  const [activeInput, setActiveInput] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [distanceInfo, setDistanceInfo] = useState("");
  const [tripValue, setTripValue] = useState(null);

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

  const handleSubmit = () => {
    if (!signedIn) {
      navigate('/login?redirect=/dashboard');
      return;
    }
    // Handle the ride offer submission logic here
    console.log('Submitting ride offer...');
    onClose();
  };

  // Draw route and calculate distance/price
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
            const miles = parseFloat(element.distance.text.replace(" mi", ""));
            
            const numSeats = parseInt(seats, 10);
            if (!isNaN(numSeats) && numSeats > 0) {
              let rate = 1.0; // Base rate for 1 seat
              if (numSeats > 1) {
                rate += (numSeats - 1) * 0.5; // Add $0.50 for each extra seat
              }
              setTripValue(miles * rate);
            } else {
              setTripValue(null); // Clear the price if seats is not a valid number
            }
        }
      }
    );
  }, [departure, destination, seats]);

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
                  <div className="autocomplete-container" onBlur={handleBlur}>
                    <input id="departure-location" value={departure} onChange={(e) => handleInput(e, "departure")} onFocus={(e) => handleInput(e, "departure")} placeholder="e.g., Rowan University" autoComplete="off"/>
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
              {/* --- THIS IS THE ONLY CHANGE --- */}
              <input type="number" id="seats" min="1" max="5" placeholder="e.g., 3" value={seats} onChange={(e) => setSeats(e.target.value)} />

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