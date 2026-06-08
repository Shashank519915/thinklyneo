"use client";

import { useEffect, useState, useRef } from "react";
import { Upload, Plus, Search, Cpu, Activity, Sparkles } from "lucide-react";

interface DynamicIslandProps {
  loading: boolean;
  workflowsCount: number;
  searchTerm: string;
  creating: boolean;
  createWorkflow: () => void;
  onImportClick: () => void;
}

export default function DynamicIsland({
  loading,
  workflowsCount,
  searchTerm,
  creating,
  createWorkflow,
  onImportClick,
}: DynamicIslandProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const islandRef = useRef<HTMLDivElement>(null);

  let state: "loading" | "creating" | "searching" | "idle" = "idle";
  if (loading) state = "loading";
  else if (creating) state = "creating";
  else if (searchTerm.trim().length > 0) state = "searching";

  // Fetch balance inside Dynamic Island to keep it self-contained
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const resp = await fetch("/api/credits/balance");
        const data = await resp.json();
        if (data.balance !== undefined) setBalance(data.balance);
      } catch (err) {
        console.error("Failed to fetch balance in Dynamic Island:", err);
      }
    };
    fetchBalance();
  }, [loading]);

  // Click outside to collapse
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (islandRef.current && !islandRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div
      ref={islandRef}
      onClick={() => {
        if (!isExpanded && state === "idle") {
          setIsExpanded(true);
        }
      }}
      className={`relative z-50 flex flex-col items-center bg-black/90 border border-white/10 text-white shadow-[0_24px_50px_-12px_rgba(0,0,0,0.9)] backdrop-blur-2xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] select-none cursor-pointer overflow-hidden ${
        isExpanded
          ? "w-[380px] h-[225px] rounded-[28px] border-white/15"
          : "hover:scale-[1.03] active:scale-[0.98]"
      } ${
        isExpanded
          ? ""
          : state === "creating"
          ? "w-[290px] h-12 rounded-[24px] border-purple-500/40"
          : state === "searching"
          ? "w-[250px] h-10 rounded-[20px]"
          : state === "loading"
          ? "w-[210px] h-10 rounded-[20px]"
          : "w-[165px] h-9 rounded-[18px]"
      }`}
    >
      {/* Expanded Content Wrapper */}
      <div
        className={`absolute inset-0 p-5 flex flex-col justify-between transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isExpanded
            ? "opacity-100 scale-100 pointer-events-auto blur-0 delay-100"
            : "opacity-0 scale-95 pointer-events-none blur-sm translate-y-2 delay-0"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between w-full border-b border-white/5 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="status-pulse-dot absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">All systems online</span>
          </div>
          <div className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span className="text-[9px] font-mono text-zinc-500 tracking-widest uppercase">Thinkly OS v1</span>
          </div>
        </div>

        {/* Expanded Content Grid */}
        <div className="grid grid-cols-2 gap-3.5 py-3 w-full">
          {/* Left Block: Credit Activity Circle */}
          <div className="flex items-center gap-2.5 rounded-2xl border border-white/5 bg-white/2 p-3 transition-all hover:bg-white/4">
            <div className="relative flex items-center justify-center flex-shrink-0">
              <svg className="w-11 h-11 transform -rotate-90">
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  className="stroke-zinc-900"
                  strokeWidth="3"
                  fill="transparent"
                />
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  className="stroke-purple-500"
                  strokeWidth="3"
                  fill="transparent"
                  strokeDasharray={113}
                  strokeDashoffset={25}
                />
              </svg>
              <Cpu className="w-4 h-4 text-purple-400 absolute" />
            </div>
            <div className="min-w-0">
              <span className="block text-[8px] uppercase tracking-widest text-zinc-500 font-semibold">Credits</span>
              <span className="text-xs font-mono font-bold text-white mt-0.5 block truncate">
                {balance !== null ? `${(balance / 1000000).toFixed(2)}M` : "100.00M"}
              </span>
            </div>
          </div>

          {/* Right Block: Flows and Status */}
          <div className="flex items-center gap-2.5 rounded-2xl border border-white/5 bg-white/2 p-3 transition-all hover:bg-white/4">
            <div className="relative flex items-center justify-center flex-shrink-0">
              <svg className="w-11 h-11 transform -rotate-90">
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  className="stroke-zinc-900"
                  strokeWidth="3"
                  fill="transparent"
                />
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  className="stroke-emerald-400"
                  strokeWidth="3"
                  fill="transparent"
                  strokeDasharray={113}
                  strokeDashoffset={15}
                />
              </svg>
              <Activity className="w-4 h-4 text-emerald-400 absolute" />
            </div>
            <div className="min-w-0">
              <span className="block text-[8px] uppercase tracking-widest text-zinc-500 font-semibold">Flows</span>
              <span className="text-xs font-mono font-bold text-white mt-0.5 block truncate">
                {workflowsCount} matching
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Clean iOS Pill Aesthetics */}
        <div className="flex gap-2.5 w-full mt-auto pt-1">
          {/* Import Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onImportClick();
              setIsExpanded(false);
            }}
            className="flex-1 group relative inline-flex items-center justify-between rounded-full border border-white/10 bg-white/5 pl-4 pr-1.5 py-1 text-[11px] font-semibold text-zinc-200 hover:bg-white/10 hover:text-white transition-all active:scale-[0.95] cursor-pointer active-scale shadow-sm"
          >
            <span className="tracking-tight">Import Flow</span>
            <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:bg-white/10">
              <Upload className="w-3.5 h-3.5 text-purple-400" />
            </div>
          </button>

          {/* New Flow Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              createWorkflow();
              setIsExpanded(false);
            }}
            className="flex-1 group relative inline-flex items-center justify-between rounded-full bg-white pl-4 pr-1.5 py-1 text-[11px] font-semibold text-black hover:bg-zinc-100 transition-all active:scale-[0.95] cursor-pointer border-0 active-scale shadow-lg shadow-white/5"
          >
            <span className="tracking-tight">New Flow</span>
            <div className="w-6 h-6 rounded-full bg-black/5 dark:bg-black/10 flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:bg-black/20">
              <Plus className="w-3.5 h-3.5 text-black" />
            </div>
          </button>
        </div>
      </div>

      {/* Collapsed Content Wrapper */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all duration-250 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          !isExpanded
            ? "opacity-100 scale-100 pointer-events-auto blur-0 delay-75"
            : "opacity-0 scale-90 pointer-events-none blur-sm -translate-y-2 delay-0"
        }`}
      >
        {state === "creating" && (
          <div className="flex items-center gap-2.5 text-xs font-semibold tracking-wide">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
            </span>
            <span className="animate-pulse text-zinc-200">Designing new canvas...</span>
          </div>
        )}
        {state === "searching" && (
          <div className="flex items-center gap-2.5 text-xs font-semibold text-zinc-300 tracking-wide">
            <Search className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span>Found {workflowsCount} matching flows</span>
          </div>
        )}
        {state === "loading" && (
          <div className="flex items-center gap-2.5 text-xs font-semibold text-zinc-300 tracking-wide">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-t-transparent border-white/60" />
            <span>Syncing workspace...</span>
          </div>
        )}
        {state === "idle" && (
          <div className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">Thinkly</span>
          </div>
        )}
      </div>
    </div>
  );
}
