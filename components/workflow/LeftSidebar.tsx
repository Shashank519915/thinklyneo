"use client";

/**
 * @fileoverview App navigation sidebar: expanded (260px) or collapsed icon rail (48px).
 * Settings modal contains API keys + webhook configuration (moved from /dashboard?tab=api).
 */

import { useState, useEffect, useCallback } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Search,
  MessageSquare,
  FolderOpen,
  Library,
  Workflow,
  Boxes,
  BookOpen,
  Settings,
  Crown,
  Wallet,
  Sparkles,
  Users,
  ArrowRight,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Key,
  Webhook,
  Copy,
  Check,
} from "lucide-react";
import { SpinningLogo } from "@/components/SpinningLogo";

const EXPANDED_WIDTH = 260;
const COLLAPSED_WIDTH = 48;

interface LeftSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

function IconRailButton({
  children,
  title,
  onClick,
  href,
  active,
}: {
  children: React.ReactNode;
  title: string;
  onClick?: (e: React.MouseEvent) => void;
  href?: string;
  active?: boolean;
}) {
  const className = `inline-flex h-8 w-8 items-center justify-center rounded-[18px] text-gray-500 transition-colors hover:bg-[#E8E8E8] hover:text-gray-900 ${
    active ? "bg-[#E8E8E8] text-gray-900" : ""
  }`;
  if (href) {
    return (
      <Link href={href} className={className} title={title} onClick={onClick}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className} title={title}>
      {children}
    </button>
  );
}

// ─── Settings Modal ──────────────────────────────────────────────────────────

