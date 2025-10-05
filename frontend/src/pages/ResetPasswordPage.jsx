import { useState } from "react"
import { Navigate, useLocation, useNavigate } from "react-router-dom"

// Basic password rule
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

// Backend
const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5050";

function ResetPasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmedPassword, setConfirmedPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [inputDisabled, setInputDisabled] = useState(false);
    const [msg, setMsg] = useState(null);
    const [err, setErr] = useState(null);
    const location = useLocation();
    const nav = useNavigate();
    
    // If there is no location state, go back to the homepage
    if (!location.state) {
        return <Navigate to="/" />;
    }

    const { access_token, refresh_token } = location.state;

    function validate() {
        if (password != confirmedPassword)
            return "❌ Passwords do not match."
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
            setTimeout(() => nav("/dashboard"), 1000);
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
                        <label className="field">
                            <span>New Password</span>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={inputDisabled}
                            />
                        </label>

                        <label className="field">
                            <span>Confirm New Password</span>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={confirmedPassword}
                                onChange={(e) => setConfirmedPassword(e.target.value)}
                                required
                                disabled={inputDisabled}
                            />
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