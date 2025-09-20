import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import '../css/LoginPage.css';

// Rowan-only + basic password rule
const ROWAN_REGEX = /@(?:students\.rowan\.edu|rowan\.edu)$/i;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export default function LoginPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [acceptTos, setAcceptTos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  // Handle password reset redirect + signed-in redirect
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset');
        setMsg('Enter a new password to finish resetting.');
      }
      if (event === 'SIGNED_IN') {
        nav('/dashboard'); // <<— go to dashboard after login
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [nav]);

  function validate() {
    if (!ROWAN_REGEX.test(email)) return 'Use your @students.rowan.edu or @rowan.edu email.';
    if (mode === 'signup' && !PASSWORD_REGEX.test(password))
      return 'Password must be 8+ chars with at least 1 letter and 1 number.';
    if (mode === 'signup' && !acceptTos) return 'Please accept the Terms to continue.';
    return null;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr(null); setMsg(null);

    if (mode !== 'reset') {
      const v = validate();
      if (v) return setErr(v);
    }

    try {
      setLoading(true);

      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMsg('✅ Logged in! Redirecting…');
      }

      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg('✅ Check your email to verify your account.');
      }

      if (mode === 'reset') {
        if (!PASSWORD_REGEX.test(newPassword)) {
          throw new Error('New password must be 8+ chars with a letter and number.');
        }
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        setMsg('✅ Password updated. You can now log in.');
        setMode('login');
        setPassword('');
        setNewPassword('');
      }
    } catch (e) {
      setErr(e?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function onMagicLink() {
    setErr(null); setMsg(null);
    if (!ROWAN_REGEX.test(email)) return setErr('Use your Rowan email.');
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setMsg('📨 Magic link sent! Check your inbox.');
    } catch (e) {
      setErr(e?.message || 'Failed to send magic link.');
    } finally {
      setLoading(false);
    }
  }

  async function onForgotPassword() {
    setErr(null); setMsg(null);
    if (!email) return setErr('Enter your email first.');
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/login',
      });
      if (error) throw error;
      setMsg('📨 Password reset email sent. Click the link in your inbox.');
    } catch (e) {
      setErr(e?.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-card">
          <h1 className="auth-title">Login / Sign Up</h1>
          <p className="auth-sub">Campus access only — Rowan emails required.</p>

          <div className="auth-tabs">
            <button onClick={() => setMode('login')} className={`tab ${mode === 'login' ? 'active' : ''}`}>Login</button>
            <button onClick={() => setMode('signup')} className={`tab ${mode === 'signup' ? 'active' : ''}`}>Sign Up</button>
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

            {mode !== 'reset' ? (
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
            ) : (
              <label className="field">
                <span>New password</span>
                <input
                  type="password"
                  placeholder="New strong password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </label>
            )}

            {mode === 'signup' && (
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

            {mode === 'login' && (
              <>
                <div className="row">
                  <button type="submit" className="primary" disabled={loading}>
                    {loading ? 'Please wait…' : 'Login'}
                  </button>
                  <button type="button" className="secondary" onClick={onMagicLink} disabled={loading}>
                    Send Magic Link to Email
                  </button>
                </div>
                <div style={{ marginTop: 10, textAlign: 'center' }}>
                  <button type="button" className="link-btn" onClick={onForgotPassword} disabled={loading}>
                    Forgot password?
                  </button>
                </div>
              </>
            )}

            {mode === 'signup' && (
              <button type="submit" className="primary" disabled={loading}>
                {loading ? 'Please wait…' : 'Create Account'}
              </button>
            )}

            {mode === 'reset' && (
              <button type="submit" className="primary" disabled={loading}>
                {loading ? 'Please wait…' : 'Update Password'}
              </button>
            )}
          </form>

          <p className="fineprint">Rules: Rowan emails only, respectful conduct, and campus-safe rides.</p>
        </div>
      </div>
    </div>
  );
}