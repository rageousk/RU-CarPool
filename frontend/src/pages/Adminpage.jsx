import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function AdminPage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function runCleanup() {
    setRunning(true);
    setResult(null);
    setError(null);

    try {
      // Get the Supabase session token from the browser
      const { data } = await supabase.auth.getSession();
      const accessToken = data?.session?.access_token;

      if (!accessToken) {
        setError("Please sign in first.");
        setRunning(false);
        return;
      }

      const res = await fetch(`${apiBase}/api/admin/cleanup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // ✅ send the bearer token (Option A)
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const out = await res.json();
      if (!res.ok) throw new Error(out.error || "Failed to run cleanup");
      setResult(out);
    } catch (e) {
      setError(e.message || "Request failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{ maxWidth: 980, margin: "24px auto" }}>
      <h1>Admin Dashboard</h1>
      <p>Tools for moderators/admins.</p>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 16,
          background: "#fff",
          boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
          marginTop: 16,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Cleanup Unverified Users &gt; 24h</h2>
        <p>Deletes unverified accounts (auth + mirrored public.users) older than 24 hours.</p>

        <button
          onClick={runCleanup}
          disabled={running}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            fontWeight: 800,
            background: running ? "#93c5fd" : "#3b82f6",
            color: "#fff",
            border: "none",
            cursor: running ? "not-allowed" : "pointer",
          }}
        >
          {running ? "Running…" : "Run Cleanup"}
        </button>

        {error && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 8,
              background: "#fee2e2",
              color: "#991b1b",
            }}
          >
            {error}
          </div>
        )}

        {result && (
          <pre
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 8,
              background: "#0b1220",
              color: "#a7f3d0",
              overflowX: "auto",
            }}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}