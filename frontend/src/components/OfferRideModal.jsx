import React from 'react';
import '../css/OfferRideModal.css'; // We will create this CSS file next

const OfferRideModal = ({ isOpen, onClose }) => {
  if (!isOpen) {
    return null; // Don't render the modal if it's not open
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-button" onClick={onClose}>&times;</button>
        <h2>Offer a Ride</h2>
        <p>Share your trip details and pick up fellow students along the way.</p>
        
        <form className="offer-ride-form">
          <label htmlFor="departure">Departure Location</label>
          <input type="text" id="departure" name="departure" placeholder="e.g., Rowan University" />

          <label htmlFor="destination">Destination</label>
          <input type="text" id="destination" name="destination" placeholder="e.g., Philadelphia" />

          <label htmlFor="date">Date of Travel</label>
          <input type="date" id="date" name="date" />

          <label htmlFor="time">Time of Departure</label>
          <input type="time" id="time" name="time" />
          
          <label htmlFor="seats">Available Seats</label>
          <input type="number" id="seats" name="seats" min="1" placeholder="e.g., 3" />

          <button type="submit" className="submit-button">Submit Offer</button>
        </form>
      </div>
    </div>
  );
};

export default OfferRideModal;