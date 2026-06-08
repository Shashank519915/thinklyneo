"use client";

/**
 * @fileoverview App navigation sidebar: expanded (260px) or collapsed icon rail (48px).
 * Settings modal contains API keys + webhook configuration (moved from /dashboard?tab=api).
 * the nav buttons all use href= "#" and onClick=(e) => e.preventDefault() to prevent navigation. basically to keep stub because they are just UI match and nota requiremrent rightnow to be built.
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
} from "lucide-react";
import { SettingsModal } from "@/components/settings/SettingsModal";

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
  const className = `inline-flex h-8 w-8 items-center justify-center rounded-xl text-zinc-400 transition-all duration-300 hover:bg-white/10 hover:text-white active:scale-[0.94] ${
    active ? "bg-white/10 text-white" : ""
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
        className="group/sidebar relative flex flex-shrink-0 flex-col overflow-hidden border-r border-white/5 bg-[var(--sidebar-bg)] transition-[width] duration-300 ease-in-out"
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
            className="relative mb-3 mt-3 inline-flex h-7 w-7 items-center justify-center rounded-xl text-zinc-400 transition-all duration-200 hover:bg-white/10 hover:text-white active:scale-[0.94]"
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
              <img src="/logo.svg" alt="Thinkly logo" className="h-10 w-10 flex-shrink-0" />
              <span className="ml-1 select-none text-[20px] font-bold leading-none tracking-tight text-white">
                Thinkly
              </span>
            </div>
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-zinc-400 transition-all duration-200 hover:bg-white/10 hover:text-white active:scale-[0.94]"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>

          <div className="mx-1.5 mb-2 flex flex-col p-2">
            <button
              type="button"
              onClick={(e) => e.preventDefault()}
              className="group mb-0.5 flex w-full cursor-pointer items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-sm font-normal text-zinc-300 transition-all duration-200 hover:bg-white/5 hover:text-white active:scale-[0.98]"
            >
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-gray-500" />
                New task
              </div>
              <span className="text-[10px] text-zinc-500 opacity-0 transition-opacity group-hover:opacity-100">
                CtrlShift+O
              </span>
            </button>
            <button
              type="button"
              onClick={(e) => e.preventDefault()}
              className="group mb-0.5 flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-normal text-zinc-400 transition-all duration-200 hover:bg-white/5 hover:text-white active:scale-[0.97]"
            >
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300" />
                Search tasks
              </div>
              <span className="text-[10px] text-zinc-500 opacity-0 transition-opacity group-hover:opacity-100">
                CtrlK
              </span>
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex h-full min-h-0 flex-1 flex-col gap-2 overflow-auto [scrollbar-color:rgb(209_213_219)_transparent] [scrollbar-width:thin] hover:[scrollbar-color:rgb(156_163_175)_transparent]">
              <div className="mx-1.5 mb-2 flex flex-col px-2">
                <a href="#" onClick={(e) => e.preventDefault()} className="group mb-0.5 flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-normal text-zinc-400 transition-all duration-200 hover:bg-white/5 hover:text-white active:scale-[0.97]">
                  <div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300" />Tasks</div>
                </a>
                <a href="#" onClick={(e) => e.preventDefault()} className="group mb-0.5 flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-normal text-zinc-400 transition-all duration-200 hover:bg-white/5 hover:text-white active:scale-[0.97]">
                  <div className="flex items-center gap-2"><FolderOpen className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300" />Projects</div>
                </a>
                <a href="#" onClick={(e) => e.preventDefault()} className="group mb-0.5 flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-normal text-zinc-400 transition-all duration-200 hover:bg-white/5 hover:text-white active:scale-[0.97]">
                  <div className="flex items-center gap-2"><Library className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300" />Library</div>
                </a>
                <a
                  href="/dashboard?tab=workflows"
                  className={`group mb-0.5 flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm transition-all duration-200 hover:bg-white/5 hover:text-white active:scale-[0.97] ${
                    isWorkflowsActive ? "bg-white/10 font-medium text-white" : "font-normal text-zinc-400"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Workflow className={`h-4 w-4 ${isWorkflowsActive ? "text-white" : "text-zinc-500 group-hover:text-zinc-300"}`} />
                    Flow
                  </div>
                </a>
                <a href="#" onClick={(e) => e.preventDefault()} className="group mb-0.5 flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-normal text-zinc-400 transition-all duration-200 hover:bg-white/5 hover:text-white active:scale-[0.97]">
                  <div className="flex items-center gap-2"><Boxes className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300" />Nodes</div>
                </a>
                {/* API / MCP → mintlify docs (external link) */}
                <a
                  href="/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group mb-0.5 flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-normal text-zinc-400 transition-all duration-200 hover:bg-white/5 hover:text-white active:scale-[0.97]"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300" />
                    API / MCP
                  </div>
                </a>
              </div>
              <div className="select-none px-3 py-8 text-center text-sm text-gray-400">No tasks yet</div>
            </div>
            <div className="pointer-events-none absolute bottom-0 left-0 z-10 h-16 w-full bg-gradient-to-t from-[#0C0C0E] to-transparent" />
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
                      className="font-mono text-xs font-semibold tabular-nums text-zinc-300 underline-offset-2 transition-all duration-200 hover:text-white hover:underline"
                    >
                      {balance !== null ? `${(balance / 1000000).toFixed(2)}M` : "100.00M"}
                    </a>
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-1 rounded-xl border border-green-950/20 bg-green-950/10 p-1.5">
                  <p className="text-[11px] font-medium text-green-400">+15M credits on 30 Jun &apos;26</p>
                </div>
              </div>

              <button type="button" className="relative mt-2 inline-flex h-8 w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-400 shadow-md transition-all duration-300 hover:bg-amber-500/20 hover:border-amber-500/35 active:scale-[0.97]">
                <Crown className="relative z-10 mr-1.5 h-3.5 w-3.5 text-amber-400" />
                <span className="relative z-10">Get Lifetime Access</span>
              </button>

              <button type="button" className="relative inline-flex h-8 w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl border border-indigo-500/20 bg-indigo-600/15 px-4 text-xs font-semibold text-indigo-300 shadow-md transition-all duration-300 hover:bg-indigo-600/25 hover:border-indigo-500/35 active:scale-[0.97]">
                <Wallet className="mr-1.5 h-4 w-4 text-indigo-400" />
                Add Credits
              </button>

              <div className="mt-2 flex items-center gap-2">
                {/* Settings button → opens modal */}
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="inline-flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-white/5 bg-white/5 px-3 text-xs font-medium text-zinc-300 shadow-sm transition-all duration-200 hover:bg-white/10 hover:text-white active:scale-[0.97]"
                >
                  <Settings className="h-3.5 w-3.5 text-zinc-400" />
                  Settings
                </button>
                <button type="button" className="relative inline-flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-white/5 bg-white/5 px-3 text-xs font-medium text-zinc-300 shadow-sm transition-all duration-200 hover:bg-white/10 hover:text-white active:scale-[0.97]">
                  <Sparkles className="h-3.5 w-3.5 text-zinc-400" />
                  What&apos;s New
                  <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                </button>
              </div>

              <div className="mt-2">
                <a role="button" href="#" onClick={(e) => e.preventDefault()} className="group relative z-10 flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3.5 py-2 text-xs text-zinc-300 transition-all duration-200 hover:bg-white/10 hover:text-white active:scale-[0.97]">
                  <span className="flex items-center gap-3">
                    <Users className="h-4 w-4 flex-shrink-0 text-zinc-500" />
                    <span>Invite team members</span>
                  </span>
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-zinc-400" />
                </a>
              </div>
            </div>

            <div className="mt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setFooterVisible((v) => !v)}
                className="flex w-full cursor-pointer items-center justify-center border-0 bg-transparent py-1 text-zinc-500 transition-all hover:bg-white/5 hover:text-zinc-300"
                aria-label={footerVisible ? "Hide sidebar details" : "Show sidebar details"}
              >
                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${footerVisible ? "" : "rotate-180"}`} />
              </button>
            </div>

            <div className="flex items-center gap-2.5 px-2 py-1">
              <UserButton appearance={{ elements: { avatarBox: "w-7 h-7" } }} />
              <span className="flex-1 select-none truncate text-sm font-medium text-zinc-200">
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
