import React, { useState } from "react";
import "../css/UserDashboard.css";
import RiderDashboard from "../components/RiderDashboard";
import DriverDashboard from "../components/DriverDashboard";

function UserDashboard({ user, signedIn, navigate }) {
  const [role, setRole] = useState("rider");

  return (
    // The main container for the entire application layout
    <div className="dashboard-app-layout">
      <header className="app-header-nav">
        <div className="driver-rider-switch">
          <button
            className={`rider-tab ${role === "rider" ? "active" : ""}`}
            onClick={() => setRole("rider")}
          >
            Rider
          </button>
          <button
            className={`driver-tab ${role === "driver" ? "active" : ""}`}
            onClick={() => setRole("driver")}
          >
            Driver
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="app-main-content">
        {role === "rider" && (
          <RiderDashboard 
            user={user} 
            signedIn={signedIn} 
            navigate={navigate} 
            setRole={setRole} // Passed down, though the switching happens via the parent buttons
          />
        )}
        
        {role === "driver" && (
          <DriverDashboard 
            user={user} 
            setRole={setRole} 
          />
        )}
      </main>
    </div>
  );
}

export default UserDashboard;