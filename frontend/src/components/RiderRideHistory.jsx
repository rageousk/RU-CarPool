import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMapPin as fasMapPin,
  faClock as fasClock,
  faUsers as fasUsers,
  faDollarSign as fasDollarSign,
  faInfoCircle as fasInfoCircle,
  faCheckCircle as fasCheckCircle,
  faTimesCircle as fasTimesCircle,
} from "@fortawesome/free-solid-svg-icons";
import "../css/RiderCurrentRide.css"; // Reuse the same styles

const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5050";

/**
 * RiderRideHistory Component
 * Displays completed and cancelled ride requests for the current rider
 */
function RiderRideHistory({ user, token }) {
  const [rides, setRides] = useState([]); // List of rider's completed/cancelled demands
  const [loading, setLoading] = useState(true); // Loading state
  const [error, setError] = useState(null); // Error message

  // Fetch user's ride history on component mount
  useEffect(() => {
    fetchMyRideHistory();
  }, [token, user?.id]);

  /**
   * Fetch all completed and cancelled ride requests for the current user
   */
  const fetchMyRideHistory = async () => {
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
      // Filter only completed and cancelled rides
      const historyRides = (data.demands || []).filter(
        (ride) => ride.status === "completed" || ride.status === "cancelled"
      );
      setRides(historyRides);
    } catch (err) {
      console.error("Error fetching ride history:", err);
      setError(err.message || "Failed to load your ride history.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Format departure time for display
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
      });
    } catch {
      return isoString;
    }
  };

  /**
   * Get status badge color and icon based on ride status
   */
  const getStatusInfo = (status) => {
    const statusMap = {
      completed: {
        color: "#27ae60",
        text: "Completed",
        icon: fasCheckCircle,
      },
      cancelled: {
        color: "#e74c3c",
        text: "Cancelled",
        icon: fasTimesCircle,
      },
    };
    return statusMap[status] || { color: "#95a5a6", text: status, icon: null };
  };

  // --- Render Loading State ---
  if (loading) {
    return (
      <div className="current-ride-container">
        <header className="dashboard-header">
          <div className="title-area">
            <h2>Ride History</h2>
          </div>
        </header>
        <div className="loading-state">
          <p>Loading your ride history...</p>
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
            <h2>Ride History</h2>
          </div>
        </header>
        <div className="error-state">
          <p>⚠️ {error}</p>
          <button onClick={fetchMyRideHistory} className="retry-button">
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
            <h2>Ride History</h2>
          </div>
        </header>
        <div className="empty-state">
          <p>No ride history yet.</p>
          <p className="empty-subtitle">Your completed and cancelled rides will appear here.</p>
        </div>
      </div>
    );
  }

  // --- Render Rides History List ---
  return (
    <div className="current-ride-container">
      <header className="dashboard-header">
        <div className="title-area">
          <h2>Ride History</h2>
        </div>
      </header>

      <div className="rides-list">
        {rides.map((ride) => {
          const statusInfo = getStatusInfo(ride.status);
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
                  {statusInfo.icon && (
                    <>
                      <FontAwesomeIcon icon={statusInfo.icon} /> {" "}
                    </>
                  )}
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

              {/* Driver Information (if ride was completed with a driver) */}
              {ride.status === "completed" && (driverInfo || driverProfile) && (
                <div className="driver-info-card">
                  <div className="driver-header">
                    <h4 className="driver-title">Driver</h4>
                  </div>
                  <div className="driver-details">
                    {driverInfo && (
                      <div className="driver-item">
                        <span className="driver-label">Name</span>
                        <p className="driver-value">
                          {driverInfo.first_name || "N/A"} {driverInfo.last_name || ""}
                        </p>
                      </div>
                    )}

                    { (driverInfo && driverInfo.phone) || (driverProfile && driverProfile.phone_number) ? (
                      <div className="driver-item">
                        <span className="driver-label">Contact</span>
                        <p className="driver-value">{driverInfo?.phone || driverProfile?.phone_number}</p>
                      </div>
                    ) : null}

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
                        {driverProfile.license && (
                          <div className="driver-item">
                            <span className="driver-label">License</span>
                            <p className="driver-value">{driverProfile.license}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RiderRideHistory;
