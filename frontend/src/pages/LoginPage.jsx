// frontend/src/pages/LoginPage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/LoginPage.css";

// Rowan-only + basic password rule
const ROWAN_REGEX = /@(?:students\.rowan\.edu|rowan\.edu)$/i;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

// Where the backend lives (Codespaces/Prod can override this in .env.local)
const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function LoginPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTos, setAcceptTos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  // Redirect and hide page when signed in
  const [userEmail] = useState(null);
  const hasToken = !!localStorage.getItem('ru_token');
  const signedIn = hasToken || !!userEmail;

  useEffect(() => {
    if (signedIn)
      nav("/dashboard");
  }, []);

  function validate() {
    if (!ROWAN_REGEX.test(email))
      return "Use your @students.rowan.edu or @rowan.edu email.";
    if (mode === "signup" && !PASSWORD_REGEX.test(password))
      return "Password must be 8+ chars with at least 1 letter and 1 number.";
    if (mode === "signup" && !acceptTos)
      return "Please accept the Terms to continue.";
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

      if (mode === "login") {
        const res = await fetch(`${apiBase}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        });
        const out = await res.json();
        if (!res.ok) throw new Error(out.error || "Login failed");

        // ✅ store a simple token + email so <RequireAuth> can allow /dashboard
        if (out?.session?.access_token) {
          localStorage.setItem("ru_token", out.session.access_token);
        }
        localStorage.setItem("ru_email", out?.user?.email || email);

        setMsg("✅ Logged in! Redirecting…");
        setTimeout(() => nav("/dashboard"), 300);
      }

      if (mode === "signup") {
        const res = await fetch(`${apiBase}/api/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const out = await res.json();
        if (!res.ok) {
          // When signing up with a pre-existing email say the user already exists
          const USER_EXISTS_ERR = `insert or update on table "users" violates foreign key constraint "users_id_fkey"`;
          if (out.error == USER_EXISTS_ERR)
            throw new Error("This user already exists. Do you want to login?");
          else
            throw new Error(out.error || "Sign up failed");
        }
        setMsg("✅ Check your email to verify your account.");
      }
    } catch (e) {
      setErr(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function onMagicLink() {
    setErr(null);
    setMsg(null);
    if (!ROWAN_REGEX.test(email)) return setErr("Use your Rowan email.");
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/api/auth/magic-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          redirectTo: window.location.origin,
        }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || "Failed to send magic link");
      setMsg("📨 Magic link sent! Check your inbox.");
    } catch (e) {
      setErr(e?.message || "Failed to send magic link.");
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
      const res = await fetch(`${apiBase}/api/auth/forgot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          redirectTo: `${window.location.origin}/login`,
        }),
      });
      const out = await res.json();
      if (!res.ok)
        throw new Error(out.error || "Failed to send reset email.");
      setMsg("📨 Password reset email sent. Click the link in your inbox.");
    } catch (e) {
      setErr(e?.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  }

  return (!signedIn &&
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-card">
          <h1 className="auth-title">Login / Sign Up</h1>
          <p className="auth-sub">Campus access only — Rowan emails required.</p>

          <div className="auth-tabs">
            <button
              onClick={() => {
                if (mode !== "login") setErr(null);
                setMode("login");
              }}
              className={`tab ${mode === "login" ? "active" : ""}`}
            >
              Login
            </button>
            <button
              onClick={() => {
                if (mode !== "signup") setErr(null);
                setMode("signup");
              }}
              className={`tab ${mode === "signup" ? "active" : ""}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={onSubmit} className="auth-form">
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                placeholder="you@students.rowan.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim())}
                required
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            {mode === "signup" && (
              <label className="tos">
                <input
                  type="checkbox"
                  checked={acceptTos}
                  onChange={(e) => setAcceptTos(e.target.checked)}
                />
                I agree to the Terms of Service & Code of Conduct.
              </label>
            )}

            {err && <div className="msg error">{err}</div>}
            {msg && <div className="msg ok">{msg}</div>}

            {mode === "login" && (
              <>
                <div className="row">
                  <button type="submit" className="primary" disabled={loading}>
                    {loading ? "Please wait…" : "Login"}
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={onMagicLink}
                    disabled={loading}
                  >
                    Send Magic Link to Email
                  </button>
                </div>
                <div style={{ marginTop: 10, textAlign: "center" }}>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={onForgotPassword}
                    disabled={loading}
                  >
                    Forgot password?
                  </button>
                </div>
              </>
            )}

            {mode === "signup" && (
              <button type="submit" className="primary" disabled={loading}>
                {loading ? "Please wait…" : "Create Account"}
              </button>
            )}
          </form>

          <p className="fineprint">
            Rules: Rowan emails only, respectful conduct, and campus-safe rides.
          </p>
        </div>
      </div>
    </div>
  );
}