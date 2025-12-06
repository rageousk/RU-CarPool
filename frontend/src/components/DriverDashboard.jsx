import React, { useState, useRef, useEffect } from "react";
import usePlacesAutocomplete from "use-places-autocomplete";
import "../css/UserDashboard.css";
import "../css/DriverDashboard.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse as farHouse,
  faCalendarDays as farCalendarDays,
  faMessage as farMessage,
  faClockRotateLeft as fasHistory,
  faCircleQuestion as fasCircleQuestion,
  faLocationArrow as fasLocationArrow,
  faPlus as fasPlus,
  faCar as fasCar,
  faListCheck as fasListCheck,
  faMapPin as fasMapPin,
  faClock as fasClock,
  faUsers as fasUsers,
  faDollarSign as fasDollarSign,
  faInfoCircle as fasInfoCircle,
  faCheck as fasCheck,
  faTimes as fasTimes,
} from "@fortawesome/free-solid-svg-icons";
import { useRides } from "../context/RideContext.jsx";
import { GoogleMap, DirectionsRenderer, Marker } from "@react-google-maps/api";

const containerStyle = { width: "100%", height: "100%" };
const defaultCenter = { lat: 39.7107, lng: -75.121 };
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5050";
const BASE_RATE_PER_MILE = 1.00;

const calculatePricePerMile = (passengers) => {
  switch (passengers) {
    case 1: return 1.00;
    case 2: return 1.50;
    case 3: return 2.00;
    default: return 1.00;
  }
};

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

