import React from "react";
import "../css/LoginSignup.css"; // Reusing existing styles
import "../css/AboutPage.css"; // About page specific styles

function AboutPage() {
  return (
    <div className="auth-page" style={{ minHeight: "100vh", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        {/* Header Section */}
        <div style={{ textAlign: "center", marginBottom: "4rem", padding: "2rem 0" }}>
          <h1 style={{ 
            fontSize: "3.5rem", 
            marginBottom: "1.5rem", 
            color: "#57150B",
            fontWeight: "800",
            textShadow: "0 2px 4px rgba(87, 21, 11, 0.1)"
          }}>
            About UniRide
          </h1>
          <p style={{ 
            fontSize: "1.3rem", 
            lineHeight: "1.8",
            color: "#4a5568",
            maxWidth: "800px",
            margin: "0 auto",
            fontWeight: "400"
          }}>
            UniRide is a carpooling platform designed to connect Rowan University students
            for safe and convenient transportation.
          </p>
        </div>

        {/* Team Section */}
        <div style={{ marginBottom: "4rem" }}>
          <h2 style={{ 
            fontSize: "2.5rem", 
            marginBottom: "3rem", 
            color: "#57150B", 
            textAlign: "center", 
            fontWeight: "700" 
          }}>
            🚗 Meet Our Team
          </h2>
          
          {/* Desktop Team Grid - 2x2 layout */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(2, 1fr)", 
            gap: "2.5rem",
            marginBottom: "3rem"
          }}>
            <div style={{ 
              padding: "2.5rem", 
              borderRadius: "16px", 
              backgroundColor: "#fff",
              boxShadow: "0 8px 25px rgba(0, 0, 0, 0.12)",
              border: "1px solid #e5e7eb",
              transition: "all 0.3s ease",
              cursor: "pointer"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-8px)";
              e.currentTarget.style.boxShadow = "0 20px 40px rgba(0, 0, 0, 0.15)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 25px rgba(0, 0, 0, 0.12)";
            }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
                <span style={{ fontSize: "2.5rem", marginRight: "1rem" }}>👑</span>
                <div>
                  <h3 style={{ margin: "0 0 0.25rem 0", color: "#111827", fontSize: "1.5rem", fontWeight: "700" }}>Sahil Kamboj</h3>
                  <p style={{ margin: "0", color: "#57150B", fontSize: "1rem", fontWeight: "600" }}>Project Lead & Frontend Developer</p>
                </div>
              </div>
              <p style={{ margin: "0", color: "#6b7280", fontSize: "0.95rem", lineHeight: "1.6" }}>
                Leading the project vision and frontend architecture
              </p>
            </div>
            
            <div style={{ 
              padding: "2.5rem", 
              borderRadius: "16px", 
              backgroundColor: "#fff",
              boxShadow: "0 8px 25px rgba(0, 0, 0, 0.12)",
              border: "1px solid #e5e7eb",
              transition: "all 0.3s ease",
              cursor: "pointer"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-8px)";
              e.currentTarget.style.boxShadow = "0 20px 40px rgba(0, 0, 0, 0.15)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 25px rgba(0, 0, 0, 0.12)";
            }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
                <span style={{ fontSize: "2.5rem", marginRight: "1rem" }}>🎨</span>
                <div>
                  <h3 style={{ margin: "0 0 0.25rem 0", color: "#111827", fontSize: "1.5rem", fontWeight: "700" }}>Nerissa Bautista</h3>
                  <p style={{ margin: "0", color: "#57150B", fontSize: "1rem", fontWeight: "600" }}>UI/UX Designer & Frontend Developer</p>
                </div>
              </div>
              <p style={{ margin: "0", color: "#6b7280", fontSize: "0.95rem", lineHeight: "1.6" }}>
                Crafting intuitive user experiences and visual design
              </p>
            </div>
            
            <div style={{ 
              padding: "2.5rem", 
              borderRadius: "16px", 
              backgroundColor: "#fff",
              boxShadow: "0 8px 25px rgba(0, 0, 0, 0.12)",
              border: "1px solid #e5e7eb",
              transition: "all 0.3s ease",
              cursor: "pointer"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-8px)";
              e.currentTarget.style.boxShadow = "0 20px 40px rgba(0, 0, 0, 0.15)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 25px rgba(0, 0, 0, 0.12)";
            }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
                <span style={{ fontSize: "2.5rem", marginRight: "1rem" }}>⚙️</span>
                <div>
                  <h3 style={{ margin: "0 0 0.25rem 0", color: "#111827", fontSize: "1.5rem", fontWeight: "700" }}>Lokesh Pullakandam</h3>
                  <p style={{ margin: "0", color: "#57150B", fontSize: "1rem", fontWeight: "600" }}>Lead Backend Developer & Database Architect</p>
                </div>
              </div>
              <p style={{ margin: "0", color: "#6b7280", fontSize: "0.95rem", lineHeight: "1.6" }}>
                Building robust server infrastructure and database systems
              </p>
            </div>
            
            <div style={{ 
              padding: "2.5rem", 
              borderRadius: "16px", 
              backgroundColor: "#fff",
              boxShadow: "0 8px 25px rgba(0, 0, 0, 0.12)",
              border: "1px solid #e5e7eb",
              transition: "all 0.3s ease",
              cursor: "pointer"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-8px)";
              e.currentTarget.style.boxShadow = "0 20px 40px rgba(0, 0, 0, 0.15)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 25px rgba(0, 0, 0, 0.12)";
            }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
                <span style={{ fontSize: "2.5rem", marginRight: "1rem" }}>🔗</span>
                <div>
                  <h3 style={{ margin: "0 0 0.25rem 0", color: "#111827", fontSize: "1.5rem", fontWeight: "700" }}>Justin Khan</h3>
                  <p style={{ margin: "0", color: "#57150B", fontSize: "1rem", fontWeight: "600" }}>Backend Developer & API Integration Specialist</p>
                </div>
              </div>
              <p style={{ margin: "0", color: "#6b7280", fontSize: "0.95rem", lineHeight: "1.6" }}>
                Developing seamless API integrations and backend services
              </p>
            </div>
          </div>
        </div>

        {/* Mission & Values Section - Side by Side Layout */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "1fr 1fr", 
          gap: "3rem",
          marginBottom: "4rem"
        }}>
          {/* Mission */}
          <div style={{ 
            padding: "3rem", 
            borderRadius: "20px", 
            background: "linear-gradient(135deg, #f0f7ff 0%, #e0f2fe 100%)",
            border: "1px solid #e0f2fe",
            boxShadow: "0 8px 25px rgba(0, 0, 0, 0.08)"
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎯</div>
              <h3 style={{ 
                margin: "0 0 1.5rem 0", 
                color: "#111827", 
                fontSize: "2rem",
                fontWeight: "700"
              }}>
                Our Mission
              </h3>
              <p style={{ 
                margin: "0", 
                color: "#374151", 
                fontSize: "1.1rem",
                lineHeight: "1.8",
                fontWeight: "400"
              }}>
                To provide a safe, reliable, and eco-friendly transportation solution 
                for Rowan University students, fostering community connections while 
                reducing campus traffic and environmental impact.
              </p>
            </div>
          </div>

          {/* Vision */}
          <div style={{ 
            padding: "3rem", 
            borderRadius: "20px", 
            background: "linear-gradient(135deg, #fef7f0 0%, #fed7aa 100%)",
            border: "1px solid #fed7aa",
            boxShadow: "0 8px 25px rgba(0, 0, 0, 0.08)"
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🌟</div>
              <h3 style={{ 
                margin: "0 0 1.5rem 0", 
                color: "#111827", 
                fontSize: "2rem",
                fontWeight: "700"
              }}>
                Our Vision
              </h3>
              <p style={{ 
                margin: "0", 
                color: "#374151", 
                fontSize: "1.1rem",
                lineHeight: "1.8",
                fontWeight: "400"
              }}>
                To become the premier transportation platform for university students, 
                creating a sustainable and connected campus community through 
                innovative ride-sharing solutions.
              </p>
            </div>
          </div>
        </div>

        {/* Core Values */}
        <div style={{ 
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "2rem",
          textAlign: "center",
          marginBottom: "2rem"
        }}>
          <div style={{ 
            padding: "2rem",
            borderRadius: "16px",
            backgroundColor: "#f8fffe",
            border: "2px solid #a7f3d0"
          }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🌱</div>
            <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1.3rem", color: "#111827", fontWeight: "600" }}>Eco-Friendly</h4>
            <p style={{ margin: "0", fontSize: "1rem", color: "#6b7280", fontWeight: "400" }}>Reducing carbon footprint together</p>
          </div>
          <div style={{ 
            padding: "2rem",
            borderRadius: "16px",
            backgroundColor: "#fefbf3",
            border: "2px solid #fde68a"
          }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🤝</div>
            <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1.3rem", color: "#111827", fontWeight: "600" }}>Community Driven</h4>
            <p style={{ margin: "0", fontSize: "1rem", color: "#6b7280", fontWeight: "400" }}>Built by students, for students</p>
          </div>
          <div style={{ 
            padding: "2rem",
            borderRadius: "16px",
            backgroundColor: "#f0f9ff",
            border: "2px solid #93c5fd"
          }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔒</div>
            <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1.3rem", color: "#111827", fontWeight: "600" }}>Safe & Secure</h4>
            <p style={{ margin: "0", fontSize: "1rem", color: "#6b7280", fontWeight: "400" }}>Your safety is our priority</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;