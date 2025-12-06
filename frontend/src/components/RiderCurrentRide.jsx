import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMapPin as fasMapPin,
  faClock as fasClock,
  faUsers as fasUsers,
  faDollarSign as fasDollarSign,
  faInfoCircle as fasInfoCircle,
  faTrash as fasTrash,
} from "@fortawesome/free-solid-svg-icons";
import "../css/RiderCurrentRide.css";

const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5050";

/**
 * RiderCurrentRide Component
 * Displays all ride requests created by the current rider
 * Shows status, locations, time, passengers, cost, and notes
 */
function RiderCurrentRide({ user, token }) {
  const [rides, setRides] = useState([]); // List of rider's demands
  const [loading, setLoading] = useState(true); // Loading state
  const [error, setError] = useState(null); // Error message
  const [cancellingId, setCancellingId] = useState(null); // Track which ride is being cancelled

  // Fetch user's ride requests on component mount
  useEffect(() => {
    fetchMyRides();
  }, [token, user?.id]);

  // Auto-cancel ride function
  const autoCancelRide = async (rideId) => {
    try {
      const response = await fetch(`${apiBase}/api/demands/${rideId}/cancel`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ auto: true })  // <- tells backend to bypass 24h rule
      });
    } catch (err) {
      console.error("Auto-cancel failed:", err);
    }
  };

  /**
   * Fetch all ride requests for the current user
   */
  const fetchMyRides = async () => {
    if (!token || !user?.id) {
      setError("Authentication required. Please log in.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBase}/api/demands/mine`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to fetch rides: ${response.status}`
        );
      }

      const data = await response.json();
      const loadedRides = data.demands || [];

      // Auto-cancel expired rides
      const now = new Date();
      const updatedRides = loadedRides.map((ride) => {
        const hasAcceptedClaim =
          ride.ride_claims &&
          ride.ride_claims.length > 0 &&
          ride.ride_claims[0].status === "accepted";

        const departureTime = new Date(ride.departure_time);
        const isPastDeparture = departureTime <= now;

        if (ride.status === "open" && !hasAcceptedClaim && isPastDeparture) {
          autoCancelRide(ride.id);  // <-- FIX ADDED
          return { ...ride, status: "cancelled" };
        }

        return ride;
      });

      setRides(updatedRides);
    } catch (err) {
      console.error("Error fetching rides:", err);
      setError(err.message || "Failed to load your ride requests.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle cancelling a ride request
   */
  const handleCancelRide = async (rideId) => {
    if (!token) {
      alert("Authentication required to cancel a ride.");
      return;
    }

    const ride = rides.find((r) => r.id === rideId);
    if (!ride) return;

    const departureTime = new Date(ride.departure_time);
    const now = new Date();
    const diffHours = (departureTime - now) / (1000 * 60 * 60);

    if (diffHours < 24 && ride.status === "open") {
      alert("You can only cancel rides at least 24 hours before departure.");
      return;
    }

    if (!window.confirm(`Cancel ride from ${ride.origin} to ${ride.destination}?`)) {
      return;
    }

    setCancellingId(rideId);

    try {
      const response = await fetch(`${apiBase}/api/demands/${rideId}/cancel`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to cancel ride: ${response.status}`
        );
      }

      setRides((prevRides) =>
        prevRides.map((ride) =>
          ride.id === rideId ? { ...ride, status: "cancelled" } : ride
        )
      );

      alert("Ride cancelled successfully.");
    } catch (err) {
      console.error("Error cancelling ride:", err);
      alert(`Failed to cancel ride: ${err.message}`);
    } finally {
      setCancellingId(null);
    }
  };

  /** Format Departure Time **/
  const formatDateTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "America/New_York",
      });
    } catch {
      return isoString;
    }
  };

  /** Get Status Badge **/
  const getStatusBadge = (ride) => {
    if (ride.ride_claims && ride.ride_claims.length > 0) {
      const claim = ride.ride_claims[0];
      if (claim.status === "accepted") {
        return { color: "#27ae60", text: "Accepted" };
      }
    }

    const statusMap = {
      open: { color: "#3498db", text: "Pending" },
      claimed: { color: "#27ae60", text: "Accepted" },
      completed: { color: "#9b59b6", text: "Completed" },
      cancelled: { color: "#e74c3c", text: "Cancelled" },
    };
    return statusMap[ride.status] || { color: "#95a5a6", text: ride.status };
  };

  // Loading state
  if (loading) {
    return (
      <div className="current-ride-container">
        <header className="dashboard-header">
          <h2>My Ride Requests</h2>
        </header>
        <div className="loading-state">
          <p>Loading your ride requests...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="current-ride-container">
        <header className="dashboard-header">
          <h2>My Ride Requests</h2>
        </header>
        <div className="error-state">
          <p>⚠️ {error}</p>
          <button onClick={fetchMyRides} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No rides
  if (rides.length === 0) {
    return (
      <div className="current-ride-container">
        <header className="dashboard-header">
          <h2>My Ride Requests</h2>
        </header>
        <div className="empty-state">
          <p>No active ride requests.</p>
        </div>
      </div>
    );
  }

  // Filter to show ONLY active rides
  const activeRides = rides.filter(
    (ride) => ride.status !== "completed" && ride.status !== "cancelled"
  );

  // No active rides
  if (activeRides.length === 0) {
    return (
      <div className="current-ride-container">
        <header className="dashboard-header">
          <h2>My Ride Requests</h2>
        </header>
        <div className="empty-state">
          <p>No active ride requests.</p>
          <p className="empty-subtitle">Check your History for past rides or request a new one!</p>
        </div>
      </div>
    );
  }

  // Active rides list
  return (
    <div className="current-ride-container">
      <header className="dashboard-header">
        <h2>My Ride Requests</h2>
      </header>

      <div className="rides-list">
        {activeRides.map((ride) => {
          const statusInfo = getStatusBadge(ride);
          const canCancel =
            ride.status === "open" &&
            new Date(ride.departure_time) - new Date() > 24 * 60 * 60 * 1000;

          const driverInfo =
            ride.ride_claims && ride.ride_claims.length > 0
              ? ride.ride_claims[0].driver_user
              : null;

          const driverProfile =
            ride.ride_claims && ride.ride_claims.length > 0
              ? ride.ride_claims[0].driver_profile
              : null;

          return (
            <div key={ride.id} className={`ride-card ride-status-${ride.status}`}>
              <div className="ride-header">
                <h3 className="ride-title">
                  {ride.origin} → {ride.destination}
                </h3>
                <span
                  className="status-badge"
                  style={{ backgroundColor: statusInfo.color }}
                >
                  {statusInfo.text}
                </span>
              </div>

              {/* Ride details */}
              <div className="ride-details">
                <div className="detail-item">
                  <div className="detail-icon" style={{ color: "#1abc9c" }}>
                    <FontAwesomeIcon icon={fasMapPin} />
                  </div>
                  <div className="detail-content">
                    <span className="detail-label">Pick-up</span>
                    <p className="detail-value">{ride.origin}</p>
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-icon" style={{ color: "#e74c3c" }}>
                    <FontAwesomeIcon icon={fasMapPin} />
                  </div>
                  <div className="detail-content">
                    <span className="detail-label">Drop-off</span>
                    <p className="detail-value">{ride.destination}</p>
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-icon" style={{ color: "#3498db" }}>
                    <FontAwesomeIcon icon={fasClock} />
                  </div>
                  <div className="detail-content">
                    <span className="detail-label">Departure</span>
                    <p className="detail-value">{formatDateTime(ride.departure_time)}</p>
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-icon" style={{ color: "#9b59b6" }}>
                    <FontAwesomeIcon icon={fasUsers} />
                  </div>
                  <div className="detail-content">
                    <span className="detail-label">Passengers</span>
                    <p className="detail-value">{ride.seats_needed}</p>
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-icon" style={{ color: "#27ae60" }}>
                    <FontAwesomeIcon icon={fasDollarSign} />
                  </div>
                  <div className="detail-content">
                    <span className="detail-label">Est. Cost</span>
                    <p className="detail-value">
                      ${ride.estimated_cost ? ride.estimated_cost.toFixed(2) : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {ride.notes && (
                <div className="ride-notes">
                  <FontAwesomeIcon icon={fasInfoCircle} className="notes-icon" />
                  <div className="notes-content">
                    <span className="notes-label">Pick-up Instructions</span>
                    <p className="notes-value">{ride.notes}</p>
                  </div>
                </div>
              )}

              {driverInfo && (
                <div className="driver-info-card">
                  <div className="driver-header">
                    <h4 className="driver-title">Driver Assigned</h4>
                  </div>
                  <div className="driver-details">
                    <div className="driver-item">
                      <span className="driver-label">Name</span>
                      <p className="driver-value">
                        {driverInfo.first_name} {driverInfo.last_name}
                      </p>
                    </div>

                    {(driverInfo.phone ||
                      (driverProfile && driverProfile.phone_number)) && (
                      <div className="driver-item">
                        <span className="driver-label">Contact</span>
                        <p className="driver-value">
                          {driverInfo.phone ||
                            (driverProfile && driverProfile.phone_number)}
                        </p>
                      </div>
                    )}

                    {driverProfile && driverProfile.car_make && (
                      <div className="driver-item">
                        <span className="driver-label">Vehicle</span>
                        <p className="driver-value">{driverProfile.car_make}</p>
                      </div>
                    )}

                    {driverProfile && driverProfile.plate_number && (
                      <div className="driver-item">
                        <span className="driver-label">Plate</span>
                        <p className="driver-value">{driverProfile.plate_number}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="ride-actions">
                {canCancel && (
                  <button
                    className="cancel-button"
                    onClick={() => handleCancelRide(ride.id)}
                    disabled={cancellingId === ride.id}
                  >
                    <FontAwesomeIcon icon={fasTrash} />
                    {cancellingId === ride.id ? " Cancelling..." : " Cancel Request"}
                  </button>
                )}

                {!canCancel && ride.status === "open" && (
                  <p className="cannot-cancel-text">
                    Cannot cancel within 24 hours of departure
                  </p>
                )}

                {ride.status !== "open" && (
                  <p className="status-info-text">
                    This ride request is {ride.status.toLowerCase()}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RiderCurrentRide;