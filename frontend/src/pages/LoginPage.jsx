// frontend/src/pages/LoginPage.jsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../css/LoginSignup.css";
import { LuEye, LuEyeClosed } from "react-icons/lu";
import { supabase } from "../lib/supabaseClient";

import GoogleIcon from "../assets/google.png";
import MicrosoftIcon from "../assets/microsoft.png";

const ROWAN_REGEX = /@(?:students\.rowan\.edu|rowan\.edu)$/i;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  // Check if already logged in
  useEffect(() => {
    const hasToken = !!localStorage.getItem("ru_token");
    const params = new URLSearchParams(location.search);
    const redirect = params.get("redirect") || "/dashboard"; // default dashboard
    if (hasToken) navigate(redirect);
  }, []);

  function toggleShow() {
    setShowPassword(!showPassword);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    const cleanEmail = email.trim();

    if (!ROWAN_REGEX.test(cleanEmail)) return setErr("Use your Rowan email.");
    if (!PASSWORD_REGEX.test(password))
      return setErr(
        "Password must be 8+ chars with at least 1 letter and 1 number."
      );

    try {
      setLoading(true);
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5050"}/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email: cleanEmail, password }),
        }
      );
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || "Login failed");

      if (out?.session?.access_token) {
        localStorage.setItem("ru_token", out.session.access_token);
      }
      localStorage.setItem("ru_email", out?.user?.email || cleanEmail);

      setMsg("Logged in! Redirecting…");

      // Respect redirect query parameter
      const params = new URLSearchParams(location.search);
      const redirect = params.get("redirect") || "/dashboard";
      setTimeout(() => navigate(redirect), 500);
    } catch (e) {
      setErr(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function onForgotPassword() {
    setErr(null);
    setMsg(null);
    const cleanEmail = resetEmail.trim();
    if (!cleanEmail) return setErr("Enter your email first.");

    try {
      setLoading(true);
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5050"}/api/auth/forgot`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: cleanEmail,
            redirectTo: `${window.location.origin}/login`,
          }),
        }
      );
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || "Failed to send reset email");

      setMsg("Password reset email sent! Check your inbox.");

      // Close modal after brief delay
      setTimeout(() => {
        setShowModal(false);
        setResetEmail("");
        setMsg(null);
      }, 2000);
    } catch (e) {
      setErr(e.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  }

  async function socialLogin(provider) {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
    } catch (e) {
      setErr(e.message || "Social login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className={`auth-page ${showModal ? "blur" : ""}`}>
        <div className="auth-shell">
          <div className="auth-card">
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-sub">Campus access only — Rowan emails required.</p>

            {/* Social login buttons */}
            <div className="social-login">
              <button
                className="google-btn"
                onClick={() => socialLogin("google")}
                disabled={loading}
              >
                <img src={GoogleIcon} alt="Google" className="social-icon" />
                Continue with Google
              </button>

              <button
                className="microsoft-btn"
                onClick={() => socialLogin("azure")}
                disabled={loading}
              >
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
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>

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

                <div className="forgot-password-container">
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => setShowModal(true)}
                    disabled={loading}
                  >
                    Forgot password?
                  </button>
                </div>
              </label>

              {/* Display login errors / success */}
              {(err || msg) && (
                <div className="auth-messages" aria-live="polite">
                  {err && <div className="msg error">{err}</div>}
                  {msg && <div className="msg ok">{msg}</div>}
                </div>
              )}

              <button type="submit" className="primary" disabled={loading}>
                {loading ? "Please wait…" : "Login"}
              </button>

              <div className="signup-link-container">
                <span>Don't have an account? </span>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => navigate("/signup")}
                >
                  Sign up
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showModal && (
        <div
          className="forgot-modal"
          onClick={() => {
            setShowModal(false);
            setErr(null);
            setMsg(null);
            setResetEmail("");
          }}
        >
          <div
            className="forgot-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="modal-title">Reset your password</h2>
            <p className="modal-sub">
              Enter your Rowan email to receive a password reset link.
            </p>

            <input
              type="email"
              className="modal-input"
              placeholder="email@students.rowan.edu"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              autoFocus
            />

            {(err || msg) && (
              <div
                className="auth-messages"
                aria-live="polite"
                style={{ marginBottom: 12 }}
              >
                {err && <div className="msg error">{err}</div>}
                {msg && <div className="msg ok">{msg}</div>}
              </div>
            )}

            <div className="modal-actions">
              <button
                className="btn cancel"
                onClick={() => {
                  setShowModal(false);
                  setErr(null);
                  setMsg(null);
                  setResetEmail("");
                }}
              >
                Cancel
              </button>
              <button className="btn reset-button" onClick={onForgotPassword}>
                Send Reset Link
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}