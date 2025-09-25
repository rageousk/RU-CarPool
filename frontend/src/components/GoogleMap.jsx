import React, { useState, useEffect } from "react";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "400px", // Adjust the height as needed
};

const defaultCenter = {
  lat: 40.7128, // Default latitude (New York City)
  lng: -74.006, // Default longitude (New York City)
};

const GoogleMapComponent = () => {
  const [currentLocation, setCurrentLocation] = useState(defaultCenter);

  useEffect(() => {
    // Use the Geolocation API to get the user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
    }
  }, []);

  return (
    <LoadScript googleMapsApiKey="AIzaSyB-Ep4rBtq2tecPJgVqHYS9vt6vKwFLFuE">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={currentLocation}
        zoom={12} // Adjust the zoom level as needed
      >
        {/* Add a marker to the map */}
        <Marker position={currentLocation} />
      </GoogleMap>
    </LoadScript>
  );
};

export default GoogleMapComponent;