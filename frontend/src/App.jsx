// frontend/src/App.jsx
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage.jsx";
import UserDashboard from "./pages/UserDashboard.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import AboutPage from "./pages/AboutPage.jsx";
import ProfileSettings from "./components/ProfileSettings.jsx";
import { RideProvider } from "./context/RideContext.jsx";
import { supabase } from "./lib/supabaseClient";
import "./App.css";

export default function App() {
  const [userEmail, setUserEmail] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const navigate = useNavigate();

  // --- Helper: parse hash tokens (#access_token=...&refresh_token=...) ---
  const extractHashTokens = () => {
    const hash = window.location.hash || "";
    if (!hash.includes("access_token")) return null;
    const params = new URLSearchParams(hash.replace(/^#/, "?"));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (!access_token || !refresh_token) return null;
    return { access_token, refresh_token };
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      // 1) If we just returned from a magic link / recovery, consume tokens once.
      const hashTokens = extractHashTokens();
      if (hashTokens) {
        try {
          const { data, error } = await supabase.auth.setSession(hashTokens);
          if (error) console.error("setSession error:", error);
          // Clean the hash so it doesn't linger in history
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
          if (data?.session?.user?.email) {
            localStorage.setItem("ru_email", data.session.user.email);
            localStorage.setItem("ru_token", data.session.access_token);
          }
        } catch (e) {
          console.error("setSession threw:", e);
        }
      }

      // 2) Load current session
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      const user = data?.session?.user ?? null;
      const email = user?.email ?? null;
      const id = user?.id ?? null;

      setUserEmail(email);
      setUserId(id); // ✅ set userId so ProfileSettings can render

      // Mirror into your existing keys (so your current logic continues to work)
      if (email) {
        localStorage.setItem("ru_email", email);
        localStorage.setItem("ru_token", data.session.access_token);
      } else {
        localStorage.removeItem("ru_email");
        localStorage.removeItem("ru_token");
      }

      setLoadingAuth(false);
    })();

    // 3) Keep localStorage + state in sync on any change (sign in/out/refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      const email = user?.email ?? null;
      const id = user?.id ?? null;

      setUserEmail(email);
      setUserId(id);

      if (email) {
        localStorage.setItem("ru_email", email);
        localStorage.setItem("ru_token", session.access_token);
      } else {
        localStorage.removeItem("ru_email");
        localStorage.removeItem("ru_token");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const signedIn = !loadingAuth && (!!userEmail || !!localStorage.getItem("ru_token"));
  const displayEmail = userEmail || localStorage.getItem("ru_email") || "";

  return (
    <RideProvider>
      <Navbar userProp={signedIn ? { email: displayEmail } : null} />
      <div className="main-content">
        {loadingAuth ? (
          <div className="loading-screen">Loading...</div>
        ) : (
          <Routes>
            <Route path="/" element={<HomePage signedIn={signedIn} />} />
            <Route 
              path="/login" 
              element={signedIn ? <Navigate to="/dashboard" replace /> : <LoginPage />}
            />
            <Route 
              path="/signup" 
              element={signedIn ? <Navigate to="/dashboard" replace /> : <SignupPage />}
            />
            <Route
              path="/dashboard"
              element={
                signedIn ? (
                  <UserDashboard 
                    user={{ id: displayEmail }} 
                    signedIn={signedIn} 
                    navigate={navigate} 
                  />
                ) : (
                  <Navigate to="/login?redirect=/dashboard" replace />
                )
              }
            />
            <Route
              path="/settings"
              element={
                signedIn ? (
                  userId ? (
                    <ProfileSettings userId={userId} />
                  ) : (
                    <div className="loading-screen">Loading user data...</div>
                  )
                ) : (
                  <Navigate to="/login?redirect=/settings" replace />
                )
              }
            />
            <Route path="/about-us" element={<AboutPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </div>
    </RideProvider>
  );
}