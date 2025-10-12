import React, { useState } from "react";
import "../css/UserDashboard.css";

function RiderDashboard({ user }) {
  const [rideRequests, setRideRequests] = useState([
    { id: 1, pickup: "Holly Pointe Commons", destination: "Cherry Hill Mall", date: "2025-10-12", time: "10:00 AM", status: "Pending" },
    { id: 2, pickup: "Rowan University", destination: "Camden Waterfront", date: "2025-10-13", time: "2:30 PM", status: "Confirmed" },
  ]);

  const handleNewRequest = () => alert("Open request ride modal");

  return (
    <div className="rider-dashboard">
      <h2>Rider Dashboard</h2>
      <p>Hi {user.name}, here are your ride requests:</p>

      <button className="new-request-button" onClick={handleNewRequest}>
        Request a New Ride
      </button>

      {rideRequests.length === 0 ? (
        <p>You have no ride requests yet.</p>
      ) : (
        <table className="ride-requests-table">
          <thead>
            <tr>
              <th>Pickup</th>
              <th>Destination</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rideRequests.map((ride) => (
              <tr key={ride.id}>
                <td>{ride.pickup}</td>
                <td>{ride.destination}</td>
                <td>{ride.date}</td>
                <td>{ride.time}</td>
                <td>{ride.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default RiderDashboard;
