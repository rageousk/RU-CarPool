// src/components/Navbar.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient"; // ✅ import supabase client
import "../css/Navbar.css";

export default function Navbar({ userProp }) {
  const [user, setUser] = useState(userProp || null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => setUser(userProp), [userProp]);

  const handleLogout = async () => {
    try {
      // ✅ Sign out from Supabase (ends auth session)
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error.message);
    } finally {
      // ✅ Clear any custom tokens/local data
      localStorage.removeItem("ru_token");
      localStorage.removeItem("ru_email");
      setUser(null);
      // ✅ Navigate to login page
      navigate("/login");
    }
  };

  return (
    <div className="navbar">
      <div className="navbar-logo">
        <Link to="/" className="app-name">UniRide</Link>
        <Link to="/about-us" className="nav-link">About Us</Link>
      </div>

      <div className="navbar-links">
        {!user ? (
          <>
            <Link to="/login" className="login-icon">Login</Link>
            <Link to="/signup" className="signup-icon">Signup</Link>
          </>
        ) : (
          <div className="user-dropdown">
            <span onClick={() => setDropdownOpen(!dropdownOpen)}>
              {user.email.split("@")[0]} ▼
            </span>
            {dropdownOpen && (
              <div className="dropdown-menu">
                <button onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}