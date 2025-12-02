import React, { createContext, useState, useContext, useEffect } from "react";

const RideContext = createContext();

const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5050";

export const RideProvider = ({ children }) => {
  const [rideRequests, setRideRequests] = useState([]);
  const [currentRides, setCurrentRides] = useState([]);
  const [rideHistory, setRideHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch open ride demands from backend
  const fetchRideRequests = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBase}/api/demands/open`);

      if (!response.ok) {
        throw new Error(`Failed to fetch ride requests: ${response.status}`);
      }

      const data = await response.json();

      // Map the backend demand structure to match frontend expectations
      const mappedRequests = data.demands?.map(demand => ({
        id: demand.id,
        pickup: demand.origin,
        dropoff: demand.destination,
        passengers: demand.seats_needed,
        datetime: demand.departure_time,
        status: demand.status,
        riderId: demand.rider_id,
        createdAt: demand.created_at
      })) || [];

      setRideRequests(mappedRequests);
    } catch (err) {
      console.error("Error fetching ride requests:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch current rides (claims) for the driver
  const fetchCurrentRides = async () => {
    setLoading(true);
    setError(null);

    try {
      // Add timestamp to prevent caching
      const response = await fetch(`${apiBase}/api/claims/mine?t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ru_token')}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Not logged in or token expired
          return;
        }
        throw new Error(`Failed to fetch current rides: ${response.status}`);
      }

      const data = await response.json();

      // Filter for active rides (accepted)
      const acceptedClaims = data.claims?.filter(claim => claim.status === 'accepted') || [];

      const currentRides = acceptedClaims.map(claim => ({
        id: claim.id,
        claimId: claim.id,
        demandId: claim.demand?.id,
        pickup: claim.demand?.origin,
        dropoff: claim.demand?.destination,
        passengers: claim.demand?.seats_needed,
        datetime: claim.demand?.departure_time,
        status: claim.status,
        riderId: claim.demand?.rider_id,
        acceptedAt: claim.created_at
      }));

      // Filter and map ride history (completed, declined, withdrawn)
      const history = data.claims?.filter(claim =>
        ['completed', 'declined', 'withdrawn'].includes(claim.status)
      ).map(claim => ({
        id: claim.id,
        claimId: claim.id,
        demandId: claim.demand?.id,
        pickup: claim.demand?.origin,
        dropoff: claim.demand?.destination,
        passengers: claim.demand?.seats_needed,
        datetime: claim.demand?.departure_time,
        status: claim.status, // Keep original status for now
        riderId: claim.demand?.rider_id,
        completedAt: claim.created_at
      })) || [];

      setCurrentRides(currentRides);

      // All history (completed, declined, withdrawn) comes from database
      // Sort by creation date (newest first)
      history.sort((a, b) => new Date(b.createdAt || b.completedAt) - new Date(a.createdAt || a.completedAt));

      setRideHistory(history);
    } catch (err) {
      console.error("Error fetching current rides:", err);
      setError(err.message);
      setCurrentRides([]);
      setRideHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // Update ride request status (accept/decline)
  const updateRideRequest = async (id, updates, rideDetails = null) => {
    if (updates.status === 'accepted') {
      const confirmMessage = rideDetails
        ? `Are you sure you want to accept this ride?\n\nFrom: ${rideDetails.pickup}\nTo: ${rideDetails.dropoff}\nPassengers: ${rideDetails.passengers}\nDeparture: ${new Date(rideDetails.datetime).toLocaleString()}`
        : 'Are you sure you want to accept this ride request?';

      const confirmed = window.confirm(confirmMessage);

      if (!confirmed) {
        return; // User cancelled, don't proceed
      }

      try {
        // Get auth token from localStorage
        const token = localStorage.getItem('ru_token');

        if (!token) {
          throw new Error('Authentication token not found. Please log in again.');
        }

        const response = await fetch(`${apiBase}/api/demands/${id}/claims`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(errorData.error || `Failed to accept ride request: ${response.status}`);
        }

        // Remove the accepted request from the list since it's no longer "open"
        setRideRequests(prev => prev.filter(request => request.id !== id));

        alert('Ride request accepted successfully!');

        // Refresh the list to get updated data
        fetchRideRequests();
        fetchCurrentRides(); // Also refresh current rides to show the new one

      } catch (err) {
        console.error("Error accepting ride request:", err);
        alert(`Failed to accept ride request: ${err.message}`);
      }
    } else if (updates.status === 'declined') {
      // Show confirmation dialog for decline
      const confirmMessage = rideDetails
        ? `Are you sure you want to decline this ride?\n\nFrom: ${rideDetails.pickup}\nTo: ${rideDetails.dropoff}\nPassengers: ${rideDetails.passengers}\nDeparture: ${new Date(rideDetails.datetime).toLocaleString()}`
        : 'Are you sure you want to decline this ride request?';

      const confirmed = window.confirm(confirmMessage);

      if (!confirmed) {
        return; // User cancelled, don't proceed
      }

      try {
        // Get auth token from localStorage
        const token = localStorage.getItem('ru_token');

        if (!token) {
          throw new Error('Authentication token not found. Please log in again.');
        }

        // Create a claim with declined status via backend
        const response = await fetch(`${apiBase}/api/demands/${id}/claims`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status: 'declined' })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(errorData.error || `Failed to decline ride request: ${response.status}`);
        }

        // Remove from pending requests immediately
        setRideRequests(prev => prev.filter(request => request.id !== id));

        alert('Ride request declined. It will appear in your history.');

        // Refresh data
        fetchRideRequests();
        fetchCurrentRides(); // Refresh to show in history

      } catch (err) {
        console.error("Error declining ride request:", err);
        alert(`Failed to decline ride request: ${err.message}`);
      }
    }
  };

  // Complete a ride (driver marks as completed)
  const completeRide = async (claimId, rideDetails = null) => {
    console.log("Attempting to complete ride:", claimId);
    if (!claimId) {
      alert('Error: Invalid claim ID. Please try refreshing the page.');
      return;
    }

    const confirmMessage = rideDetails
      ? `Mark this ride as completed?\n\nFrom: ${rideDetails.pickup}\nTo: ${rideDetails.dropoff}\nPassengers: ${rideDetails.passengers}`
      : 'Are you sure you want to mark this ride as completed?';

    if (!window.confirm(confirmMessage)) return;

    try {
      const token = localStorage.getItem('ru_token');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const response = await fetch(`${apiBase}/api/claims/${claimId}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to complete ride: ${response.status}`);
      }

      console.log("Ride completed successfully:", data);
      alert('Ride marked as completed successfully!');
      // Force refresh of lists
      await fetchCurrentRides();

    } catch (err) {
      console.error("Failed to complete ride:", err);
      alert(`Failed to complete ride: ${err.message}`);
    }
  };

  const addRideRequest = (ride) => {
    // This function is mainly for compatibility, but in the new system,
    // ride requests come from the backend
    setRideRequests((prev) => [...prev, ride]);
  };

  return (
    <RideContext.Provider value={{
      rideRequests,
      currentRides,
      rideHistory,
      addRideRequest,
      updateRideRequest,
      completeRide,
      fetchRideRequests,
      fetchCurrentRides,
      loading,
      error
    }}>
      {children}
    </RideContext.Provider>
  );
};

export const useRides = () => useContext(RideContext);
