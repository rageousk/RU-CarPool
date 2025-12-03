import React, { useState, useEffect } from "react";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUserCircle,
  faSave,
  faCar,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import "../css/ProfileSettings.css";

export default function ProfileSettings({ userId }) {
  const [profile, setProfile] = useState(null);
  const [driver, setDriver] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isDriver, setIsDriver] = useState(false);

  // Password state
  const [passwords, setPasswords] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  // Use the correct token from localStorage
  const token = localStorage.getItem("ru_token");

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5050";

  // Axios instance with Authorization header
  const api = axios.create({
    baseURL: apiBase,
    headers: { Authorization: `Bearer ${token}` },
  });

  /* ---------------------------- Load User Info ---------------------------- */
  useEffect(() => {
    if (!userId || !token) return;

    const fetchProfile = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get(`/api/users/me`);
        setProfile(data.profile);
        setIsDriver(data.profile.is_driver || false);
        if (data.profile.is_driver && data.driver) {
          setDriver(data.driver);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load your profile information.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId, token]);

  /* ----------------------------- Handle Changes ----------------------------- */
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleDriverChange = (e) => {
    const { name, value } = e.target;
    setDriver((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      alert("Profile photo preview updated (not yet saved to backend).");
    }
  };

  /* ----------------------------- Save Changes ----------------------------- */
  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      // Update basic profile
      await api.patch("/api/users/me", {
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
      });

      // Update or remove driver record
      if (isDriver) {
        if (driver) {
          await api.put("/api/users/me/driver", driver);
        } else {
          await api.put("/api/users/me/driver", {});
        }
      } else {
        await api.delete("/api/users/me/driver");
      }

      // Update password if provided
      if (passwords.new_password) {
        if (passwords.new_password !== passwords.confirm_password) {
          alert("New passwords do not match.");
          setSaving(false);
          return;
        }
        await api.post("/api/users/me/change-password", {
          current_password: passwords.current_password,
          new_password: passwords.new_password,
        });
        // Clear password fields after success
        setPasswords({ current_password: "", new_password: "", confirm_password: "" });
      }

      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Error saving profile:", err);
      alert("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="settings-loading">Loading...</div>;
  if (error) return <div className="settings-error">{error}</div>;

  /* ------------------------------ JSX Layout ------------------------------ */
  return (
    <div className="settings-container">
      <h2 className="settings-title">Profile Settings</h2>

      <div className="profile-section">
        <div className="profile-form">
          <div className="form-group">
            <label>First Name</label>
            <input
              name="first_name"
              type="text"
              value={profile.first_name || ""}
              onChange={handleProfileChange}
            />
          </div>

          <div className="form-group">
            <label>Last Name</label>
            <input
              name="last_name"
              type="text"
              value={profile.last_name || ""}
              onChange={handleProfileChange}
            />
          </div>

          <div className="form-group">
            <label>Phone</label>
            <input
              name="phone"
              type="tel"
              value={profile.phone || ""}
              onChange={handleProfileChange}
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={isDriver}
                onChange={(e) => setIsDriver(e.target.checked)}
              />{" "}
              I am a driver
            </label>
          </div>
        </div>
      </div>

      {isDriver && (
        <div className="driver-section">
          <h3 className="driver-title">
            <FontAwesomeIcon icon={faCar} /> Driver Information
          </h3>

          <div className="driver-form">
            <div className="form-group">
              <label>Plate Number</label>
              <input
                name="plate_number"
                type="text"
                value={driver?.plate_number || ""}
                onChange={handleDriverChange}
              />
            </div>

            <div className="form-group">
              <label>Car Make</label>
              <input
                name="car_make"
                type="text"
                value={driver?.car_make || ""}
                onChange={handleDriverChange}
              />
            </div>

            <div className="form-group">
              <label>License</label>
              <input
                name="license"
                type="text"
                value={driver?.license || ""}
                onChange={handleDriverChange}
              />
            </div>

            <div className="form-group">
              <label>Insurance</label>
              <input
                name="car_insurance"
                type="text"
                value={driver?.car_insurance || ""}
                onChange={handleDriverChange}
              />
            </div>

            <div className="form-group">
              <label>Driver Phone</label>
              <input
                name="phone_number"
                type="tel"
                value={driver?.phone_number || ""}
                onChange={handleDriverChange}
              />
            </div>

            <button
              onClick={async () => {
                if (
                  window.confirm(
                    "Are you sure you want to delete your driver profile?"
                  )
                ) {
                  await api.delete("/api/users/me/driver");
                  setDriver(null);
                  setIsDriver(false);
                  alert("Driver profile removed.");
                }
              }}
              className="delete-driver-btn"
            >
              <FontAwesomeIcon icon={faTrash} /> Remove Driver Profile
            </button>
          </div>
        </div>
      )}

      {/* ------------------------ PASSWORD CHANGE ------------------------ */}
      <div className="password-section">
        <h3 className="password-title">Change Password</h3>

        <div className="form-group">
          <label>Current Password</label>
          <input
            name="current_password"
            type="password"
            value={passwords.current_password}
            onChange={handlePasswordChange}
            placeholder="Enter current password"
          />
        </div>

        <div className="form-group">
          <label>New Password</label>
          <input
            name="new_password"
            type="password"
            value={passwords.new_password}
            onChange={handlePasswordChange}
            placeholder="Enter new password"
          />
        </div>

        <div className="form-group">
          <label>Confirm New Password</label>
          <input
            name="confirm_password"
            type="password"
            value={passwords.confirm_password}
            onChange={handlePasswordChange}
            placeholder="Confirm new password"
          />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="save-btn">
        <FontAwesomeIcon icon={faSave} />{" "}
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}