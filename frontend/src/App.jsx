import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import { supabase } from "./lib/supabaseClient";
import "./App.css";

export default function App() {
  const [userEmail, setUserEmail] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true); // Track auth loading
  const navigate = useNavigate();

  // Fetch session on mount
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setUserEmail(data.session?.user?.email ?? null);
      setLoadingAuth(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Compute signedIn after loading completes
  const signedIn = !loadingAuth && (!!localStorage.getItem("ru_token") || !!userEmail);
  const displayEmail = userEmail || localStorage.getItem("ru_email") || "";

  return (
    <>
      <Navbar userProp={signedIn ? { email: displayEmail } : null} />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<HomePage signedIn={signedIn} />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={signedIn ? <HomePage signedIn={signedIn} /> : <Navigate to="/login" replace />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  );
}