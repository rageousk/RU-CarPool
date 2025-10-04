import { useEffect, useState } from 'react';
import { Link, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import { supabase } from './lib/supabaseClient';
import './App.css';

function Dashboard() {
  return (
    <div style={{
      width: '100%', maxWidth: 900, margin: '0 auto',
      background: '#fff', border: '1px solid #eef2f7',
      borderRadius: 12, padding: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.06)'
    }}>
      <h1 style={{ margin: 0, fontSize: 28 }}>Dashboard</h1>
      <p style={{ marginTop: 8 }}>
        You’re signed in. We’ll show rides, profile, and the map here next.
      </p>
    </div>
  );
}

export default function App() {
  const loc = useLocation();
  const nav = useNavigate();

  const [userEmail, setUserEmail] = useState(null);

  // ✅ consider either a Supabase browser session OR a backend token as signed-in
  const hasToken = !!localStorage.getItem('ru_token');
  const signedIn = hasToken || !!userEmail;
  const displayEmail = userEmail || localStorage.getItem('ru_email') || '';

  useEffect(() => {
    let mounted = true;

    // still listen for Supabase auth if ever used directly in the browser
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setUserEmail(data.session?.user?.email ?? null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  function handleLogout() {
    // clear backend login artifacts
    localStorage.removeItem('ru_token');
    localStorage.removeItem('ru_email');
    setUserEmail(null);
    // also sign out of any browser Supabase session (no-op if none)
    supabase.auth.signOut().catch(() => {});
    nav('/login');
  }

  return (
    <div style={layout}>
      <header style={header}>
        <nav style={navStyle}>
          <Link to="/" style={brand}>RU Carpooling</Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <NavLink to="/" active={loc.pathname === '/'}>Home</NavLink>
            <NavLink to="/login" active={loc.pathname.startsWith('/login')}>Login / Sign Up</NavLink>
            {signedIn && <NavLink to="/dashboard" active={loc.pathname.startsWith('/dashboard')}>Dashboard</NavLink>}

            {signedIn ? (
              <div style={userBox}>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
                  {displayEmail}
                </span>
                <button onClick={handleLogout} style={logoutBtn}>Log out</button>
              </div>
            ) : null}
          </div>
        </nav>
      </header>

      <main style={main}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth signedIn={signedIn}>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function RequireAuth({ signedIn, children }) {
  if (!signedIn) return <Navigate to="/login" replace />;
  return children;
}

function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      style={{
        color: active ? '#a7f3d0' : '#e5e7eb',
        textDecoration: 'none',
        padding: '6px 10px',
        borderRadius: 8,
        background: active ? 'rgba(167,243,208,0.08)' : 'transparent',
        fontWeight: 700
      }}
    >
      {children}
    </Link>
  );
}

const layout = { minHeight: '100dvh', display: 'flex', flexDirection: 'column' };
const header = { position: 'sticky', top: 0, zIndex: 10, background: '#0b1220', color: '#fff', borderBottom: '1px solid #111827' };
const navStyle = { maxWidth: 1100, margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 };
const brand = { color: '#a7f3d0', textDecoration: 'none', fontWeight: 800, letterSpacing: 0.2 };
const main = { flex: 1, padding: '20px 16px', background: 'linear-gradient(135deg,#f5f7fa,#e4ecf7)' };
const userBox = { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', border: '1px solid #1f2937', borderRadius: 10, background: '#0f172a' };
const logoutBtn = { padding: '6px 10px', borderRadius: 8, border: '1px solid #334155', background: '#111827', color: '#e5e7eb', cursor: 'pointer', fontWeight: 700 };