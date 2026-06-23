"use client";

/**
 * @fileoverview Execution History drawer for `/workflow/[id]/canvas`: REST-backed run list with filters and a
 * live in-flight run pill. Clicking a finished run opens the centered RunDetailsModal (Canvas + Inspect tabs);
 * the per-node input/output drill-down lives in that modal. The legacy inline-preview drawer is preserved as
 * RightHistoryPanel2 for `/workflow/[id]/canvas2`.
 */

import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronRight, Check } from "lucide-react";
import RunDetailsModal from "./RunDetailsModal";
import { useWorkflowStore } from "@/store/workflow-store";
import { SpinningLogo } from "@/components/SpinningLogo";

interface NodeRunData {
  id: string;
  nodeId: string;
  nodeName: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  inputs?: Record<string, unknown>;
  output?: unknown;
  error?: string;
  providerUsed?: string | null;
  providerAttempts?: Array<{ providerId: string; status: "success" | "failed"; error?: string; durationMs: number }> | null;
  logs?: string | null;
  creditCost?: number | null;
}

interface RunHistoryItem {
  id: string;
  scope: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  nodeRuns: NodeRunData[];
}

interface RightHistoryPanelProps {
  workflowId: string;
  isOpen: boolean;
}

/**
 * Fires canonical auto-arrange after layout settles so a closed preview doesn't leave nodes overlapping.
 *
 * NOTE: RAF + 160ms timeout mirrors React Flow measurement timing used after collapsing preview overlays.
 */
function scheduleAutoArrangeAfterHistoryPreviewToggle(): void {
  requestAnimationFrame(() => {
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("thinkly:auto-arrange"));
    }, 160);
  });
}

type FilterStatus = "all" | "queued" | "running" | "waiting" | "success" | "failed" | "canceled";

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: "all",      label: "All"       },
  { value: "queued",   label: "Queued"    },
  { value: "running",  label: "Running"   },
  { value: "waiting",  label: "Waiting"   },
  { value: "success",  label: "Completed" },
  { value: "failed",   label: "Failed"    },
  { value: "canceled", label: "Canceled"  },
];

const statusDot: Record<string, { color: string; label: string; pulse?: boolean }> = {
  success:  { color: "#10B981", label: "Completed" },
  failed:   { color: "#EF4444", label: "Failed"    },
  partial:  { color: "#F59E0B", label: "Partial"   },
  running:  { color: "#3B82F6", label: "Running", pulse: true },
  queued:   { color: "#8B5CF6", label: "Queued"    },
  waiting:  { color: "#F59E0B", label: "Waiting"   },
  canceled: { color: "#9CA3AF", label: "Canceled"  },
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB") + ", " + d.toLocaleTimeString("en-GB");
}

// ── Custom dropdown ───────────────────────────────────────────────────────────

