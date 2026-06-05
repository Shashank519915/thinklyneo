import { useCallback, useRef } from "react";
import { useReactFlow } from "@xyflow/react";

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTO_ARRANGE_DURATION_MS = 420;

const H_GAP = 120;
const V_GAP = 40;
const NODE_W = 380;
const DEFAULT_H = 200;

// ─── Easing ───────────────────────────────────────────────────────────────────

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns an `autoArrange` callback that performs a topological column layout
 * via longest-path leveling, animating node translations with an eased RAF loop.
 * The generation counter prevents stale animation frames from a previous call
 * from interfering with a new one.
 */
export function useAutoArrange() {
  const arrangeGenRef = useRef(0);
  const { fitView, setNodes, getNodes, getEdges } = useReactFlow();

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
      for (const [id, lv] of level) {
        if (connectedIds.has(id) && lv >= 1) level.set(id, lv + 1);
      }
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

    // Pre-compute x position per level
    const levelX = new Map<number, number>();
    const sortedLevels = Array.from(byLevel.keys()).sort((a, b) => a - b);
    let xCursor = 0;
    for (const lv of sortedLevels) {
      levelX.set(lv, xCursor);
      xCursor += NODE_W + H_GAP;
    }

    // For each level, compute per-node y using actual measured heights
    const nodePositions = new Map<string, { x: number; y: number }>();

    for (const lv of sortedLevels) {
      const ids = byLevel.get(lv)!;
      const x = levelX.get(lv) ?? 0;

      const heights = ids.map((id) => {
        const nd = ns.find((n) => n.id === id);
        return (nd?.measured?.height ?? nd?.height ?? DEFAULT_H);
      });
      const totalHeight = heights.reduce((s, h) => s + h, 0) + V_GAP * (ids.length - 1);

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

  return { autoArrange };
}
