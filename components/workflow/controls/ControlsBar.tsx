"use client";

/**
 * @fileoverview Floating canvas controls: undo/redo, zoom, fit-view, easing
 * auto-layout (Shift+A), and marquee select-mode toggle (S).
 *
 * Sub-pieces:
 *  - useAutoArrange   — topological layout algorithm (./useAutoArrange)
 *  - ShortcutsModal   — keyboard cheat-sheet modal   (./ShortcutsModal)
 */

import { useState, useEffect } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Undo2,
  Redo2,
  Command,
  ZoomOut,
  ZoomIn,
  Maximize2,
  LayoutGrid,
  Move,
} from "lucide-react";
import { useReactFlow, useViewport } from "@xyflow/react";
import { useWorkflowStore } from "@/store/workflow-store";
import { useAutoArrange } from "./useAutoArrange";
import { ShortcutsModal } from "./ShortcutsModal";

// ─── Small local UI pieces (too small to warrant separate files) ──────────────

/** Visual cue for marquee mode (white framed square) vs default move cursor. */
function SelectModeIcon({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
        <rect x="1.3" y="1.5" width="15" height="15" rx="3" stroke="white" strokeWidth="1.5" fill="none" />
      </svg>
    );
  }
  return <Move className="w-4 h-4" />;
}

/** Lightweight hover tooltip for icon buttons. `side` adjusts placement. */
function Tip({
  label,
  shortcut,
  children,
  side = "top",
}: {
  label: string;
  shortcut?: string;
  children: React.ReactNode;
  side?: "top" | "top-left" | "top-right";
}) {
  const posClass =
    side === "top-left"
      ? "bottom-full left-0 mb-2"
      : side === "top-right"
      ? "bottom-full right-0 mb-2"
      : "bottom-full left-1/2 -translate-x-1/2 mb-2";

  return (
    <div className="relative group/tip">
      {children}
      <div className={`pointer-events-none absolute ${posClass} hidden group-hover/tip:flex z-[200] items-center gap-1.5`}>
        <div className="flex items-center gap-1.5 bg-gray-900 text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
          <span>{label}</span>
          {shortcut && (
            <kbd className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-gray-700 text-[10px] font-medium text-gray-200 border border-gray-600">
              {shortcut}
            </kbd>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ControlsBar ─────────────────────────────────────────────────────────────

/** Canvas HUD reacting to Zoom/Fit/`nextflow:auto-arrange` broadcasts. */
export default function ControlsBar() {
  const [expanded, setExpanded] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const { fitView } = useReactFlow();
  const { zoomIn, zoomOut } = useReactFlow();
  const { zoom } = useViewport();

  const {
    undo, redo,
    undoStack, redoStack,
    selectModeActive, setSelectModeActive,
  } = useWorkflowStore();

  const { autoArrange } = useAutoArrange();

  // Shift+A global shortcut
  useEffect(() => {
    const handler = () => autoArrange();
    window.addEventListener("nextflow:auto-arrange", handler);
    return () => window.removeEventListener("nextflow:auto-arrange", handler);
  }, [autoArrange]);

  const zoomPct = Math.round(zoom * 100);

  if (!expanded) {
    return (
      <>
        <Tip label="Expand controls">
          <div className="flex items-center bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl px-1 py-1 md:px-2 md:py-1.5 shadow-sm">
            <button
              onClick={() => setExpanded(true)}
              className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </Tip>
        {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-0.5 md:gap-1 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl px-1 py-1 md:px-2 md:py-1.5 shadow-sm">

        {/* Collapse */}
        <Tip label="Collapse" side="top-left">
          <button
            onClick={() => setExpanded(false)}
            className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        </Tip>

        <div className="mx-0.5 h-5 w-px bg-gray-200" />

        {/* Undo */}
        <Tip label="Undo" shortcut="⌘Z">
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            className="p-2 rounded-lg transition-colors text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
        </Tip>

        {/* Redo */}
        <Tip label="Redo" shortcut="⌘⇧Z">
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            className="p-2 rounded-lg transition-colors text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </Tip>

        {/* Keyboard shortcuts */}
        <Tip label="Keyboard shortcuts">
          <button
            onClick={() => setShowShortcuts(true)}
            className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Command className="h-3.5 w-3.5" />
          </button>
        </Tip>

        <div className="mx-0.5 h-5 w-px bg-gray-200" />

        {/* Zoom out */}
        <Tip label="Zoom out" shortcut="−">
          <button
            onClick={() => zoomOut({ duration: 200 })}
            className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
        </Tip>

        {/* Zoom % */}
        <span className="min-w-[36px] md:min-w-[44px] text-center text-xs font-medium text-gray-500 tabular-nums select-none">
          {zoomPct}%
        </span>

        {/* Zoom in */}
        <Tip label="Zoom in" shortcut="+">
          <button
            onClick={() => zoomIn({ duration: 200 })}
            className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </Tip>

        <div className="mx-0.5 h-5 w-px bg-gray-200" />

        {/* Fit view */}
        <Tip label="Fit view" shortcut="F">
          <button
            onClick={() => fitView({ padding: 0.1, duration: 400 })}
            className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </Tip>

        {/* Auto-arrange */}
        <Tip label="Auto-arrange" shortcut="⇧A">
          <button
            onClick={autoArrange}
            className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </Tip>

        {/* Select mode */}
        <Tip label={selectModeActive ? "Exit select mode" : "Select mode"} shortcut="S" side="top-right">
          <button
            onClick={() => setSelectModeActive(!selectModeActive)}
            className={`p-2 rounded-lg transition-colors ${
              selectModeActive
                ? "bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
                : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <SelectModeIcon active={selectModeActive} />
          </button>
        </Tip>
      </div>

      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </>
  );
}
