import React, { useState } from "react";
import "../css/UserDashboard.css";

function DriverDashboard({ user }) {
  const [ridesOffered, setRidesOffered] = useState([
    // Sample data
    {
      id: 1,
      pickup: "Rowan University",
      destination: "Cherry Hill Mall",
      date: "2025-10-12",
      time: "9:00 AM",
      status: "Pending",
      seatsAvailable: 3,
    },
    {
      id: 2,
      pickup: "Holly Pointe Commons",
      destination: "Camden Waterfront",
      date: "2025-10-13",
      time: "1:00 PM",
      status: "Confirmed",
      seatsAvailable: 2,
    },
  ]);

  const handleNewOffer = () => {
    // Placeholder logic: you can open a modal for offering a ride
    alert("Open offer ride modal");
  };

  return (
    <div className="driver-dashboard">
      <h2>Driver Dashboard</h2>
      <p>Hi {user.name}, here are your rides you are offering:</p>

      <button className="new-offer-button" onClick={handleNewOffer}>
        Offer a New Ride
      </button>

      {ridesOffered.length === 0 ? (
        <p>You have no rides offered yet.</p>
      ) : (
        <table className="rides-offered-table">
          <thead>
            <tr>
              <th>Pickup</th>
              <th>Destination</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
              <th>Seats Available</th>
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
      )}
    </div>
  );
}

export default DriverDashboard;