"use client";

/**
 * @fileoverview Run-history detail modal for `/workflow/[id]/canvas`. Opened when a run pill is clicked.
 * Two tabs: "Canvas" embeds a read-only React Flow snapshot of the run (outputs overlaid via the store
 * preview pipeline), and "Inspect" lists the run summary + per-node results with a drill-down into
 * NodeDetailModal. Edit / Duplicate & Edit are presentational (route to the editor) per the reference.
 */

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import Canvas from "@/components/workflow/Canvas";
import NodeDetailModal from "@/components/workflow/NodeDetailModal";
import { useWorkflowStore } from "@/store/workflow-store";
import { formatDuration } from "@/lib/utils";
import {
  type NodeRunData,
  type RunHistoryItem,
  formatScopeMode,
  formatTimestampFull,
  statusMeta,
  statusTextClass,
} from "./run-detail-utils";

type Tab = "canvas" | "inspect";

export default function RunDetailsModal({
  run,
  workflowId,
  onClose,
}: {
  run: RunHistoryItem;
  workflowId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { setPreviewRun, clearPreviewRun } = useWorkflowStore();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>("canvas");
  const [selectedNodeRunId, setSelectedNodeRunId] = useState<string | null>(
    run.nodeRuns[0]?.id ?? null
  );
  const [detailNodeRun, setDetailNodeRun] = useState<NodeRunData | null>(null);

  // Overlay this run's outputs onto the canvas snapshot while the modal is open.
  useEffect(() => {
    setPreviewRun(run as Parameters<typeof setPreviewRun>[0]);
    return () => clearPreviewRun();
  }, [run, setPreviewRun, clearPreviewRun]);

  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const meta = statusMeta(run.status);
  const selectedNodeRun = useMemo(
    () => run.nodeRuns.find((n) => n.id === selectedNodeRunId) ?? null,
    [run.nodeRuns, selectedNodeRunId]
  );

  if (!mounted) return null;

  const goToEditor = () => {
    onClose();
    router.push(`/workflow/${workflowId}/canvas`);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex h-[85vh] w-[1100px] max-w-[85vw] flex-col overflow-hidden rounded-[18px] border border-gray-200 bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 pb-4 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                style={{ background: `${meta.color}1f` }}
              >
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: meta.color }} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold tracking-tight text-gray-900">
                  {meta.label}
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  {formatTimestampFull(run.startedAt)}
                  <span className="mx-1.5 text-gray-300">|</span>
                  {formatDuration(run.durationMs)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex rounded-lg border border-gray-200 bg-gray-100 p-0.5">
              {(["canvas", "inspect"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`rounded-md px-5 py-1.5 text-xs font-medium capitalize transition-colors ${
                    tab === t
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={goToEditor}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={goToEditor}
                className="rounded-lg border border-indigo-300 bg-indigo-500 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-600"
              >
                Duplicate &amp; Edit
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {tab === "canvas" ? (
            <div className="run-details-canvas h-full w-full">
              <style>{`.run-details-canvas .react-flow__node { cursor: default !important; }`}</style>
              <Canvas readOnly />
            </div>
          ) : (
            <div className="h-full space-y-4 overflow-y-auto p-5">
              {/* Run summary */}
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="text-sm font-medium text-gray-900">Run summary</div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-500">
                  <div>
                    Status: <span className="font-medium text-gray-900">{meta.label}</span>
                  </div>
                  <div className="text-right">
                    Mode:{" "}
                    <span className="capitalize text-gray-900">{formatScopeMode(run.scope)}</span>
                  </div>
                  <div>
                    Started: <span className="text-gray-900">{formatTimestampFull(run.startedAt)}</span>
                  </div>
                  <div className="text-right">
                    Finished:{" "}
                    <span className="text-gray-900">{formatTimestampFull(run.finishedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Nodes list */}
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="text-sm font-medium text-gray-900">
                  Nodes ({run.nodeRuns.length})
                </div>
                <div className="mt-3 max-h-[300px] space-y-2 overflow-y-auto">
                  {run.nodeRuns.map((nr) => {
                    const selected = nr.id === selectedNodeRunId;
                    const m = statusMeta(nr.status);
                    return (
                      <button
                        key={nr.id}
                        type="button"
                        onClick={() => setSelectedNodeRunId(nr.id)}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition ${
                          selected
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="inline-flex min-w-0 items-center gap-2">
                            <span
                              className="inline-block h-2 w-2 shrink-0 rounded-full"
                              style={{ background: m.color }}
                            />
                            <span className="truncate text-gray-900">{nr.nodeName}</span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-gray-400">{formatDuration(nr.durationMs)}</span>
                            <span className="text-gray-600">{m.label}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected node summary */}
              {selectedNodeRun && (
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">
                      {selectedNodeRun.nodeName}
                    </div>
                    <button
                      type="button"
                      onClick={() => setDetailNodeRun(selectedNodeRun)}
                      className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] text-gray-600 transition hover:bg-gray-100"
                    >
                      Show details
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
                    <div>
                      Status:{" "}
                      <span className={statusTextClass(selectedNodeRun.status)}>
                        {statusMeta(selectedNodeRun.status).label}
                      </span>
                    </div>
                    <div>
                      Duration:{" "}
                      <span className="text-gray-900">
                        {formatDuration(selectedNodeRun.durationMs)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          aria-label="Close"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {detailNodeRun && (
        <NodeDetailModal nodeRun={detailNodeRun} onClose={() => setDetailNodeRun(null)} />
      )}
    </div>,
    document.body
  );
}