function DriverDashboard({ user }) {
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [seats, setSeats] = useState(1);
  const [manualPrice, setManualPrice] = useState("");
  const [activeInput, setActiveInput] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [userMarkerPosition, setUserMarkerPosition] = useState(null);
  const [directions, setDirections] = useState(null);
  const [distanceInfo, setDistanceInfo] = useState("");
  const [calculatedMiles, setCalculatedMiles] = useState(null);
  const [suggestedCost, setSuggestedCost] = useState(null);
  const [activeView, setActiveView] = useState("home");

  const { 
    rideRequests, 
    currentRides, 
    rideHistory, 
    declinedRides,
    updateRideRequest, 
    completeRide, 
    loading, 
    error, 
    fetchRideRequests, 
    fetchCurrentRides,
    cleanupExpiredRides
  } = useRides() || {
    rideRequests: [],
    currentRides: [],
    rideHistory: [],
    declinedRides: [],
    updateRideRequest: () => {},
    completeRide: () => {},
    loading: false,
    error: null,
    fetchRideRequests: () => {},
    fetchCurrentRides: () => {},
    cleanupExpiredRides: () => {},
  };

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

  useEffect(() => {
    if (cleanupExpiredRides) {
      cleanupExpiredRides();
    }
  }, []);

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

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { color: "#f39c12", text: "Pending" },
      accepted: { color: "#27ae60", text: "Accepted" },
      completed: { color: "#9b59b6", text: "Completed" },
      declined: { color: "#e74c3c", text: "Declined" },
      withdrawn: { color: "#95a5a6", text: "Withdrawn" },
    };
    return statusMap[status] || { color: "#95a5a6", text: status };
  };

  const iconStyle = { color: "#555", width: "20px", textAlign: "center", marginRight: "10px" };

  const renderActiveView = () => {
    switch (activeView) {
      case 'home':
        return (
          <div className="content-placeholder">
            <h2>Driver Dashboard</h2>
            <p>Home view content will be implemented here.</p>
          </div>
        );

      case "currentRide":
        return (
          <div className="driver-dashboard-container">
            <header className="dashboard-header">
              <h2>Current Rides</h2>
              <button 
                onClick={fetchCurrentRides}
                disabled={loading}
                className="refresh-button current-rides"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </header>
            
            {error && (
              <div className="error-state">
                <p>⚠️ {error}</p>
              </div>
            )}
            
            {loading ? (
              <div className="loading-state">
                <p>Loading current rides...</p>
              </div>
            ) : currentRides && currentRides.length > 0 ? (
              <div className="rides-list">
                {currentRides.map((ride) => {
                  const statusInfo = getStatusBadge(ride.status || 'accepted');
                  
                  return (
                    <div key={ride.id} className={`ride-card ride-status-${ride.status || 'accepted'}`}>
                      <div className="ride-header">
                        <h3 className="ride-title">
                          {ride.pickup || 'N/A'} → {ride.dropoff || 'N/A'}
                        </h3>
                        <span className="ride-status-badge" style={{ backgroundColor: statusInfo.color }}>
                          {statusInfo.text}
                        </span>
                      </div>

                      <div className="ride-details">
                        <div className="detail-item">
                          <div className="detail-icon" style={{ color: "#1abc9c" }}>
                            <FontAwesomeIcon icon={fasMapPin} />
                          </div>
                          <div className="detail-content">
                            <span className="detail-label">Pick-up</span>
                            <p className="detail-value">{ride.pickup || 'N/A'}</p>
                          </div>
                        </div>

                        <div className="detail-item">
                          <div className="detail-icon" style={{ color: "#e74c3c" }}>
                            <FontAwesomeIcon icon={fasMapPin} />
                          </div>
                          <div className="detail-content">
                            <span className="detail-label">Drop-off</span>
                            <p className="detail-value">{ride.dropoff || 'N/A'}</p>
                          </div>
                        </div>

                        <div className="detail-item">
                          <div className="detail-icon" style={{ color: "#3498db" }}>
                            <FontAwesomeIcon icon={fasClock} />
                          </div>
                          <div className="detail-content">
                            <span className="detail-label">Departure</span>
                            <p className="detail-value">
                              {ride.datetime ? formatDateTime(ride.datetime) : 'N/A'}
                            </p>
                          </div>
                        </div>

                        <div className="detail-item">
                          <div className="detail-icon" style={{ color: "#9b59b6" }}>
                            <FontAwesomeIcon icon={fasUsers} />
                          </div>
                          <div className="detail-content">
                            <span className="detail-label">Passengers</span>
                            <p className="detail-value">{ride.passengers || 'N/A'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="ride-actions">
                        <button 
                          onClick={() => completeRide(ride.claimId, ride)}
                          className="action-button complete"
                        >
                          <FontAwesomeIcon icon={fasCheck} />
                          Complete Ride
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : ( 
              <div className="empty-state">
                <div className="empty-state-icon">🚙</div>
                <h4>No Current Rides</h4>
                <p>You don't have any accepted rides at the moment.</p>
              </div>
            )}
          </div>
        );

      case "requestedRides":
        return (
          <div className="driver-dashboard-container">
            <header className="dashboard-header">
              <h2>Incoming Ride Requests</h2>
              <button 
                onClick={fetchRideRequests}
                disabled={loading}
                className="refresh-button"
              >
                {loading ? 'Refreshing...' : 'Refresh & Clean'}
              </button>
            </header>
            
            {error && (
              <div className="error-state">
                <p>⚠️ {error}</p>
              </div>
            )}
            
            {loading ? (
              <div className="loading-state">
                <p>Loading ride requests...</p>
              </div>
            ) : rideRequests && rideRequests.filter(ride => ride.status === 'pending').length > 0 ? (
              <div className="rides-list">
                {rideRequests.filter(ride => ride.status === 'pending').map((ride) => {
                  const statusInfo = getStatusBadge(ride.status || 'pending');
                  
                  return (
                    <div key={ride.id} className={`ride-card ride-status-${ride.status || 'pending'}`}>
                      <div className="ride-header">
                        <h3 className="ride-title">
                          {ride.pickup || 'N/A'} → {ride.dropoff || 'N/A'}
                        </h3>
                        <span className="ride-status-badge" style={{ backgroundColor: statusInfo.color }}>
                          {statusInfo.text}
                        </span>
                      </div>

                      <div className="ride-details">
                        <div className="detail-item">
                          <div className="detail-icon" style={{ color: "#1abc9c" }}>
                            <FontAwesomeIcon icon={fasMapPin} />
                          </div>
                          <div className="detail-content">
                            <span className="detail-label">Pick-up</span>
                            <p className="detail-value">{ride.pickup || 'N/A'}</p>
                          </div>
                        </div>

                        <div className="detail-item">
                          <div className="detail-icon" style={{ color: "#e74c3c" }}>
                            <FontAwesomeIcon icon={fasMapPin} />
                          </div>
                          <div className="detail-content">
                            <span className="detail-label">Drop-off</span>
                            <p className="detail-value">{ride.dropoff || 'N/A'}</p>
                          </div>
                        </div>

                        <div className="detail-item">
                          <div className="detail-icon" style={{ color: "#3498db" }}>
                            <FontAwesomeIcon icon={fasClock} />
                          </div>
                          <div className="detail-content">
                            <span className="detail-label">Departure</span>
                            <p className="detail-value">
                              {ride.datetime ? formatDateTime(ride.datetime) : 'N/A'}
                            </p>
                          </div>
                        </div>

                        <div className="detail-item">
                          <div className="detail-icon" style={{ color: "#9b59b6" }}>
                            <FontAwesomeIcon icon={fasUsers} />
                          </div>
                          <div className="detail-content">
                            <span className="detail-label">Passengers</span>
                            <p className="detail-value">{ride.passengers || 'N/A'}</p>
                          </div>
                        </div>
                      </div>

                      {ride.riderInfo && (
                        <div className="rider-info-card">
                          <div className="rider-header">
                            <h4 className="rider-title">Rider Information</h4>
                          </div>
                          <div className="rider-details">
                            <div className="rider-item">
                              <span className="rider-label">Name</span>
                              <p className="rider-value">
                                {ride.riderInfo.first_name} {ride.riderInfo.last_name}
                              </p>
                            </div>
                            {ride.riderInfo.phone && (
                              <div className="rider-item">
                                <span className="rider-label">Contact</span>
                                <p className="rider-value">{ride.riderInfo.phone}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {ride.notes && (
                        <div className="ride-notes">
                          <FontAwesomeIcon icon={fasInfoCircle} className="notes-icon" />
                          <div className="notes-content">
                            <span className="notes-label">Pick-up Instructions</span>
                            <p className="notes-value">{ride.notes}</p>
                          </div>
                        </div>
                      )}

                      <div className="ride-actions">
                        <button 
                          className="action-button accept" 
                          onClick={() => updateRideRequest(ride.id, { status: "accepted" }, ride)}
                        >
                          <FontAwesomeIcon icon={fasCheck} />
                          Accept
                        </button>
                        <button 
                          className="action-button decline" 
                          onClick={() => updateRideRequest(ride.id, { status: "declined" }, ride)}
                        >
                          <FontAwesomeIcon icon={fasTimes} />
                          Decline
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : ( 
              <div className="empty-state">
                <div className="empty-state-icon">🚗</div>
                <h4>No Ride Requests Available</h4>
                <p>There are no incoming ride requests at the moment. Check back later!</p>
              </div>
            )}
          </div>
        );

      case "history":
        return (
          <div className="driver-dashboard-container">
            <header className="dashboard-header">
              <h2>Ride History</h2>
              <div className="header-actions">
                <button 
                  onClick={fetchCurrentRides}
                  disabled={loading}
                  className="refresh-button history"
                >
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
            </header>
            
            {error && (
              <div className="error-state">
                <p>⚠️ {error}</p>
              </div>
            )}
            
            {loading ? (
              <div className="loading-state">
                <p>Loading ride history...</p>
              </div>
            ) : rideHistory && rideHistory.length > 0 ? (
              <div className="rides-list">
                {rideHistory.map((ride) => {
                  const statusInfo = getStatusBadge(ride.status);
                  
                  return (
                    <div key={ride.id} className={`ride-card ride-status-${ride.status}`}>
                      <div className="ride-header">
                        <h3 className="ride-title">
                          {ride.pickup || 'N/A'} → {ride.dropoff || 'N/A'}
                        </h3>
                        <span className="ride-status-badge" style={{ backgroundColor: statusInfo.color }}>
                          {statusInfo.text}
                        </span>
                      </div>

                      <div className="ride-details">
                        <div className="detail-item">
                          <div className="detail-icon" style={{ color: "#1abc9c" }}>
                            <FontAwesomeIcon icon={fasMapPin} />
                          </div>
                          <div className="detail-content">
                            <span className="detail-label">Pick-up</span>
                            <p className="detail-value">{ride.pickup || 'N/A'}</p>
                          </div>
                        </div>

                        <div className="detail-item">
                          <div className="detail-icon" style={{ color: "#e74c3c" }}>
                            <FontAwesomeIcon icon={fasMapPin} />
                          </div>
                          <div className="detail-content">
                            <span className="detail-label">Drop-off</span>
                            <p className="detail-value">{ride.dropoff || 'N/A'}</p>
                          </div>
                        </div>

                        <div className="detail-item">
                          <div className="detail-icon" style={{ color: "#3498db" }}>
                            <FontAwesomeIcon icon={fasClock} />
                          </div>
                          <div className="detail-content">
                            <span className="detail-label">Departure</span>
                            <p className="detail-value">
                              {ride.datetime ? formatDateTime(ride.datetime) : 'N/A'}
                            </p>
                          </div>
                        </div>

                        <div className="detail-item">
                          <div className="detail-icon" style={{ color: "#9b59b6" }}>
                            <FontAwesomeIcon icon={fasUsers} />
                          </div>
                          <div className="detail-content">
                            <span className="detail-label">Passengers</span>
                            <p className="detail-value">{ride.passengers || 'N/A'}</p>
                          </div>
                        </div>

                        <div className="detail-item">
                          <div className="detail-icon" style={{ color: "#95a5a6" }}>
                            <FontAwesomeIcon icon={fasClock} />
                          </div>
                          <div className="detail-content">
                            <span className="detail-label">Completed On</span>
                            <p className="detail-value">
                              {ride.createdAt ? new Date(ride.createdAt).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : ( 
              <div className="empty-state">
                <div className="empty-state-icon">📚</div>
                <h4>No Ride History</h4>
                <p>You haven't completed or declined any rides yet.</p>
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
            <li className={activeView === 'home' ? 'active' : ''} onClick={() => setActiveView('home')}>
              <FontAwesomeIcon icon={farHouse} style={iconStyle} /> Home
            </li>
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
            <li className={activeView === 'message' ? 'active' : ''} onClick={() => setActiveView('message')}>
              <FontAwesomeIcon icon={farMessage} style={iconStyle} /> Message
            </li>
            <li className={activeView === 'help' ? 'active' : ''} onClick={() => setActiveView('help')}>
              <FontAwesomeIcon icon={fasCircleQuestion} style={iconStyle} /> Help
            </li>
          </ul>
        </nav>
      </aside>
      <main className="dashboard-main">
        {isMapsLoaded ? renderActiveView() : <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}>Loading Dashboard...</div>}
      </main>
    </div>
  );
}

export default DriverDashboard;