"use client";

/**
 * @fileoverview Shared Gemini/Crop header affordances: info card, reset/run, overflow menu (duplicate, lock, delete).
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
        ? "border border-yellow-500/30 bg-yellow-500/20 text-yellow-600"
        : runState === "error"
          ? "border border-red-200 bg-red-50 text-red-400"
          : runState === "done"
            ? "border border-gray-200 bg-gray-100 text-gray-400"
            : "border border-green-500/30 bg-green-500/20 text-green-500 hover:bg-green-500/30";

  return (
    <div className="mt-0.5 flex shrink-0 items-center gap-1.5">
      <div className="group/tip relative nodrag" style={{ overflow: "visible" }}>
        <Info className="h-3.5 w-3.5 cursor-default text-gray-400 dark:text-zinc-500" aria-hidden="true" />
        <div className="pointer-events-none absolute left-1/2 top-full z-[9999] mt-1.5 hidden w-max max-w-[280px] -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] font-normal leading-relaxed text-gray-700 shadow-lg group-hover/tip:block dark:bg-zinc-100">
          {description}
        </div>
      </div>

      <button
        className="nodrag rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
        title="Reset all inputs and output"
        onClick={onReset}
        disabled={isLocked}
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      <button
        onClick={onRun}
        disabled={runDisabled}
        className={`nodrag flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
          isLocked
            ? "border border-yellow-400/30 bg-yellow-400/20 text-yellow-500 opacity-50"
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

      <div ref={menuRef} className="relative nodrag" style={{ overflow: "visible" }}>
        <button
          className="nodrag inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-[#F5F5F5] text-gray-500 hover:bg-gray-100"
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <Ellipsis className="h-4 w-4" aria-hidden="true" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-[9999] mt-1.5 w-52 overflow-hidden rounded-2xl border border-gray-200 bg-white py-1 shadow-2xl">
            <button
              className="flex w-full items-center gap-3 px-4 py-2.5 text-[14px] text-gray-800 transition-colors hover:bg-gray-50"
              onClick={() => {
                onDuplicate();
                setMenuOpen(false);
              }}
            >
              <Copy className="h-4 w-4 text-gray-500" />
              Duplicate
            </button>

            <button
              className="flex w-full items-center gap-3 px-4 py-2.5 text-[14px] text-gray-800 transition-colors hover:bg-gray-50"
              onClick={() => {
                onDuplicateWithEdges();
                setMenuOpen(false);
              }}
            >
              <GitFork className="h-4 w-4 text-gray-500" />
              Duplicate with Edges
            </button>

            <div className="mx-3 my-1 border-t border-gray-100" />

            <button
              className="flex w-full items-center gap-3 px-4 py-2.5 text-[14px] text-gray-800 transition-colors hover:bg-gray-50"
              onClick={() => {
                onLockToggle();
                setMenuOpen(false);
              }}
            >
              {isLocked ? (
                <Unlock className="h-4 w-4 text-gray-500" />
              ) : (
                <Lock className="h-4 w-4 text-gray-500" />
              )}
              {isLocked ? "Unlock" : "Lock"}
            </button>

            <div className="mx-3 my-1 border-t border-gray-100" />

            <button
              className="flex w-full items-center gap-3 px-4 py-2.5 text-[14px] text-red-500 transition-colors hover:bg-red-50"
              onClick={() => {
                onDelete();
                setMenuOpen(false);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
