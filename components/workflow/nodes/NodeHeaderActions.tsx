"use client";

/**
 * @fileoverview Shared Gemini/Crop header affordances: info card, reset/run, overflow menu (duplicate, lock, delete).
 */

import { useRef, useState, useEffect } from "react";
import { Info, RotateCcw, Play, MoreHorizontal, Copy, GitFork, Lock, Unlock, Trash2 } from "lucide-react";

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
 *
 * NOTE: Locked state swaps Run styling yellow and swaps menu label Unlock/Lock without mutating graph automatically.
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
    <div className="flex items-center gap-1">

      {/* ── Info tooltip ─────────────────────────────────── */}
      <div className="relative group/info nodrag">
        <button className="flex items-center justify-center w-6 h-6 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <Info className="w-3.5 h-3.5" />
        </button>
        {/* White card tooltip — opens BELOW the button, centred under the icon */}
        <div className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover/info:block z-[300]">
          <div className="bg-white border border-gray-200 rounded-xl shadow-xl px-3 py-2 w-72 text-[12px] text-gray-600 leading-relaxed">
            {description}
          </div>
        </div>
      </div>

      {/* ── Reset button ─────────────────────────────────── */}
      <button
        className="nodrag flex items-center justify-center w-6 h-6 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        title="Reset all inputs and output"
        onClick={onReset}
        disabled={isLocked}
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>

      {/* ── Run button ───────────────────────────────────── */}
      <button
        onClick={onRun}
        disabled={isExecuting || isLocked}
        className={`nodrag flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
          isLocked
            ? "border border-yellow-400/50 bg-yellow-400/20 text-yellow-600 opacity-50 cursor-not-allowed"
            : "border border-green-500/30 bg-green-500/20 text-green-600 hover:bg-green-500/30 disabled:opacity-50"
        }`}
      >
        <Play className="w-3 h-3" />
        {isExecuting ? "Running..." : "Run"}
      </button>

      {/* ── Three-dot menu ───────────────────────────────── */}
      <div ref={menuRef} className="relative nodrag">
        <button
          className="nodrag flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-[#F5F5F5] text-gray-500 hover:bg-gray-100 transition-colors"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[400] overflow-hidden py-1">

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
