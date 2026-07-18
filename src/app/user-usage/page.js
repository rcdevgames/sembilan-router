"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, Button, Input } from "@/shared/components";

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
        if (json.key.isActive === false) { setError("API key is disabled"); setData(null); return; }
        if (json.key.expiresAt && new Date(json.key.expiresAt).getTime() <= Date.now()) { setError("API key has expired"); setData(null); return; }
        setData(json); setError("");
      }
    } catch { setError("Network error"); setData(null); }
    finally { setLoading(false); }
  }, [apiKey]);

  // --- LOGIN FORM (matches login page design) ---
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-4 relative overflow-hidden">
        <div className="landing-grid absolute inset-0 pointer-events-none" aria-hidden="true" />
        <div className="relative z-10 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">Sembilan Router</h1>
            <p className="text-text-muted">Enter your API key to view usage details.</p>
          </div>
          <Card>
            <form onSubmit={(e) => { e.preventDefault(); fetchUsage(); }} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">API Key</label>
                <Input
                  type="password"
                  placeholder="sr-xxxx-xxxx-xxxxxxxx"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  required
                  autoFocus
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
              </div>
              <Button type="submit" variant="primary" className="w-full" loading={loading} disabled={!apiKey.trim()}>
                View Usage
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  // --- DASHBOARD ---
  const { key, usage, history, endpoint } = data;
  const tokenPct = key.maxTokens ? Math.round((usage.totalTokens / key.maxTokens) * 100) : null;
  const reqPct = key.maxRequests ? Math.round((usage.totalRequests / key.maxRequests) * 100) : null;

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-6">User Usage</h1>

        <div className="grid gap-3 mb-6">
          <Row label="Endpoint" value={endpoint} onCopy={() => copy(endpoint, "endpoint")} copied={copied === "endpoint"} />
          <Row label="API Key" value={key.key} onCopy={() => copy(key.key, "apikey")} copied={copied === "apikey"} mono />
          <Row label="Model" value={key.allowedModels?.length ? key.allowedModels.join(", ") : "All models"} onCopy={() => copy(key.allowedModels?.length ? key.allowedModels.join(", ") : "All models", "model")} copied={copied === "model"} />
          <Row label="Expires" value={key.expiresAt ? fmtCountdown(new Date(key.expiresAt).getTime() - now) : "Unlimited"} />
        </div>

        <Card className="mb-6">
          <h2 className="text-sm font-semibold mb-3">Quota</h2>
          <div className="grid grid-cols-2 gap-4">
            <QuotaBar label="Tokens" used={usage.totalTokens} max={key.maxTokens} pct={tokenPct} />
            <QuotaBar label="Requests" used={usage.totalRequests} max={key.maxRequests} pct={reqPct} />
          </div>
          {!key.maxTokens && !key.maxRequests && <p className="text-text-muted text-xs mt-2">No quota limit set.</p>}
        </Card>

        <Card className="mb-8">
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
        </Card>

        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => { setData(null); setApiKey(""); }}>Logout</Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, onCopy, copied, mono }) {
  return (
    <div className="bg-card rounded-xl border border-border px-4 py-3 flex items-center justify-between gap-2">
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
