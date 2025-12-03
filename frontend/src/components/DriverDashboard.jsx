import React, { useState, useEffect } from "react";
import "../css/UserDashboard.css"; // Shared CSS
import "../css/DriverDashboard.css"; // New specific CSS
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarDays as farCalendarDays,
  faMessage as farMessage,
  faClockRotateLeft as fasHistory,
  faCircleQuestion as fasCircleQuestion,
  faCar as fasCar,
  faListCheck as fasListCheck,
  faUser as fasUser,
} from "@fortawesome/free-solid-svg-icons";
import { useRides } from "../context/RideContext.jsx";

const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5050";

// --- Hook to check if Google Maps API is loaded ---
const useGoogleMapsLoaded = () => {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      if (
        window.google &&
        window.google.maps &&
        window.google.maps.places &&
        window.google.maps.DirectionsService &&
        window.google.maps.DistanceMatrixService &&
        window.google.maps.Geocoder
      ) {
        setLoaded(true);
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);
  return loaded;
};

// --- Main DriverDashboard component ---
function DriverDashboard({ user }) {
  // State for managing which view is displayed
  const [activeView, setActiveView] = useState("requestedRides");

  const isMapsLoaded = useGoogleMapsLoaded();

  // Context - Get rideHistory, loading, error from RideContext
  const { rideRequests, updateRideRequest, rideHistory, currentRides, completeRide, loading, error, fetchCurrentRides, fetchRideRequests } = useRides() || {
    rideRequests: [],
    updateRideRequest: (id, data) => console.warn("updateRideRequest called without RideProvider:", id, data),
    rideHistory: [],
    currentRides: [],
    completeRide: (id) => console.warn("completeRide called without RideProvider:", id),
    loading: false,
    error: null,
    fetchCurrentRides: () => { },
    fetchRideRequests: () => { }
  };




  // --- Effect: Fetch history when viewing history tab ---
  useEffect(() => {
    if (activeView === 'history' || activeView === 'currentRide') {
      fetchCurrentRides();
    } else if (activeView === 'requestedRides') {
      fetchRideRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);


  const iconStyle = { color: "#555", width: "20px", textAlign: "center", marginRight: "10px" };

  // --- Render Views ---
  const renderActiveView = () => {
    switch (activeView) {
      case "currentRide":
        return (
          <div className="rides-list" style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <h3 style={{ marginBottom: '20px', color: '#343a40' }}>Current Accepted Rides</h3>

            {loading ? (
              <div className="loading-container">
                <div className="loading-text">Loading current rides...</div>
                <div className="loading-spinner"></div>
              </div>
            ) : currentRides && currentRides.length > 0 ? (
              <div className="table-container">
                <table className="rides-table">
                  <thead>
                    <tr>
                      <th style={{ width: '25%' }}>Pickup</th>
                      <th style={{ width: '25%' }}>Drop-off</th>
                      <th className="center" style={{ width: '10%' }}>Passengers</th>
                      <th className="center" style={{ width: '15%' }}>Departure</th>
                      <th className="center" style={{ width: '10%' }}>Status</th>
                      <th className="center" style={{ width: '15%' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRides.map((ride) => (
                      <tr key={ride.id}>
                        <td className="top-align">
                          <div className="location-cell">
                            <div className="location-text">{ride.pickup || 'N/A'}</div>
                          </div>
                        </td>
                        <td className="top-align">
                          <div className="location-cell">
                            <div className="location-text">{ride.dropoff || 'N/A'}</div>
                          </div>
                        </td>
                        <td className="passengers-cell">{ride.passengers || 'N/A'}</td>
                        <td className="datetime-cell">
                          {ride.datetime ? (
                            <div>
                              <div className="date-text">{new Date(ride.datetime).toLocaleDateString()}</div>
                              <div className="time-text">{new Date(ride.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                          ) : 'N/A'}
                        </td>
                        <td className="center">
                          <span className={`status-badge ${ride.status || 'accepted'}`}>
                            {ride.status || 'accepted'}
                          </span>
                        </td>
                        <td className="center">
                          <button
                            className="action-button accept"
                            onClick={() => completeRide(ride.claimId, ride)}
                            style={{ backgroundColor: '#28a745' }}
                          >
                            Complete Ride
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state-container">
                <div className="empty-state-icon">🚖</div>
                <h4 className="empty-state-title">No Active Rides</h4>
                <p className="empty-state-text">You don't have any active rides at the moment. Check "Requested Rides" to accept new ones!</p>
              </div>
            )}
          </div>
        );

      case "requestedRides":
        return (
          <div className="rides-list" style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <h3 style={{ marginBottom: '20px', color: '#343a40' }}>Incoming Ride Requests</h3>

            {loading ? (
              <div className="loading-container">
                <div className="loading-text">Loading ride requests...</div>
                <div className="loading-spinner"></div>
              </div>
            ) : rideRequests && rideRequests.length > 0 ? (
              <div className="table-container">
                <div className="debug-info"></div>
                <table className="rides-table">
                  <thead>
                    <tr>
                      <th style={{ width: '25%' }}>Pickup</th>
                      <th style={{ width: '25%' }}>Drop-off</th>
                      <th className="center" style={{ width: '10%' }}>Passengers</th>
                      <th className="center" style={{ width: '15%' }}>Departure</th>
                      <th className="center" style={{ width: '10%' }}>Status</th>
                      <th className="center" style={{ width: '15%' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rideRequests.filter(ride => ride.status === 'open').map((ride) => (
                      <tr key={ride.id}>
                        <td className="top-align">
                          <div className="location-cell">
                            <div className="location-text">{ride.pickup || 'N/A'}</div>
                          </div>
                        </td>
                        <td className="top-align">
                          <div className="location-cell">
                            <div className="location-text">{ride.dropoff || 'N/A'}</div>
                          </div>
                        </td>
                        <td className="passengers-cell">{ride.passengers || 'N/A'}</td>
                        <td className="datetime-cell">
                          {ride.datetime ? (
                            <div>
                              <div className="date-text">{new Date(ride.datetime).toLocaleDateString()}</div>
                              <div className="time-text">{new Date(ride.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                          ) : 'N/A'}
                        </td>
                        <td className="center">
                          <span className={`status-badge ${ride.status || 'open'}`}>
                            {ride.status || 'open'}
                          </span>
                        </td>
                        <td className="center">
                          <div className="action-buttons-container">
                            <button className="action-button accept" onClick={() => updateRideRequest(ride.id, { status: "accepted" }, ride)}>Accept</button>
                            <button className="action-button decline" onClick={() => updateRideRequest(ride.id, { status: "declined" }, ride)}>Decline</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {rideRequests.filter(ride => ride.status === 'open').length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#6c757d', fontStyle: 'italic' }}>
                          No open requests found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state-container">
                <div className="empty-state-icon">🚗</div>
                <h4 className="empty-state-title">No Ride Requests Available</h4>
                <p className="empty-state-text">There are no incoming ride requests at the moment. Check back later!</p>
              </div>
            )}
          </div>
        );

      case "history":
        return (
          <div className="rides-list" style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <div className="history-header">
              <h3 className="history-title">Ride History</h3>
              <div className="history-actions">
                <button onClick={fetchCurrentRides} disabled={loading} className="refresh-button">
                  {loading ? 'Refreshing...' : 'Refresh'}
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Clear all local declined ride history?')) {
                      localStorage.removeItem('declinedRides');
                      window.location.reload();
                    }
                  }}
                  className="clear-button"
                >
                  Clear Local
                </button>
              </div>
            </div>

            {error && <div className="error-message"><strong>Error:</strong> {error}</div>}

            {loading ? (
              <div className="loading-container">
                <div className="loading-text">Loading ride history...</div>
                <div className="loading-spinner"></div>
              </div>
            ) : rideHistory && rideHistory.length > 0 ? (
              <div className="table-container">
                <table className="rides-table">
                  <thead>
                    <tr>
                      <th style={{ width: '25%' }}>Pickup</th>
                      <th style={{ width: '25%' }}>Drop-off</th>
                      <th className="center" style={{ width: '10%' }}>Passengers</th>
                      <th className="center" style={{ width: '15%' }}>Departure</th>
                      <th className="center" style={{ width: '15%' }}>Status</th>
                      <th className="center" style={{ width: '10%' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rideHistory.map((ride) => (
                      <tr key={ride.id}>
                        <td className="top-align">
                          <div className="location-cell">
                            <div className="location-text">{ride.pickup || 'N/A'}</div>
                          </div>
                        </td>
                        <td className="top-align">
                          <div className="location-cell">
                            <div className="location-text">{ride.dropoff || 'N/A'}</div>
                          </div>
                        </td>
                        <td className="center" style={{ fontSize: '16px', fontWeight: '600', color: '#6c757d' }}>
                          {ride.passengers || 'N/A'}
                        </td>
                        <td className="datetime-cell">
                          {ride.datetime ? (
                            <div>
                              <div className="date-text">{new Date(ride.datetime).toLocaleDateString()}</div>
                              <div className="time-text">{new Date(ride.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                          ) : 'N/A'}
                        </td>
                        <td className="center">
                          <span className={`status-badge ${ride.status || 'unknown'}`}>
                            {ride.status || 'unknown'}
                          </span>
                        </td>
                        <td className="center" style={{ fontSize: '12px', color: '#6c757d' }}>
                          {ride.createdAt ? new Date(ride.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state-container">
                <div className="empty-state-icon">📚</div>
                <h4 className="empty-state-title">No Ride History</h4>
                <p className="empty-state-text">You haven't completed or declined any rides yet.</p>
              </div>
            )}
          </div>
        );

      case "schedule":
        return <div className="content-placeholder"><h2>Schedule</h2><p>Display future rides the driver is committed to...</p></div>;
      case "message":
        return <div className="content-placeholder"><h2>Messages</h2><p>Implement chat/messaging between driver and riders here...</p></div>;
      case "help":
        return <div className="content-placeholder"><h2>Help</h2><p>Display FAQs or support information here...</p></div>;
      default:
        return <div>Select an option from the sidebar.</div>;
    }
  };

  return (
    <div className="rider-dashboard-content">
      <aside className="sidebar">
        <nav className="nav-menu">
          <ul>
            <li className={activeView === 'currentRide' ? 'active' : ''} onClick={() => setActiveView('currentRide')}>
              <FontAwesomeIcon icon={fasCar} style={iconStyle} /> Current Ride
            </li>
            <li className={activeView === 'requestedRides' ? 'active' : ''} onClick={() => setActiveView('requestedRides')}>
              <FontAwesomeIcon icon={fasListCheck} style={iconStyle} /> Requested Rides
            </li>
            <li className={activeView === 'history' ? 'active' : ''} onClick={() => setActiveView('history')}>
              <FontAwesomeIcon icon={fasHistory} style={iconStyle} /> History
            </li>
            <li className={activeView === 'schedule' ? 'active' : ''} onClick={() => setActiveView('schedule')}>
              <FontAwesomeIcon icon={farCalendarDays} style={iconStyle} /> Schedule
            </li>
            <li onClick={() => window.location.href = '/messages'}>
              <FontAwesomeIcon icon={farMessage} style={iconStyle} /> Message
            </li>
            <li className={activeView === 'help' ? 'active' : ''} onClick={() => setActiveView('help')}>
              <FontAwesomeIcon icon={fasCircleQuestion} style={iconStyle} /> Help
            </li>
            <li onClick={() => window.location.href = '/profile'}>
              <FontAwesomeIcon icon={fasUser} style={iconStyle} /> Profile
            </li>
          </ul>
        </nav>
      </aside>
      <main className="dashboard-main">
        {isMapsLoaded ? renderActiveView() : <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>Loading Dashboard...</div>}
      </main>
    </div>
  );
}

export default DriverDashboard;