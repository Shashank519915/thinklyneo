/**
 * @fileoverview Authenticated `/dashboard` page matching the layout, system workflow carousels,
 * and design aesthetics of the reference Magica portal. Includes JSON import, search filters, and card grids.
 */

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  PanelLeft,
  Plus,
  Pencil,
  Trash2,
  Workflow,
  Clock,
  Upload,
  Search,
} from "lucide-react";
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

function countWorkflowNodes(nodes: unknown): number {
  if (!Array.isArray(nodes)) return 0;
  return nodes.filter(
    (n: { type?: string }) => n.type !== "requestInputs" && n.type !== "response",
  ).length;
}

export default function DashboardPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchWorkflows = async () => {
    try {
      const resp = await fetch("/api/workflows");
      const data = await resp.json();
      if (data.data) setWorkflows(data.data);
    } catch (err) {
      console.error("Failed to fetch workflows:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
    console.log(
      "[NextFlow] Candidate LinkedIn: " +
        (process.env.NEXT_PUBLIC_LINKEDIN_URL ||
          "https://www.linkedin.com/in/shashank-anand")
    );
  }, []);

  // Poll for status updates if any workflow is currently running
  useEffect(() => {
    const hasRunning = workflows.some((w) => w.status === "running");
    if (!hasRunning) return;
    const interval = setInterval(fetchWorkflows, 3000);
    return () => clearInterval(interval);
  }, [workflows]);

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
    } catch (err) {
      console.error("Failed to create workflow:", err);
    } finally {
      setCreating(false);
    }
  };

  const createSampleWorkflow = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const resp = await fetch("/api/workflows/sample", { method: "POST" });
      const data = await resp.json();
      if (data.data?.id) {
        router.push(`/workflow/${data.data.id}`);
      } else {
        fetchWorkflows();
      }
    } catch (err) {
      console.error("Failed to create sample:", err);
    } finally {
      setCreating(false);
    }
  };

  const deleteWorkflow = async (id: string) => {
    try {
      await fetch(`/api/workflows/${id}`, { method: "DELETE" });
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      console.error("Failed to delete workflow:", err);
    }
  };

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
    } catch (err) {
      console.error("Failed to rename workflow:", err);
    } finally {
      setRenamingId(null);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result;
      if (typeof text !== "string") return;
      try {
        const resp = await fetch("/api/workflows/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ json: text }),
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: "Import failed" }));
          window.alert(err.error || "Import failed");
          return;
        }
        fetchWorkflows();
      } catch (err) {
        console.error("Import failed:", err);
      }
    };
    reader.readAsText(file);
  };

  const filteredWorkflows = workflows.filter((wf) =>
    wf.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Left Sidebar */}
      <LeftSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main content container */}
      <div className="flex min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="min-h-screen w-full bg-background">
          {/* Top bar — sticky for collapsed sidebar button */}
          {sidebarCollapsed && (
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 h-14 pt-3 bg-background border-b border-border">
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-[18px] border border-border bg-background shadow-md text-foreground/80 hover:bg-muted transition-colors flex-shrink-0 cursor-pointer"
                title="Open Sidebar"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Main dashboard content */}
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            {/* Upper Header Row */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="inline-flex min-w-0 items-center gap-2">
                  <div className="min-w-0">
                    <div className="text-xl font-semibold text-foreground sm:text-2xl">Flow</div>
                    <div className="mt-0.5 text-xs text-muted-foreground sm:mt-1 sm:text-sm">
                      Build workflows or run models directly.
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportFile}
                  className="hidden"
                  accept=".json"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-2 text-sm text-foreground/80 transition-colors hover:bg-muted disabled:opacity-40 sm:gap-2 sm:px-3 cursor-pointer"
                  title="Import workflow JSON"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-upload" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" x2="12" y1="3" y2="15"></line>
                  </svg>
                  <span className="hidden sm:inline">Import</span>
                </button>
                <button
                  type="button"
                  onClick={createWorkflow}
                  disabled={creating}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 sm:gap-2 sm:px-3 cursor-pointer border-0"
                  title="Create a new workflow"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-plus" aria-hidden="true">
                    <path d="M5 12h14"></path>
                    <path d="M12 5v14"></path>
                  </svg>
                  <span className="xs:inline hidden">{creating ? "Creating..." : "New workflow"}</span>
                </button>
              </div>
            </div>

            {/* System Workflows */}
            <div className="mt-8">
              <div className="flex items-start justify-between gap-2 sm:items-center">
                <div>
                  <div className="text-sm font-semibold text-foreground">System Workflows</div>
                  <div className="mt-1 text-xs text-muted-foreground sm:text-sm">
                    Pre-built workflow templates — click to open and start using.
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div>
                  <div
                    className="flex gap-3 overflow-x-auto scroll-smooth pb-2 scrollbar-none sm:gap-4"
                    style={{ scrollSnapType: "x mandatory" }}
                  >
                    <a
                      className="group w-[220px] flex-none overflow-hidden rounded-xl border border-border bg-[#F5F5F5] text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md dark:bg-card sm:w-[280px] cursor-pointer"
                      onClick={createSampleWorkflow}
                      style={{ scrollSnapAlign: "start" }}
                    >
                      <div className="relative aspect-[5/3]">
                        <img
                          alt="Product Marketing Post Generator"
                          loading="lazy"
                          src="/marketing_post.png"
                          className="object-cover absolute h-full w-full inset-0 color-transparent"
                        />
                      </div>
                      <div className="p-4">
                        <div className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                          Product Marketing Post Generator
                        </div>
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Your Workflows */}
            <div className="mt-10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">Your Workflows</div>
                  <div className="mt-1 text-sm text-muted-foreground">Open one to edit, run, and review history.</div>
                </div>
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-search pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.3-4.3"></path>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search workflows..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50 sm:w-52"
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <SpinningLogo size="md" />
                </div>
              ) : filteredWorkflows.length === 0 ? (
                <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <div className="font-medium text-foreground">No workflows yet</div>
                  <div className="mt-1 text-sm text-muted-foreground">Create your first workflow to start building.</div>
                  <button
                    type="button"
                    onClick={createWorkflow}
                    className="mt-4 inline-flex rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-40 cursor-pointer border-0 font-medium"
                  >
                    Create workflow
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
                  {filteredWorkflows.map((wf) => {
                    const blockCount = countWorkflowNodes(wf.nodes);
                    const runCount = wf._count?.runs ?? 0;
                    return (
                      <div
                        key={wf.id}
                        className="group relative overflow-hidden rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2">
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
                                className="text-[14px] font-medium text-foreground bg-background border border-primary rounded px-2 py-0.5 outline-none w-full"
                              />
                            ) : (
                              <button
                                className="truncate font-semibold text-foreground group-hover:text-primary transition-colors text-left text-sm max-w-[180px] bg-transparent border-0 cursor-pointer p-0"
                                onClick={() => router.push(`/workflow/${wf.id}`)}
                              >
                                {wf.name}
                              </button>
                            )}
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                statusColors[wf.status] ?? statusColors.idle
                              }`}
                            >
                              {wf.status === "running" && (
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                              )}
                              {statusLabels[wf.status] ?? wf.status}
                            </span>
                          </div>
                          <p className="text-[12px] text-muted-foreground mt-1.5 line-clamp-2">
                            {wf.description || "Open to design nodes and configure models."}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-4 text-[11px] text-muted-foreground">
                            <span>{blockCount} blocks</span>
                            <span>•</span>
                            <span>
                              {runCount} run{runCount !== 1 ? "s" : ""}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {formatRelativeTime(wf.updatedAt)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-border bg-muted/10 px-4 py-2">
                          <button
                            onClick={() => router.push(`/workflow/${wf.id}`)}
                            className="text-[12px] font-semibold text-primary hover:text-primary/95 transition-colors cursor-pointer bg-transparent border-0 p-0"
                          >
                            Open workflow
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setRenamingId(wf.id);
                                setRenameValue(wf.name);
                              }}
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer bg-transparent border-0"
                              title="Rename"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete "${wf.name}"? This cannot be undone.`)) {
                                  deleteWorkflow(wf.id);
                                }
                              }}
                              className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-muted transition-colors cursor-pointer bg-transparent border-0"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
