import React, { useState } from "react";
import "../css/UserDashboard.css";
import RiderDashboard from "../components/RiderDashboard";
import DriverDashboard from "../components/DriverDashboard";

function UserDashboard({ user }) {
  const [role, setRole] = useState("rider");

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
