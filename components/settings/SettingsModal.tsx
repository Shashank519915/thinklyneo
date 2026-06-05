"use client";

/** Some nav sections are stub, as their pages are not iplemented yet and are not a requirement as for now, they are just ui matching. hence kept them. */

import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  Brain,
  ChevronRight,
  CircleHelp,
  CreditCard,
  ExternalLink,
  Key,
  Keyboard,
  Palette,
  Plug,
  Settings,
  Smile,
  User,
  Webhook,
  X,
} from "lucide-react";
import { ApiKeysManageModal } from "./ApiKeysManageModal";
import type { WorkflowWebhookRecord } from "./types";

type SettingsSection =
  | "account"
  | "general"
  | "billing"
  | "preferences"
  | "personalization"
  | "memory"
  | "integrations"
  | "apiKeys"
  | "webhooks"
  | "resources"
  | "shortcuts";

const NAV: Array<{ id: SettingsSection; label: string; icon: React.ReactNode }> = [
  { id: "account", label: "Account", icon: <User className="h-4 w-4 shrink-0" /> },
  { id: "general", label: "General", icon: <Settings className="h-4 w-4 shrink-0" /> },
  { id: "billing", label: "Billing", icon: <CreditCard className="h-4 w-4 shrink-0" /> },
  { id: "preferences", label: "Preferences", icon: <Palette className="h-4 w-4 shrink-0" /> },
  { id: "personalization", label: "Personalization", icon: <Smile className="h-4 w-4 shrink-0" /> },
  { id: "memory", label: "Memory", icon: <Brain className="h-4 w-4 shrink-0" /> },
  { id: "integrations", label: "Integrations", icon: <Plug className="h-4 w-4 shrink-0" /> },
  { id: "apiKeys", label: "API Keys", icon: <Key className="h-4 w-4 shrink-0" /> },
  { id: "webhooks", label: "Webhooks", icon: <Webhook className="h-4 w-4 shrink-0" /> },
  { id: "resources", label: "Resources", icon: <CircleHelp className="h-4 w-4 shrink-0" /> },
  { id: "shortcuts", label: "Shortcuts", icon: <Keyboard className="h-4 w-4 shrink-0" /> },
];

const SECTION_TITLES: Record<SettingsSection, string> = {
  account: "Account",
  general: "General",
  billing: "Billing",
  preferences: "Preferences",
  personalization: "Personalization",
  memory: "Memory",
  integrations: "Integrations",
  apiKeys: "API Keys",
  webhooks: "Webhooks",
  resources: "Resources",
  shortcuts: "Shortcuts",
};

function PlaceholderPanel({ title }: { title: string }) {
  return (
    <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-gray-500">
      {title} settings coming soon.
    </div>
  );
}

