"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, Button, CardSkeleton, ModelSelectModal, ConfirmModal } from "@/shared/components";

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
