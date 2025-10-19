// src/App.jsx
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage.jsx";
import UserDashboard from "./pages/UserDashboard.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import AboutPage from "./pages/AboutPage.jsx";
import { supabase } from "./lib/supabaseClient";
import "./App.css";

export default function App() {
  const [userEmail, setUserEmail] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setUserEmail(data.session?.user?.email ?? null);
      setLoadingAuth(false);
    })();

    // Single subscription for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUserEmail(session?.user?.email ?? null);

      if (event === "PASSWORD_RECOVERY") {
        // Try to get tokens from session object first
        const access_token = session?.access_token ?? session?.provider_token ?? null;
        const refresh_token = session?.refresh_token ?? null;

        if (access_token) {
          // navigate and pass tokens in state
          navigate("/reset-password", { state: { access_token, refresh_token } });
          return;
        }

        // Fallback: tokens might be in URL fragment (e.g. #access_token=...&type=recovery)
        const hash = window.location.hash || "";
        if (hash.includes("access_token")) {
          const params = new URLSearchParams(hash.replace(/^#/, "?"));
          const at = params.get("access_token");
          const rt = params.get("refresh_token");
          navigate("/reset-password", { state: { access_token: at, refresh_token: rt } });
        } else {
          // If no tokens found, still attempt to navigate so the reset page can parse the URL
          navigate("/reset-password");
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const signedIn = !loadingAuth && (!!localStorage.getItem("ru_token") || !!userEmail);
  const displayEmail = userEmail || localStorage.getItem("ru_email") || "";

  return (
    <>
      <Navbar userProp={signedIn ? { email: displayEmail } : null} />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<HomePage signedIn={signedIn} />} />
          <Route 
            path="/login" 
            element={
              signedIn ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <LoginPage />
              )
            } 
          />
          <Route 
            path="/signup" 
            element={
              signedIn ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <SignupPage />
              )
            } 
          />
          <Route
            path="/dashboard"
            element={
              signedIn ? (
                <UserDashboard user={{ name: displayEmail }} />
              ) : (
                <Navigate to="/login?redirect=/dashboard" replace />
              )
            }
          />
          <Route path="/about-us" element={<AboutPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  );
}
