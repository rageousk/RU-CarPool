import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../css/Navbar.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRightFromBracket,
  faUser,
  faChevronDown,
  faGear,
} from "@fortawesome/free-solid-svg-icons";

export default function Navbar({ userProp }) {
  const [user, setUser] = useState(userProp || null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => setUser(userProp), [userProp]);

  // Logout logic
  const handleLogout = () => {
    localStorage.removeItem("ru_token");
    localStorage.removeItem("ru_email");
    setUser(null);
    navigate("/");
  };

  // Navigate to settings/profile page
  const handleSettings = () => {
    navigate("/settings"); 
  };

  return (
    <div className="navbar">
      {/* Left side links */}
      <div className="navbar-logo">
        <Link to={user ? "/dashboard" : "/"} className="app-name">
          UniRide
        </Link>
        <Link to="/" className="nav-link">
          Home
        </Link>
        <Link to="/about-us" className="nav-link">
          About Us
        </Link>
      </div>

      {/* Right side links */}
      <div className="navbar-links">
        {!user ? (
          <>
            <Link to="/login" className="login-icon">
              Login
            </Link>
            <Link to="/signup" className="signup-icon">
              Signup
            </Link>
          </>
        ) : (
          <div className="user-dropdown">
            <div
              className="user-info"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <FontAwesomeIcon icon={faUser} className="user-icon" />
              <span className="user-email">
                {user.email.split("@")[0]}
              </span>
              <FontAwesomeIcon
                icon={faChevronDown}
                className={`dropdown-icon ${
                  dropdownOpen ? "open" : ""
                }`}
              />
            </div>

            {dropdownOpen && (
              <div className="dropdown-menu">
                <button onClick={handleSettings} className="dropdown-item">
                  <FontAwesomeIcon icon={faGear} className="settings-icon" />
                  Settings
                </button>
                <button onClick={handleLogout} className="dropdown-item">
                  <FontAwesomeIcon
                    icon={faRightFromBracket}
                    className="logout-icon"
                  />
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}