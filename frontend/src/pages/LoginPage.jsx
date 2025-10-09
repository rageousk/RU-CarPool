import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../css/LoginSignup.css";
import { LuEye, LuEyeClosed } from "react-icons/lu";
import { supabase } from "../lib/supabaseClient"; // your supabase client

import GoogleIcon from "../assets/google.png";
import MicrosoftIcon from "../assets/microsoft.png";


const ROWAN_REGEX = /@(?:students\.rowan\.edu|rowan\.edu)$/i;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export default function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const hasToken = !!localStorage.getItem("ru_token");
    if (hasToken) nav("/");
  }, []);

  function toggleShow() {
    setShowPassword(!showPassword);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    if (!ROWAN_REGEX.test(email)) return setErr("Use your Rowan email.");
    if (!PASSWORD_REGEX.test(password))
      return setErr("Password must be 8+ chars with at least 1 letter and 1 number.");

    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5050"}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || "Login failed");

      localStorage.setItem("ru_token", out.session.access_token);
      localStorage.setItem("ru_email", out.user.email || email);

      setMsg("✅ Logged in! Redirecting…");
      setTimeout(() => nav("/"), 300);
    } catch (e) {
      setErr(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function onForgotPassword() {
    setErr(null);
    setMsg(null);
    if (!email) return setErr("Enter your email first.");
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5050"}/api/auth/forgot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          redirectTo: `${window.location.origin}/login`,
        }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || "Failed to send reset email");
      setMsg("📨 Password reset email sent! Check your inbox.");
    } catch (e) {
      setErr(e.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  }


  async function socialLogin(provider) {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({ provider });
      if (error) throw error;
      // Supabase redirects user automatically for OAuth
    } catch (e) {
      setErr(e.message || "Social login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-card">
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-sub">Campus access only — Rowan emails required.</p>

          {/* Social login buttons */}
          <div className="social-login">
            <button className="google-btn" onClick={() => socialLogin("google")}>
              <img src={GoogleIcon} alt="Google" className="social-icon" />
              Continue with Google
            </button>

            <button className="microsoft-btn" onClick={() => socialLogin("azure")}>
              <img src={MicrosoftIcon} alt="Microsoft" className="social-icon" />
              Continue with Microsoft
            </button>
          </div>


          <div className="divider">
            <span>or</span>
          </div>

          {/* Email/password login */}
          <form onSubmit={onSubmit} className="auth-form">
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                placeholder="email@students.rowan.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim())}
                required
              />
            </label>

            {/* Password field */}
            <label className="field password-field">
              <span>Password</span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="toggle-password-login" onClick={toggleShow}>
                {showPassword ? <LuEye size="1.2em" /> : <LuEyeClosed size="1.2em" />}
              </p>

              {/* Forgot password right under input, right-aligned */}
              <div className="forgot-password-container">
                <button
                  type="button"
                  className="link-btn"
                  onClick={onForgotPassword}
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>
            </label>

            {/* Submit button */}
            <button type="submit" className="primary" disabled={loading}>
              {loading ? "Please wait…" : "Login"}
            </button>

            {/* Signup link centered below */}
            <div className="signup-link-container">
              <span>Don't have an account? </span>
              <button
                type="button"
                className="link-btn"
                onClick={() => nav("/signup")}
              >
              Sign up
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}