function WebhooksPanel() {
  const [workflows, setWorkflows] = useState<WorkflowWebhookRecord[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    try {
      const resp = await fetch("/api/workflows");
      const data = await resp.json();
      if (data.data) {
        setWorkflows(data.data);
        const next: Record<string, string> = {};
        data.data.forEach((w: WorkflowWebhookRecord) => {
          next[w.id] = w.webhookUrl || "";
        });
        setDrafts(next);
      }
    } catch (err) {
      console.error("Failed to fetch workflows:", err);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const saveWebhook = async (workflowId: string) => {
    setSavingId(workflowId);
    try {
      const resp = await fetch(`/api/workflows/${workflowId}/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: drafts[workflowId] || "" }),
      });
      const data = await resp.json();
      if (data.data) {
        setWorkflows((prev) =>
          prev.map((w) =>
            w.id === workflowId
              ? {
                  ...w,
                  webhookUrl: data.data.webhookUrl,
                  webhookSecret: data.data.webhookSecret,
                }
              : w
          )
        );
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error("Failed to save webhook:", err);
    } finally {
      setSavingId(null);
    }
  };

  const copySecret = (secret: string, id: string) => {
    navigator.clipboard.writeText(secret);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <p className="text-xs leading-relaxed text-gray-500">
        Configure webhook endpoints to receive lifecycle updates when workflow runs
        execute. Each workflow can have one outbound URL and an auto-generated signing
        secret.
      </p>

      {workflows.length === 0 ? (
        <p className="text-xs italic text-gray-500">
          Create a workflow from the Flow tab to configure webhooks.
        </p>
      ) : (
        <div className="space-y-3">
          {workflows.map((w) => (
            <div
              key={w.id}
              className="rounded-lg border border-gray-200 bg-white px-3 py-3"
            >
              <div className="mb-2 text-sm font-medium text-gray-900">{w.name}</div>
              <input
                type="url"
                placeholder="https://your-app.com/webhook"
                value={drafts[w.id] ?? ""}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [w.id]: e.target.value }))
                }
                className="mb-2 h-9 w-full rounded-[18px] border border-gray-200 px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
              />
              {w.webhookSecret ? (
                <div className="mb-2 flex items-center gap-2">
                  <code className="max-w-[220px] truncate rounded-lg bg-gray-50 px-2 py-1 font-mono text-[11px] text-gray-500">
                    {w.webhookSecret}
                  </code>
                  <button
                    type="button"
                    onClick={() => copySecret(w.webhookSecret!, w.id)}
                    className="text-[11px] font-medium text-gray-600 hover:underline"
                  >
                    {copiedId === w.id ? "Copied" : "Copy secret"}
                  </button>
                </div>
              ) : (
                <p className="mb-2 text-[11px] text-gray-500">
                  Secret auto-generated on save.
                </p>
              )}
              <button
                type="button"
                onClick={() => saveWebhook(w.id)}
                disabled={savingId === w.id}
                className="inline-flex h-8 items-center rounded-[18px] bg-gray-900 px-3 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {savingId === w.id ? "Saving…" : "Save URL"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ApiKeysPanel({ onManage }: { onManage: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <p className="flex-1 text-xs leading-relaxed text-gray-500">
          Generate, label, and revoke API keys for programmatic access to your account.
          Use these keys with the public REST API or MCP server.
        </p>
        <button
          type="button"
          onClick={onManage}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-[18px] border border-gray-200 bg-white px-4 text-sm font-medium shadow-sm hover:bg-gray-50"
        >
          <Key className="h-4 w-4" />
          Manage
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-gray-200 pt-4">
        <div className="flex min-w-0 items-start gap-3">
          <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-900">API documentation</div>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              Review REST API and MCP usage before creating production keys.
            </p>
          </div>
        </div>
        <a
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-[18px] border border-gray-200 bg-white px-4 text-sm font-medium shadow-sm hover:bg-gray-50"
        >
          View
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [section, setSection] = useState<SettingsSection>("apiKeys");
  const [keysModalOpen, setKeysModalOpen] = useState(false);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="settings-title"
        className="fixed left-1/2 top-1/2 z-[51] grid h-full max-h-[85vh] w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[18px] border border-gray-200 bg-white shadow-lg md:h-[600px]"
      >
        <h2 id="settings-title" className="sr-only">
          Settings
        </h2>
        <p className="sr-only">
          Manage account, billing, preferences, and support resources.
        </p>

        <div className="flex h-full flex-col overflow-hidden md:flex-row">
          <div className="flex w-full shrink-0 flex-col border-b border-gray-200 bg-gray-50 md:h-auto md:w-[240px] md:border-b-0 md:border-r">
            <div className="hidden p-3 md:flex">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
                aria-label="Close settings"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex flex-row flex-wrap gap-1 p-2 md:flex-col md:gap-0">
              {NAV.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`flex min-w-fit flex-auto items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors md:w-full md:gap-3 md:py-2.5 md:text-sm ${
                    section === item.id
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="hidden h-[60px] shrink-0 items-center border-b border-gray-200 px-6 md:flex">
              <h2 className="text-lg font-semibold text-gray-900">
                {SECTION_TITLES[section]}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
              {section === "apiKeys" && (
                <ApiKeysPanel onManage={() => setKeysModalOpen(true)} />
              )}
              {section === "webhooks" && <WebhooksPanel />}
              {section !== "apiKeys" && section !== "webhooks" && (
                <PlaceholderPanel title={SECTION_TITLES[section]} />
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 md:hidden"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {keysModalOpen && (
        <ApiKeysManageModal onClose={() => setKeysModalOpen(false)} />
      )}
    </>
  );
}
