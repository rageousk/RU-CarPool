import React, { createContext, useState, useContext, useEffect } from "react";

const RideContext = createContext();

const apiBase = import.meta.env.VITE_API_URL ;

export const RideProvider = ({ children }) => {
  const [rideRequests, setRideRequests] = useState([]);
  const [currentRides, setCurrentRides] = useState([]);
  const [rideHistory, setRideHistory] = useState([]);
  const [declinedRides, setDeclinedRides] = useState(() => {
    // Load declined rides from localStorage on init
    const stored = localStorage.getItem('declinedRides');
    return stored ? JSON.parse(stored) : [];
  });
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
      
      // Get current user ID from localStorage token
      const token = localStorage.getItem('ru_token');
      let currentUserId = null;
      
      if (token) {
        try {
          // Decode JWT token to get user ID (basic decode, not verification)
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          const payload = JSON.parse(jsonPayload);
          currentUserId = payload.sub; // 'sub' field contains user ID in Supabase JWT
        } catch (e) {
          console.warn('Could not decode token for user filtering:', e);
        }
      }
      
      // Get IDs of declined rides from localStorage
      const stored = localStorage.getItem('declinedRides');
      const declinedRideIds = stored ? JSON.parse(stored).map(ride => {
        // Extract original demand ID from declined ride ID
        const match = ride.id.match(/^declined-(\d+)-\d+$/);
        return match ? parseInt(match[1]) : null;
      }).filter(Boolean) : [];
      
      // Map the backend demand structure to match frontend expectations
      const mappedRequests = data.demands?.map(demand => ({
        id: demand.id,
        pickup: demand.origin,
        dropoff: demand.destination, 
        passengers: demand.seats_needed,
        datetime: demand.departure_time,
        status: 'pending', // All open demands are pending for drivers
        notes: demand.notes,
        estimatedCost: demand.estimated_cost,
        riderId: demand.rider_id,
        originCoords: demand.origin_coords,
        destinationCoords: demand.destination_coords
      })) || [];
      
      // Filter out declined rides AND current user's own ride requests
      const filteredRequests = mappedRequests.filter(request => 
        !declinedRideIds.includes(request.id) &&
        request.riderId !== currentUserId  // Exclude current user's own requests
      );
      
      setRideRequests(filteredRequests);
    } catch (err) {
      console.error("Error fetching ride requests:", err);
      setError(err.message);
      // Fallback to empty array on error
      setRideRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch driver's current accepted rides
  const fetchCurrentRides = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('ru_token');
      
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }
      
      const response = await fetch(`${apiBase}/api/claims/mine`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch current rides: ${response.status}`);
      }
      
      const data = await response.json();
      // Filter and map current rides (accepted status)
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
      
      // Combine database history with locally stored declined rides
      const combinedHistory = [...history, ...declinedRides];
      // Sort by creation date (newest first)
      combinedHistory.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setRideHistory(combinedHistory);
    } catch (err) {
      console.error("Error fetching current rides:", err);
      setError(err.message);
      setCurrentRides([]);
      setRideHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // Persist declined rides to localStorage
  useEffect(() => {
    localStorage.setItem('declinedRides', JSON.stringify(declinedRides));
  }, [declinedRides]);

  // Initial data fetch on mount
  useEffect(() => {
    fetchRideRequests();
    fetchCurrentRides();
  }, []);

  // Accept a ride request (driver claims it)
  const updateRideRequest = async (id, updates, rideDetails = null) => {
    if (updates.status === 'accepted') {
      // Show confirmation dialog
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

      // Create declined ride record
      const declinedRide = {
        ...rideDetails,
        id: `declined-${id}-${Date.now()}`, // Generate unique ID for declined ride
        claimId: null, // No claim ID for declined rides
        status: 'declined',
        createdAt: new Date().toISOString()
      };
      
      // Add to declined rides (will be persisted to localStorage)
      setDeclinedRides(prev => [declinedRide, ...prev]);
      
      // Remove from pending requests immediately
      setRideRequests(prev => prev.filter(request => request.id !== id));
      
      alert('Ride request declined. It will appear in your history.');
      
      // No need to refresh - we already updated the state directly above
    }
  };

  // Complete a ride (driver marks as completed)
  const completeRide = async (claimId, rideDetails = null) => {
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
      
      alert('Ride marked as completed successfully!');
      fetchCurrentRides();
      
    } catch (err) {
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
      declinedRides,
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
