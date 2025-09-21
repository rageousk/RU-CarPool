import React, { useState } from 'react'; // Import useState
import '../css/RequestRideModal.css';

const RequestRideModal = ({ isOpen, onClose }) => {
  // NEW: State to hold the slider's value
  const [radius, setRadius] = useState(10);

  if (!isOpen) {
    return null;
  }

  // NEW: Function to handle slider changes
  const handleSliderChange = (event) => {
    setRadius(event.target.value);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-button" onClick={onClose}>&times;</button>
        <h2>Request a Ride</h2>
        <p>Fill out your trip details and we'll match you with drivers going your way.</p>
        
        <form className="request-ride-form">
          {/* NEW: Added Pickup Location field */}
          <label htmlFor="pickup-location">Pickup Location *</label>
          <input type="text" id="pickup-location" name="pickup-location" placeholder="e.g., Holly Pointe Commons" />

          <label htmlFor="destination">Destination *</label>
          <input type="text" id="destination" name="destination" placeholder="e.g., Cherry Hill Mall, Philadelphia Airport, etc." />

          <label htmlFor="departure-time">Preferred Departure Time *</label>
          <input type="datetime-local" id="departure-time" name="departure-time" />

          {/* UPDATED: The label now displays the current radius value */}
          <label htmlFor="pickup-radius">Pickup Radius: {radius} miles from destination</label>
          <p className="slider-description">How far are you willing to travel to meet your ride?</p>
          {/* UPDATED: The slider now uses the state value and has an onChange handler */}
          <input 
            type="range" 
            id="pickup-radius" 
            name="pickup-radius" 
            min="1" 
            max="25" // Increased max for more range
            value={radius} 
            onChange={handleSliderChange} 
            className="slider" 
          />
          
          <button type="submit" className="submit-button">Request Ride</button>
        </form>
      </div>
    </div>
  );
};

export default RequestRideModal;