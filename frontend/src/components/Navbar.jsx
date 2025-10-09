import React, { useState, useEffect } from "react";
//import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "../css/Navbar.css";
import { useNavigate } from "react-router-dom";

const Navbar = ({ userProp }) => {
    const [user, setUser] = useState(userProp || null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const navigate = useNavigate();
  
    // Update user state when userProp changes
    useEffect(() => {
      setUser(userProp);
    }, [userProp]);
  
    // Logout function
    const handleLogout = () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      alert("You have been logged out.");
      setUser(null); 
      navigate("/login");
    };
  
    // Toggle dropdown menu
    const toggleDropdown = () => {
      setDropdownOpen(!dropdownOpen);
    };
  
    return (
        <div className="navbar">
        <div className="navbar-logo">
          <span className="brand-name">
            <a href="/" className="app-name">
              RU Carpooling
            </a>
          </span>
          <a href="/about-us" className="nav-link">
            About Us
          </a>
        </div>

        <div className="navbar-links">
        {!user ? (
          <a href="/login" className="login-icon">Login</a>
        ) : (
          <div className="user-dropdown">
            <span className="nav-user-name" onClick={toggleDropdown}>
              {user.email.split("@")[0]} ▼
            </span>
            {dropdownOpen && (
              <div className="dropdown-menu">
                <button className="dropdown-item" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    );
  };

export default Navbar;