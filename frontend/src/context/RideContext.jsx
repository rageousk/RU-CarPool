import React, { createContext, useState, useContext, useEffect } from "react";

const RideContext = createContext();

export const RideProvider = ({ children }) => {
  const [rideRequests, setRideRequests] = useState(() => {
    const stored = localStorage.getItem("rideRequests");
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem("rideRequests", JSON.stringify(rideRequests));
  }, [rideRequests]);

  const addRideRequest = (ride) => setRideRequests((prev) => [...prev, ride]);
  const updateRideRequest = (id, updates) =>
    setRideRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));

  return (
    <RideContext.Provider value={{ rideRequests, addRideRequest, updateRideRequest }}>
      {children}
    </RideContext.Provider>
  );
};

export const useRides = () => useContext(RideContext);