function FilterDropdown({
  value,
  onChange,
}: {
  value: FilterStatus;
  onChange: (v: FilterStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = FILTER_OPTIONS.find((o) => o.value === value)!;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-md border border-white/[0.08] bg-[#121215] px-2 py-1 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.06]"
      >
        {selected.label}
        <ChevronDown className="h-3.5 w-3.5 text-zinc-500 opacity-60" />
      </button>

      {open && (
        <div className="wf-canvas-panel absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-xl py-1">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-zinc-200 transition-colors hover:bg-white/[0.06]"
            >
              <span className="w-4 flex-shrink-0">
                {value === opt.value && <Check className="h-3.5 w-3.5 text-purple-400" />}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── RunItem ───────────────────────────────────────────────────────────────────

/** A single run pill. Finished runs open the RunDetailsModal; the live run pill is non-interactive. */
function RunItem({
  run,
  onOpen,
}: {
  run: RunHistoryItem;
  onOpen: () => void;
}) {
  const sd = statusDot[run.status] ?? statusDot.failed;
  const isLive = run.status === "running";

  return (
    <div
      className={`mb-2 overflow-hidden rounded-xl border transition-colors ${
        isLive
          ? "border-blue-500/40 bg-blue-500/10"
          : "border-white/[0.08] bg-[#121215] hover:border-white/[0.14]"
      }`}
    >
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={() => {
          if (!isLive) onOpen();
        }}
        disabled={isLive}
      >
        <div className="flex items-start gap-3 min-w-0">
          <span className="mt-[3px] flex-shrink-0 relative">
            <span
              className="block w-3 h-3 rounded-full"
              style={{ background: sd.color }}
            />
            {sd.pulse && (
              <span
                className="absolute inset-0 rounded-full animate-ping opacity-60"
                style={{ background: sd.color }}
              />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold leading-tight text-zinc-100">
              {sd.label}
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              {isLive
                ? "In progress…"
                : `Credits: ${(() => {
                    const totalCost = run.nodeRuns.reduce((sum, nr) => sum + (nr.creditCost ?? 0), 0);
                    return `${(totalCost / 1000000).toFixed(2)}M`;
                  })()}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className="flex-shrink-0 tabular-nums text-[11px] text-zinc-500">
            {formatTimestamp(run.startedAt)}
          </span>
          {!isLive && <ChevronRight className="h-4 w-4 text-zinc-600" aria-hidden />}
        </div>
      </button>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

/** Sidebar listing `/api/workflows/:id/history` + synthetic in-flight run mirrored from workflow store state. */
export default function RightHistoryPanel({ workflowId, isOpen }: RightHistoryPanelProps) {
  const {
    setIsHistoryPanelOpen,
    runHistory,
    setRunHistory,
    clearPreviewRun,
    isRunning,
    currentRunId,
    currentRunScope,
  } = useWorkflowStore();

  const [activeTab, setActiveTab] = useState<"ui" | "api">("ui");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [loading, setLoading] = useState(false);
  // Clicking a run pill opens the centered run-details modal (Canvas + Inspect tabs).
  const [detailsRun, setDetailsRun] = useState<RunHistoryItem | null>(null);

  // Auto-switch to UI Runs tab when a run starts
  useEffect(() => {
    if (isRunning) setActiveTab("ui");
  }, [isRunning]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/workflows/${workflowId}/history`);
      const data = await resp.json();
      if (data.data) setRunHistory(data.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, [workflowId]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchHistory();
    };
    window.addEventListener("thinkly:refresh-history", handleRefresh);
    return () => window.removeEventListener("thinkly:refresh-history", handleRefresh);
  }, [workflowId]);

  // Build the synthetic "running" entry to show at the top while executing
  const liveRun: RunHistoryItem | null = isRunning
    ? {
        id: currentRunId ?? "__live__",
        scope: currentRunScope ?? "full",
        status: "running",
        startedAt: new Date().toISOString(),
        nodeRuns: [],
      }
    : null;

  // The live pill only shows when filter is "all" or "running"
  const showLive = liveRun && (filter === "all" || filter === "running");

  // Filter completed history (never show "running" status from DB in the list since we use liveRun for that)
  const filteredRuns = runHistory.filter((r) => {
    // If this run is exactly the one we're showing as liveRun, hide it from the DB list
    if (showLive && r.id === liveRun.id) return false;

    if (filter === "all") return true;
    // Map filter values to actual stored statuses
    if (filter === "success") return r.status === "success";
    if (filter === "failed") return r.status === "failed";
    if (filter === "canceled") return r.status === "canceled";
    if (filter === "running") return r.status === "running";
    if (filter === "queued") return r.status === "queued";
    if (filter === "waiting") return r.status === "waiting";
    return true;
  });

  return (
    <div
      className="absolute right-0 top-0 bottom-0 z-40 flex flex-col transition-[width,padding,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden pointer-events-none"
      style={{
        width: isOpen ? 360 : 0,
        padding: isOpen ? 12 : 0,
        opacity: isOpen ? 1 : 0,
      }}
    >
      {/* Outer Bezel (matches LeftSidebar outer style) */}
      <div className="flex flex-col h-full rounded-[2rem] p-1.5 border border-white/10 bg-white/[0.02] backdrop-blur-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.85)] w-[336px] relative pointer-events-auto">
        
        {/* Inner Core Bezel (matches LeftSidebar inner style) */}
        <div className="rounded-[calc(2rem-6px)] bg-[#0A0A0C]/90 border border-white/5 flex flex-col h-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] relative overflow-hidden w-full">
          {/* CSS Film Grain Noise overlay */}
          <div className="absolute inset-0 pointer-events-none glass-noise z-0" />
          
          <div className="flex h-full min-h-0 flex-col relative z-10">

            {/* Sticky header */}
          <div className="sticky top-0 z-10 border-b border-white/[0.08] bg-[#0A0A0C]/90 backdrop-blur-md p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-zinc-100">Execution History</div>
              <button
                onClick={() => {
                  const hadPreview = useWorkflowStore.getState().previewRunId !== null;
                  clearPreviewRun();
                  setDetailsRun(null);
                  setIsHistoryPanelOpen(false);
                  if (hadPreview) scheduleAutoArrangeAfterHistoryPreviewToggle();
                }}
                className="inline-flex h-8 items-center justify-center rounded-[18px] px-3 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
              >
                Close
              </button>
            </div>

            {/* Tab toggle + refresh */}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex flex-1 rounded-lg border border-white/[0.08] bg-[#121215] p-0.5">
                <button
                  onClick={() => setActiveTab("ui")}
                  className={`flex-1 rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors ${
                    activeTab === "ui"
                      ? "bg-[#0A0A0C] text-zinc-100 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  UI Runs
                </button>
                <button
                  onClick={() => setActiveTab("api")}
                  className={`flex-1 rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors ${
                    activeTab === "api"
                      ? "bg-[#0A0A0C] text-zinc-100 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  API Runs
                </button>
              </div>
              <button
                onClick={fetchHistory}
                className="wf-canvas-chrome inline-flex h-8 w-8 items-center justify-center rounded-[18px] text-zinc-400 transition-colors hover:text-zinc-200"
                title="Refresh"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {/* Filter row */}
              <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-xs font-medium text-zinc-400">Run history</div>
              <FilterDropdown value={filter} onChange={setFilter} />
            </div>

            {/* Run list */}
            {activeTab === "api" ? (
              <div className="rounded-xl border border-white/[0.08] bg-[#121215] p-4 text-center">
                <p className="mb-1 text-[12px] font-medium text-zinc-300">No API runs yet</p>
                <p className="text-[11px] leading-relaxed text-zinc-500">
                  Trigger this workflow externally via{" "}
                  <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[10px] text-zinc-400">
                    POST /api/workflows/{"{id}"}/run
                  </code>{" "}
                  with a valid session to see runs here.
                </p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-8">
                <SpinningLogo size="sm" />
              </div>
            ) : !showLive && filteredRuns.length === 0 ? (
              <div className="rounded-xl border border-white/[0.08] bg-[#121215] p-4 text-center text-xs text-zinc-500">
                No runs for this filter yet.
              </div>
            ) : (
              <div className="space-y-2">
                {/* Live running pill — always at top */}
                {showLive && (
                  <RunItem key="__live__" run={liveRun!} onOpen={() => {}} />
                )}
                {filteredRuns.map((run) => (
                  <RunItem
                    key={run.id}
                    run={run}
                    onOpen={() => setDetailsRun(run)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

      {detailsRun && (
        <RunDetailsModal
          run={detailsRun}
          workflowId={workflowId}
          onClose={() => setDetailsRun(null)}
        />
      )}
    </div>
  );
}
