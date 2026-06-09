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
import {
  useWorkspaceIsland,
  useWorkspaceNavigate,
  WorkspaceLink,
} from "@/components/workspace";
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
  const { navigate } = useWorkspaceNavigate();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeUploadPopoverId, setActiveUploadPopoverId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("All");

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
    let navigated = false;
    try {
      const resp = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled Workflow" }),
      });
      const data = await resp.json();
      if (data.data?.id) {
        navigate(`/workflow/${data.data.id}`, "open");
        navigated = true;
      }
    } catch (err) {
      console.error("Failed to create workflow:", err);
    } finally {
      if (!navigated) setCreating(false);
    }
  };

  const createSampleWorkflow = async () => {
    if (creating) return;
    setCreating(true);
    let navigated = false;
    try {
      const resp = await fetch("/api/workflows/sample", { method: "POST" });
      const data = await resp.json();
      if (data.data?.id) {
        navigate(`/workflow/${data.data.id}`, "open");
        navigated = true;
      } else {
        fetchWorkflows();
      }
    } catch (err) {
      console.error("Failed to create sample:", err);
    } finally {
      if (!navigated) setCreating(false);
    }
  };

  const createCustomWorkflow = async (name: string) => {
    if (creating) return;
    setCreating(true);
    let navigated = false;
    try {
      const resp = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await resp.json();
      if (data.data?.id) {
        navigate(`/workflow/${data.data.id}`, "open");
        navigated = true;
      }
    } catch (err) {
      console.error("Failed to create custom workflow:", err);
    } finally {
      if (!navigated) setCreating(false);
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

  const filteredWorkflows = workflows.filter((wf) => {
    const matchesSearch = wf.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      activeFilter === "All" ||
      (wf.status ?? "idle").toLowerCase() === activeFilter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  useWorkspaceIsland({
    loading,
    workflowsCount: filteredWorkflows.length,
    searchTerm,
    creating,
    createWorkflow,
    onImportClick: () => fileInputRef.current?.click(),
  });

  return (
    <div className="relative flex h-full w-full flex-col justify-start">
          {/* Main dashboard content — flush with top, fixed height */}
          <div className="w-full px-3 pt-3 pb-3 z-10 flex-1 flex flex-col">
            {/* Outer Bezel — fixed height = viewport minus padding */}
            <div data-workspace-card className="relative p-2 rounded-[1.75rem] border border-white/10 bg-white/[0.02] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.8)] flex flex-col h-[calc(100vh-1.5rem)] overflow-hidden will-change-transform">
              {/* Inner Core Bezel */}
              <div className="rounded-[calc(1.75rem-8px)] bg-[#0A0A0C]/90 border border-white/5 flex flex-col shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] relative flex-1 overflow-hidden">
                {/* CSS Film Grain Noise overlay */}
                <div className="absolute inset-0 pointer-events-none glass-noise z-0" />

                {/* ── macOS Window Title Bar ─────────────────────────────── */}
                <div className="group/mac relative z-10 flex items-center h-12 flex-shrink-0 px-5 border-b border-white/[0.05]">
                  {/* Traffic light buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="w-3 h-3 rounded-full bg-[#FF5F57] border border-black/15 transition-[filter] duration-100 hover:brightness-90 active:brightness-75 flex items-center justify-center flex-shrink-0 cursor-pointer"
                      title="Close"
                    >
                      <svg className="w-[7px] h-[7px] opacity-0 group-hover/mac:opacity-60 transition-opacity duration-100" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 1.5L6.5 6.5M6.5 1.5L1.5 6.5" stroke="#000" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/chat", "minimize")}
                      className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-black/15 transition-[filter] duration-100 hover:brightness-90 active:brightness-75 flex items-center justify-center flex-shrink-0 cursor-pointer"
                      title="Minimize to Chat"
                    >
                      <svg className="w-[7px] h-[7px] opacity-0 group-hover/mac:opacity-60 transition-opacity duration-100" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4H6.5" stroke="#000" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="w-3 h-3 rounded-full bg-[#28C840] border border-black/15 transition-[filter] duration-100 hover:brightness-90 active:brightness-75 flex items-center justify-center flex-shrink-0 cursor-pointer"
                      title="Full screen"
                    >
                      <svg className="w-[7px] h-[7px] opacity-0 group-hover/mac:opacity-60 transition-opacity duration-100" viewBox="0 0 8 8" fill="none">
                        <path d="M1 7L7 1M1 4.5V7H3.5" stroke="#000" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                  {/* Center: intentionally empty — Dynamic Island floats here */}
                  <div className="flex-1" />
                  {/* Right: workspace label */}
                  <span className="text-[9px] font-mono text-zinc-700 uppercase tracking-[0.2em] select-none">Flow Workspace</span>
                </div>

                {/* ── Scrollable Content ─────────────────────────────────── */}
                <div className="flex flex-col flex-1 p-6 sm:p-8 md:p-10 relative z-10 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {currentTab === "api" ? (
                  /* Redirect legacy ?tab=api to the Mintlify docs */
                  <RedirectToDocs />
                ) : (
                  <>
                    {/* ── Page Header ─────────────────────────────────────────── */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-white/5 pb-6 z-10 animate-fade-slide-up">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1.5">
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] border border-purple-500/20 bg-purple-500/8 text-purple-400">
                            <span className="w-1 h-1 rounded-full bg-purple-400 animate-pulse" />
                            Workspace
                          </span>
                        </div>
                        <h2 className="text-2xl font-bold tracking-[-0.02em] text-white sm:text-3xl">Flow</h2>
                        <p className="mt-1.5 text-xs text-zinc-500 sm:text-sm max-w-[65ch] leading-relaxed">
                          Build visual AI media workflows or run ready templates directly.
                        </p>
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
                          className="group relative inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 pl-5 pr-1.5 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition-[transform,background-color,border-color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer active-scale shadow-sm"
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
                          className="group relative inline-flex items-center gap-3 rounded-full bg-white text-black pl-5 pr-1.5 py-1.5 text-xs font-semibold hover:bg-zinc-100 transition-[transform,background-color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer border-0 active-scale shadow-lg shadow-white/5"
                          title="Create a new workflow"
                        >
                          <span className="tracking-tight">{creating ? "Creating..." : "New workflow"}</span>
                          <div className="w-7 h-7 rounded-full bg-black/5 flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:bg-black/10 group-hover:scale-105">
                            <Plus className="w-4 h-4 text-black transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" />
                          </div>
                        </button>
                      </div>
                    </div>

                  {/* ── System Workflows ─────────────────────────────────────── */}
                  <div className="mt-8 z-10 animate-fade-slide-up stagger-1">
                    {/* Section label row */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-[9px] font-mono font-semibold uppercase tracking-[0.2em] text-zinc-600">Templates</span>
                      <div className="flex-1 h-px bg-white/5" />
                      <span className="text-[9px] font-mono text-zinc-700">2 available</span>
                    </div>

                    {/* Template cards — 2-col grid, no horizontal scroll */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {/* Template 1 */}
                      <button
                        type="button"
                        onClick={createSampleWorkflow}
                        className="group relative flex items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.015] p-3.5 text-left transition-[transform,border-color,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-purple-500/25 hover:bg-white/[0.03] hover:shadow-[0_0_20px_rgba(139,92,246,0.08)] active:scale-[0.985] cursor-pointer shimmer-hover"
                      >
                        {/* Thumbnail */}
                        <div className="relative w-20 h-14 flex-shrink-0 overflow-hidden rounded-xl border border-white/5 bg-zinc-950">
                          <img
                            alt="Product Marketing Post Generator"
                            loading="lazy"
                            src="/marketing_post.png"
                            className="object-cover absolute h-full w-full inset-0 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-zinc-200 truncate transition-colors duration-200 group-hover:text-purple-300">
                            Product Marketing Post Generator
                          </div>
                          <p className="mt-0.5 text-[10px] text-zinc-500 line-clamp-1">AI-powered marketing pipeline</p>
                          <div className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-purple-500/10 border border-purple-500/15">
                            <span className="text-[8px] font-bold uppercase tracking-[0.15em] text-purple-400">Use Template</span>
                          </div>
                        </div>
                      </button>

                      {/* Template 2 */}
                      <button
                        type="button"
                        onClick={() => createCustomWorkflow("Autonomous AI Video Pipeline")}
                        className="group relative flex items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.015] p-3.5 text-left transition-[transform,border-color,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-emerald-500/25 hover:bg-white/[0.03] hover:shadow-[0_0_20px_rgba(16,185,129,0.06)] active:scale-[0.985] cursor-pointer shimmer-hover"
                      >
                        <div className="relative w-20 h-14 flex-shrink-0 overflow-hidden rounded-xl border border-white/5 bg-zinc-950">
                          <img
                            alt="Autonomous AI Video Pipeline"
                            loading="lazy"
                            src="/ai_racing_car.png"
                            className="object-cover absolute h-full w-full inset-0 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-zinc-200 truncate transition-colors duration-200 group-hover:text-emerald-300">
                            Autonomous AI Video Pipeline
                          </div>
                          <p className="mt-0.5 text-[10px] text-zinc-500 line-clamp-1">Heavy GPU automated video render</p>
                          <div className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/15">
                            <span className="text-[8px] font-bold uppercase tracking-[0.15em] text-emerald-400">Use Template</span>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* ── Your Workflows ───────────────────────────────────────── */}
                  <div className="mt-10 flex-1 flex flex-col z-10 animate-fade-slide-up stagger-2">
                    {/* Section label row */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-[9px] font-mono font-semibold uppercase tracking-[0.2em] text-zinc-600">Your Workflows</span>
                      <div className="flex-1 h-px bg-white/5" />
                      {!loading && (
                        <span className="text-[9px] font-mono text-zinc-700">{filteredWorkflows.length} flow{filteredWorkflows.length !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                    {/* Toolbar: search + actions */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-white/5">
                      <div className="relative group flex-1 max-w-xs">
                        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-3.5 h-3.5 transition-colors duration-200 group-focus-within:text-purple-400" />
                        <input
                          type="text"
                          placeholder="Search workflows..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="h-8 w-full rounded-xl border border-white/5 bg-[#0C0C0E]/60 pl-8 pr-4 text-xs text-white outline-none transition-all duration-300 placeholder:text-zinc-500 focus:border-[var(--brand-purple)]/40 focus:bg-black/40 focus:shadow-[0_0_12px_rgba(139,92,246,0.1)] shadow-inner"
                        />
                      </div>
                      {/* Filter chip row — interactive, reads from workflow status */}
                      <div className="flex items-center gap-1.5">
                        {(["All", "Running", "Done", "Idle"] as const).map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => setActiveFilter(chip)}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] border transition-[background-color,border-color,color] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer select-none active:scale-[0.96] ${
                              activeFilter === chip
                                ? chip === "Running"
                                  ? "bg-blue-500/15 border-blue-500/30 text-blue-300"
                                  : chip === "Done"
                                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                                  : chip === "Idle"
                                  ? "bg-zinc-500/15 border-zinc-500/30 text-zinc-300"
                                  : "bg-purple-500/15 border-purple-500/30 text-purple-300"
                                : "border-white/5 bg-white/[0.03] text-zinc-600 hover:border-white/10 hover:text-zinc-400"
                            }`}
                          >
                            {activeFilter === chip && (
                              <span className={`w-1 h-1 rounded-full flex-shrink-0 ${
                                chip === "Running" ? "bg-blue-400" :
                                chip === "Done" ? "bg-emerald-400" :
                                chip === "Idle" ? "bg-zinc-400" : "bg-purple-400"
                              }`} />
                            )}
                            {chip}
                          </button>
                        ))}
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
                      <>
                      <div
                        className="mt-4 flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-1 px-1"
                      >
                        {filteredWorkflows.map((wf, idx) => {
                          return (
                            <div
                              key={wf.id}
                              className="snap-start flex-shrink-0 w-[300px] sm:w-[320px]"
                            >
                              <div className="group/card relative rounded-[20px] p-1.5 border border-white/10 bg-white/[0.02] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.85)] hover:scale-[1.015] hover:border-purple-500/25 hover:shadow-[0_0_30px_rgba(139,92,246,0.06)] transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.985] animate-fade-slide-up h-[256px]"
                                style={{ animationDelay: `${idx * 45}ms` }}
                              >
                              <div className="rounded-[14px] bg-[#0A0A0C]/60 p-4 flex flex-col h-full relative justify-between gap-3">
                                
                                {/* Tactile Window Header Row */}
                                <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 tracking-wider">
                                  {/* macOS console dots */}
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
                                  </div>

                                  {/* Status Pill */}
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold border transition-all duration-300 ${
                                    wf.status === "running"
                                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.15)]"
                                      : wf.status === "done"
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                      : wf.status === "error"
                                      ? "bg-red-500/10 text-red-400 border-red-500/20"
                                      : "bg-zinc-900/40 text-zinc-400 border-white/5"
                                  }`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${
                                      wf.status === "running"
                                        ? "bg-blue-400 animate-pulse"
                                        : wf.status === "done"
                                        ? "bg-emerald-400"
                                        : wf.status === "error"
                                        ? "bg-red-400"
                                        : "bg-zinc-500"
                                    }`} />
                                    {statusLabels[wf.status] || wf.status}
                                  </span>
                                </div>

                                {/* Typography Block */}
                                <div className="flex flex-col gap-1.5">
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
                                    <WorkspaceLink
                                      href={`/workflow/${wf.id}`}
                                      transition="open"
                                      className="truncate text-sm font-semibold text-zinc-200 block hover:text-purple-400 transition-colors cursor-pointer tracking-tight"
                                      title={wf.name}
                                    >
                                      {wf.name}
                                    </WorkspaceLink>
                                  )}
                                  {wf.description ? (
                                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed min-h-[2.5rem]">{wf.description}</p>
                                  ) : (
                                    <p className="text-xs text-zinc-600 italic line-clamp-2 leading-relaxed min-h-[2.5rem]">No description provided. Click to open.</p>
                                  )}
                                </div>

                                {/* Inset Visual Canvas */}
                                <div className="relative overflow-hidden rounded-xl border border-white/5 aspect-[250/130] bg-[#050506] flex items-center justify-center transition-all duration-500 group-hover/card:border-purple-500/20 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]">
                                  <WorkspaceLink transition="open" className="absolute inset-0 z-0 flex items-center justify-center cursor-pointer" href={`/workflow/${wf.id}`}>
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.06)_0%,transparent_70%)] opacity-0 group-hover/card:opacity-100 transition-opacity duration-700" />
                                    
                                    {/* Mini Interactive Node Graph representation */}
                                    <div className="absolute inset-0 p-4 flex flex-col justify-between pointer-events-none opacity-50 group-hover/card:opacity-100 transition-all duration-500">
                                      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                                        {/* Base paths */}
                                        <path
                                          d="M 60,24 C 80,24 80,65 97,65"
                                          fill="none"
                                          stroke="rgba(139, 92, 246, 0.12)"
                                          strokeWidth="1.5"
                                          className="transition-[stroke] duration-500 group-hover/card:stroke-[rgba(139,92,246,0.35)]"
                                        />
                                        {/* Animated dash overlay — opacity transition instead of display toggle to prevent jitter */}
                                        <path
                                          d="M 60,24 C 80,24 80,65 97,65"
                                          fill="none"
                                          stroke="#8B5CF6"
                                          strokeWidth="1.5"
                                          strokeDasharray="4, 4"
                                          className="opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] edge-animated"
                                        />
                                        
                                        <path
                                          d="M 60,106 C 80,106 80,65 97,65"
                                          fill="none"
                                          stroke="rgba(16, 185, 129, 0.12)"
                                          strokeWidth="1.5"
                                          className="transition-[stroke] duration-500 group-hover/card:stroke-[rgba(16,185,129,0.35)]"
                                        />
                                        <path
                                          d="M 60,106 C 80,106 80,65 97,65"
                                          fill="none"
                                          stroke="#10B981"
                                          strokeWidth="1.5"
                                          strokeDasharray="4, 4"
                                          className="opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] edge-animated"
                                        />

                                        <path
                                          d="M 153,65 L 190,65"
                                          fill="none"
                                          stroke="rgba(255, 255, 255, 0.08)"
                                          strokeWidth="1.5"
                                          className="transition-[stroke] duration-500 group-hover/card:stroke-[rgba(255,255,255,0.22)]"
                                        />
                                        <path
                                          d="M 153,65 L 190,65"
                                          fill="none"
                                          stroke="rgba(255, 255, 255, 0.3)"
                                          strokeWidth="1.5"
                                          strokeDasharray="4, 4"
                                          className="opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] edge-animated"
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
                                  </WorkspaceLink>

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
                                      className="rounded-full bg-black/60 p-1.5 text-zinc-400 opacity-0 transition-all duration-300 group-hover/card:opacity-100 hover:bg-black/80 hover:text-white border border-white/10 backdrop-blur-sm cursor-pointer active:scale-95"
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
                                      className="rounded-full bg-black/60 p-1.5 text-zinc-400 opacity-0 transition-all duration-300 group-hover/card:opacity-100 hover:bg-black/80 hover:text-white border border-white/10 backdrop-blur-sm cursor-pointer active:scale-95"
                                      title="More actions"
                                    >
                                      <EllipsisVertical className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* HUD Monospace Footer Row */}
                                <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-600 border-t border-white/5 pt-2.5 min-w-0">
                                  <span className="shrink-0 text-zinc-700 tracking-wider">#{wf.id.slice(0, 6).toUpperCase()}</span>
                                  <span className="text-zinc-800 flex-shrink-0">·</span>
                                  {/* Runs: play icon + count — much clearer than '0r' */}
                                  <span className={`flex-shrink-0 inline-flex items-center gap-0.5 ${
                                    wf._count && wf._count.runs > 0 ? "text-purple-400" : "text-zinc-700"
                                  }`}>
                                    <svg className="w-2 h-2" viewBox="0 0 8 8" fill="currentColor">
                                      <polygon points="1,0.5 7.5,4 1,7.5" />
                                    </svg>
                                    <span className="tabular-nums">{wf._count ? wf._count.runs : 0} run{(wf._count?.runs ?? 0) !== 1 ? "s" : ""}</span>
                                  </span>
                                  <span className="flex-1" />
                                  <div className="flex items-center gap-1 flex-shrink-0 text-zinc-700">
                                    <Clock className="w-2.5 h-2.5" />
                                    <span className="truncate max-w-[6rem] tracking-wider">{formatRelativeTime(wf.updatedAt)}</span>
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
                                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 px-3 py-2 text-[10px] font-semibold text-white transition-all cursor-pointer border-0 active:scale-95"
                                    >
                                      <ImagePlus className="h-3.5 w-3.5 text-zinc-400" />
                                      Select Asset
                                    </button>
                                    <button
                                      type="button"
                                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-3 py-2 text-[10px] font-semibold text-white transition-all cursor-pointer border-0 active:scale-95"
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
                                      className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] text-zinc-300 hover:bg-white/5 hover:text-white text-left cursor-pointer border-0 bg-transparent active:scale-95"
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
                                      className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] text-red-400 hover:bg-red-950/20 text-left cursor-pointer border-0 bg-transparent active-scale-95"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Pagination dots — UI placeholder (pagination API WIP) */}
                      {filteredWorkflows.length > 1 && (
                        <div className="flex items-center justify-center gap-1.5 mt-3 py-0.5">
                          {filteredWorkflows.map((_, i) => (
                            <div
                              key={i}
                              className={`rounded-full transition-[width,background-color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                                i === 0
                                  ? 'w-4 h-1 bg-purple-400'
                                  : 'w-1 h-1 bg-zinc-700'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                      </>
                    )}
                  </div>
                </>
              )}
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
