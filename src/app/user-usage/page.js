"use client";

import { useState, useEffect, useCallback } from "react";

function maskKey(k) {
  if (!k) return "";
  if (k.length <= 12) return k.slice(0, 4) + "***";
  return k.slice(0, 4) + "***" + k.slice(-4);
}

function fmtCountdown(ms) {
  if (ms <= 0) return "expired";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

export default function UserUsagePage() {
  const [apiKey, setApiKey] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchUsage = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/user-usage", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Request failed"); setData(null); }
      else { setData(json); setError(""); }
    } catch { setError("Network error"); setData(null); }
    finally { setLoading(false); }
  }, [apiKey]);

  if (!data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0b0f", color: "#e0e0e0", fontFamily: "system-ui, sans-serif" }}>
        <form onSubmit={(e) => { e.preventDefault(); fetchUsage(); }} style={{ background: "#14141a", padding: "2rem", borderRadius: "12px", width: "100%", maxWidth: "400px", border: "1px solid #222" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.25rem", fontWeight: 600 }}>User Usage</h1>
          <p style={{ margin: "0 0 1.25rem", fontSize: "0.8rem", color: "#888" }}>Enter your API key to view usage details.</p>
          <input
            type="password"
            placeholder="sr-xxxx-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "8px", border: "1px solid #333", background: "#1a1a22", color: "#e0e0e0", fontSize: "0.9rem", boxSizing: "border-box" }}
          />
          <button type="submit" disabled={loading || !apiKey.trim()} style={{ marginTop: "0.75rem", width: "100%", padding: "0.6rem", borderRadius: "8px", border: "none", background: "#2563eb", color: "#fff", fontWeight: 600, cursor: loading ? "default" : "pointer", opacity: loading || !apiKey.trim() ? 0.6 : 1 }}>
            {loading ? "Loading..." : "View Usage"}
          </button>
          {error && <p style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "#ef4444" }}>{error}</p>}
        </form>
      </div>
    );
  }

  const { key, usage, history, endpoint } = data;
  const expired = key.expiresAt && now >= new Date(key.expiresAt).getTime();
  const tokenPct = key.maxTokens ? Math.round((usage.totalTokens / key.maxTokens) * 100) : null;
  const reqPct = key.maxRequests ? Math.round((usage.totalRequests / key.maxRequests) * 100) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0f", color: "#e0e0e0", fontFamily: "system-ui, sans-serif", padding: "1.5rem" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.5rem" }}>📊 User Usage</h1>

        {/* Info cards row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
          <Card label="Endpoint" value={endpoint} />
          <Card label="API Key" value={maskKey(key.key)} />
          <Card label="Model" value={key.allowedModels?.length ? key.allowedModels.join(", ") : "All models"} />
          <Card label="Created" value={new Date(key.createdAt).toLocaleDateString()} />
          <Card label="Status" value={
            key.isActive === false ? "❌ Disabled" :
            expired ? "❌ Expired" : "✅ Active"
          } />
          <Card label="Expires" value={
            key.expiresAt ? fmtCountdown(new Date(key.expiresAt).getTime() - now) : "Unlimited"
          } />
        </div>

        {/* Quota */}
        <div style={{ background: "#14141a", borderRadius: "12px", border: "1px solid #222", padding: "1rem", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "0.9rem", fontWeight: 600, margin: "0 0 0.75rem" }}>Quota</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <QuotaBar label="Tokens" used={usage.totalTokens} max={key.maxTokens} pct={tokenPct} unit="tokens" />
            <QuotaBar label="Requests" used={usage.totalRequests} max={key.maxRequests} pct={reqPct} unit="reqs" />
          </div>
          {!key.maxTokens && !key.maxRequests && <p style={{ fontSize: "0.8rem", color: "#888", margin: 0 }}>No quota limit set.</p>}
        </div>

        {/* Usage History */}
        <div style={{ background: "#14141a", borderRadius: "12px", border: "1px solid #222", padding: "1rem" }}>
          <h2 style={{ fontSize: "0.9rem", fontWeight: 600, margin: "0 0 0.75rem" }}>Usage History</h2>
          {history.length === 0 ? (
            <p style={{ fontSize: "0.8rem", color: "#888", margin: 0 }}>No usage recorded yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #333" }}>
                    <th style={{ textAlign: "left", padding: "0.4rem 0.5rem", color: "#888" }}>Time</th>
                    <th style={{ textAlign: "left", padding: "0.4rem 0.5rem", color: "#888" }}>Model</th>
                    <th style={{ textAlign: "right", padding: "0.4rem 0.5rem", color: "#888" }}>Tokens</th>
                    <th style={{ textAlign: "right", padding: "0.4rem 0.5rem", color: "#888" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #1a1a22" }}>
                      <td style={{ padding: "0.4rem 0.5rem" }}>{new Date(h.timestamp).toLocaleString()}</td>
                      <td style={{ padding: "0.4rem 0.5rem", fontFamily: "monospace", fontSize: "0.75rem" }}>{h.model}</td>
                      <td style={{ padding: "0.4rem 0.5rem", textAlign: "right", fontFamily: "monospace" }}>
                        {(h.tokens?.prompt_tokens || 0) + (h.tokens?.completion_tokens || 0)}
                      </td>
                      <td style={{ padding: "0.4rem 0.5rem", textAlign: "right" }}>{h.status || "ok"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <button onClick={() => { setData(null); setApiKey(""); }} style={{ marginTop: "1rem", background: "none", border: "1px solid #333", color: "#888", padding: "0.4rem 0.8rem", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" }}>
          ← Back
        </button>
      </div>
    </div>
  );
}

function Card({ label, value }) {
  return (
    <div style={{ background: "#14141a", borderRadius: "10px", border: "1px solid #222", padding: "0.75rem 1rem" }}>
      <p style={{ margin: "0 0 0.25rem", fontSize: "0.7rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
      <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 500, wordBreak: "break-all" }}>{value}</p>
    </div>
  );
}

function QuotaBar({ label, used, max, pct, unit }) {
  if (!max) return null;
  const remaining = Math.max(0, max - used);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.25rem" }}>
        <span>{label}: {remaining}/{max} {unit}</span>
        <span style={{ color: pct > 80 ? "#ef4444" : pct > 50 ? "#f59e0b" : "#22c55e" }}>{pct}%</span>
      </div>
      <div style={{ height: "8px", borderRadius: "4px", background: "#222", overflow: "hidden" }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", borderRadius: "4px", background: pct > 80 ? "#ef4444" : pct > 50 ? "#f59e0b" : "#2563eb", transition: "width 0.3s" }} />
      </div>
    </div>
  );
}
