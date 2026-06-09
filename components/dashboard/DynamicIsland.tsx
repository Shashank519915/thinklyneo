"use client";

import { useEffect, useState, useRef } from "react";
import { Upload, Plus, Search, Cpu, Activity } from "lucide-react";

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

  const balanceFormatted =
    balance !== null ? `${(balance / 1_000_000).toFixed(2)}M` : "100.00M";
  // percentage of 1 billion cap
  const creditPct = balance !== null ? Math.min((balance / 1_000_000_000) * 100, 100) : 73;
  const circumference = 2 * Math.PI * 16; // r=16

  // Keep vertical center fixed while collapsed height morphs (max = creating state).
  const maxCollapsedHeight = 48;
  const collapsedHeight =
    state === "creating" ? 48 : state === "searching" || state === "loading" ? 40 : 36;
  const marginTop = isExpanded ? 0 : (maxCollapsedHeight - collapsedHeight) / 2;

  return (
    <div
      ref={islandRef}
      onClick={() => {
        if (!isExpanded && state === "idle") {
          setIsExpanded(true);
        }
      }}
      style={{ marginTop }}
      className={`relative z-50 flex flex-col items-center border text-white
        shadow-[0_24px_60px_-10px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.06)]
        transition-[width,height,margin-top,border-radius,border-color,box-shadow,background-color]
        ${isExpanded ? "bg-[#0A0A0A]/95 backdrop-blur-2xl" : "bg-[#0A0A0A]"}
        duration-[480ms] ease-[cubic-bezier(0.32,0.72,0,1)]
        select-none overflow-hidden ${
          isExpanded
            ? "w-[440px] h-[288px] rounded-[32px] border-white/12 cursor-default"
            : `cursor-pointer hover:scale-[1.02] active:scale-[0.98]
               transition-[width,height,margin-top,border-radius,border-color,transform,box-shadow]
               ${
                 state === "creating"
                   ? "w-[290px] h-12 rounded-[24px] border-purple-500/40"
                   : state === "searching"
                   ? "w-[260px] h-10 rounded-[20px] border-white/10"
                   : state === "loading"
                   ? "w-[200px] h-10 rounded-[20px] border-white/8"
                   : "w-[152px] h-9 rounded-[18px] border-white/8"
               }`
        }`}
    >
      {/* ── EXPANDED STATE ─────────────────────────────────── */}
      <div
        className={`absolute inset-0 flex flex-col transition-[opacity,transform,filter]
          duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            isExpanded
              ? "opacity-100 scale-100 pointer-events-auto blur-0 delay-[120ms]"
              : "opacity-0 scale-[0.92] pointer-events-none blur-[4px] delay-0"
          }`}
      >
        {/* Top header bar */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2.5 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="status-pulse-dot absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-emerald-400">
              Online
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(false);
            }}
            className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-white/10 transition-colors duration-150 cursor-pointer"
          >
            <svg viewBox="0 0 8 8" className="w-2.5 h-2.5" fill="none">
              <path d="M1.5 1.5L6.5 6.5M6.5 1.5L1.5 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Stats grid — vertical layout: label → number → progress bar */}
        <div className="grid grid-cols-2 gap-3 px-4 py-3 flex-1">
          {/* Credits card */}
          <div className="flex flex-col justify-between rounded-2xl border border-white/8 bg-white/[0.04] p-4 transition-colors duration-200 hover:bg-white/[0.06]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] font-mono font-bold uppercase tracking-[0.22em] text-zinc-500">
                Credits
              </span>
              <Cpu className="w-3 h-3 text-zinc-700" />
            </div>
            <span className="text-[1.6rem] font-black text-white leading-none tabular-nums tracking-tight mt-1">
              {balanceFormatted}
            </span>
            {/* Progress bar */}
            <div className="mt-3 h-[3px] bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-[width] duration-700"
                style={{ width: `${creditPct}%` }}
              />
            </div>
            <span className="text-[8px] font-mono text-zinc-600 mt-1.5">{creditPct.toFixed(0)}% remaining</span>
          </div>

          {/* Flows card */}
          <div className="flex flex-col justify-between rounded-2xl border border-white/8 bg-white/[0.04] p-4 transition-colors duration-200 hover:bg-white/[0.06]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] font-mono font-bold uppercase tracking-[0.22em] text-zinc-500">
                Flows
              </span>
              <Activity className="w-3 h-3 text-zinc-700" />
            </div>
            <span className="text-[1.6rem] font-black text-white leading-none tabular-nums tracking-tight mt-1">
              {workflowsCount}
            </span>
            {/* Mini bar — flows up to 20 */}
            <div className="mt-3 h-[3px] bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-[width] duration-700"
                style={{ width: `${Math.min((workflowsCount / 20) * 100, 100)}%` }}
              />
            </div>
            <span className="text-[8px] font-mono text-zinc-600 mt-1.5">
              {workflowsCount === 0 ? "No flows yet" : workflowsCount === 1 ? "1 workflow" : `${workflowsCount} workflows`}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5 px-4 pb-4 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onImportClick();
              setIsExpanded(false);
            }}
            className="flex-1 group relative inline-flex items-center justify-between rounded-full border border-white/12 bg-white/5 pl-4 pr-1.5 py-1.5 text-[11px] font-semibold text-zinc-200 hover:bg-white/10 hover:text-white transition-[background-color,border-color] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer active:scale-[0.97]"
          >
            <span>Import Flow</span>
            <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:bg-white/10">
              <Upload className="w-3 h-3 text-purple-400" />
            </div>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              createWorkflow();
              setIsExpanded(false);
            }}
            className="flex-1 group relative inline-flex items-center justify-between rounded-full bg-white pl-4 pr-1.5 py-1.5 text-[11px] font-semibold text-black hover:bg-zinc-100 transition-[background-color] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer border-0 active:scale-[0.97]"
          >
            <span>New Flow</span>
            <div className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:rotate-90 group-hover:bg-black/10">
              <Plus className="w-3.5 h-3.5 text-black" />
            </div>
          </button>
        </div>
      </div>

      {/* ── COLLAPSED STATE ─────────────────────────────────── */}
      <div
        className={`absolute inset-0 flex items-center justify-center px-4
          transition-[opacity,transform,filter] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            !isExpanded
              ? "opacity-100 scale-100 pointer-events-auto blur-0 delay-[60ms]"
              : "opacity-0 scale-90 pointer-events-none blur-[3px] delay-0"
          }`}
      >
        {state === "creating" && (
          <div className="flex items-center gap-2.5 text-[11px] font-semibold">
            <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-purple-500" />
            </span>
            <span className="text-zinc-100">Designing canvas...</span>
          </div>
        )}
        {state === "searching" && (
          <div className="flex items-center gap-2 text-[11px] font-semibold text-zinc-200">
            <Search className="w-3 h-3 text-purple-400 animate-pulse flex-shrink-0" />
            <span>{workflowsCount} flow{workflowsCount !== 1 ? "s" : ""} found</span>
          </div>
        )}
        {state === "loading" && (
          <div className="flex items-center gap-2.5 text-[11px] font-semibold text-zinc-300">
            <div className="h-3 w-3 flex-shrink-0 animate-spin rounded-full border-2 border-t-transparent border-white/50" />
            <span>Syncing...</span>
          </div>
        )}
        {state === "idle" && (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            {/* Thinkly wordmark: bold, compressed, all-caps — brandkit: short-height widescreen grotesque */}
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white leading-none">
              Thinkly
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
