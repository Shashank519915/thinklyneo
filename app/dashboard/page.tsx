/**
 * @fileoverview Authenticated `/dashboard`: lists workflows (`GET /api/workflows`), supports create/sample,
 * rename, delete, and row actions. Polls briefly while any row is `running` so status badges refresh.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PanelLeft, Plus, MoreHorizontal, Pencil, Trash2, ExternalLink, Workflow, Clock } from "lucide-react";
import LeftSidebar from "@/components/workflow/LeftSidebar";
import { formatRelativeTime } from "@/lib/utils";
import { SpinningLogo } from "@/components/SpinningLogo";

interface WorkflowItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  nodes?: unknown;
  _count?: { runs: number };
}

const statusColors: Record<string, string> = {
  idle:    "bg-gray-100 text-gray-600",
  running: "bg-blue-100 text-blue-600",
  done:    "bg-green-100 text-green-700",
  error:   "bg-red-100 text-red-600",
};

const statusLabels: Record<string, string> = {
  idle:    "Idle",
  running: "Running",
  done:    "Done",
  error:   "Error",
};

/**
 * Counts “block” nodes (everything except anchored Request-Inputs / Response).
 * Used beside total node count so the dashboard can show graph size minus fixed chrome.
 *
 * @param nodes — Persisted workflow `nodes` JSON (possibly non-array during migration).
 * @returns Number of draggable/executable-ish nodes on the canvas.
 */
function countWorkflowNodes(nodes: unknown): number {
  if (!Array.isArray(nodes)) return 0;
  return nodes.filter(
    (n: { type?: string }) => n.type !== "requestInputs" && n.type !== "response",
  ).length;
}

/**
 * Workflow list surface: empty state CTAs; table rows with sticky header; row kebab mirrors Open/Rename/Delete.
 *
 * @returns Full-page client layout beside `LeftSidebar`.
 */
