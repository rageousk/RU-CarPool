export default function HomePage() {
    return (
      <div style={{
        width: '100%', maxWidth: 900, margin: '0 auto',
        background: '#fff', border: '1px solid #eef2f7',
        borderRadius: 12, padding: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.06)'
      }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>Welcome to RU Carpooling</h1>
        <p style={{ marginTop: 8 }}>Use the header → <b>Login / Sign Up</b>.</p>
      </div>
    );
  }