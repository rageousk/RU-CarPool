// src/pages/SignupPage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/LoginSignup.css";
import { LuEye, LuEyeClosed } from "react-icons/lu";
import { supabase } from "../lib/supabaseClient";

import GoogleIcon from "../assets/google.png";
import MicrosoftIcon from "../assets/microsoft.png";

const ROWAN_REGEX = /@(?:students\.rowan\.edu|rowan\.edu)$/i;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export default function SignupPage() {
  const nav = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState(null);
  const [msg, setMsg]         = useState(null);

  // Only trust Supabase session to decide if already signed in
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const alreadyIn = !!data.session?.user?.email;
      if (!cancelled && alreadyIn) {
        setErr("You’re already signed in. You don’t need to create another account.");
        setTimeout(() => nav("/dashboard"), 1200);
      }
    })();
    return () => { cancelled = true; };
  }, [nav]);

  function toggleShow(field) {
    if (field === "password") setShowPassword((s) => !s);
    else if (field === "confirm") setShowConfirm((s) => !s);
  }

  function validate() {
    if (!ROWAN_REGEX.test(email)) return "Use your Rowan email.";
    if (!PASSWORD_REGEX.test(password))
      return "Password must be 8+ chars with at least 1 letter and 1 number.";
    if (password !== confirmPassword) return "Passwords do not match.";
    if (!firstName || !lastName) return "Enter first and last name.";
    return null;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const v = validate();
    if (v) return setErr(v);

    try {
      setLoading(true);
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5050"}/api/auth/signup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            email: email.trim(),
            password,
          }),
        }
      );

      const out = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) {
          throw new Error("This email is already registered. Please log in or reset your password.");
        }
        throw new Error(out.error || "Signup failed");
      }

      setMsg("✅ Account created! Check your email to verify, then log in.");
      setTimeout(() => nav("/login"), 1500);
    } catch (e) {
      setErr(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function socialLogin(provider) {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({ provider });
      if (error) throw error;
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
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-sub">Sign up using your Rowan email or social login.</p>

          <div className="social-login">
            <button className="google-btn" onClick={() => socialLogin("google")} disabled={loading}>
              <img src={GoogleIcon} alt="Google" className="social-icon" /> Continue with Google
            </button>
            <button className="microsoft-btn" onClick={() => socialLogin("azure")} disabled={loading}>
              <img src={MicrosoftIcon} alt="Microsoft" className="social-icon" /> Continue with Microsoft
            </button>
          </div>

          <div className="divider"><span>or</span></div>

          <form onSubmit={onSubmit} className="auth-form">
            <label className="field">
              <span>First Name</span>
              <input
                type="text"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>Last Name</span>
              <input
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </label>

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

            <label className="field password-field">
              <span>Password</span>
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <p className="toggle-password" onClick={() => toggleShow("password")}>
                  {showPassword ? <LuEye /> : <LuEyeClosed />}
                </p>
              </div>
            </label>

            <label className="field password-field">
              <span>Confirm Password</span>
              <div className="password-wrapper">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <p className="toggle-password" onClick={() => toggleShow("confirm")}>
                  {showConfirm ? <LuEye /> : <LuEyeClosed />}
                </p>
              </div>
            </label>

            {err && <div className="msg error">{err}</div>}
            {msg && <div className="msg ok">{msg}</div>}

            <button type="submit" className="primary" disabled={loading}>
              {loading ? "Please wait…" : "Sign up"}
            </button>

            <div className="signup-link-container" style={{ justifyContent: "center", marginTop: 12 }}>
              <span>Already have an account? </span>
              <button type="button" className="link-btn" onClick={() => nav("/login")}>
                Login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}