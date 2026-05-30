"use client";

/**
 * @fileoverview Floating canvas controls: undo/redo, zoom, fit-view, easing auto-layout (Shift+A), select-mode marquee toggle (S).
 */

import { useState, useEffect, useCallback, useRef } from "react";
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
  X,
} from "lucide-react";
import { useReactFlow, useViewport } from "@xyflow/react";
import { useWorkflowStore } from "@/store/workflow-store";

// ─── Keyboard Shortcut Modal ─────────────────────────────────────────────────

const SHORTCUTS = [
  {
    section: "General",
    items: [
      { label: "Undo",               keys: ["⌘", "Z"] },
      { label: "Redo",               keys: ["⌘", "Shift", "Z"] },
      { label: "Select all",         keys: ["⌘", "A"] },
      { label: "Deselect all",       keys: ["Esc"] },
      { label: "Pan canvas",         keys: ["Space", "Drag"] },
      { label: "Zoom in",            keys: ["+"] },
      { label: "Zoom out",           keys: ["−"] },
      { label: "Fit view",           keys: ["F"] },
      { label: "Toggle select mode", keys: ["S"] },
      { label: "Auto-arrange",       keys: ["Shift", "A"] },
    ],
  },
  {
    section: "Node Operations",
    items: [
      { label: "Copy",                 keys: ["⌘", "C"] },
      { label: "Paste",                keys: ["⌘", "V"] },
      { label: "Duplicate",            keys: ["⌘", "D"] },
      { label: "Duplicate with Edges", keys: ["⌘", "Shift", "D"] },
      { label: "Delete",               keys: ["Delete"] },
    ],
  },
];

