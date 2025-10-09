import React, { useState, useEffect } from "react";
import { GoogleMap, Marker } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "100%",
};

const defaultCenter = {
  lat: 39.7107, // Rowan University Latitude
  lng: -75.121,  // Rowan University Longitude
};

const GoogleMapComponent = () => {
  const [currentLocation, setCurrentLocation] = useState(defaultCenter);

  useEffect(() => {
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
    }
  }, []);
  
  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={currentLocation}
      zoom={15}
      options={{ streetViewControl: false, mapTypeControl: false }}
    >
      <Marker position={currentLocation} />
    </GoogleMap>
  );
};

export default GoogleMapComponent;