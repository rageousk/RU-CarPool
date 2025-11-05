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

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      const user = data.session?.user ?? null;
      setUserEmail(user?.email ?? null);
      setUserId(user?.id ?? null);
      setLoadingAuth(false);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;
      setUserEmail(currentUser?.email ?? null);
      setUserId(currentUser?.id ?? null);

      if (event === "PASSWORD_RECOVERY") {
        const access_token = session?.access_token ?? session?.provider_token ?? null;
        const refresh_token = session?.refresh_token ?? null;

        if (access_token) {
          navigate("/reset-password", { state: { access_token, refresh_token } });
          return;
        }

        const hash = window.location.hash || "";
        if (hash.includes("access_token")) {
          const params = new URLSearchParams(hash.replace(/^#/, "?"));
          const at = params.get("access_token");
          const rt = params.get("refresh_token");
          navigate("/reset-password", { state: { access_token: at, refresh_token: rt } });
        } else {
          navigate("/reset-password");
        }
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
            <Route path="/login" element={signedIn ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
            <Route path="/signup" element={signedIn ? <Navigate to="/dashboard" replace /> : <SignupPage />} />
            <Route
              path="/dashboard"
              element={
                signedIn ? (
                  <UserDashboard user={{ name: displayEmail }} signedIn={signedIn} navigate={navigate} />
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