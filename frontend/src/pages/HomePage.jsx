import React, { useState } from "react";
import "../css/HomePage.css";
import OfferRideModal from "../components/OfferRideModal";
import RequestRideModal from "../components/RequestRideModal";
import ruCampus from "../assets/ru_campus.jpg";
import bodyImage from "../assets/ru_carpool_homepage.png";
import { useNavigate } from "react-router-dom";

function HomePage({ signedIn }) {
  const navigate = useNavigate();
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // --- Handle Request Button ---
  const handleRequestClick = () => {
    if (!signedIn) {
      navigate("/login?redirect=/dashboard");
    } else {
      navigate("/dashboard?rider=true");
    }
  };

  // --- Handle Offer Button ---
  const handleOfferClick = () => {
    if (!signedIn) {
      navigate("/login?redirect=/dashboard");
    } else {
      navigate("/dashboard?driver=true");
    }
  };

  return (
    <>
      <div className="homepage">
        <img src={ruCampus} alt="Carpooling" className="homepage-image" />

        <div className="card-container">
          <div className="choice-card">
            <div className="card-icon">📍</div>
            <h3 className="card-title">Need a Ride?</h3>
            <p className="card-description">
              Tell us where you want to go and when, and we'll match you with
              drivers heading your way.
            </p>
            <button className="request-button" onClick={handleRequestClick}>
              Request a Ride
            </button>
          </div>

          <div className="choice-card">
            <div className="card-icon">👥</div>
            <h3 className="card-title">Driving Somewhere?</h3>
            <p className="card-description">
              Share your trip details and pick up fellow students along the way.
            </p>
            <button className="offer-button" onClick={handleOfferClick}>
              Offer a Ride
            </button>
          </div>
        </div>
      </div>

      <div className="body-section">
        <div className="body-section-right">
          <h1 className="tag-line">
            Ride <span className="highlight">together.</span> Save{" "}
            <span className="highlight">together.</span>
          </h1>
          <p className="description">
            "Our mission is to make commuting easier, affordable, and
            eco-friendly by connecting students and staff through a safe,
            reliable carpooling network."
          </p>
        </div>
        <div className="body-section-left">
          <img
            src={bodyImage}
            alt="Illustration of people carpooling"
            className="body-image"
          />
        </div>
      </div>

      {/* Optionally still include modals */}
      {isOfferModalOpen && (
        <OfferRideModal
          onClose={() => setIsOfferModalOpen(false)}
          signedIn={signedIn}
          navigate={navigate}
        />
      )}
      {isRequestModalOpen && (
        <RequestRideModal
          onClose={() => setIsRequestModalOpen(false)}
          signedIn={signedIn}
          navigate={navigate}
        />
      )}
    </>
  );
}

export default HomePage;