function SettingsModal({ onClose }: { onClose: () => void }) {
  const [keys, setKeys] = useState<any[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [rateLimit, setRateLimit] = useState(60);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const [workflows, setWorkflows] = useState<any[]>([]);
  const [webhookDrafts, setWebhookDrafts] = useState<Record<string, string>>({});
  const [savingWebhookId, setSavingWebhookId] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState<"keys" | "webhooks">("keys");

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const fetchKeys = useCallback(async () => {
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
  }, []);

  const fetchWorkflows = useCallback(async () => {
    try {
      const resp = await fetch("/api/workflows");
      const data = await resp.json();
      if (data.data) {
        setWorkflows(data.data);
        const drafts: Record<string, string> = {};
        data.data.forEach((w: any) => { drafts[w.id] = w.webhookUrl || ""; });
        setWebhookDrafts(drafts);
      }
    } catch (err) {
      console.error("Failed to fetch workflows:", err);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
    fetchWorkflows();
  }, [fetchKeys, fetchWorkflows]);

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
      const resp = await fetch(`/api/keys/${id}`, { method: "DELETE" });
      if (resp.ok) setKeys((prev) => prev.filter((k) => k.id !== id));
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
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error("Failed to save webhook:", err);
    } finally {
      setSavingWebhookId(null);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div
        className="fixed z-50 flex flex-col rounded-2xl bg-background shadow-2xl"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(680px, 92vw)",
          maxHeight: "85vh",
        }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Settings</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground border-0 bg-transparent cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 gap-1 border-b border-border px-6">
          <button
            type="button"
            onClick={() => setActiveSection("keys")}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors border-0 cursor-pointer ${
              activeSection === "keys"
                ? "border-b-2 border-solid border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5" />
              API Keys
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("webhooks")}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors border-0 cursor-pointer ${
              activeSection === "webhooks"
                ? "border-b-2 border-solid border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Webhook className="h-3.5 w-3.5" />
              Webhooks
            </span>
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {/* ── API Keys section ── */}
          {activeSection === "keys" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground">API Keys</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Create, manage, and revoke credentials for calling the versioned Public REST API.
                </p>
              </div>

              {/* Create key form */}
              <form onSubmit={createApiKey} className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="modal-key-name" className="text-xs font-semibold text-foreground">
                    Key Name
                  </label>
                  <input
                    id="modal-key-name"
                    type="text"
                    placeholder="e.g. Production client key"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="modal-rate-limit" className="text-xs font-semibold text-foreground">
                    Rate Limit per Minute
                  </label>
                  <select
                    id="modal-rate-limit"
                    value={rateLimit}
                    onChange={(e) => setRateLimit(Number(e.target.value))}
                    className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value={60}>60 / min — Standard</option>
                    <option value={120}>120 / min — Pro</option>
                    <option value={300}>300 / min — Enterprise</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors border-0 cursor-pointer"
                >
                  Generate API Key
                </button>
              </form>

              {/* Newly created key */}
              {newlyCreatedKey && (
                <div className="rounded-xl border border-green-200 bg-green-50/50 p-4 space-y-2">
                  <p className="text-xs font-semibold text-green-800">
                    API key generated — copy it now. You will not be able to retrieve it again.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-xs font-bold select-all truncate">
                      {newlyCreatedKey}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyText(newlyCreatedKey, "newkey")}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Copy key"
                    >
                      {copiedText === "newkey" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Keys list */}
              <div>
                <h4 className="mb-3 text-sm font-semibold text-foreground">
                  Generated Keys ({keys.length})
                </h4>
                {keysLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <SpinningLogo size="sm" />
                  </div>
                ) : keys.length === 0 ? (
                  <p className="py-2 text-xs italic text-muted-foreground">
                    No API keys yet. Create one above.
                  </p>
                ) : (
                  <div className="rounded-xl border border-border bg-background">
                    <table className="w-full border-collapse text-left text-sm table-fixed">
                      <thead>
                        <tr className="border-b border-border bg-muted/30 text-xs font-semibold uppercase text-muted-foreground">
                          <th className="px-4 py-3 w-auto min-w-0">Name</th>
                          <th className="px-4 py-3 w-[130px]">Masked Token</th>
                          <th className="px-4 py-3 w-[90px]">Created</th>
                          <th className="px-4 py-3 w-[80px] text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border text-foreground">
                        {keys.map((k) => (
                          <tr key={k.id} className="transition-colors hover:bg-muted/10">
                            <td className="px-4 py-3 font-medium min-w-0 truncate max-w-0">{k.name}</td>
                            <td className="px-4 py-3 font-mono text-xs">{k.maskedKey}</td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {new Date(k.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Revoke API key "${k.name}"? Active clients using this key will immediately fail.`)) {
                                    revokeApiKey(k.id);
                                  }
                                }}
                                disabled={revokingId === k.id}
                                className="inline-flex h-7 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-2.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 cursor-pointer disabled:opacity-40"
                              >
                                {revokingId === k.id ? "Revoking…" : "Revoke"}
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
          )}

          {/* ── Webhooks section ── */}
          {activeSection === "webhooks" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Outbound Webhooks</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Configure webhook endpoints to receive lifecycle payload updates when workflow runs execute.
                </p>
              </div>

              {workflows.length === 0 ? (
                <p className="py-2 text-xs italic text-muted-foreground">
                  Create a workflow from the Flow tab to configure webhooks.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border bg-background">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-xs font-semibold uppercase text-muted-foreground">
                        <th className="px-4 py-3 w-[160px]">Workflow</th>
                        <th className="px-4 py-3">Destination URL</th>
                        <th className="px-4 py-3 w-[200px]">Webhook Secret</th>
                        <th className="px-4 py-3 w-[100px] text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm text-foreground">
                      {workflows.map((w) => (
                        <tr key={w.id} className="align-top transition-colors hover:bg-muted/10">
                          <td className="px-4 py-4 font-medium pt-5">{w.name}</td>
                          <td className="px-4 py-4">
                            <input
                              type="text"
                              placeholder="https://your-app.com/webhook"
                              value={webhookDrafts[w.id] ?? ""}
                              onChange={(e) =>
                                setWebhookDrafts((prev) => ({ ...prev, [w.id]: e.target.value }))
                              }
                              className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-4 py-4 pt-5">
                            {w.webhookSecret ? (
                              <div className="flex items-center gap-2">
                                <code className="max-w-[140px] truncate rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground" title={w.webhookSecret}>
                                  {w.webhookSecret}
                                </code>
                                <button
                                  type="button"
                                  onClick={() => copyText(w.webhookSecret, w.id)}
                                  className="inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-background text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                                  title="Copy secret"
                                >
                                  {copiedText === w.id ? <Check className="h-2.5 w-2.5 text-green-600" /> : <Copy className="h-2.5 w-2.5" />}
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs italic text-muted-foreground">Auto-generated on save</span>
                            )}
                          </td>
                          <td className="px-4 py-4 pt-4 text-right">
                            <button
                              type="button"
                              onClick={() => saveWebhook(w.id)}
                              disabled={savingWebhookId === w.id}
                              className="inline-flex h-8 items-center justify-center rounded-lg border-0 bg-indigo-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 cursor-pointer disabled:opacity-40"
                            >
                              {savingWebhookId === w.id ? "Saving…" : "Save URL"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Main Sidebar ────────────────────────────────────────────────────────────

export default function LeftSidebar({ collapsed = false, onToggle }: LeftSidebarProps) {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentTab = searchParams ? searchParams.get("tab") || "workflows" : "workflows";

  const isWorkflowsActive =
    pathname?.startsWith("/workflow") ||
    (pathname === "/dashboard" && currentTab === "workflows");

  const [footerVisible, setFooterVisible] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const fetchBalance = useCallback(async () => {
    try {
      const resp = await fetch("/api/credits/balance");
      const data = await resp.json();
      if (data.balance !== undefined) setBalance(data.balance);
    } catch (err) {
      console.error("Failed to fetch balance in sidebar:", err);
    }
  }, []);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  useEffect(() => {
    const handleRefresh = () => fetchBalance();
    window.addEventListener("nextflow:refresh-history", handleRefresh);
    return () => window.removeEventListener("nextflow:refresh-history", handleRefresh);
  }, [fetchBalance]);

  const displayName =
    user?.fullName ??
    user?.firstName ??
    user?.emailAddresses[0]?.emailAddress?.split("@")[0] ??
    "User";

  const width = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  return (
    <>
      <div
        className="group/sidebar relative flex flex-shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-[#F9F9F9] transition-[width] duration-300 ease-in-out"
        style={{ width, minHeight: "100%" }}
      >
        {/* ── Collapsed icon rail (48px) ── */}
        <div
          className={`absolute inset-y-0 left-0 z-10 flex h-full w-12 flex-col items-center transition-opacity duration-300 ease-in-out ${
            collapsed ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        >
          <button
            type="button"
            onClick={onToggle}
            title="Expand sidebar"
            className="relative mb-3 mt-3 inline-flex h-7 w-7 items-center justify-center rounded-[18px] text-gray-500 transition-colors hover:bg-[#E8E8E8] hover:text-gray-900"
          >
            <img
              src="/logo.svg"
              alt="NextFlow"
              className="h-5 w-5 transition-opacity duration-200 group-hover/sidebar:opacity-0"
            />
            <PanelLeftOpen
              className="absolute inset-0 m-auto h-4 w-4 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100"
              aria-hidden
            />
          </button>

          <div className="flex flex-col items-center gap-1">
            <IconRailButton title="New task" onClick={(e) => e.preventDefault()}>
              <Plus className="h-4 w-4" />
            </IconRailButton>
            <IconRailButton title="Search tasks" onClick={(e) => e.preventDefault()}>
              <Search className="h-4 w-4" />
            </IconRailButton>
            <IconRailButton title="Tasks" onClick={(e) => e.preventDefault()}>
              <MessageSquare className="h-4 w-4" />
            </IconRailButton>
            <IconRailButton title="Projects" onClick={(e) => e.preventDefault()}>
              <FolderOpen className="h-4 w-4" />
            </IconRailButton>
            <IconRailButton title="Library" onClick={(e) => e.preventDefault()}>
              <Library className="h-4 w-4" />
            </IconRailButton>
            <IconRailButton title="Flow" href="/dashboard?tab=workflows" active={isWorkflowsActive}>
              <Workflow className="h-4 w-4" />
            </IconRailButton>
            <IconRailButton title="Nodes" onClick={(e) => e.preventDefault()}>
              <Boxes className="h-4 w-4" />
            </IconRailButton>
            {/* API / MCP → external docs */}
            <IconRailButton title="API / MCP Docs" href="/docs">
              <BookOpen className="h-4 w-4" />
            </IconRailButton>
            {/* Settings icon in rail */}
            <IconRailButton title="Settings" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4" />
            </IconRailButton>
          </div>

          <div className="mt-auto flex flex-col items-center gap-2 pb-4">
            <div className="flex items-center justify-center">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8",
                    userButtonTrigger: "focus:shadow-none",
                  },
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Expanded panel (260px) ── */}
        <div
          className={`flex h-full min-w-[260px] flex-col transition-opacity duration-300 ease-in-out ${
            collapsed ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
          }`}
          style={{ width: EXPANDED_WIDTH }}
        >
          <div className="mx-1.5 mb-2 mt-2 flex h-14 items-center justify-between px-3 py-1">
            <div className="flex min-w-0 items-center gap-0 pl-0">
              <img src="/logo.svg" alt="NextFlow logo" className="h-10 w-10 flex-shrink-0" />
              <span className="ml-1 select-none text-[20px] font-bold leading-none tracking-tight text-gray-900">
                NextFlow
              </span>
            </div>
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[18px] text-gray-500 transition-colors hover:bg-gray-100"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>

          <div className="mx-1.5 mb-2 flex flex-col p-2">
            <button
              type="button"
              onClick={(e) => e.preventDefault()}
              className="group mb-0.5 flex w-full cursor-pointer items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-sm font-normal text-gray-600 transition-colors hover:bg-[#E8E8E8] hover:text-gray-900"
            >
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-gray-500" />
                New task
              </div>
              <span className="text-[10px] text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">
                CtrlShift+O
              </span>
            </button>
            <button
              type="button"
              onClick={(e) => e.preventDefault()}
              className="group mb-0.5 flex w-full cursor-pointer items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-sm font-normal text-gray-600 transition-colors hover:bg-[#E8E8E8] hover:text-gray-900"
            >
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-500" />
                Search tasks
              </div>
              <span className="text-[10px] text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">
                CtrlK
              </span>
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex h-full min-h-0 flex-1 flex-col gap-2 overflow-auto [scrollbar-color:rgb(209_213_219)_transparent] [scrollbar-width:thin] hover:[scrollbar-color:rgb(156_163_175)_transparent]">
              <div className="mx-1.5 mb-2 flex flex-col px-2">
                <a href="#" onClick={(e) => e.preventDefault()} className="group mb-0.5 flex w-full items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-sm font-normal text-gray-600 transition-colors hover:bg-[#E8E8E8] hover:text-gray-900">
                  <div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-gray-500" />Tasks</div>
                </a>
                <a href="#" onClick={(e) => e.preventDefault()} className="group mb-0.5 flex w-full items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-sm font-normal text-gray-600 transition-colors hover:bg-[#E8E8E8] hover:text-gray-900">
                  <div className="flex items-center gap-2"><FolderOpen className="h-4 w-4 text-gray-500" />Projects</div>
                </a>
                <a href="#" onClick={(e) => e.preventDefault()} className="group mb-0.5 flex w-full items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-sm font-normal text-gray-600 transition-colors hover:bg-[#E8E8E8] hover:text-gray-900">
                  <div className="flex items-center gap-2"><Library className="h-4 w-4 text-gray-500" />Library</div>
                </a>
                <a
                  href="/dashboard?tab=workflows"
                  className={`group mb-0.5 flex w-full items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-sm transition-colors hover:bg-[#E8E8E8] hover:text-gray-900 ${
                    isWorkflowsActive ? "bg-[#E8E8E8] font-medium text-gray-900" : "font-normal text-gray-600"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Workflow className={`h-4 w-4 ${isWorkflowsActive ? "text-gray-900" : "text-gray-500"}`} />
                    Flow
                  </div>
                </a>
                <a href="#" onClick={(e) => e.preventDefault()} className="group mb-0.5 flex w-full items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-sm font-normal text-gray-600 transition-colors hover:bg-[#E8E8E8] hover:text-gray-900">
                  <div className="flex items-center gap-2"><Boxes className="h-4 w-4 text-gray-500" />Nodes</div>
                </a>
                {/* API / MCP → mintlify docs (external link) */}
                <a
                  href="/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group mb-0.5 flex w-full items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-sm font-normal text-gray-600 transition-colors hover:bg-[#E8E8E8] hover:text-gray-900"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-gray-500" />
                    API / MCP
                  </div>
                </a>
              </div>
              <div className="select-none px-3 py-8 text-center text-sm text-gray-400">No tasks yet</div>
            </div>
            <div className="pointer-events-none absolute bottom-0 left-0 z-10 h-16 w-full bg-gradient-to-t from-[#F9F9F9] to-transparent" />
          </div>

          <div className="relative z-10 flex-shrink-0 px-2 pb-2">
            <div
              className={`flex flex-col gap-2 overflow-hidden transition-all duration-300 ease-in-out ${
                footerVisible ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="flex flex-col gap-2">
                <div className="px-2 pt-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-gray-400">Available Credits</span>
                    <a
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      className="font-mono text-xs font-semibold tabular-nums text-neutral-600 underline-offset-2 transition-colors duration-200 hover:text-neutral-800 hover:underline"
                    >
                      {balance !== null ? `${(balance / 1000000).toFixed(2)}M` : "100.00M"}
                    </a>
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-1 rounded-[18px] border border-green-200 bg-green-50 p-1.5">
                  <p className="text-[11px] font-medium text-green-700">+15M credits on 30 Jun &apos;26</p>
                </div>
              </div>

              <button type="button" className="relative mt-2 inline-flex h-8 w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-[18px] border-0 bg-gradient-to-r from-amber-500 to-yellow-600 px-4 py-2 text-xs font-semibold text-white shadow-lg transition-all duration-300 before:absolute before:inset-0 before:translate-x-[-200%] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-transform before:duration-1000 before:ease-in-out hover:from-amber-600 hover:to-yellow-700 hover:shadow-xl hover:before:translate-x-[200%]">
                <Crown className="relative z-10 mr-1.5 h-3.5 w-3.5 text-white" />
                <span className="relative z-10">Get Lifetime Access</span>
              </button>

              <button type="button" className="relative inline-flex h-8 w-full items-center justify-center gap-2 overflow-hidden rounded-[18px] border-0 bg-indigo-600/90 px-4 text-xs font-semibold text-white shadow-lg transition-all duration-300 before:absolute before:inset-0 before:translate-x-[-200%] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:transition-transform before:duration-1000 before:ease-in-out hover:bg-indigo-700 hover:shadow-xl hover:before:translate-x-[200%]">
                <Wallet className="mr-1.5 h-4 w-4" />
                Add Credits
              </button>

              <div className="mt-2 flex items-center gap-2">
                {/* Settings button → opens modal */}
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="inline-flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-[18px] border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Settings
                </button>
                <button type="button" className="relative inline-flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-[18px] border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900">
                  <Sparkles className="h-3.5 w-3.5" />
                  What&apos;s New
                  <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                </button>
              </div>

              <div className="mt-2">
                <a role="button" href="#" onClick={(e) => e.preventDefault()} className="group relative z-10 flex w-full items-center justify-between rounded-[18px] border border-gray-200 bg-white px-3.5 py-2 text-xs text-gray-600 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-900">
                  <span className="flex items-center gap-3">
                    <Users className="h-4 w-4 flex-shrink-0 text-gray-500" />
                    <span>Invite team members</span>
                  </span>
                  <ArrowRight className="h-4 w-4 flex-shrink-0" />
                </a>
              </div>
            </div>

            <div className="mt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setFooterVisible((v) => !v)}
                className="flex w-full cursor-pointer items-center justify-center border-0 bg-transparent py-1 text-gray-400 transition-all hover:bg-gray-50 hover:text-gray-600"
                aria-label={footerVisible ? "Hide sidebar details" : "Show sidebar details"}
              >
                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${footerVisible ? "" : "rotate-180"}`} />
              </button>
            </div>

            <div className="flex items-center gap-2.5 px-2 py-1">
              <UserButton appearance={{ elements: { avatarBox: "w-7 h-7" } }} />
              <span className="flex-1 select-none truncate text-sm font-medium text-gray-700">
                {displayName}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings modal portal */}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </>
  );
}
