/**
 * @fileoverview Authenticated `/dashboard` page matching the layout, system workflow carousels,
 * and design aesthetics of the reference Magica portal. Includes JSON import, search filters, and card grids.
 */

"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
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
  Key,
  Webhook,
  Copy,
  Check,
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

  // API Keys state
  const [keys, setKeys] = useState<any[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [rateLimit, setRateLimit] = useState(60);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Webhooks state
  const [webhookDrafts, setWebhookDrafts] = useState<Record<string, string>>({});
  const [savingWebhookId, setSavingWebhookId] = useState<string | null>(null);

  const [activeUploadPopoverId, setActiveUploadPopoverId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const fetchKeys = async () => {
    setKeysLoading(true);
    try {
      const resp = await fetch("/api/keys");
      const data = await resp.json();
      if (data.data) setKeys(data.data);
    } catch (err) {
      console.error("Failed to fetch keys:", err);
    } finally {
      setKeysLoading(false);
    }
  };

  const fetchWorkflows = async () => {
    try {
      const resp = await fetch("/api/workflows");
      const data = await resp.json();
      if (data.data) {
        setWorkflows(data.data);
        // Initialize drafts for webhook urls
        const drafts: Record<string, string> = {};
        data.data.forEach((w: any) => {
          drafts[w.id] = w.webhookUrl || "";
        });
        setWebhookDrafts(drafts);
      }
    } catch (err) {
      console.error("Failed to fetch workflows:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
    fetchKeys();
    console.log(
      "[NextFlow] Candidate LinkedIn: " +
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

  const createApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;
    try {
      const resp = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName.trim(), rateLimit }),
      });
      const data = await resp.json();
      if (data.data) {
        setNewlyCreatedKey(data.data.key);
        setKeyName("");
        fetchKeys();
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error("Failed to create key:", err);
    }
  };

  const revokeApiKey = async (id: string) => {
    if (revokingId) return;
    setRevokingId(id);
    try {
      const resp = await fetch(`/api/keys/${id}`, {
        method: "DELETE",
      });
      if (resp.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== id));
      }
    } catch (err) {
      console.error("Failed to revoke key:", err);
    } finally {
      setRevokingId(null);
    }
  };

  const saveWebhook = async (workflowId: string) => {
    setSavingWebhookId(workflowId);
    const url = webhookDrafts[workflowId] || "";
    try {
      const resp = await fetch(`/api/workflows/${workflowId}/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: url }),
      });
      const data = await resp.json();
      if (data.data) {
        setWorkflows((prev) =>
          prev.map((w) =>
            w.id === workflowId
              ? { ...w, webhookUrl: data.data.webhookUrl, webhookSecret: data.data.webhookSecret }
              : w
          )
        );
        alert("Webhook configured successfully!");
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error("Failed to save webhook:", err);
    } finally {
      setSavingWebhookId(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
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
              <div className="space-y-12">
                {/* Header Row */}
                <div>
                  <h1 className="text-2xl font-bold text-foreground tracking-tight sm:text-3xl">API & Outbound Webhooks</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Expose workflow platforms externally and register outbound webhook listeners.
                  </p>
                </div>

                {/* API Keys Configuration Card */}
                <div className="rounded-2xl border border-border bg-card shadow-sm p-6 space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Key className="w-5 h-5 text-indigo-500" />
                      API Keys
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Create, manage, and revoke credentials for calling the versioned Public REST API.
                    </p>
                  </div>

                  {/* Create Key Form */}
                  <form onSubmit={createApiKey} className="flex flex-col gap-4 max-w-xl">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="key-name-input" className="text-xs font-semibold text-foreground">API Key Name</label>
                      <input
                        id="key-name-input"
                        type="text"
                        placeholder="e.g. Production client key"
                        value={keyName}
                        onChange={(e) => setKeyName(e.target.value)}
                        className="h-9 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="rate-limit-select" className="text-xs font-semibold text-foreground">Rate Limit per Minute</label>
                      <select
                        id="rate-limit-select"
                        value={rateLimit}
                        onChange={(e) => setRateLimit(Number(e.target.value))}
                        className="h-9 px-2.5 rounded-lg border border-border bg-background text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value={60}>60 requests / minute (Standard)</option>
                        <option value={120}>120 requests / minute (Pro)</option>
                        <option value={300}>300 requests / minute (Enterprise)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="inline-flex h-9 max-w-max items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors border-0 cursor-pointer"
                    >
                      Generate API Key
                    </button>
                  </form>

                  {/* Newly Created Key Alert (Shown once) */}
                  {newlyCreatedKey && (
                    <div className="rounded-xl border border-green-200 bg-green-50/50 p-4 space-y-2">
                      <div className="text-xs font-semibold text-green-800">
                        API Key generated successfully! Make sure to copy it now. You will not be able to retrieve it again.
                      </div>
                      <div className="flex items-center gap-2 max-w-xl">
                        <code className="flex-1 bg-background text-foreground border border-border px-3 py-1.5 rounded-lg text-xs font-mono font-bold select-all truncate">
                          {newlyCreatedKey}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(newlyCreatedKey, "newkey")}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          title="Copy key"
                        >
                          {copiedText === "newkey" ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* API Keys List */}
                  <div className="border-t border-border pt-6">
                    <h3 className="text-sm font-semibold text-foreground mb-4">Generated Keys ({keys.length})</h3>

                    {keysLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <SpinningLogo size="sm" />
                      </div>
                    ) : keys.length === 0 ? (
                      <div className="text-xs text-muted-foreground py-2 italic">No API keys registered. Create one above to get started.</div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-border bg-background">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-border bg-muted/30 text-xs font-bold text-muted-foreground uppercase select-none">
                              <th className="px-4 py-3 font-semibold">Key Name</th>
                              <th className="px-4 py-3 font-semibold">Masked Token</th>
                              <th className="px-4 py-3 font-semibold">Created At</th>
                              <th className="px-4 py-3 font-semibold text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border text-sm text-foreground">
                            {keys.map((k) => (
                              <tr key={k.id} className="hover:bg-muted/10 transition-colors">
                                <td className="px-4 py-3 font-medium">{k.name}</td>
                                <td className="px-4 py-3 font-mono text-xs">{k.maskedKey}</td>
                                <td className="px-4 py-3 text-muted-foreground">{new Date(k.createdAt).toLocaleDateString()}</td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`Revoke API key "${k.name}"? Active external clients using this key will immediately fail.`)) {
                                        revokeApiKey(k.id);
                                      }
                                    }}
                                    disabled={revokingId === k.id}
                                    className="inline-flex h-7 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors px-2.5 cursor-pointer disabled:opacity-40"
                                  >
                                    {revokingId === k.id ? "Revoking..." : "Revoke"}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Webhooks Configuration Card */}
                <div className="rounded-2xl border border-border bg-card shadow-sm p-6 space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Webhook className="w-5 h-5 text-indigo-500" />
                      Outbound Webhooks
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Configure webhook endpoints to receive lifecycle payload updates when workflow runs execute.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {workflows.length === 0 ? (
                      <div className="text-xs text-muted-foreground py-2 italic">Create a workflow from the Flow tab to configure webhooks.</div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-border bg-background">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-border bg-muted/30 text-xs font-bold text-muted-foreground uppercase select-none">
                              <th className="px-4 py-3 font-semibold w-[200px]">Workflow</th>
                              <th className="px-4 py-3 font-semibold">Webhook Destination URL</th>
                              <th className="px-4 py-3 font-semibold w-[240px]">Webhook Secret</th>
                              <th className="px-4 py-3 font-semibold text-right w-[120px]">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border text-sm text-foreground">
                            {workflows.map((w) => (
                              <tr key={w.id} className="hover:bg-muted/10 transition-colors align-top">
                                <td className="px-4 py-4 font-medium pt-5">{w.name}</td>
                                <td className="px-4 py-4">
                                  <input
                                    type="text"
                                    placeholder="e.g. https://my-app.com/api/webhooks"
                                    value={webhookDrafts[w.id] ?? ""}
                                    onChange={(e) => setWebhookDrafts(prev => ({ ...prev, [w.id]: e.target.value }))}
                                    className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                  />
                                </td>
                                <td className="px-4 py-4 pt-5 select-all">
                                  {w.webhookSecret ? (
                                    <div className="flex items-center gap-2">
                                      <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground truncate max-w-[170px]" title={w.webhookSecret}>
                                        {w.webhookSecret}
                                      </code>
                                      <button
                                        type="button"
                                        onClick={() => copyToClipboard(w.webhookSecret, w.id)}
                                        className="inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-background text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                        title="Copy secret"
                                      >
                                        {copiedText === w.id ? <Check className="w-2.5 h-2.5 text-green-600" /> : <Copy className="w-2.5 h-2.5" />}
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground italic">Secret auto-generated on URL save</span>
                                  )}
                                </td>
                                <td className="px-4 py-4 text-right pt-4">
                                  <button
                                    type="button"
                                    onClick={() => saveWebhook(w.id)}
                                    disabled={savingWebhookId === w.id}
                                    className="inline-flex h-8 items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition-colors px-3 cursor-pointer disabled:opacity-40 border-0"
                                  >
                                    {savingWebhookId === w.id ? "Saving..." : "Save URL"}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
                                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-galaxy-neutral-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 cursor-pointer border-0"
                                    >
                                      <ImagePlus className="h-4 w-4" />
                                      Select Asset
                                    </button>
                                    <button
                                      type="button"
                                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-galaxy-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 cursor-pointer border-0"
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