/** Modal cheat-sheet listing editor shortcuts surfaced from the ⌘ icon. */
function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-[500px] max-h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-[16px] font-semibold text-gray-900">Keyboard Shortcuts</h2>
            <p className="text-[13px] text-gray-500 mt-0.5">Quickly navigate and create with these shortcuts.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-4 space-y-5">
          {SHORTCUTS.map((group) => (
            <div key={group.section}>
              <p className="text-[13px] font-semibold text-gray-900 mb-3">{group.section}</p>
              <div className="space-y-0">
                {group.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0"
                  >
                    <span className="text-[13px] text-gray-700">{item.label}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, i) => (
                        <kbd
                          key={i}
                          className="inline-flex items-center justify-center min-w-[32px] h-6 px-2 rounded-md border border-gray-200 bg-gray-50 text-[11px] font-medium text-gray-600"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Select mode icon — inactive: Move icon, active: purple box with inner square ─

/** Cubic ease-out curve used when interpolating nodes during Shift+A arrange. */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

const AUTO_ARRANGE_DURATION_MS = 420;

/** Visual cue for marquee mode (purple framed square vs move cursor). */
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

// ─── Tooltip wrapper — viewport-aware ────────────────────────────────────────

/** Lightweight hover tooltip for icon buttons (`side` adjusts absolute placement classes). */
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

/** Canvas HUD reacting to Zoom/Fit/`nextflow:auto-arrange` broadcasts from other panels when history toggles reshape nodes. */
export default function ControlsBar() {
  const [expanded, setExpanded] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const arrangeGenRef = useRef(0);

  const { zoomIn, zoomOut, fitView, setNodes, getNodes, getEdges } = useReactFlow();
  const { zoom } = useViewport();

  const {
    undo, redo,
    undoStack, redoStack,
    selectModeActive, setSelectModeActive,
  } = useWorkflowStore();

  // ── Auto-arrange ──────────────────────────────────────────────────────────
  /**
   * Topological column layout via longest-path leveling; animates translations with guarded generation counter to abort stale RAF loops.
   */
  const autoArrange = useCallback(() => {
    const ns = getNodes();
    const es = getEdges();
    if (ns.length === 0) return;

    // Build adjacency
    const inDegree = new Map<string, number>(ns.map((n) => [n.id, 0]));
    const outEdges = new Map<string, string[]>(ns.map((n) => [n.id, []]));

    for (const e of es) {
      inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
      outEdges.get(e.source)?.push(e.target);
    }

    // BFS longest-path level assignment (connected nodes only)
    const level = new Map<string, number>(ns.map((n) => [n.id, 0]));
    const queue: string[] = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }
    const remaining = new Map(inDegree);
    while (queue.length > 0) {
      const id = queue.shift()!;
      for (const next of outEdges.get(id) ?? []) {
        const nextLevel = (level.get(id) ?? 0) + 1;
        if (nextLevel > (level.get(next) ?? 0)) level.set(next, nextLevel);
        remaining.set(next, (remaining.get(next) ?? 1) - 1);
        if ((remaining.get(next) ?? 0) === 0) queue.push(next);
      }
    }

    // Unconnected nodes get their own level inserted at level 1,
    // shifting all connected levels ≥ 1 up by 1 to make room.
    const connectedIds = new Set<string>();
    for (const e of es) { connectedIds.add(e.source); connectedIds.add(e.target); }

    const hasOrphans = ns.some((n) => !connectedIds.has(n.id));
    if (hasOrphans) {
      // Shift every connected node that is at level ≥ 1 up by one
      for (const [id, lv] of level) {
        if (connectedIds.has(id) && lv >= 1) level.set(id, lv + 1);
      }
      // Place orphans at the newly freed level 1
      for (const n of ns) {
        if (!connectedIds.has(n.id)) level.set(n.id, 1);
      }
    }

    // Group by level
    const byLevel = new Map<number, string[]>();
    for (const [id, lv] of level) {
      if (!byLevel.has(lv)) byLevel.set(lv, []);
      byLevel.get(lv)!.push(id);
    }

    const H_GAP = 120; // horizontal gap between level columns
    const V_GAP = 40;  // vertical gap between nodes in the same column
    const NODE_W = 380;
    const DEFAULT_H = 200;

    // Pre-compute x position per level (each level column starts at same x for all its nodes)
    // x = sum of (NODE_W + H_GAP) for all previous levels
    // We use a fixed column width so all nodes in a level share the same x
    const levelX = new Map<number, number>();
    const sortedLevels = Array.from(byLevel.keys()).sort((a, b) => a - b);
    let xCursor = 0;
    for (const lv of sortedLevels) {
      levelX.set(lv, xCursor);
      xCursor += NODE_W + H_GAP;
    }

    // For each level, compute per-node y using actual measured heights
    // Stack nodes top-to-bottom, centred around y=0
    const nodePositions = new Map<string, { x: number; y: number }>();

    for (const lv of sortedLevels) {
      const ids = byLevel.get(lv)!;
      const x = levelX.get(lv) ?? 0;

      // Total height of all nodes in this level including gaps
      const heights = ids.map((id) => {
        const nd = ns.find((n) => n.id === id);
        return (nd?.measured?.height ?? nd?.height ?? DEFAULT_H);
      });
      const totalHeight = heights.reduce((s, h) => s + h, 0) + V_GAP * (ids.length - 1);

      // Start y so the column is centred around 0
      let y = -totalHeight / 2;
      for (let i = 0; i < ids.length; i++) {
        nodePositions.set(ids[i], { x, y });
        y += heights[i] + V_GAP;
      }
    }

    const startPositions = new Map(ns.map((n) => [n.id, { x: n.position.x, y: n.position.y }]));
    const endPositions = new Map<string, { x: number; y: number }>();
    for (const n of ns) {
      const target = nodePositions.get(n.id) ?? n.position;
      endPositions.set(n.id, { x: target.x, y: target.y });
    }

    let needsMotion = false;
    for (const n of ns) {
      const a = startPositions.get(n.id)!;
      const b = endPositions.get(n.id)!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      if (dx * dx + dy * dy > 0.5) {
        needsMotion = true;
        break;
      }
    }

    const applyPositions = (ease: number) => {
      const latest = getNodes();
      setNodes(
        latest.map((n) => {
          const from = startPositions.get(n.id) ?? n.position;
          const to = endPositions.get(n.id) ?? from;
          return {
            ...n,
            position: {
              x: from.x + (to.x - from.x) * ease,
              y: from.y + (to.y - from.y) * ease,
            },
          };
        })
      );
    };

    if (!needsMotion) {
      setTimeout(() => fitView({ padding: 0.12, duration: 400 }), 50);
      return;
    }

    arrangeGenRef.current += 1;
    const gen = arrangeGenRef.current;
    const t0 = performance.now();

    const step = (now: number) => {
      if (gen !== arrangeGenRef.current) return;
      const linear = Math.min(1, (now - t0) / AUTO_ARRANGE_DURATION_MS);
      const ease = easeOutCubic(linear);
      applyPositions(ease);
      if (linear < 1) {
        requestAnimationFrame(step);
      } else {
        const latest = getNodes();
        setNodes(
          latest.map((n) => ({
            ...n,
            position: endPositions.get(n.id) ?? n.position,
          }))
        );
        setTimeout(() => fitView({ padding: 0.12, duration: 450 }), 50);
      }
    };
    requestAnimationFrame(step);
  }, [getNodes, getEdges, setNodes, fitView]);

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

        {/* Shortcuts — Command icon */}
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
