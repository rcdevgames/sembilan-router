"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Card, Button, CardSkeleton, ModelSelectModal, ConfirmModal, Modal } from "@/shared/components";

const DESCRIPTION =
  "Models allowed here are exposed in /v1/models. Combos are always shown — provider models appear only if added to this list. Click a chip to remove it.";

function toValue(modelOrId) {
  if (typeof modelOrId === "string") return modelOrId;
  return modelOrId?.value || modelOrId?.name || "";
}

export default function ModelWhitelistPage() {
  const [whitelist, setWhitelist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSelect, setShowSelect] = useState(false);
  const [activeProviders, setActiveProviders] = useState([]);
  const [confirmClear, setConfirmClear] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testState, setTestState] = useState({ current: 0, total: 0, passed: 0, failed: 0, currentModel: "" });
  const [testResults, setTestResults] = useState([]);
  const cancelRef = useRef(false);

  const fetchData = async () => {
    try {
      const [wlRes, providersRes] = await Promise.all([
        fetch("/api/models/whitelist"),
        fetch("/api/providers"),
      ]);
      if (wlRes.ok) {
        const d = await wlRes.json();
        setWhitelist(d.models || []);
      }
      if (providersRes.ok) {
        const d = await providersRes.json();
        setActiveProviders(d.connections || []);
      }
    } catch (e) {
      console.log("Error fetching whitelist:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = async (model) => {
    const value = toValue(model);
    if (!value || whitelist.includes(value)) return;
    const next = [...whitelist, value];
    setWhitelist(next);
    try {
      await fetch("/api/models/whitelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ models: [value] }),
      });
    } catch (e) {
      console.log(e);
    }
  };

  const handleRemove = async (modelOrId) => {
    const value = toValue(modelOrId);
    if (!value) return;
    setWhitelist((prev) => prev.filter((m) => m !== value));
    try {
      await fetch("/api/models/whitelist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ models: [value] }),
      });
    } catch (e) {
      console.log(e);
    }
  };

  const handleClear = async () => {
    setConfirmClear(false);
    setWhitelist([]);
    try {
      await fetch("/api/models/whitelist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clear: true }),
      });
    } catch (e) {
      console.log(e);
    }
  };

  // Test every active model (combos + whitelisted) one by one. Continues past
  // individual failures; only stops on cancel (after the in-flight test).
  const handleTestAll = async () => {
    setTesting(true);
    cancelRef.current = false;
    setTestResults([]);
    setTestState({ current: 0, total: 0, passed: 0, failed: 0, currentModel: "" });
    try {
      const combosRes = await fetch("/api/combos");
      const combosData = await combosRes.json().catch(() => ({}));
      const comboNames = (combosData.combos || [])
        .filter((c) => !c.kind || c.kind === "llm")
        .map((c) => c.name);
      const models = Array.from(new Set([...comboNames, ...whitelist]));
      setTestState((s) => ({ ...s, total: models.length }));

      let passed = 0;
      let failed = 0;
      const results = [];
      for (let i = 0; i < models.length; i++) {
        if (cancelRef.current) break;
        const model = models[i];
        setTestState((s) => ({ ...s, current: i + 1, currentModel: model }));
        try {
          const r = await fetch("/api/models/test", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model, kind: "llm" }),
          });
          const d = await r.json().catch(() => ({}));
          const ok = r.ok && d.ok === true;
          if (ok) passed++; else failed++;
          results.push({ model, ok, latencyMs: d.latencyMs ?? null, error: d.error || null });
        } catch (e) {
          failed++;
          results.push({ model, ok: false, latencyMs: null, error: String(e?.message || e) });
        }
        setTestResults([...results]);
        setTestState((s) => ({ ...s, passed, failed }));
      }
    } catch (e) {
      console.log("Test all error:", e);
    } finally {
      setTestState((s) => ({ ...s, currentModel: "" }));
      setTesting(false);
    }
  };

  const handleCancelTest = () => { cancelRef.current = true; };

  const closeTestModal = () => {
    setTestResults([]);
    setTestState({ current: 0, total: 0, passed: 0, failed: 0, currentModel: "" });
  };

  // Group by provider prefix (the part before the first "/")
  const grouped = useMemo(() => {
    const g = {};
    for (const id of whitelist) {
      const slash = id.indexOf("/");
      const key = slash > -1 ? id.slice(0, slash) : "other";
      (g[key] = g[key] || []).push(id);
    }
    return g;
  }, [whitelist]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-text-muted mt-1 max-w-2xl">{DESCRIPTION}</p>
        </div>
        <div className="flex gap-2">
          {whitelist.length > 0 && (
            <Button
              variant="ghost"
              icon="delete_sweep"
              onClick={() => setConfirmClear(true)}
              className="w-full sm:w-auto"
            >
              Clear all
            </Button>
          )}
          <Button
            icon="science"
            onClick={handleTestAll}
            loading={testing}
            className="w-full sm:w-auto whitespace-nowrap"
          >
            Test All
          </Button>
          <Button
            icon="add"
            onClick={() => setShowSelect(true)}
            className="w-full sm:w-auto whitespace-nowrap"
          >
            Add Model
          </Button>
        </div>
      </div>

      {/* List */}
      {whitelist.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
              <span className="material-symbols-outlined text-[32px]">verified</span>
            </div>
            <p className="text-text-main font-medium mb-1">No provider models whitelisted</p>
            <p className="text-sm text-text-muted mb-4">
              Only combos will show in /v1/models. Add provider models here to expose them.
            </p>
            <Button icon="add" onClick={() => setShowSelect(true)} className="w-full sm:w-auto">
              Add Model
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {Object.entries(grouped).map(([prefix, ids]) => (
            <Card key={prefix} padding="sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                  {prefix}
                </span>
                <span className="text-[10px] text-text-muted">({ids.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ids.map((id) => {
                  const slash = id.indexOf("/");
                  const modelId = slash > -1 ? id.slice(slash + 1) : id;
                  return (
                    <button
                      key={id}
                      onClick={() => handleRemove(id)}
                      className="inline-flex items-center gap-1 rounded-xl bg-primary/10 border border-primary/20 px-2 py-1 text-xs font-medium text-text-main hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 transition-colors"
                      title="Click to remove from whitelist"
                    >
                      <span className="font-mono">{modelId}</span>
                      <span className="material-symbols-outlined text-[12px]">close</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Model picker (multi-select, mirrors combo picker) */}
      <ModelSelectModal
        isOpen={showSelect}
        onClose={() => setShowSelect(false)}
        onSelect={handleAdd}
        onDeselect={handleRemove}
        activeProviders={activeProviders}
        title="Add Model to Whitelist"
        addedModelValues={whitelist}
        hideCombos={true}
        closeOnSelect={false}
      />

      <Modal
        isOpen={testing || testResults.length > 0}
        onClose={() => { if (!testing) closeTestModal(); }}
        title="Test All Models"
        size="md"
        footer={
          testing ? (
            <Button variant="ghost" onClick={handleCancelTest}>Cancel</Button>
          ) : (
            <Button variant="primary" onClick={closeTestModal}>Close</Button>
          )
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {testing
                ? `Testing ${testState.current}/${testState.total || "?"}`
                : `Done \u2014 ${testState.passed} passed, ${testState.failed} failed`}
            </span>
            <span className="flex gap-3">
              <span className="text-green-600 dark:text-green-400">✓ {testState.passed}</span>
              <span className="text-red-500">✗ {testState.failed}</span>
            </span>
          </div>
          {testing && testState.currentModel && (
            <p className="text-xs text-text-muted truncate font-mono">{testState.currentModel}</p>
          )}
          {testState.total > 0 && (
            <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${testState.total ? (testState.current / testState.total) * 100 : 0}%` }}
              />
            </div>
          )}
          {testResults.length > 0 && (
            <div className="max-h-[300px] overflow-y-auto flex flex-col gap-1 mt-1">
              {testResults.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs px-2 py-1 rounded bg-black/[0.02] dark:bg-white/[0.02]">
                  <span className={r.ok ? "text-green-600 dark:text-green-400" : "text-red-500"}>
                    {r.ok ? "✓" : "✗"}
                  </span>
                  <span className="font-mono truncate flex-1">{r.model}</span>
                  {r.latencyMs != null && <span className="text-text-muted shrink-0">{r.latencyMs}ms</span>}
                  {!r.ok && r.error && (
                    <span className="text-red-500 truncate max-w-[45%]" title={r.error}>{r.error}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <ConfirmModal
        isOpen={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={handleClear}
        title="Clear Whitelist"
        message="Remove all provider models from the whitelist? Only combos will remain in /v1/models."
        variant="danger"
      />
    </div>
  );
}
