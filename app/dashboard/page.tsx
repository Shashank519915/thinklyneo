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
import DynamicIsland from "@/components/dashboard/DynamicIsland";
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
  idle:    "bg-[#18181B] text-zinc-400 border border-white/5",
  running: "bg-blue-950/30 text-blue-400 border border-blue-900/30",
  done:    "bg-emerald-950/30 text-emerald-400 border border-emerald-900/30",
  error:   "bg-red-950/30 text-red-400 border border-red-900/30",
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
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-zinc-500">
      <p className="text-sm">Redirecting to API docs…</p>
    </div>
  );
}



// ─── Main Dashboard Page ─────────────────────────────────────────────────────
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

  const createCustomWorkflow = async (name: string) => {
    if (creating) return;
    setCreating(true);
    try {
      const resp = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await resp.json();
      if (data.data?.id) {
        router.push(`/workflow/${data.data.id}`);
      }
    } catch (err) {
      console.error("Failed to create custom workflow:", err);
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
    <div className="flex h-screen overflow-hidden bg-[#050505] text-foreground dotted-grid">
      {/* Left Sidebar */}
      <LeftSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main content container */}
      <div className="flex min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-transparent">
        <div className="min-h-screen w-full flex flex-col justify-start relative">
          
          {/* Sticky top centering wrapper for Dynamic Island */}
          <div className="sticky top-5 left-0 right-0 h-0 flex justify-center z-50 pointer-events-none">
            <div className="pointer-events-auto">
              <DynamicIsland
                loading={loading}
                workflowsCount={filteredWorkflows.length}
                searchTerm={searchTerm}
                creating={creating}
                createWorkflow={createWorkflow}
                onImportClick={() => fileInputRef.current?.click()}
              />
            </div>
          </div>
          
          {/* Sticky top gradient shroud to prevent scroll clutter under the Dynamic Island */}
          <div className="sticky top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#050505] via-[#050505]/95 to-transparent pointer-events-none z-40" />

          {/* Subtle background glow centered behind Dynamic Island */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[180px] bg-purple-500/5 blur-[80px] rounded-full pointer-events-none z-0" />

          {/* Main dashboard content */}
          <div className="mx-auto w-full max-w-6xl px-4 pt-20 pb-8 sm:px-8 sm:pt-24 sm:pb-12 z-10 flex-1 animate-fade-slide-up">
            {/* Outer Bezel */}
            <div className="p-2 rounded-[2.5rem] border border-white/10 bg-white/[0.02] backdrop-blur-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.85)] flex-1 flex flex-col">
              {/* Inner Core Bezel */}
              <div className="rounded-[calc(2.5rem-8px)] bg-[#0A0A0C]/90 border border-white/5 p-6 sm:p-8 md:p-10 min-h-[calc(100vh-8rem)] flex flex-col shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] relative overflow-hidden flex-1">
                {/* CSS Film Grain Noise overlay */}
                <div className="absolute inset-0 pointer-events-none glass-noise z-0" />
                {currentTab === "api" ? (
                  /* Redirect legacy ?tab=api to the Mintlify docs */
                  <RedirectToDocs />
                ) : (
                  <>
                    {/* Upper Header Row */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-white/5 pb-6 z-10 animate-fade-slide-up">
                    <div className="min-w-0">
                      <div className="inline-flex min-w-0 items-center gap-2">
                        <div className="min-w-0">
                          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">Flow</h2>
                          <div className="mt-1.5 text-xs text-zinc-400 sm:text-sm max-w-[65ch]">
                            Build visual AI media workflows or run ready templates directly.
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
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
                        className="group relative inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 pl-5 pr-1.5 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition-all duration-300 cursor-pointer active-scale shadow-sm"
                        title="Import workflow JSON"
                      >
                        <span className="tracking-tight">Import Flow</span>
                        <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:bg-white/10 group-hover:scale-105">
                          <Upload className="w-3.5 h-3.5 text-purple-400 transition-transform duration-300 group-hover:scale-110" />
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={createWorkflow}
                        disabled={creating}
                        className="group relative inline-flex items-center gap-3 rounded-full bg-white text-black pl-5 pr-1.5 py-1.5 text-xs font-semibold hover:bg-zinc-100 transition-all duration-300 cursor-pointer border-0 active-scale shadow-lg shadow-white/5"
                        title="Create a new workflow"
                      >
                        <span className="tracking-tight">{creating ? "Creating..." : "New workflow"}</span>
                        <div className="w-7 h-7 rounded-full bg-black/5 flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:bg-black/10 group-hover:scale-105">
                          <Plus className="w-4 h-4 text-black transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" />
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* System Workflows */}
                  <div className="mt-8 z-10 animate-fade-slide-up stagger-1">
                    <div className="flex items-start justify-between gap-2 sm:items-center">
                      <div>
                        <h3 className="text-base font-bold text-zinc-200 tracking-tight">System Workflows</h3>
                        <div className="mt-1 text-xs text-zinc-400">
                          Pre-built workflow templates — click to copy and start using immediately.
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div>
                        <div
                          className="flex gap-4 overflow-x-auto scroll-smooth pb-4 scrollbar-none sm:gap-5"
                          style={{ scrollSnapType: "x mandatory" }}
                        >
                          <a
                            className="group w-[220px] flex-none overflow-hidden rounded-2xl bezel-container-inner text-left shadow-xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-purple-500/30 hover:scale-[1.01] sm:w-[280px] cursor-pointer shimmer-hover active-scale"
                            onClick={createSampleWorkflow}
                            style={{ scrollSnapAlign: "start" }}
                          >
                            <div className="rounded-[15px] bg-[#0A0A0C]/40 overflow-hidden backdrop-blur-md">
                              <div className="relative aspect-[5/3] overflow-hidden border-b border-white/5 bg-zinc-950">
                                <img
                                  alt="Product Marketing Post Generator"
                                  loading="lazy"
                                  src="/marketing_post.png"
                                  className="object-cover absolute h-full w-full inset-0 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                              </div>
                              <div className="p-4">
                                <div className="truncate text-sm font-semibold text-zinc-200 transition-colors group-hover:text-[var(--brand-purple)]">
                                  Product Marketing Post Generator
                                </div>
                                <p className="mt-1 text-xs text-zinc-400 line-clamp-1">AI-powered marketing pipeline</p>
                              </div>
                            </div>
                          </a>

                          <a
                            className="group w-[220px] flex-none overflow-hidden rounded-2xl bezel-container-inner text-left shadow-xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-emerald-500/30 hover:scale-[1.01] sm:w-[280px] cursor-pointer shimmer-hover active-scale"
                            onClick={() => createCustomWorkflow("Autonomous AI Video Pipeline")}
                            style={{ scrollSnapAlign: "start" }}
                          >
                            <div className="rounded-[15px] bg-[#0A0A0C]/40 overflow-hidden backdrop-blur-md">
                              <div className="relative aspect-[5/3] overflow-hidden border-b border-white/5 bg-zinc-950">
                                <img
                                  alt="Autonomous AI Video Pipeline"
                                  loading="lazy"
                                  src="/ai_racing_car.png"
                                  className="object-cover absolute h-full w-full inset-0 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                              </div>
                              <div className="p-4">
                                <div className="truncate text-sm font-semibold text-zinc-200 transition-colors group-hover:text-emerald-400">
                                  Autonomous AI Video Pipeline
                                </div>
                                <p className="mt-1 text-xs text-zinc-400 line-clamp-1">Heavy GPU automated video render</p>
                              </div>
                            </div>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Your Workflows */}
                  <div className="mt-10 flex-1 flex flex-col z-10 animate-fade-slide-up stagger-2">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4">
                      <div>
                        <h3 className="text-base font-bold text-zinc-200 tracking-tight">Your Workflows</h3>
                        <div className="mt-1 text-xs text-zinc-400">Open one to edit, run, and review history.</div>
                      </div>
                      <div className="relative group">
                        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4 transition-colors group-focus-within:text-purple-400" />
                        <input
                          type="text"
                          placeholder="Search workflows..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="h-9 w-full rounded-xl border border-white/5 bg-[#0C0C0E]/60 pl-9 pr-4 text-xs text-white outline-none transition-all duration-300 placeholder:text-zinc-500 focus:border-[var(--brand-purple)]/40 focus:bg-black/40 focus:shadow-[0_0_12px_rgba(139,92,246,0.1)] sm:w-60 shadow-inner"
                        />
                      </div>
                    </div>

                    {loading ? (
                      <div className="flex items-center justify-center py-20 flex-1">
                        <SpinningLogo size="md" />
                      </div>
                    ) : filteredWorkflows.length === 0 ? (
                      <div className="mt-8 rounded-2xl border border-white/8 bg-[#0C0C0E]/40 backdrop-blur-md p-8 text-center shadow-xl max-w-md mx-auto my-auto">
                        <Workflow className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                        <div className="font-semibold text-white">No workflows yet</div>
                        <div className="mt-1.5 text-xs text-zinc-500">Create your first visual workspace or import a JSON file.</div>
                        <button
                          type="button"
                          onClick={createWorkflow}
                          className="mt-5 inline-flex rounded-xl bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-hover)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-all duration-200 active:scale-95 cursor-pointer border-0 active-scale"
                        >
                          Create workflow
                        </button>
                      </div>
                    ) : (
                      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filteredWorkflows.map((wf, idx) => {
                          return (
                            <div
                              key={wf.id}
                              className="group/card relative rounded-[20px] p-1.5 border border-white/10 bg-white/[0.02] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.85)] hover:scale-[1.02] hover:border-purple-500/30 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active-scale animate-fade-slide-up"
                              style={{ animationDelay: `${idx * 45}ms` }}
                            >
                              <div className="rounded-[14px] bg-[#0A0A0C]/60 p-3.5 flex flex-col h-full relative">
                                {/* Thumbnail Container */}
                                <div className="relative overflow-hidden rounded-xl border border-white/5 aspect-[250/150] bg-gradient-to-br from-zinc-950 to-zinc-900 flex items-center justify-center transition-all duration-500 group-hover/card:border-white/10">
                                  <Link className="absolute inset-0 z-0 flex items-center justify-center cursor-pointer" href={`/workflow/${wf.id}`}>
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.06)_0%,transparent_70%)] opacity-0 group-hover/card:opacity-100 transition-opacity duration-700" />
                                    
                                    {/* Mini Interactive Node Graph representation */}
                                    <div className="absolute inset-0 p-4 flex flex-col justify-between pointer-events-none opacity-50 group-hover/card:opacity-100 transition-all duration-500">
                                      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                                        <path
                                          d="M 60,28 C 80,28 80,75 97,75"
                                          fill="none"
                                          stroke="rgba(139, 92, 246, 0.15)"
                                          strokeWidth="1.5"
                                          className="group-hover/card:stroke-purple-500/40 transition-colors duration-500"
                                        />
                                        <path
                                          d="M 60,28 C 80,28 80,75 97,75"
                                          fill="none"
                                          stroke="#8B5CF6"
                                          strokeWidth="1.5"
                                          strokeDasharray="4, 4"
                                          className="hidden group-hover/card:block edge-animated"
                                        />
                                        
                                        <path
                                          d="M 60,122 C 80,122 80,75 97,75"
                                          fill="none"
                                          stroke="rgba(16, 185, 129, 0.15)"
                                          strokeWidth="1.5"
                                          className="group-hover/card:stroke-emerald-500/40 transition-colors duration-500"
                                        />
                                        <path
                                          d="M 60,122 C 80,122 80,75 97,75"
                                          fill="none"
                                          stroke="#10B981"
                                          strokeWidth="1.5"
                                          strokeDasharray="4, 4"
                                          className="hidden group-hover/card:block edge-animated"
                                        />

                                        <path
                                          d="M 153,75 L 190,75"
                                          fill="none"
                                          stroke="rgba(255, 255, 255, 0.1)"
                                          strokeWidth="1.5"
                                          className="group-hover/card:stroke-zinc-500/30 transition-colors duration-500"
                                        />
                                        <path
                                          d="M 153,75 L 190,75"
                                          fill="none"
                                          stroke="rgba(255, 255, 255, 0.3)"
                                          strokeWidth="1.5"
                                          strokeDasharray="4, 4"
                                          className="hidden group-hover/card:block edge-animated"
                                        />
                                      </svg>
                                      
                                      <div className="flex justify-between items-center h-full w-full relative z-10 px-1 py-1">
                                        <div className="flex flex-col justify-between h-full">
                                          <div className="w-11 h-6 rounded bg-zinc-900/90 border border-white/5 flex items-center justify-center text-[7px] font-mono text-zinc-500 shadow-sm transition-all duration-500 group-hover/card:border-purple-500/30 group-hover/card:text-purple-400">
                                            INPUT
                                          </div>
                                          <div className="w-11 h-6 rounded bg-zinc-900/90 border border-white/5 flex items-center justify-center text-[7px] font-mono text-zinc-500 shadow-sm transition-all duration-500 group-hover/card:border-emerald-500/30 group-hover/card:text-emerald-400">
                                            API
                                          </div>
                                        </div>
                                        
                                        <div className="w-14 h-8 rounded-lg bg-[#0C0C0E] border border-white/5 flex flex-col items-center justify-center shadow-md transition-all duration-500 group-hover/card:border-purple-500/40 group-hover/card:scale-105 group-hover/card:shadow-[0_0_15px_rgba(139,92,246,0.15)] relative">
                                          <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-purple-500 opacity-0 group-hover/card:opacity-100 group-hover/card:animate-pulse transition-opacity duration-500" />
                                          <span className="text-[8px] font-bold tracking-wider text-purple-400">MODEL</span>
                                          <span className="text-[6px] font-mono text-zinc-600 tracking-tighter">openai-v4</span>
                                        </div>
                                        
                                        <div className="w-11 h-6 rounded bg-zinc-900/90 border border-white/5 flex items-center justify-center text-[7px] font-mono text-zinc-500 shadow-sm transition-all duration-500 group-hover/card:border-zinc-700 group-hover/card:text-zinc-300">
                                          OUTPUT
                                        </div>
                                      </div>
                                    </div>
                                  </Link>

                                  {/* Upload Popover Button (top left) */}
                                  <div className="absolute left-2.5 top-2.5 z-10">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setActiveUploadPopoverId(activeUploadPopoverId === wf.id ? null : wf.id);
                                        setActiveMenuId(null);
                                      }}
                                      className="rounded-full bg-black/60 p-1.5 text-zinc-400 opacity-0 transition-all duration-300 group-hover/card:opacity-100 hover:bg-black/80 hover:text-white border border-white/10 backdrop-blur-sm cursor-pointer active-scale"
                                      title="Upload assets"
                                    >
                                      <ImagePlus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <input hidden accept="image/*" type="file" />

                                  {/* Ellipsis Menu Button (top right) */}
                                  <div className="absolute right-2.5 top-2.5 z-10">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setActiveMenuId(activeMenuId === wf.id ? null : wf.id);
                                        setActiveUploadPopoverId(null);
                                      }}
                                      className="rounded-full bg-black/60 p-1.5 text-zinc-400 opacity-0 transition-all duration-300 group-hover/card:opacity-100 hover:bg-black/80 hover:text-white border border-white/10 backdrop-blur-sm cursor-pointer active-scale"
                                      title="More actions"
                                    >
                                      <EllipsisVertical className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* HUD Header Row */}
                                <div className="mt-3.5 flex items-center justify-between text-[9px] font-mono text-zinc-500 tracking-wider">
                                  <span>ID: {wf.id.slice(0, 8).toUpperCase()}</span>
                                  {wf._count && wf._count.runs > 0 ? (
                                    <span className="text-purple-400">{wf._count.runs} runs</span>
                                  ) : (
                                    <span className="text-zinc-600">0 runs</span>
                                  )}
                                </div>

                                {/* Card Metadata */}
                                <div className="mt-1 flex-1 flex flex-col justify-between">
                                  <div>
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
                                        className="text-sm font-semibold text-white bg-zinc-900 border border-purple-500/50 rounded-lg px-2 py-1 outline-none w-full animate-none"
                                      />
                                    ) : (
                                      <Link
                                        href={`/workflow/${wf.id}`}
                                        className="truncate text-sm font-semibold text-zinc-200 block hover:text-purple-400 transition-colors cursor-pointer tracking-tight"
                                        title={wf.name}
                                      >
                                        {wf.name}
                                      </Link>
                                    )}
                                    {wf.description ? (
                                      <p className="mt-1 text-xs text-zinc-400 line-clamp-2 leading-relaxed min-h-[2rem]">{wf.description}</p>
                                    ) : (
                                      <p className="mt-1 text-xs text-zinc-600 italic line-clamp-2 leading-relaxed min-h-[2rem]">No description provided. Click to open.</p>
                                    )}
                                  </div>
                                  
                                  {/* Footer row */}
                                  <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2.5">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold border transition-all duration-300 ${
                                      wf.status === "running"
                                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.15)] animate-pulse"
                                        : wf.status === "done"
                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                        : wf.status === "error"
                                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                                        : "bg-zinc-900/40 text-zinc-400 border-white/5"
                                    }`}>
                                      <span className={`h-1.5 w-1.5 rounded-full ${
                                        wf.status === "running"
                                          ? "bg-blue-400"
                                          : wf.status === "done"
                                          ? "bg-emerald-400"
                                          : wf.status === "error"
                                          ? "bg-red-400"
                                          : "bg-zinc-500"
                                      }`} />
                                      {statusLabels[wf.status] || wf.status}
                                    </span>

                                    <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                                      <Clock className="w-3 h-3 text-zinc-600" />
                                      <span>{formatRelativeTime(wf.updatedAt)}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Floating Popovers positioned relative to Card container to avoid overflow-hidden clipping */}
                                {activeUploadPopoverId === wf.id && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute left-3.5 top-12 z-50 flex w-[220px] flex-col gap-2.5 rounded-2xl bg-[#0C0C0E]/95 backdrop-blur-md border border-white/10 p-3.5 shadow-2xl origin-top-left transition-all duration-200 fade-scale-in"
                                  >
                                    <p className="text-[10px] text-zinc-400 font-medium">Add assets to canvas library</p>
                                    <button
                                      type="button"
                                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 px-3 py-2 text-[10px] font-semibold text-white transition-all cursor-pointer border-0 active-scale"
                                    >
                                      <ImagePlus className="h-3.5 w-3.5 text-zinc-400" />
                                      Select Asset
                                    </button>
                                    <button
                                      type="button"
                                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-3 py-2 text-[10px] font-semibold text-white transition-all cursor-pointer border-0 active-scale"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                      Upload
                                    </button>
                                  </div>
                                )}

                                {activeMenuId === wf.id && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute right-3.5 top-12 z-50 flex flex-col min-w-[120px] rounded-xl bg-[#0C0C0E]/95 backdrop-blur-md p-1.5 shadow-2xl border border-white/10 origin-top-right transition-all duration-200 fade-scale-in"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRenamingId(wf.id);
                                        setRenameValue(wf.name);
                                        setActiveMenuId(null);
                                      }}
                                      className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] text-zinc-300 hover:bg-white/5 hover:text-white text-left cursor-pointer border-0 bg-transparent active-scale"
                                    >
                                      <Pencil className="w-3.5 h-3.5 text-zinc-500" />
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
                                      className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] text-red-400 hover:bg-red-950/20 text-left cursor-pointer border-0 bg-transparent active-scale"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                      Delete
                                    </button>
                                  </div>
                                )}
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
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#050505]">
        <SpinningLogo size="lg" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
