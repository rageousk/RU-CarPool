import React from 'react';
import '../css/HomePage.css'; 
import RU_Map from '../assets/RU_Map.png';
import ru_carpool_homepage from '../assets/ru_carpool_homepage.png';

const HomePage = () => {
  return (
    <div>
        {/* Header */}
        <div className="homepage">
            <img src={RU_Map} alt="Homepage" className="homepage-image" />
            <div className="button-container">
                <button className="rider-button"> Rider</button>
                <button className="driver-button">Driver</button>
            </div>
        </div>

        {/* Body */}
        <div className="body-section">
            <div className="body-section-right">
                <h1 className="tag-line">
                <span className="highlight">Ride</span> <span>together.</span> <span className="highlight">Save</span> <span>together</span>
                </h1>
                <p className="description">
                “Our mission is to make commuting easier, affordable, and eco-friendly
                </p>
                <p className="description">
                by connecting students and staff through a safe, reliable carpooling network.”
                </p>
            </div>
            <div className="body-section-left">
                <img src={ru_carpool_homepage} alt="RU Carpool" className="body-image" />
            </div>
        </div>
   </div> 
  );
};

export default HomePage;
