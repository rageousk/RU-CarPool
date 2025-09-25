import React, { useState, useEffect } from 'react';
import usePlacesAutocomplete from 'use-places-autocomplete';
import '../css/OfferRideModal.css';

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const OfferRideModal = ({ isOpen, onClose }) => {
  // State for all form fields
  const [departure, setDeparture] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [seats, setSeats] = useState("");

  const [activeInput, setActiveInput] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const {
    ready,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({ debounce: 300 });

  // useEffect to reset the form when the modal is closed
  useEffect(() => {
    if (!isOpen) {
      setDeparture("");
      setDestination("");
      setDate("");
      setTime("");
      setSeats("");
      clearSuggestions();
      setActiveInput(null);
    }
  }, [isOpen]);

  const handleGetLiveLocation = async (fieldToUpdate) => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleMapsApiKey}`);
        const responseData = await response.json();
        if (responseData.results && responseData.results.length > 0) {
          const address = responseData.results[0].formatted_address;
          if (fieldToUpdate === 'departure') setDeparture(address);
          else if (fieldToUpdate === 'destination') setDestination(address);
        } else {
          alert("Could not find address for your location.");
        }
      } catch (error) {
        console.error("Error reverse geocoding:", error);
        alert("An error occurred while fetching your address.");
      } finally {
        setIsGettingLocation(false);
        setActiveInput(null);
      }
    }, (error) => {
      console.error("Error getting location:", error);
      alert("Unable to retrieve your location. Please check your browser permissions.");
      setIsGettingLocation(false);
      setActiveInput(null);
    });
  };

  const handleInput = (e, field) => {
    const newValue = e.target.value;
    if (field === 'departure') setDeparture(newValue);
    if (field === 'destination') setDestination(newValue);
    setValue(newValue);
    setActiveInput(field);
  };

  const handleSelect = (description, field) => {
    setValue(description, false);
    clearSuggestions();
    if (field === 'departure') setDeparture(description);
    if (field === 'destination') setDestination(description);
    setActiveInput(null);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setActiveInput(null);
    }, 150);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-button" onClick={onClose}>&times;</button>
        <h2>Offer a Ride</h2>
        <p>Share your trip details and pick up fellow students along the way.</p>
        
        <form className="offer-ride-form">
          <label htmlFor="departure">Departure Location</label>
          <div className="autocomplete-container" onBlur={handleBlur}>
            <input
              id="departure" value={departure} onChange={(e) => handleInput(e, 'departure')}
              onFocus={(e) => handleInput(e, 'departure')}
              disabled={!ready} placeholder="e.g., Rowan University" autoComplete="off"
            />
            {activeInput === 'departure' && (
              <div className="autocomplete-dropdown">
                <div className="location-item" onClick={() => handleGetLiveLocation('departure')}>
                  📍 {isGettingLocation ? 'Getting location...' : 'Allow location access'}
                </div>
                {status === 'OK' && data.map(({ place_id, description }) => (
                  <div key={place_id} className="suggestion-item" onClick={() => handleSelect(description, 'departure')}>{description}</div>
                ))}
              </div>
            )}
          </div>

          <label htmlFor="destination">Destination</label>
          <div className="autocomplete-container" onBlur={handleBlur}>
            <input
              id="destination" value={destination} onChange={(e) => handleInput(e, 'destination')}
              onFocus={(e) => handleInput(e, 'destination')}
              disabled={!ready} placeholder="e.g., Philadelphia" autoComplete="off"
            />
            {activeInput === 'destination' && (
              <div className="autocomplete-dropdown">
                <div className="location-item" onClick={() => handleGetLiveLocation('destination')}>
                  📍 {isGettingLocation ? 'Getting location...' : 'Allow location access'}
                </div>
                {status === 'OK' && data.map(({ place_id, description }) => (
                  <div key={place_id} className="suggestion-item" onClick={() => handleSelect(description, 'destination')}>{description}</div>
                ))}
              </div>
            )}
          </div>
          
          <label htmlFor="date">Date of Travel</label>
          <input type="date" id="date" name="date" value={date} onChange={(e) => setDate(e.target.value)} />

          <label htmlFor="time">Time of Departure</label>
          <input type="time" id="time" name="time" value={time} onChange={(e) => setTime(e.target.value)} />
          
          <label htmlFor="seats">Available Seats</label>
          <input type="number" id="seats" name="seats" min="1" placeholder="e.g., 3" value={seats} onChange={(e) => setSeats(e.target.value)} />
          
          <button type="submit" className="submit-button">Submit Offer</button>
        </form>
      </div>
    </div>
  );
};

export default OfferRideModal;