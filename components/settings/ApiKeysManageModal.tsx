"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Copy,
  Gauge,
  Key,
  Pencil,
  X,
} from "lucide-react";
import { SpinningLogo } from "@/components/SpinningLogo";
import type { ApiKeyRecord } from "./types";

const MAX_KEYS = 10;

const inputClass =
  "rounded-[18px] border border-white/[0.08] bg-[#18181B] text-zinc-100 outline-none placeholder:text-zinc-600 focus-visible:ring-2 focus-visible:ring-purple-500/40";

function formatMaskedKey(maskedKey: string): string {
  if (!maskedKey) return "••••••••";
  const prefix = maskedKey.replace(/\.\.\..*$/, "").replace(/_+$/, "");
  const visible = prefix.length > 10 ? prefix.slice(0, 10) : prefix;
  return `${visible}••••••••`;
}

function formatExpiry(date: string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function todayForDateInput(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ApiKeysManageModalProps {
  onClose: () => void;
}

export function ApiKeysManageModal({ onClose }: ApiKeysManageModalProps) {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [label, setLabel] = useState("Default");
  const [perMin, setPerMin] = useState(60);
  const [perDay, setPerDay] = useState(1000);
  const [expiresAt, setExpiresAt] = useState("");

  const [newKey, setNewKey] = useState<string | null>(null);

  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");

  const [editingRatesId, setEditingRatesId] = useState<string | null>(null);
  const [ratesDraft, setRatesDraft] = useState({ perMin: 60, perDay: 1000 });

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch("/api/keys");
      const data = await resp.json();
      if (data.data) setKeys(data.data);
    } catch (err) {
      console.error("Failed to fetch keys:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const copyKey = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const createKey = async () => {
    if (!label.trim() || creating || keys.length >= MAX_KEYS) return;
    setCreating(true);
    try {
      const resp = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: label.trim(),
          rateLimitPerMin: perMin,
          rateLimitPerDay: perDay,
          expiresAt: expiresAt || null,
        }),
      });
      const data = await resp.json();
      if (data.data?.key) {
        setNewKey(data.data.key);
        setLabel("Default");
        setExpiresAt("");
        await fetchKeys();
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error("Failed to create key:", err);
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (id: string) => {
    if (revokingId) return;
    setRevokingId(id);
    try {
      const resp = await fetch(`/api/keys/${id}`, { method: "DELETE" });
      if (resp.ok) setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      console.error("Failed to revoke key:", err);
    } finally {
      setRevokingId(null);
    }
  };

  const saveName = async (id: string) => {
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    try {
      const resp = await fetch(`/api/keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await resp.json();
      if (data.data) {
        setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, ...data.data } : k)));
        setEditingNameId(null);
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error("Failed to update name:", err);
    }
  };

  const saveRates = async (id: string) => {
    try {
      const resp = await fetch(`/api/keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rateLimitPerMin: ratesDraft.perMin,
          rateLimitPerDay: ratesDraft.perDay,
        }),
      });
      const data = await resp.json();
      if (data.data) {
        setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, ...data.data } : k)));
        setEditingRatesId(null);
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error("Failed to update rate limits:", err);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60" onClick={onClose} />
      <div
        role="dialog"
        aria-modal
        className="wf-canvas-panel fixed left-1/2 top-1/2 z-[61] flex max-h-[80vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-[18px] p-6"
      >
        <div className="flex flex-col space-y-1.5 text-left">
          <h2 className="flex items-center gap-2 text-lg font-semibold leading-none tracking-tight text-zinc-100">
            <Key className="h-[18px] w-[18px] text-zinc-300" aria-hidden />
            API Keys
          </h2>
          <p className="text-sm text-zinc-500">
            Create and manage API keys for REST API access. Max {MAX_KEYS} keys.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Key label..."
              maxLength={64}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className={`h-10 flex-1 px-3 text-sm ${inputClass}`}
            />
            <button
              type="button"
              onClick={createKey}
              disabled={creating || keys.length >= MAX_KEYS}
              className="inline-flex h-8 shrink-0 items-center justify-center rounded-[18px] bg-zinc-100 px-3 text-xs font-medium text-zinc-900 hover:bg-white disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create Key"}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Gauge className="h-3 w-3 shrink-0 text-zinc-500" aria-hidden />
              <label className="shrink-0 text-[11px] text-zinc-500">Per min</label>
              <input
                type="number"
                min={1}
                max={60}
                value={perMin}
                onChange={(e) => setPerMin(Number(e.target.value))}
                className={`h-7 w-20 px-2 text-xs ${inputClass}`}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="shrink-0 text-[11px] text-zinc-500">Per day</label>
              <input
                type="number"
                min={1}
                value={perDay}
                onChange={(e) => setPerDay(Number(e.target.value))}
                className={`h-7 w-24 px-2 text-xs ${inputClass}`}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 shrink-0 text-zinc-500" aria-hidden />
            <label className="shrink-0 text-[11px] text-zinc-500">Expires</label>
            <input
              type="date"
              min={todayForDateInput()}
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className={`h-7 px-2 text-xs [color-scheme:dark] ${inputClass}`}
            />
            <span className="text-[11px] text-zinc-500">Optional</span>
          </div>
        </div>

        {newKey && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden />
              <span className="text-[12px] text-amber-300">
                Copy your key now — it won&apos;t be shown again.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg border border-white/[0.08] bg-[#121215] px-3 py-2 font-mono text-xs text-zinc-200">
                {newKey}
              </code>
              <button
                type="button"
                onClick={() => copyKey(newKey)}
                className="inline-flex h-8 items-center gap-1 rounded-[18px] border border-white/[0.08] bg-[#121215] px-3 text-xs font-medium text-zinc-200 transition hover:bg-white/[0.06]"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setNewKey(null)}
              className="inline-flex h-8 items-center rounded-[18px] px-3 text-[12px] font-medium text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="h-px w-full shrink-0 bg-white/[0.08]" />

        <div className="flex-1 space-y-2 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <SpinningLogo size="sm" />
            </div>
          ) : keys.length === 0 ? (
            <p className="py-4 text-center text-xs text-zinc-500">No API keys yet.</p>
          ) : (
            keys.map((k) => (
              <div
                key={k.id}
                className="rounded-lg border border-white/[0.08] bg-[#121215] px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {editingNameId === k.id ? (
                        <div className="flex min-w-0 flex-1 items-center gap-1">
                          <input
                            type="text"
                            value={nameDraft}
                            maxLength={64}
                            onChange={(e) => setNameDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveName(k.id);
                              if (e.key === "Escape") setEditingNameId(null);
                            }}
                            className={`h-7 min-w-0 flex-1 rounded-lg px-2 text-sm ${inputClass}`}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => saveName(k.id)}
                            className="text-xs font-medium text-zinc-200 hover:underline"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="truncate text-sm font-medium text-zinc-100">
                            {k.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNameId(k.id);
                              setNameDraft(k.name);
                            }}
                            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[18px] text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-300"
                            title="Edit name"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <code className="font-mono text-xs text-zinc-500">
                        {formatMaskedKey(k.maskedKey)}
                      </code>
                      {k.expiresAt && (
                        <span className="text-[11px] text-zinc-500">
                          {formatExpiry(k.expiresAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => revokeKey(k.id)}
                    disabled={revokingId === k.id}
                    className="inline-flex h-8 shrink-0 items-center rounded-[18px] border border-white/[0.08] bg-white/[0.04] px-3 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.08] disabled:opacity-50"
                  >
                    {revokingId === k.id ? "Revoking…" : "Revoke"}
                  </button>
                </div>

                <div className="mt-1.5 flex items-center gap-3">
                  {editingRatesId === k.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={ratesDraft.perMin}
                        onChange={(e) =>
                          setRatesDraft((d) => ({
                            ...d,
                            perMin: Number(e.target.value),
                          }))
                        }
                        className={`h-6 w-16 rounded-lg px-1.5 text-[11px] ${inputClass}`}
                      />
                      <span className="text-[11px] text-zinc-500">/min</span>
                      <input
                        type="number"
                        min={1}
                        value={ratesDraft.perDay}
                        onChange={(e) =>
                          setRatesDraft((d) => ({
                            ...d,
                            perDay: Number(e.target.value),
                          }))
                        }
                        className={`h-6 w-20 rounded-lg px-1.5 text-[11px] ${inputClass}`}
                      />
                      <span className="text-[11px] text-zinc-500">/day</span>
                      <button
                        type="button"
                        onClick={() => saveRates(k.id)}
                        className="text-[11px] font-medium text-zinc-200 hover:underline"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingRatesId(null)}
                        className="text-[11px] text-zinc-500 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                        <Gauge className="h-[11px] w-[11px] shrink-0" aria-hidden />
                        <span>{k.rateLimitPerMin ?? 60}/min</span>
                        <span className="text-zinc-700">|</span>
                        <span>{k.rateLimitPerDay ?? 1000}/day</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRatesId(k.id);
                          setRatesDraft({
                            perMin: k.rateLimitPerMin ?? 60,
                            perDay: k.rateLimitPerDay ?? 1000,
                          });
                        }}
                        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[18px] text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-300"
                        title="Edit rate limits"
                      >
                        <Pencil className="h-2.5 w-2.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-300"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}
