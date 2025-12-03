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
        throw new Error(errorData.error || `Failed to fetch rides: ${response.status}`);
      }

      const data = await response.json();
      setRides(data.demands || []);
    } catch (err) {
      console.error("Error fetching rides:", err);
      setError(err.message || "Failed to load your ride requests.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle cancelling a ride request
   * Only available for "open" rides at least 24 hours before departure
   */
  const handleCancelRide = async (rideId) => {
    if (!token) {
      alert("Authentication required to cancel a ride.");
      return;
    }

    // Confirm cancellation
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
        throw new Error(errorData.error || `Failed to cancel ride: ${response.status}`);
      }

      // Update the ride status locally
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

  /**
   * Format departure time for display in Eastern Time
   */
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
        timeZone: "America/New_York" // Force Eastern Time display
      });
    } catch {
      return isoString;
    }
  };

  /**
   * Get status badge color and text based on demand and claim status
   */
  const getStatusBadge = (ride) => {
    // If there are claims attached, use the first claim status
    if (ride.ride_claims && ride.ride_claims.length > 0) {
      const claim = ride.ride_claims[0];
      if (claim.status === "accepted") {
        return { color: "#27ae60", text: "Accepted" };
      }
    }

    // Otherwise use demand status, map "open" to "Pending" and "claimed" to "Accepted"
    const statusMap = {
      open: { color: "#3498db", text: "Pending" },
      claimed: { color: "#27ae60", text: "Accepted" },
      completed: { color: "#9b59b6", text: "Completed" },
      cancelled: { color: "#e74c3c", text: "Cancelled" },
    };
    return statusMap[ride.status] || { color: "#95a5a6", text: ride.status };
  };

  // --- Render Loading State ---
  if (loading) {
    return (
      <div className="current-ride-container">
        <header className="dashboard-header">
          <div className="title-area">
            <h2>My Ride Requests</h2>
          </div>
        </header>
        <div className="loading-state">
          <p>Loading your ride requests...</p>
        </div>
      </div>
    );
  }

  // --- Render Error State ---
  if (error) {
    return (
      <div className="current-ride-container">
        <header className="dashboard-header">
          <div className="title-area">
            <h2>My Ride Requests</h2>
          </div>
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

  // --- Render Empty State ---
  if (rides.length === 0) {
    return (
      <div className="current-ride-container">
        <header className="dashboard-header">
          <div className="title-area">
            <h2>My Ride Requests</h2>
          </div>
        </header>
        <div className="empty-state">
          <p>No active ride requests.</p>
          <p className="empty-subtitle">Request a ride from the Home tab to get started!</p>
        </div>
      </div>
    );
  }

  // Filter out completed and cancelled rides
  const activeRides = rides.filter(
    (ride) => ride.status !== "completed" && ride.status !== "cancelled"
  );

  // --- Render Empty Active Rides State ---
  if (activeRides.length === 0) {
    return (
      <div className="current-ride-container">
        <header className="dashboard-header">
          <div className="title-area">
            <h2>My Ride Requests</h2>
          </div>
        </header>
        <div className="empty-state">
          <p>No active ride requests.</p>
          <p className="empty-subtitle">Check your History for past rides or request a new one!</p>
        </div>
      </div>
    );
  }

  // --- Render Rides List ---
  return (
    <div className="current-ride-container">
      <header className="dashboard-header">
        <div className="title-area">
          <h2>My Ride Requests</h2>
        </div>
      </header>

      <div className="rides-list">
        {activeRides
          .map((ride) => {
          const statusInfo = getStatusBadge(ride);
          const canCancel =
            ride.status === "open" &&
            new Date(ride.departure_time) - new Date() > 24 * 60 * 60 * 1000;
          
          // Get driver info if claim exists
          const driverInfo = ride.ride_claims && ride.ride_claims.length > 0
            ? ride.ride_claims[0].driver_user
            : null;
          const driverProfile = ride.ride_claims && ride.ride_claims.length > 0
            ? ride.ride_claims[0].driver_profile
            : null;

          return (
            <div
              key={ride.id}
              className={`ride-card ride-status-${ride.status}`}
              data-status={ride.status}
            >
              {/* Status Badge */}
              <div className="ride-header">
                <div>
                  <h3 className="ride-title">
                    {ride.origin} → {ride.destination}
                  </h3>
                </div>
                <span
                  className="status-badge"
                  style={{ backgroundColor: statusInfo.color }}
                >
                  {statusInfo.text}
                </span>
              </div>

              {/* Ride Details Grid */}
              <div className="ride-details">
                {/* Pickup Location */}
                <div className="detail-item">
                  <div className="detail-icon" style={{ color: "#1abc9c" }}>
                    <FontAwesomeIcon icon={fasMapPin} />
                  </div>
                  <div className="detail-content">
                    <span className="detail-label">Pick-up</span>
                    <p className="detail-value">{ride.origin}</p>
                  </div>
                </div>

                {/* Dropoff Location */}
                <div className="detail-item">
                  <div className="detail-icon" style={{ color: "#e74c3c" }}>
                    <FontAwesomeIcon icon={fasMapPin} />
                  </div>
                  <div className="detail-content">
                    <span className="detail-label">Drop-off</span>
                    <p className="detail-value">{ride.destination}</p>
                  </div>
                </div>

                {/* Departure Time */}
                <div className="detail-item">
                  <div className="detail-icon" style={{ color: "#3498db" }}>
                    <FontAwesomeIcon icon={fasClock} />
                  </div>
                  <div className="detail-content">
                    <span className="detail-label">Departure</span>
                    <p className="detail-value">
                      {formatDateTime(ride.departure_time)}
                    </p>
                  </div>
                </div>

                {/* Passengers */}
                <div className="detail-item">
                  <div className="detail-icon" style={{ color: "#9b59b6" }}>
                    <FontAwesomeIcon icon={fasUsers} />
                  </div>
                  <div className="detail-content">
                    <span className="detail-label">Passengers</span>
                    <p className="detail-value">{ride.seats_needed}</p>
                  </div>
                </div>

                {/* Estimated Cost */}
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

              {/* Pickup Notes */}
              {ride.notes && (
                <div className="ride-notes">
                  <div className="notes-icon">
                    <FontAwesomeIcon icon={fasInfoCircle} />
                  </div>
                  <div className="notes-content">
                    <span className="notes-label">Pick-up Instructions</span>
                    <p className="notes-value">{ride.notes}</p>
                  </div>
                </div>
              )}

              {/* Driver Information (if claimed/accepted) */}
              {driverInfo ? (
                <div className="driver-info-card">
                  <div className="driver-header">
                    <h4 className="driver-title">Driver Assigned</h4>
                  </div>
                  <div className="driver-details">
                    <div className="driver-item">
                      <span className="driver-label">Name</span>
                      <p className="driver-value">
                        {driverInfo.first_name || "N/A"} {driverInfo.last_name || ""}
                      </p>
                    </div>
                    { (driverInfo.phone || (driverProfile && driverProfile.phone_number)) && (
                      <div className="driver-item">
                        <span className="driver-label">Contact</span>
                        <p className="driver-value">{driverInfo.phone || (driverProfile && driverProfile.phone_number)}</p>
                      </div>
                    )}

                    {/* Vehicle / profile details from driver table when available */}
                    {driverProfile && (
                      <>
                        {driverProfile.car_make && (
                          <div className="driver-item">
                            <span className="driver-label">Vehicle</span>
                            <p className="driver-value">{driverProfile.car_make}</p>
                          </div>
                        )}
                        {driverProfile.plate_number && (
                          <div className="driver-item">
                            <span className="driver-label">Plate</span>
                            <p className="driver-value">{driverProfile.plate_number}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : ride.ride_claims && ride.ride_claims.length > 0 ? (
                <div className="driver-info-card" style={{opacity: 0.6}}>
                  <p style={{margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '14px'}}>
                    Driver info loading...
                  </p>
                </div>
              ) : null}

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
