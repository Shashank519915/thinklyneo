"use client";

/**
 * @fileoverview Reference-navigation chrome with dynamic credit display, new task/search triggers, Settings,
 * and Clerk integration, styled exactly to match the reference Magica portal.
 */

import { useState, useEffect, useCallback } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
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
  PanelLeft,
} from "lucide-react";

interface LeftSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function LeftSidebar({ collapsed = false, onToggle }: LeftSidebarProps) {
  const { user } = useUser();
  const [footerVisible, setFooterVisible] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);

  // Fetch actual credits balance dynamically from Neon PG database
  const fetchBalance = useCallback(async () => {
    try {
      const resp = await fetch("/api/credits/balance");
      const data = await resp.json();
      if (data.balance !== undefined) {
        setBalance(data.balance);
      }
    } catch (err) {
      console.error("Failed to fetch balance in sidebar:", err);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Synchronize credits balance with workflow run events
  useEffect(() => {
    const handleRefresh = () => {
      fetchBalance();
    };
    window.addEventListener("nextflow:refresh-history", handleRefresh);
    return () => window.removeEventListener("nextflow:refresh-history", handleRefresh);
  }, [fetchBalance]);

  const displayName =
    user?.fullName ??
    user?.firstName ??
    user?.emailAddresses[0]?.emailAddress?.split("@")[0] ??
    "User";

  return (
    <div
      className={`flex-shrink-0 flex flex-col bg-[#F9F9F9] border-r border-gray-200 transition-all duration-200 overflow-hidden ${
        collapsed ? "w-0" : "w-[260px]"
      }`}
      style={{ minHeight: "100%" }}
    >
      {/* ── Header: logo + PanelLeft toggle ── */}
      <div className="mx-1.5 mb-2 mt-2 flex items-center justify-between px-3 py-1 h-14">
        <div className="flex items-center gap-0 pl-0">
          <img
            src="/logo.svg"
            alt="NextFlow logo"
            className="w-10 h-10 flex-shrink-0"
          />
          <span className="text-[20px] font-bold text-gray-900 tracking-tight select-none leading-none ml-1">
            NextFlow
          </span>
        </div>
        <button
          onClick={onToggle}
          className="inline-flex items-center justify-center rounded-[18px] h-9 w-9 shrink-0 text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
          title="Collapse sidebar"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      </div>

      {!collapsed && (
        <>
          {/* ── Upper controls ── */}
          <div className="mx-1.5 mb-2 flex flex-col p-2">
            <button
              onClick={(e) => e.preventDefault()}
              className="group mb-0.5 flex w-full items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-sm font-normal text-gray-600 hover:bg-[#E8E8E8] hover:text-gray-900 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-gray-500" />
                New task
              </div>
              <span className="text-[10px] text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">CtrlShift+O</span>
            </button>
            <button
              onClick={(e) => e.preventDefault()}
              className="group mb-0.5 flex w-full items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-sm font-normal text-gray-600 hover:bg-[#E8E8E8] hover:text-gray-900 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-500" />
                Search tasks
              </div>
              <span className="text-[10px] text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">CtrlK</span>
            </button>
          </div>

          {/* ── Scrollable Nav Content ── */}
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto h-full [scrollbar-width:thin] [scrollbar-color:rgb(209_213_219)_transparent] hover:[scrollbar-color:rgb(156_163_175)_transparent]">
              <div className="mx-1.5 mb-2 flex flex-col px-2">
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="group mb-0.5 flex w-full items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-sm font-normal text-gray-600 hover:bg-[#E8E8E8] hover:text-gray-900 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-gray-500" />
                    Tasks
                  </div>
                </a>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="group mb-0.5 flex w-full items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-sm font-normal text-gray-600 hover:bg-[#E8E8E8] hover:text-gray-900 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-gray-500" />
                    Projects
                  </div>
                </a>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="group mb-0.5 flex w-full items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-sm font-normal text-gray-600 hover:bg-[#E8E8E8] hover:text-gray-900 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Library className="h-4 w-4 text-gray-500" />
                    Library
                  </div>
                </a>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="group mb-0.5 flex w-full items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-sm font-normal hover:bg-[#E8E8E8] hover:text-gray-900 transition-colors bg-[#E8E8E8] text-gray-900 font-medium"
                >
                  <div className="flex items-center gap-2">
                    <Workflow className="h-4 w-4 text-gray-900" />
                    Flow
                  </div>
                </a>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="group mb-0.5 flex w-full items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-sm font-normal text-gray-600 hover:bg-[#E8E8E8] hover:text-gray-900 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-gray-500" />
                    Nodes
                  </div>
                </a>
                <a
                  href="https://magica.com/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group mb-0.5 flex w-full items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-sm font-normal text-gray-600 hover:bg-[#E8E8E8] hover:text-gray-900 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-gray-500" />
                    API / MCP
                  </div>
                </a>
              </div>
              <div className="px-3 py-8 text-center text-sm text-gray-400 select-none">No tasks yet</div>
            </div>
            {/* Bottom fade overlay */}
            <div className="pointer-events-none absolute bottom-0 left-0 z-10 h-16 w-full bg-gradient-to-t from-white to-transparent" />
          </div>

          {/* ── Footer ── */}
          <div className="relative z-10 flex-shrink-0 px-2 pb-2">
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden flex flex-col gap-2 ${
                footerVisible ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              {/* Credits section */}
              <div className="flex flex-col gap-2">
                <div className="px-2 pt-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-400">Available Credits</span>
                    </div>
                    <div className="flex items-center min-h-[16px]">
                      <a
                        href="#"
                        onClick={(e) => e.preventDefault()}
                        className="text-xs font-semibold text-neutral-600 hover:text-neutral-800 font-mono tabular-nums transition-colors duration-200 underline-offset-2 hover:underline"
                      >
                        {balance !== null ? `${(balance / 1000000).toFixed(2)}M` : "100.00M"}
                      </a>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-1 p-1.5 rounded-[18px] bg-green-50 border border-green-200">
                  <p className="text-[11px] font-medium text-green-700">+15M credits on 30 Jun &apos;26</p>
                </div>
              </div>

              {/* Get Lifetime Access button */}
              <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[18px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-primary/90 px-4 py-2 w-full mt-2 h-8 text-xs cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden font-semibold bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-1000 before:ease-in-out border-0">
                <Crown className="w-3.5 h-3.5 mr-1.5 text-white relative z-10" />
                <span className="relative z-10">Get Lifetime Access</span>
              </button>

              {/* Add Credits button */}
              <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[18px] font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-full text-xs text-white bg-indigo-600/90 hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-1000 before:ease-in-out h-8 px-4 border-0">
                <Wallet className="w-4 h-4 mr-1.5" />
                Add Credits
              </button>

              {/* Settings & What's New buttons side by side */}
              <div className="flex items-center gap-2 mt-2">
                <div className="relative w-full">
                  <button className="inline-flex items-center whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border shadow-sm rounded-[18px] px-3 w-full h-8 text-xs font-medium justify-center gap-1.5 bg-white hover:bg-gray-50 border-gray-200 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer">
                    <Settings className="w-3.5 h-3.5" />
                    Settings
                  </button>
                </div>
                <button className="inline-flex items-center whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border shadow-sm rounded-[18px] px-3 w-full h-8 text-xs font-medium justify-center gap-1.5 bg-white hover:bg-gray-50 border-gray-200 text-gray-600 hover:text-gray-900 transition-colors relative cursor-pointer" type="button">
                  <Sparkles className="w-3.5 h-3.5" />
                  What's New
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                </button>
              </div>

              {/* Invite team members */}
              <div className="mt-2">
                <a role="button" className="group relative z-10 flex w-full items-center justify-between rounded-[18px] border border-gray-200 bg-white hover:bg-gray-50 py-2 px-3.5 text-xs text-gray-600 hover:text-gray-900 transition-colors duration-150" href="#" onClick={(e) => e.preventDefault()}>
                  <span className="flex items-center gap-3">
                    <span className="flex-shrink-0">
                      <Users className="h-4 w-4 text-gray-500" />
                    </span>
                    <span>Invite team members</span>
                  </span>
                  <ArrowRight className="h-4 w-4 flex-shrink-0" />
                </a>
              </div>
            </div>

            {/* Divider + toggle chevron */}
            <div className="border-t border-gray-200 mt-2">
              <button
                onClick={() => setFooterVisible((v) => !v)}
                className="w-full py-1 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all cursor-pointer border-0 bg-transparent"
                aria-label={footerVisible ? "Hide sidebar details" : "Show sidebar details"}
              >
                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${footerVisible ? "" : "rotate-180"}`} />
              </button>
            </div>

            {/* User row */}
            <div className="flex items-center px-2 py-1 gap-2.5">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-7 h-7",
                  },
                }}
              />
              <span className="text-sm font-medium text-gray-700 truncate flex-1 select-none">
                {displayName}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
