"use client";

/**
 * @fileoverview Shared Gemini/Crop header affordances: info card, reset/run, overflow menu (duplicate, lock, delete).
 * All chrome is dark-mode native — no light/gray surfaces.
 */

import { useRef, useState, useEffect } from "react";
import {
  Info,
  RotateCcw,
  Play,
  Loader2,
  Ellipsis,
  Copy,
  GitFork,
  Lock,
  Unlock,
  Trash2,
} from "lucide-react";
import type { NodeRunButtonState } from "@/lib/node-run-chrome";

interface NodeHeaderActionsProps {
  nodeId: string;
  description: string;
  runState: NodeRunButtonState;
  isLocked: boolean;
  onRun: () => void;
  onReset: () => void;
  onLockToggle: () => void;
  onDuplicate: () => void;
  onDuplicateWithEdges: () => void;
  onDelete: () => void;
}

/**
 * Accessible button cluster mounted in node chrome; traps pointer events (`nodrag`) so React Flow dragging stays smooth.
 */
export default function NodeHeaderActions({
  description,
  runState,
  isLocked,
  onRun,
  onReset,
  onLockToggle,
  onDuplicate,
  onDuplicateWithEdges,
  onDelete,
}: NodeHeaderActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const runDisabled = isLocked || runState !== "idle";
  const runLabel =
    runState === "running" ? "Running..." : runState === "pending" ? "Pending" : "Run";

  const runButtonClass =
    runState === "running"
      ? "border border-[#7C3AED]/30 bg-[#7C3AED]/20 text-[#7C3AED]"
      : runState === "pending"
        ? "border border-yellow-500/30 bg-yellow-500/20 text-yellow-500"
        : runState === "error"
          ? "border border-red-500/30 bg-red-500/10 text-red-400"
          : runState === "done"
            ? "border border-white/10 bg-white/[0.05] text-zinc-400"
            : "border border-green-500/30 bg-green-500/20 text-green-400 hover:bg-green-500/30 hover:text-green-300";

  return (
    <div className="flex shrink-0 items-center gap-1">
      {/* Info tooltip */}
      <div className="group/tip relative nodrag" style={{ overflow: "visible" }}>
        <Info
          className="h-3.5 w-3.5 cursor-default text-zinc-500 hover:text-zinc-300 transition-colors"
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute right-0 top-full z-[9999] mt-1.5 hidden w-max max-w-[280px] rounded-lg border border-white/10 bg-[#0A0A0C]/95 px-3 py-2 text-[11px] font-normal leading-relaxed text-zinc-300 shadow-2xl group-hover/tip:block backdrop-blur-md">
          {description}
        </div>
      </div>

      {/* Reset button */}
      <button
        className="nodrag rounded-lg p-1.5 text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40 transition-all active:scale-[0.92] duration-150"
        title="Reset all inputs and output"
        onClick={onReset}
        disabled={isLocked}
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {/* Run button */}
      <button
        onClick={onRun}
        disabled={runDisabled}
        className={`nodrag flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.97] duration-150 ${
          isLocked
            ? "border border-yellow-500/20 bg-yellow-500/10 text-yellow-500/70 opacity-60"
            : runButtonClass
        }`}
      >
        {runState === "running" ? (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        ) : runState === "idle" || runState === "done" ? (
          <Play className="h-3 w-3 fill-current" aria-hidden="true" />
        ) : null}
        <span>{runLabel}</span>
      </button>

      {/* Overflow menu */}
      <div ref={menuRef} className="relative nodrag" style={{ overflow: "visible" }}>
        <button
          className="nodrag inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-200 transition-all active:scale-[0.93] duration-150"
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          title="More options"
        >
          <Ellipsis className="h-4 w-4" aria-hidden="true" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-[9999] mt-1.5 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#0A0A0C]/97 py-1.5 shadow-2xl backdrop-blur-md">
            <button
              className="group flex w-full items-center gap-3 px-3 py-2 text-[13px] text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-zinc-100 rounded-lg mx-auto"
              style={{ width: "calc(100% - 8px)", marginLeft: 4, marginRight: 4 }}
              onClick={() => {
                onDuplicate();
                setMenuOpen(false);
              }}
            >
              <Copy className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0" />
              Duplicate
            </button>

            <button
              className="group flex w-full items-center gap-3 px-3 py-2 text-[13px] text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-zinc-100 rounded-lg"
              style={{ width: "calc(100% - 8px)", marginLeft: 4, marginRight: 4 }}
              onClick={() => {
                onDuplicateWithEdges();
                setMenuOpen(false);
              }}
            >
              <GitFork className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0" />
              Duplicate with Edges
            </button>

            <div className="mx-3 my-1 border-t border-white/[0.06]" />

            <button
              className="group flex w-full items-center gap-3 px-3 py-2 text-[13px] text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-zinc-100 rounded-lg"
              style={{ width: "calc(100% - 8px)", marginLeft: 4, marginRight: 4 }}
              onClick={() => {
                onLockToggle();
                setMenuOpen(false);
              }}
            >
              {isLocked ? (
                <Unlock className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0" />
              )}
              {isLocked ? "Unlock" : "Lock"}
            </button>

            <div className="mx-3 my-1 border-t border-white/[0.06]" />

            <button
              className="group flex w-full items-center gap-3 px-3 py-2 text-[13px] text-red-400/80 transition-colors hover:bg-red-500/[0.08] hover:text-red-300 rounded-lg"
              style={{ width: "calc(100% - 8px)", marginLeft: 4, marginRight: 4 }}
              onClick={() => {
                onDelete();
                setMenuOpen(false);
              }}
            >
              <Trash2 className="h-3.5 w-3.5 text-red-400/60 group-hover:text-red-300 transition-colors shrink-0" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
