// src/pages/ResetPasswordPage.jsx
import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { LuEye, LuEyeClosed } from "react-icons/lu";

// Basic password rule
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

// Backend
const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5050";

function parseTokensFromHash() {
  const hash = window.location.hash || "";
  if (!hash) return null;
  const params = new URLSearchParams(hash.replace(/^#/, "?"));
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (access_token) return { access_token, refresh_token };
  return null;
}

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmedPassword, setConfirmedPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const location = useLocation();
  const nav = useNavigate();

  // get tokens from state or from URL fragment
  const stateTokens = location.state ?? null;
  const hashTokens = typeof window !== "undefined" ? parseTokensFromHash() : null;
  const tokens = stateTokens || hashTokens;

  // If there are no tokens anywhere, go back to the homepage
  if (!tokens) {
    return <Navigate to="/" />;
  }

  const { access_token, refresh_token } = tokens;

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmedPassword, setShowConfirmedPassword] = useState(false);

  function toggleShow(target) {
    if (target === "password") setShowPassword(!showPassword);
    else if (target === "confirmed-password") setShowConfirmedPassword(!showConfirmedPassword);
  }

  function validate() {
    if (password !== confirmedPassword) return "❌ Passwords do not match.";
    if (!PASSWORD_REGEX.test(password))
      return "Password must be 8+ chars with at least 1 letter and 1 number.";
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

      const res = await fetch(`${apiBase}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token, refresh_token, password }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || "Password reset failed");
      setMsg("✅ Password reset successfully.");
      setInputDisabled(true);

      // Redirect to the dashboard after 1 second
      setTimeout(() => nav("/"), 1000);
    } catch (e) {
      setErr(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-card">
          <h1 className="auth-title">Reset Password</h1>
          <p className="auth-sub">Please create a new password.</p>

          <form onSubmit={onSubmit} className="auth-form">
            <label className="field password-field">
              <span>New Password</span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={inputDisabled}
              />
              <p className="toggle-password" onClick={() => toggleShow("password")}>
                {showPassword ? <LuEye size="1.5em" /> : <LuEyeClosed size="1.5em" />}
              </p>
            </label>

            <label className="field password-field">
              <span>Confirm New Password</span>
              <input
                type={showConfirmedPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmedPassword}
                onChange={(e) => setConfirmedPassword(e.target.value)}
                required
                disabled={inputDisabled}
              />
              <p className="toggle-password" onClick={() => toggleShow("confirmed-password")}>
                {showConfirmedPassword ? <LuEye size="1.5em" /> : <LuEyeClosed size="1.5em" />}
              </p>
            </label>

            {err && <div className="msg error">{err}</div>}
            {msg && <div className="msg ok">{msg}</div>}

            <button type="submit" className="primary" disabled={loading}>
              {loading ? "Please wait…" : "Submit"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;