export default function DashboardPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    console.log(
      "[NextFlow] Candidate LinkedIn: " +
        (process.env.NEXT_PUBLIC_LINKEDIN_URL ||
          "https://www.linkedin.com/in/shashank-anand")
    );
  }, []);

  /** Loads workflows from REST; resets `loading`; swallows failures to keep UX calm. */
  const fetchWorkflows = async () => {
    try {
      const resp = await fetch("/api/workflows");
      const data = await resp.json();
      if (data.data) setWorkflows(data.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  /**
   * Soft polling: dashboards don’t websocket today; periodic refetch avoids stale badges while a workflow run is alive.
   */
  useEffect(() => {
    const hasRunning = workflows.some((w) => w.status === "running");
    if (!hasRunning) return;
    const interval = setInterval(fetchWorkflows, 3000);
    return () => clearInterval(interval);
  }, [workflows]);

  /**
   * Kebab dismissal: listens on `document` (not bubble-only) because menus port outside row stacking.
   * Skips taps inside `[data-menu-container]` so toggle + item clicks behave.
   */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // If the click is inside any element with data-menu-container, don't close
      if (target.closest("[data-menu-container]")) return;
      setOpenMenuId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /** `POST /api/workflows` → navigates straight to the new canvas id. */
  const createWorkflow = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const resp = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled Workflow" }),
      });
      const data = await resp.json();
      if (data.data?.id) {
        router.push(`/workflow/${data.data.id}`);
      }
    } catch {
      setCreating(false);
    }
  };

  /** Seeds the marketing sample graph via `POST /api/workflows/sample`. */
  const createSampleWorkflow = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const resp = await fetch("/api/workflows/sample", { method: "POST" });
      const data = await resp.json();
      if (data.data?.id) router.push(`/workflow/${data.data.id}`);
      else fetchWorkflows();
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  /**
   * Hard-deletes a workflow row and prunes local list (server is source of truth).
   *
   * @param id — Workflow primary key.
   */
  const deleteWorkflow = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/workflows/${id}`, { method: "DELETE" });
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * Patches workflow display name; optimistic map update on success.
   *
   * @param id — Workflow id.
   * @param name — Next label (trimmed); blank names short-circuit.
   */
  const renameWorkflow = async (id: string, name: string) => {
    if (!name.trim()) return;
    try {
      await fetch(`/api/workflows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      setWorkflows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, name: name.trim() } : w))
      );
    } catch {
      // ignore
    } finally {
      setRenamingId(null);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F5F5]">
      {/* Left Sidebar */}
      <LeftSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {/* Top bar — h-14 pt-3 matches sidebar header exactly */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 h-14 pt-3 bg-white border-b border-gray-200">
          <div className="flex items-center gap-3">
            {/* Sidebar expand button — shown only when sidebar is collapsed */}
            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-[18px] border border-gray-200 bg-white shadow-md text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"
                title="Open Sidebar"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}
            <h1 className="text-[20px] font-semibold text-gray-900">Workflows</h1>
          </div>
          <div className="flex items-center gap-2">
            {workflows.length > 0 && (
              <button
                onClick={createSampleWorkflow}
                disabled={creating}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-[13px] font-medium rounded-lg transition-colors disabled:opacity-60"
              >
                Load sample
              </button>
            )}
            <button
              onClick={createWorkflow}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[13px] font-medium rounded-lg transition-colors disabled:opacity-60"
            >
              <Plus className="w-4 h-4" />
              {creating ? "Creating..." : "New Workflow"}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <SpinningLogo size="md" />
            </div>
          ) : workflows.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#F3F0FF] flex items-center justify-center mb-4">
                <Workflow className="w-8 h-8 text-[#7C3AED]" />
              </div>
              <h3 className="text-[16px] font-semibold text-gray-900 mb-2">
                No workflows yet
              </h3>
              <p className="text-[14px] text-gray-500 mb-6 max-w-sm">
                Create your first AI workflow to get started. Or load a pre-built sample.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={createWorkflow}
                  disabled={creating}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[14px] font-medium rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create workflow
                </button>
                <button
                  onClick={createSampleWorkflow}
                  disabled={creating}
                  className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-[14px] font-medium rounded-lg transition-colors"
                >
                  Load sample workflow
                </button>
              </div>
            </div>
          ) : (
            /* Workflow table */
            <div className="bg-white border border-gray-200 rounded-xl overflow-visible">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-[12px] font-medium text-gray-500 first:rounded-tl-xl">
                      Name
                    </th>
                    <th
                      className="text-left px-4 py-3 text-[12px] font-medium text-gray-500"
                      title="Total graph nodes; block count excludes Request/Response anchors."
                    >
                      Nodes
                    </th>
                    <th className="text-left px-4 py-3 text-[12px] font-medium text-gray-500">
                      Runs
                    </th>
                    <th className="text-left px-4 py-3 text-[12px] font-medium text-gray-500">
                      Last edited
                    </th>
                    <th className="text-left px-4 py-3 text-[12px] font-medium text-gray-500">
                      Status
                    </th>
                    <th className="text-right px-4 py-3 text-[12px] font-medium text-gray-500 last:rounded-tr-xl">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {workflows.map((wf) => {
                    const totalNodes = Array.isArray(wf.nodes) ? wf.nodes.length : 0;
                    const blockCount = countWorkflowNodes(wf.nodes);
                    const runCount = wf._count?.runs ?? 0;
                    return (
                    <tr
                      key={wf.id}
                      className="hover:bg-[#F9FAFB] transition-colors group"
                    >
                      <td className="px-4 py-3">
                        {renamingId === wf.id ? (
                          <input
                            autoFocus
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => renameWorkflow(wf.id, renameValue)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") renameWorkflow(wf.id, renameValue);
                              if (e.key === "Escape") setRenamingId(null);
                            }}
                            className="text-[14px] font-medium text-gray-900 bg-white border border-[#7C3AED] rounded px-2 py-0.5 outline-none w-full max-w-xs"
                          />
                        ) : (
                          <button
                            className="text-[14px] font-medium text-gray-900 hover:text-[#7C3AED] transition-colors text-left truncate max-w-[260px]"
                            onClick={() => router.push(`/workflow/${wf.id}`)}
                          >
                            {wf.name}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[13px] font-medium text-gray-800 tabular-nums">
                            {totalNodes === 0 ? (
                              <span className="text-gray-400 font-normal">0</span>
                            ) : (
                              <>
                                {totalNodes} total
                              </>
                            )}
                          </span>
                          {totalNodes > 0 && (
                            <span className="text-[11px] text-gray-500">
                              {blockCount} blocks
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[13px] text-gray-500">
                          {runCount === 0 ? (
                            <span className="text-gray-300 italic">—</span>
                          ) : (
                            `${runCount} run${runCount !== 1 ? "s" : ""}`
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-[13px] text-gray-500">
                          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                          {formatRelativeTime(wf.updatedAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            statusColors[wf.status] ?? statusColors.idle
                          }`}
                        >
                          {wf.status === "running" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
                          )}
                          {statusLabels[wf.status] ?? wf.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 relative overflow-visible">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => router.push(`/workflow/${wf.id}`)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                            title="Open"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          {/* More options */}
                          <div className="relative" data-menu-container>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === wf.id ? null : wf.id);
                              }}
                              className={`p-1.5 rounded-lg transition-colors ${openMenuId === wf.id ? "bg-gray-100 text-gray-600" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
                              title="More options"
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>

                            {openMenuId === wf.id && (
                              <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] overflow-hidden">
                                <button
                                  className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                                  onClick={() => { router.push(`/workflow/${wf.id}`); setOpenMenuId(null); }}
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  Open
                                </button>
                                <button
                                  className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                                  onClick={() => { setRenamingId(wf.id); setRenameValue(wf.name); setOpenMenuId(null); }}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  Rename
                                </button>
                                <button
                                  className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50"
                                  onClick={() => {
                                    if (confirm(`Delete "${wf.name}"? This cannot be undone.`)) {
                                      deleteWorkflow(wf.id);
                                    }
                                    setOpenMenuId(null);
                                  }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
