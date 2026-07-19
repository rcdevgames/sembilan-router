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

export default function UserUsagePageClient() {
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

  return (
    <div className="min-h-screen bg-bg p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none -z-0" style={{
        backgroundImage: `
          linear-gradient(to right, rgba(59, 130, 246, 0.15) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(59, 130, 246, 0.15) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px'
      }} />
      <div className="relative z-10 max-w-2xl mx-auto py-6">
        <h1 className="text-xl font-bold mb-6">User Usage</h1>

        <Card className="mb-8">
          {/* Endpoint Section */}
          <Section title="Endpoint">
            <InfoRow label="URL" value={endpoint} onCopy={() => copy(endpoint, "endpoint")} copied={copied === "endpoint"} />
          </Section>

          <Divider />

          {/* API Key Section */}
          <Section title="API Key">
            <InfoRow label="Key" value={key.key} onCopy={() => copy(key.key, "apikey")} copied={copied === "apikey"} mono />
            <InfoRow label="Expires" value={key.expiresAt ? fmtCountdown(new Date(key.expiresAt).getTime() - now) : "Unlimited"} />
          </Section>

          <Divider />

          {/* Model Section */}
          <Section title="Model">
            <InfoRow 
              label="Assigned" 
              value={key.allowedModels?.length ? key.allowedModels.join(", ") : "All models"} 
              onCopy={() => copy(key.allowedModels?.length ? key.allowedModels.join(", ") : "All models", "model")} 
              copied={copied === "model"} 
            />
          </Section>

          <Divider />

          {/* Quota Section */}
          <Section title="Quota">
            {key.maxTokens ? (
              <QuotaBar label="Tokens" used={usage.totalTokens} max={key.maxTokens} />
            ) : key.maxRequests ? (
              <QuotaBar label="Requests" used={usage.totalRequests} max={key.maxRequests} />
            ) : (
              <p className="text-text-muted text-xs">No quota limit set.</p>
            )}
          </Section>

          <Divider />

          {/* Usage History Section */}
          <Section title="Usage History">
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
          </Section>
        </Card>

        <div className="flex justify-center">
          <button 
            onClick={() => { setData(null); setApiKey(""); }}
            className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="py-4">
      <h3 className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="border-t border-border" />;
}

function InfoRow({ label, value, onCopy, copied, mono }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-text-muted mb-0.5">{label}</p>
        <p className={`text-sm font-medium truncate ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
      {onCopy && (
        <button onClick={onCopy} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded text-text-muted hover:text-primary transition shrink-0" title="Copy">
          <span className="material-symbols-outlined text-[16px]">{copied ? "check" : "content_copy"}</span>
        </button>
      )}
    </div>
  );
}

function QuotaBar({ label, used, max }) {
  if (!max) return (
    <div>
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="text-sm font-medium">{used}</p>
    </div>
  );
  const remaining = Math.max(0, max - used);
  const pct = Math.round((used / max) * 100);
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
