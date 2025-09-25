import React, { useState } from 'react';
import { useJsApiLoader } from '@react-google-maps/api'; // Import the hook here
import '../css/HomePage.css';
import OfferRideModal from '../components/OfferRideModal';
import RequestRideModal from '../components/RequestRideModal';
import GoogleMapComponent from '../components/GoogleMap';
import ruCarpoolHomepageImage from '../assets/ru_carpool_homepage.png';
import bodyImage from '../assets/RU_Map.png';

// Put the setup outside the component
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const libraries = ['places']; // We need the 'places' library for Autocomplete

function HomePage() {
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // Load the script here, in the parent component
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey,
    libraries,
  });

  // Show error or loading screens
  if (loadError) return <div>Error loading maps. Please check your API key.</div>;
  if (!isLoaded) return <div>Loading...</div>;

  // This will only render after the script is loaded successfully
  return (
    <>
      <div className="homepage">
        <img src={ruCarpoolHomepageImage} alt="Carpooling" className="homepage-image" />
        
        <div className="card-container">
          <div className="choice-card">
            <div className="card-icon">📍</div>
            <h3 className="card-title">Need a Ride?</h3>
            <p className="card-description">
              Tell us where you want to go and when, and we'll match you with drivers heading your way.
            </p>
            <button className="card-button" onClick={() => setIsRequestModalOpen(true)}>Request a Ride</button>
          </div>

          <div className="choice-card">
            <div className="card-icon">👥</div>
            <h3 className="card-title">Driving Somewhere?</h3>
            <p className="card-description">
              Share your trip details and pick up fellow students along the way.
            </p>
            <button className="card-button" onClick={() => setIsOfferModalOpen(true)}>Offer a Ride</button>
          </div>
        </div>
      </div>

      <div className="body-section">
        <div className="body-section-right">
            <h1 className="tag-line">
                Ride <span className="highlight">together.</span> Save <span className="highlight">together.</span>
            </h1>
            <p className="description">
                "Our mission is to make commuting easier, affordable, and eco-friendly by connecting students and staff through a safe, reliable carpooling network."
            </p>
        </div>
        <div className="body-section-left">
            <img src={bodyImage} alt="Illustration of people carpooling" className="body-image" />
        </div>
      </div>

      <div className="map-section-container">
        <GoogleMapComponent />
      </div>

      <OfferRideModal isOpen={isOfferModalOpen} onClose={() => setIsOfferModalOpen(false)} />
      <RequestRideModal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} />
    </>
  );
}

export default HomePage;