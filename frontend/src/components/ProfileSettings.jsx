import React, { useState, useEffect } from "react";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserCircle, faSave } from "@fortawesome/free-solid-svg-icons";
import "../css/ProfileSettings.css";

export default function ProfileSettings({ userId }) {
  const [user, setUser] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Fetch user info when userId is available
  useEffect(() => {
    if (!userId) return;

    const fetchUser = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(`/api/users/${userId}`);
        setUser(res.data);
      } catch (err) {
        console.error("Error fetching user:", err);
        setError("Failed to load user information.");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setUser({ ...user, [name]: type === "checkbox" ? checked : value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      setUser({ ...user, profile_picture: file });
    }
  };

  const handleSave = async () => {
    if (!userId || !user) return;
    setSaving(true);
    try {
      const payload = {
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        is_driver: user.is_driver,
      };
      await axios.patch(`/api/users/${userId}`, payload);
      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Error updating profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="settings-loading">Loading...</div>;
  if (error) return <div className="settings-error">{error}</div>;

  return (
    <div className="settings-container">
      <h2 className="settings-title">Profile Settings</h2>
      <div className="profile-section">
        <div className="profile-picture">
          {preview ? (
            <img src={preview} alt="Preview" className="profile-preview" />
          ) : (
            <FontAwesomeIcon icon={faUserCircle} className="profile-icon" />
          )}
          <label htmlFor="profile-upload" className="upload-btn">
            Upload Photo
          </label>
          <input
            id="profile-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            hidden
          />
        </div>

        <div className="profile-form">
          <div className="form-group">
            <label>First Name</label>
            <input type="text" name="first_name" value={user?.first_name || ""} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Last Name</label>
            <input type="text" name="last_name" value={user?.last_name || ""} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input type="tel" name="phone" value={user?.phone || ""} onChange={handleChange} />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input type="checkbox" name="is_driver" checked={user?.is_driver || false} onChange={handleChange} />
              I am a driver
            </label>
          </div>

          <button onClick={handleSave} disabled={saving} className="save-btn">
            <FontAwesomeIcon icon={faSave} /> {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}