/**
 * @fileoverview Authenticated `/dashboard` page matching the layout, system workflow carousels,
 * and design aesthetics of the reference Magica portal. Includes JSON import, search filters, and card grids.
 */

"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  PanelLeft,
  Plus,
  Pencil,
  Trash2,
  Workflow,
  Clock,
  Upload,
  Search,
  ImagePlus,
  EllipsisVertical,
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

function RedirectToDocs() {
  useEffect(() => {
    window.location.href = "/docs";
  }, []);
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
      <p className="text-sm">Redirecting to API docs…</p>
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams ? searchParams.get("tab") || "workflows" : "workflows";

  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeUploadPopoverId, setActiveUploadPopoverId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const fetchWorkflows = async () => {
    try {
      const resp = await fetch("/api/workflows");
      const data = await resp.json();
      if (data.data) {
        setWorkflows(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch workflows:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
    console.log(
      "[Thinkly] Candidate LinkedIn: " +
        (process.env.NEXT_PUBLIC_LINKEDIN_URL ||
          "https://www.linkedin.com/in/shashank-anand")
    );

    const handleGlobalClick = () => {
      setActiveUploadPopoverId(null);
      setActiveMenuId(null);
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
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
            {currentTab === "api" ? (
              /* Redirect legacy ?tab=api to the Mintlify docs */
              <RedirectToDocs />
            ) : (
              <>
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
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-upload" aria-hidden="true">
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
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus" aria-hidden="true">
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
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">
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
                    <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                      {filteredWorkflows.map((wf) => {
                        return (
                          <div key={wf.id} className="group/card relative max-w-[250px]">
                            {/* Thumbnail Container */}
                            <div className="relative overflow-hidden rounded-xl border border-border shadow-sm transition-colors hover:border-primary/30">
                              <Link
                                className="block aspect-[250/162] bg-[#F5F5F5] dark:bg-card relative"
                                href={`/workflow/${wf.id}`}
                              >
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                  <Workflow className="w-8 h-8 text-muted-foreground/40" />
                                </div>
                              </Link>
                            </div>

                            {/* Upload Popover Button (top left) */}
                            <div className="absolute left-2 top-2 z-10">
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setActiveUploadPopoverId(activeUploadPopoverId === wf.id ? null : wf.id);
                                    setActiveMenuId(null);
                                  }}
                                  className="rounded-md bg-white/80 p-1 text-muted-foreground opacity-0 transition-all group-hover/card:opacity-100 hover:bg-white hover:text-foreground focus:opacity-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-black/50 dark:hover:bg-black/70 cursor-pointer"
                                >
                                  <ImagePlus className="w-4 h-4" />
                                </button>
                                
                                {activeUploadPopoverId === wf.id && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute left-0 z-50 flex w-[80vw] max-w-[246px] flex-col gap-3 rounded-3xl bg-popover p-4 shadow-xl sm:w-[246px] top-full mt-3"
                                  >
                                    <p className="text-xs text-muted-foreground">Add a file from your device or select one from your library</p>
                                    <button
                                      type="button"
                                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-thinkly-neutral-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 cursor-pointer border-0"
                                    >
                                      <ImagePlus className="h-4 w-4" />
                                      Select Asset
                                    </button>
                                    <button
                                      type="button"
                                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-thinkly-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 cursor-pointer border-0"
                                    >
                                      <Plus className="h-4 w-4" />
                                      Upload
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            <input hidden accept="image/*" type="file" />

                            {/* Ellipsis Menu Button (top right) */}
                            <div className="absolute right-2 top-2 z-10">
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setActiveMenuId(activeMenuId === wf.id ? null : wf.id);
                                    setActiveUploadPopoverId(null);
                                  }}
                                  className="rounded-md bg-white/80 p-1 text-muted-foreground opacity-0 transition-all group-hover/card:opacity-100 hover:bg-white hover:text-foreground focus:opacity-100 dark:bg-black/50 dark:hover:bg-black/70 cursor-pointer"
                                >
                                  <EllipsisVertical className="w-4 h-4" />
                                </button>
                                
                                {activeMenuId === wf.id && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute right-0 z-50 flex flex-col min-w-[120px] rounded-xl bg-popover p-1.5 shadow-xl border border-border mt-1"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRenamingId(wf.id);
                                        setRenameValue(wf.name);
                                        setActiveMenuId(null);
                                      }}
                                      className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded text-xs text-foreground hover:bg-muted text-left cursor-pointer border-0 bg-transparent"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                      Rename
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (confirm(`Delete "${wf.name}"? This cannot be undone.`)) {
                                          deleteWorkflow(wf.id);
                                        }
                                        setActiveMenuId(null);
                                      }}
                                      className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 text-left cursor-pointer border-0 bg-transparent"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Card Metadata */}
                            <div className="mt-2 px-1">
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
                                <Link
                                  href={`/workflow/${wf.id}`}
                                  className="truncate text-sm font-medium text-foreground block hover:text-primary transition-colors cursor-pointer animate-none"
                                  title={wf.name}
                                >
                                  {wf.name}
                                </Link>
                              )}
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                Edited {formatRelativeTime(wf.updatedAt)}
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <SpinningLogo size="lg" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
