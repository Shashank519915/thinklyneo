"use client";

/**
 * @fileoverview Shared Gemini/Crop header affordances: info card, reset/run, overflow menu (duplicate, lock, delete).
 */

import { useRef, useState, useEffect } from "react";
import { Info, RotateCcw, Play, Ellipsis, Copy, GitFork, Lock, Unlock, Trash2 } from "lucide-react";

interface NodeHeaderActionsProps {
  nodeId: string;
  description: string;
  isExecuting: boolean;
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
  isExecuting,
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

  // Close menu on outside click
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

  return (
    <div className="mt-0.5 flex shrink-0 items-center gap-1.5">

      {/* ── Info tooltip ─────────────────────────────────── */}
      <div className="group/tip relative nodrag" style={{ overflow: "visible" }}>
        <Info className="h-3.5 w-3.5 cursor-default text-gray-400 dark:text-zinc-500" aria-hidden="true" />
        <div className="pointer-events-none absolute left-1/2 top-full z-[9999] mt-1.5 hidden w-max max-w-[280px] -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] font-normal leading-relaxed text-gray-700 shadow-lg group-hover/tip:block dark:bg-zinc-100">
          {description}
        </div>
      </div>

      {/* ── Reset button ─────────────────────────────────── */}
      <button
        className="nodrag rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
        title="Reset all inputs and output"
        onClick={onReset}
        disabled={isLocked}
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {/* ── Run button ───────────────────────────────────── */}
      <button
        onClick={onRun}
        disabled={isExecuting || isLocked}
        className={`nodrag flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
          isLocked
            ? "border border-yellow-400/30 bg-yellow-400/20 text-yellow-500 opacity-50 cursor-not-allowed"
            : "border border-green-500/30 bg-green-500/20 text-green-500 hover:bg-green-500/30 disabled:cursor-not-allowed disabled:opacity-40"
        }`}
      >
        <Play className="h-3 w-3 fill-current" aria-hidden="true" />
        <span>{isExecuting ? "Running..." : "Run"}</span>
      </button>

      {/* ── Three-dot menu ───────────────────────────────── */}
      <div ref={menuRef} className="relative nodrag" style={{ overflow: "visible" }}>
        <button
          className="nodrag inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-[#F5F5F5] text-gray-500 hover:bg-gray-100"
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <Ellipsis className="h-4 w-4" aria-hidden="true" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[9999] overflow-hidden py-1">

            <button
              className="flex items-center gap-3 w-full px-4 py-2.5 text-[14px] text-gray-800 hover:bg-gray-50 transition-colors"
              onClick={() => { onDuplicate(); setMenuOpen(false); }}
            >
              <Copy className="w-4 h-4 text-gray-500" />
              Duplicate
            </button>

            <button
              className="flex items-center gap-3 w-full px-4 py-2.5 text-[14px] text-gray-800 hover:bg-gray-50 transition-colors"
              onClick={() => { onDuplicateWithEdges(); setMenuOpen(false); }}
            >
              <GitFork className="w-4 h-4 text-gray-500" />
              Duplicate with Edges
            </button>

            <div className="my-1 mx-3 border-t border-gray-100" />

            <button
              className="flex items-center gap-3 w-full px-4 py-2.5 text-[14px] text-gray-800 hover:bg-gray-50 transition-colors"
              onClick={() => { onLockToggle(); setMenuOpen(false); }}
            >
              {isLocked
                ? <Unlock className="w-4 h-4 text-gray-500" />
                : <Lock   className="w-4 h-4 text-gray-500" />
              }
              {isLocked ? "Unlock" : "Lock"}
            </button>

            <div className="my-1 mx-3 border-t border-gray-100" />

            <button
              className="flex items-center gap-3 w-full px-4 py-2.5 text-[14px] text-red-500 hover:bg-red-50 transition-colors"
              onClick={() => { onDelete(); setMenuOpen(false); }}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>

          </div>
        )}
      </div>

    </div>
  );
}
