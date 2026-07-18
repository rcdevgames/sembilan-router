"use client";

import { useState, useEffect, useCallback } from "react";

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

function CopyIcon({ onClick, className = "" }) {
  return (
    <button onClick={onClick} className={`p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded text-text-muted hover:text-primary opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all ${className}`} title="Copy">
      <span className="material-symbols-outlined text-[14px]">content_copy</span>
    </button>
  );
}

export default function UserUsagePage() {
  const [apiKey, setApiKey] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const copy = (val, field) => {
    navigator.clipboard.writeText(val);
    setCopied(field);
    setTimeout(() => setCopied(null), 1500);
  };

  const fetchUsage = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/user-usage", { headers: { Authorization: `Bearer ${apiKey}` } });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Request failed"); setData(null); }
      else {
        // Block access if key is disabled
        if (json.key.isActive === false) { setError("API key is disabled"); setData(null); return; }
        // Block if expired
        if (json.key.expiresAt && new Date(json.key.expiresAt).getTime() <= Date.now()) { setError("API key has expired"); setData(null); return; }
        setData(json); setError("");
      }
    } catch { setError("Network error"); setData(null); }
    finally { setLoading(false); }
  }, [apiKey]);

  if (!data) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <form onSubmit={(e) => { e.preventDefault(); fetchUsage(); }} className="bg-card p-6 sm:p-8 rounded-xl border border-border w-full max-w-sm shadow-lg">
          <h1 className="text-lg font-semibold mb-1">User Usage</h1>
          <p className="text-text-muted text-xs mb-4">Enter your API key to view usage details.</p>
          <input type="password" placeholder="sr-xxxx-..." value={apiKey} onChange={(e) => setApiKey(e.target.value)}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-1 focus:ring-primary mb-3" />
          <button type="submit" disabled={loading || !apiKey.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition disabled:opacity-50 disabled:cursor-default">
            {loading ? "Loading..." : "View Usage"}
          </button>
          {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
        </form>
      </div>
    );
  }

  const { key, usage, history, endpoint } = data;
  const tokenPct = key.maxTokens ? Math.round((usage.totalTokens / key.maxTokens) * 100) : null;
  const reqPct = key.maxRequests ? Math.round((usage.totalRequests / key.maxRequests) * 100) : null;

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-6">User Usage</h1>

        {/* Info cards */}
        <div className="grid gap-4 mb-6">
          <Row label="Endpoint" value={endpoint} onCopy={() => copy(endpoint, "endpoint")} copied={copied === "endpoint"} />
          <Row label="API Key" value={key.key} onCopy={() => copy(key.key, "apikey")} copied={copied === "apikey"} mono />
          <Row label="Model" value={key.allowedModels?.length ? key.allowedModels.join(", ") : "All models"} onCopy={() => copy(key.allowedModels?.length ? key.allowedModels.join(", ") : "All models", "model")} copied={copied === "model"} />
          <Row label="Expires" value={key.expiresAt ? fmtCountdown(new Date(key.expiresAt).getTime() - now) : "Unlimited"} />
        </div>

        {/* Quota */}
        <div className="bg-card rounded-xl border border-border p-4 mb-6">
          <h2 className="text-sm font-semibold mb-3">Quota</h2>
          <div className="grid grid-cols-2 gap-4">
            <QuotaBar label="Tokens" used={usage.totalTokens} max={key.maxTokens} pct={tokenPct} />
            <QuotaBar label="Requests" used={usage.totalRequests} max={key.maxRequests} pct={reqPct} />
          </div>
          {!key.maxTokens && !key.maxRequests && <p className="text-text-muted text-xs mt-2">No quota limit set.</p>}
        </div>

        {/* Usage History */}
        <div className="bg-card rounded-xl border border-border p-4 mb-8">
          <h2 className="text-sm font-semibold mb-3">Usage History</h2>
          {history.length === 0 ? (
            <p className="text-text-muted text-xs">No usage recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-text-muted font-medium">Time</th>
                  <th className="text-left py-2 px-2 text-text-muted font-medium">Model</th>
                  <th className="text-right py-2 px-2 text-text-muted font-medium">Tokens</th>
                  <th className="text-right py-2 px-2 text-text-muted font-medium">Status</th>
                </tr></thead>
                <tbody>
                  {history.slice(0, 10).map((h, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="py-2 px-2 whitespace-nowrap">{new Date(h.timestamp).toLocaleString()}</td>
                      <td className="py-2 px-2 font-mono text-[11px]">{h.model}</td>
                      <td className="py-2 px-2 text-right font-mono">{(h.tokens?.prompt_tokens || 0) + (h.tokens?.completion_tokens || 0)}</td>
                      <td className="py-2 px-2 text-right">{h.status || "ok"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Logout button centered */}
        <div className="flex justify-center">
          <button onClick={() => { setData(null); setApiKey(""); }}
            className="px-6 py-2 text-sm text-text-muted hover:text-red-500 border border-border rounded-lg hover:border-red-500/30 transition">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, onCopy, copied, mono }) {
  return (
    <div className="bg-card rounded-xl border border-border px-4 py-3 group flex items-center justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-text-muted uppercase tracking-wide mb-0.5">{label}</p>
        <p className={`text-sm font-medium truncate ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
      {onCopy && (
        <button onClick={onCopy} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded text-text-muted hover:text-primary transition" title="Copy">
          <span className="material-symbols-outlined text-[16px]">{copied ? "check" : "content_copy"}</span>
        </button>
      )}
    </div>
  );
}

function QuotaBar({ label, used, max, pct }) {
  if (!max) return (
    <div>
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="text-sm font-medium">{used}</p>
    </div>
  );
  const remaining = Math.max(0, max - used);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span>{label}: <span className="font-medium">{remaining.toLocaleString()}</span>/{max.toLocaleString()}</span>
        <span className={pct > 80 ? "text-red-500" : pct > 50 ? "text-amber-500" : "text-green-500"}>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-border overflow-hidden">
        <div className={`h-full rounded-full transition-all ${pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-blue-600"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}
