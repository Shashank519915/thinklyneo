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

/** Canvas HUD reacting to Zoom/Fit/`thinkly:auto-arrange` broadcasts. */
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
    window.addEventListener("thinkly:auto-arrange", handler);
    return () => window.removeEventListener("thinkly:auto-arrange", handler);
  }, [autoArrange]);

  const zoomPct = Math.round(zoom * 100);

  if (!expanded) {
    return (
      <>
        <Tip label="Expand controls">
          <div className="p-[4px] rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md shadow-[0_20px_40px_-15px_rgba(0,0,0,0.85)]">
            <div className="relative rounded-[calc(1rem-4px)] bg-[#0A0A0C]/90 border border-white/5 px-2 py-1.5 flex items-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-hidden">
              <div className="absolute inset-0 pointer-events-none glass-noise z-0" />
              <button
                onClick={() => setExpanded(true)}
                className="wf-canvas-chrome-btn relative z-10 rounded-lg p-2 text-zinc-400 transition-colors hover:text-zinc-100"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </Tip>
        {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      </>
    );
  }

  return (
    <>
      <div className="p-[4px] rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md shadow-[0_20px_40px_-15px_rgba(0,0,0,0.85)]">
        <div className="relative rounded-[calc(1rem-4px)] bg-[#0A0A0C]/90 border border-white/5 px-2 py-1 md:py-1.5 flex items-center gap-0.5 md:gap-1 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-hidden">
          <div className="absolute inset-0 pointer-events-none glass-noise z-0" />

          {/* Collapse */}
          <Tip label="Collapse" side="top-left">
            <button
              onClick={() => setExpanded(false)}
              className="wf-canvas-chrome-btn relative z-10 rounded-lg p-2 text-zinc-400 transition-colors hover:text-zinc-100"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </Tip>

          <div className="mx-0.5 h-5 w-px bg-white/10 relative z-10" />

          {/* Undo */}
          <Tip label="Undo" shortcut="⌘Z">
            <button
              onClick={undo}
              disabled={undoStack.length === 0}
              className="wf-canvas-chrome-btn relative z-10 rounded-lg p-2 text-zinc-400 transition-colors hover:text-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-700"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
          </Tip>

          {/* Redo */}
          <Tip label="Redo" shortcut="⌘⇧Z">
            <button
              onClick={redo}
              disabled={redoStack.length === 0}
              className="wf-canvas-chrome-btn relative z-10 rounded-lg p-2 text-zinc-400 transition-colors hover:text-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-700"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </Tip>

          {/* Keyboard shortcuts */}
          <Tip label="Keyboard shortcuts">
            <button
              onClick={() => setShowShortcuts(true)}
              className="wf-canvas-chrome-btn relative z-10 rounded-lg p-2 text-zinc-400 transition-colors hover:text-zinc-100"
            >
              <Command className="h-3.5 w-3.5" />
            </button>
          </Tip>

          <div className="mx-0.5 h-5 w-px bg-white/10 relative z-10" />

          {/* Zoom out */}
          <Tip label="Zoom out" shortcut="−">
            <button
              onClick={() => zoomOut({ duration: 200 })}
              className="wf-canvas-chrome-btn relative z-10 rounded-lg p-2 text-zinc-400 transition-colors hover:text-zinc-100"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
          </Tip>

          {/* Zoom % */}
          <span className="min-w-[36px] select-none text-center text-xs font-medium tabular-nums text-zinc-500 md:min-w-[44px] relative z-10">
            {zoomPct}%
          </span>

          {/* Zoom in */}
          <Tip label="Zoom in" shortcut="+">
            <button
              onClick={() => zoomIn({ duration: 200 })}
              className="wf-canvas-chrome-btn relative z-10 rounded-lg p-2 text-zinc-400 transition-colors hover:text-zinc-100"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </Tip>

          <div className="mx-0.5 h-5 w-px bg-white/10 relative z-10" />

          {/* Fit view */}
          <Tip label="Fit view" shortcut="F">
            <button
              onClick={() => fitView({ padding: 0.1, duration: 400 })}
              className="wf-canvas-chrome-btn relative z-10 rounded-lg p-2 text-zinc-400 transition-colors hover:text-zinc-100"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </Tip>

          {/* Auto-arrange */}
          <Tip label="Auto-arrange" shortcut="⇧A">
            <button
              onClick={autoArrange}
              className="wf-canvas-chrome-btn relative z-10 rounded-lg p-2 text-zinc-400 transition-colors hover:text-zinc-100"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </Tip>

          {/* Select mode */}
          <Tip label={selectModeActive ? "Exit select mode" : "Select mode"} shortcut="S" side="top-right">
            <button
              onClick={() => setSelectModeActive(!selectModeActive)}
              className={`p-2 rounded-lg transition-colors relative z-10 ${
                selectModeActive
                  ? "bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
                  : "wf-canvas-chrome-btn text-zinc-400 hover:text-zinc-100"
              }`}
            >
              <SelectModeIcon active={selectModeActive} />
            </button>
          </Tip>
        </div>
      </div>

      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </>
  );
}
