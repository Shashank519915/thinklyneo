"use client";

/**
 * @fileoverview App navigation sidebar: expanded (260px) or collapsed icon rail (48px).
 * Settings modal contains API keys + webhook configuration (moved from /dashboard?tab=api).
 * the nav buttons all use href= "#" and onClick=(e) => e.preventDefault() to prevent navigation. basically to keep stub because they are just UI match and nota requiremrent rightnow to be built.
 */

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { ClientUserButton } from "@/components/auth/ClientUserButton";
import { useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { WorkspaceLink } from "@/components/workspace";
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
} from "lucide-react";
import { SettingsModal } from "@/components/settings/SettingsModal";

const EXPANDED_WIDTH = 260;
const COLLAPSED_WIDTH = 76;

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
  workspace,
}: {
  children: React.ReactNode;
  title: string;
  onClick?: (e: React.MouseEvent) => void;
  href?: string;
  active?: boolean;
  workspace?: boolean;
}) {
  const className = `inline-flex h-8 w-8 items-center justify-center rounded-xl text-zinc-400 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/5 hover:text-white active:scale-[0.94] border ${
    active 
      ? "bg-white/10 border-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" 
      : "border-transparent"
  }`;
  if (href) {
    if (workspace) {
      return (
        <WorkspaceLink href={href} className={className} title={title} onClick={onClick}>
          {children}
        </WorkspaceLink>
      );
    }
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

// ─── Main Sidebar ────────────────────────────────────────────────────────────

export default function LeftSidebar({ collapsed = false, onToggle }: LeftSidebarProps) {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentTab = searchParams ? searchParams.get("tab") || "workflows" : "workflows";

  const isWorkflowsActive =
    pathname?.startsWith("/workflow") ||
    (pathname === "/dashboard" && currentTab === "workflows");

  const isChatActive = pathname === "/chat" || pathname?.startsWith("/chat/");

  const [footerVisible, setFooterVisible] = useState(false);
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
    window.addEventListener("thinkly:refresh-history", handleRefresh);
    return () => window.removeEventListener("thinkly:refresh-history", handleRefresh);
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
        className="group/sidebar relative flex flex-shrink-0 flex-col overflow-hidden bg-[#050505] p-3 h-screen transition-[width] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ width }}
      >
        {/* Outer Bezel (matches card grid outer style) */}
        <div className="flex flex-col h-full rounded-[2rem] p-1.5 border border-white/10 bg-white/[0.02] backdrop-blur-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.85)] w-full relative">
          
          {/* Inner Core Bezel (matches card core style) */}
          <div className="rounded-[calc(2rem-6px)] bg-[#0A0A0C]/90 border border-white/5 flex flex-col h-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] relative overflow-hidden p-3 w-full justify-between">
            {/* CSS Film Grain Noise overlay */}
            <div className="absolute inset-0 pointer-events-none glass-noise z-0" />
            
            {/* ── Collapsed icon rail ── */}
            <div
              className={`absolute inset-y-0 left-1/2 -translate-x-1/2 z-10 flex h-full w-12 flex-col items-center transition-opacity duration-300 ease-in-out py-3 ${
                collapsed ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
              }`}
            >
              <button
                type="button"
                onClick={onToggle}
                title="Expand sidebar"
                className="relative mb-3 mt-3 inline-flex h-7 w-7 items-center justify-center rounded-xl text-zinc-400 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/5 hover:text-white active:scale-[0.94]"
              >
                <img
                  src="/logo.svg"
                  alt="Thinkly"
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
                <IconRailButton title="Chat" href="/chat" active={isChatActive} workspace>
                  <MessageSquare className="h-4 w-4" />
                </IconRailButton>
                <IconRailButton title="Projects" onClick={(e) => e.preventDefault()}>
                  <FolderOpen className="h-4 w-4" />
                </IconRailButton>
                <IconRailButton title="Library" onClick={(e) => e.preventDefault()}>
                  <Library className="h-4 w-4" />
                </IconRailButton>
                <IconRailButton title="Flow" href="/dashboard?tab=workflows" active={isWorkflowsActive} workspace>
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
                  <ClientUserButton
                    className="h-8 w-8"
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

            {/* ── Expanded panel ── */}
            <div
              className={`flex h-full w-full flex-col transition-opacity duration-300 ease-in-out relative z-10 ${
                collapsed ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
              }`}
            >
              <div className="mx-0 mb-2 mt-0 flex h-14 items-center justify-between px-1.5 py-1">
                <div className="flex min-w-0 items-center gap-1.5 pl-0">
                  <img src="/logo.svg" alt="Thinkly logo" className="h-10 w-10 flex-shrink-0" />
                  
                  {/* Brandkit Widescreen Short-Height Bold Font */}
                  <span className="select-none text-[13px] font-black uppercase tracking-[0.18em] text-white scale-y-[0.82] origin-left inline-block transform leading-none">
                    Thinkly
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onToggle}
                  className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-zinc-400 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/5 hover:text-zinc-200 active:scale-[0.94]"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </div>

              <div className="mx-0 mb-2 flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={(e) => e.preventDefault()}
                  className="group flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-300 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] border border-white/5 bg-white/5 hover:bg-white/10 active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-purple-400 transition-transform duration-300 group-hover:rotate-90" />
                    New task
                  </div>
                  <span className="text-[9px] font-mono text-zinc-500 opacity-0 transition-opacity group-hover:opacity-100">
                    CtrlShift+O
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => e.preventDefault()}
                  className="group flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-normal text-zinc-400 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] border border-transparent hover:bg-white/5 hover:text-zinc-200 active:scale-[0.97]"
                >
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300" />
                    Search tasks
                  </div>
                  <span className="text-[9px] font-mono text-zinc-500 opacity-0 transition-opacity group-hover:opacity-100">
                    CtrlK
                  </span>
                </button>
              </div>

              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex h-full min-h-0 flex-1 flex-col gap-2 overflow-auto [scrollbar-color:rgb(209_213_219)_transparent] [scrollbar-width:thin] hover:[scrollbar-color:rgb(156_163_175)_transparent]">
                  <div className="mx-0 mb-2 flex flex-col gap-0.5">
                    <WorkspaceLink
                      href="/chat"
                      className={`group flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97] border ${
                        isChatActive
                          ? "bg-white/10 border-white/10 font-semibold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] shadow-md"
                          : "border-transparent font-normal text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare
                          className={`h-4 w-4 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                            isChatActive
                              ? "text-purple-400"
                              : "text-zinc-500 group-hover:text-zinc-300 group-hover:scale-105"
                          }`}
                        />
                        Chat
                      </div>
                    </WorkspaceLink>
                    <a href="#" onClick={(e) => e.preventDefault()} className="group flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-normal text-zinc-400 border border-transparent transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/5 hover:text-zinc-200 active:scale-[0.97]">
                      <div className="flex items-center gap-2"><FolderOpen className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300 group-hover:scale-105 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]" />Projects</div>
                    </a>
                    <a href="#" onClick={(e) => e.preventDefault()} className="group flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-normal text-zinc-400 border border-transparent transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/5 hover:text-zinc-200 active:scale-[0.97]">
                      <div className="flex items-center gap-2"><Library className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300 group-hover:scale-105 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]" />Library</div>
                    </a>
                    <WorkspaceLink
                      href="/dashboard?tab=workflows"
                      className={`group flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97] border ${
                        isWorkflowsActive 
                          ? "bg-white/10 border-white/10 font-semibold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] shadow-md" 
                          : "border-transparent font-normal text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Workflow className={`h-4 w-4 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${isWorkflowsActive ? "text-purple-400" : "text-zinc-500 group-hover:text-zinc-300 group-hover:scale-105"}`} />
                        Flow
                      </div>
                    </WorkspaceLink>
                    <a href="#" onClick={(e) => e.preventDefault()} className="group flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-normal text-zinc-400 border border-transparent transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/5 hover:text-zinc-200 active:scale-[0.97]">
                      <div className="flex items-center gap-2"><Boxes className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300 group-hover:scale-105 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]" />Nodes</div>
                    </a>
                    {/* API / MCP → mintlify docs (external link) */}
                    <a
                      href="/docs"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-normal text-zinc-400 border border-transparent transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/5 hover:text-zinc-200 active:scale-[0.97]"
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300 group-hover:scale-105 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]" />
                        API / MCP
                      </div>
                    </a>
                  </div>
                  <div className="select-none px-3 py-8 text-center text-xs text-zinc-500 font-mono uppercase tracking-wider">Start a chat above</div>
                </div>
                <div className="pointer-events-none absolute bottom-0 left-0 z-10 h-16 w-full bg-gradient-to-t from-[#0C0C0E] to-transparent" />
              </div>

              <div className="relative z-10 flex flex-shrink-0 flex-col gap-2 pb-1 transition-[gap] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
                {/* Credits — always visible; slides with collapsible block below */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-1 shadow-lg transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
                  <div className="flex flex-col gap-2 rounded-[11px] border border-white/5 bg-black/40 p-3 shadow-inner">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-mono font-semibold uppercase tracking-wider text-zinc-500">
                        Available Credits
                      </span>
                      <a
                        href="#"
                        onClick={(e) => e.preventDefault()}
                        className="shrink-0 font-mono text-xs font-bold tabular-nums text-purple-400 transition-colors hover:text-purple-300"
                      >
                        {balance !== null ? `${(balance / 1000000).toFixed(2)}M` : "100.00M"}
                      </a>
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-500/10 bg-emerald-500/5 px-2 py-1 font-mono text-[9px] text-emerald-400">
                      <span className="truncate">Grant incoming</span>
                      <span className="shrink-0 font-semibold">+15M</span>
                    </div>
                  </div>
                </div>

                {/* Action buttons — collapsed by default */}
                <div
                  className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                    footerVisible ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="flex flex-col gap-1.5 pb-0.5">
                      <button
                        type="button"
                        className="relative inline-flex h-9 w-full min-w-0 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 text-[11px] font-semibold text-amber-400 shadow-md transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-amber-500/35 hover:bg-amber-500/20 active:scale-[0.97]"
                      >
                        <Crown className="relative z-10 h-3.5 w-3.5 shrink-0 text-amber-400" />
                        <span className="relative z-10 truncate">Get Lifetime Access</span>
                      </button>

                      <button
                        type="button"
                        className="relative inline-flex h-9 w-full min-w-0 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl border border-indigo-500/20 bg-indigo-600/15 px-3 text-[11px] font-semibold text-indigo-300 shadow-md transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-indigo-500/35 hover:bg-indigo-600/25 active:scale-[0.97]"
                      >
                        <Wallet className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                        <span className="truncate">Add Credits</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSettingsOpen(true)}
                        className="inline-flex h-9 w-full min-w-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/5 px-3 text-[11px] font-medium text-zinc-300 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/10 hover:text-white active:scale-[0.97]"
                      >
                        <Settings className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                        <span className="truncate">Settings</span>
                      </button>

                      <button
                        type="button"
                        className="relative inline-flex h-9 w-full min-w-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/5 px-3 text-[11px] font-medium text-zinc-300 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/10 hover:text-white active:scale-[0.97]"
                      >
                        <Sparkles className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                        <span className="truncate">What&apos;s New</span>
                        <span className="absolute right-2 top-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                      </button>

                      <a
                        role="button"
                        href="#"
                        onClick={(e) => e.preventDefault()}
                        className="group relative z-10 flex w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2.5 text-[11px] text-zinc-300 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/10 hover:text-white active:scale-[0.97]"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <Users className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                          <span className="truncate">Invite team members</span>
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setFooterVisible((v) => !v)}
                    className="flex w-full cursor-pointer items-center justify-center border-0 bg-transparent py-1 text-zinc-500 transition-all hover:bg-white/5 hover:text-zinc-300"
                    aria-label={footerVisible ? "Hide sidebar actions" : "Show sidebar actions"}
                  >
                    <ChevronDown
                      className={`h-3 w-3 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                        footerVisible ? "" : "rotate-180"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center gap-2.5 py-1">
                  <ClientUserButton
                    className="h-7 w-7"
                    appearance={{ elements: { avatarBox: "w-7 h-7" } }}
                  />
                  <span className="flex-1 select-none truncate text-sm font-medium text-zinc-200">
                    {displayName}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Settings modal portal */}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </>
  );
}
