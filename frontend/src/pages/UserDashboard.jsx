import React, { useState, useEffect } from "react";
import "../css/UserDashboard.css";
import RiderDashboard from "../components/RiderDashboard";
import DriverDashboard from "../components/DriverDashboard";

function UserDashboard({ user }) {
  // Preserve the role state in localStorage
  const [role, setRole] = useState(() => {
    return localStorage.getItem("dashboard_view") || "rider";
  });

  // Update localStorage when role changes
  useEffect(() => {
    localStorage.setItem("dashboard_view", role);
  }, [role]);

  return (
    <div className="dashboard">
      <header>
        <h1>Welcome, {user.name}</h1>
        <div className="role-toggle">
          <button className={role === "rider" ? "active" : ""} onClick={() => setRole("rider")}>
            Rider View
          </button>
          <button className={role === "driver" ? "active" : ""} onClick={() => setRole("driver")}>
            Driver View
          </button>
        </div>
      </header>

      <main>
        {role === "rider" && <RiderDashboard user={user} />}
        {role === "driver" && <DriverDashboard user={user} />}
      </main>
    </div>
  );
}

export default UserDashboard;
