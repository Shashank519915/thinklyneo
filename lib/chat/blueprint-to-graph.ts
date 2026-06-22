import type { Edge, Node } from "@xyflow/react";
import type { Blueprint } from "@/lib/chat/types";

const H_GAP = 120;
const V_GAP = 40;
const NODE_W = 380;
const DEFAULT_H = 200;

/** Convert a Blueprint draft into React Flow nodes/edges for read-only Canvas preview, applying topological column layout. */
export function blueprintToFlowGraph(blueprint: Blueprint): { nodes: Node[]; edges: Edge[] } {
  const scaffoldRequest = {
    id: "request-inputs",
    type: "requestInputs",
    position: { x: 80, y: 200 },
    data: {
      label: "Request-Inputs",
      fields: blueprint.requestFields.map((f) => ({
        id: f.id,
        type: f.type,
        label: f.label,
        value: f.type.includes("image") || f.type.includes("video") || f.type.includes("audio")
          ? null
          : "",
      })),
    },
  };

  const scaffoldResponse = {
    id: "response",
    type: "response",
    position: { x: 80, y: 200 },
    data: { label: "Output", results: [] },
  };

  const execNodes: Node[] = blueprint.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: { x: 80, y: 200 },
    data: {
      label: n.label,
      inputs: n.params ?? {},
      output: null,
    },
  }));

  const nodes: Node[] = [scaffoldRequest, ...execNodes, scaffoldResponse];

  const edges: Edge[] = blueprint.edges.map((e, i) => ({
    id: `bp-edge-${i}`,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    type: "animatedEdge",
    animated: true,
  }));

  // Build adjacency
  const inDegree = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  const outEdges = new Map<string, string[]>(nodes.map((n) => [n.id, []]));

  for (const e of edges) {
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    outEdges.get(e.source)?.push(e.target);
  }

  // BFS longest-path level assignment (connected nodes only)
  const level = new Map<string, number>(nodes.map((n) => [n.id, 0]));
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
  // shifting all connected levels >= 1 up by 1 to make room.
  const connectedIds = new Set<string>();
  for (const e of edges) {
    connectedIds.add(e.source);
    connectedIds.add(e.target);
  }

  const hasOrphans = nodes.some((n) => !connectedIds.has(n.id));
  if (hasOrphans) {
    for (const [id, lv] of level) {
      if (connectedIds.has(id) && lv >= 1) level.set(id, lv + 1);
    }
    for (const n of nodes) {
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

  // For each level, compute per-node y using DEFAULT_H
  const nodePositions = new Map<string, { x: number; y: number }>();

  for (const lv of sortedLevels) {
    const ids = byLevel.get(lv)!;
    const x = levelX.get(lv) ?? 0;

    const heights = ids.map((id) => {
      const nd = nodes.find((n) => n.id === id);
      return nd?.height ?? DEFAULT_H;
    });
    const totalHeight = heights.reduce((s, h) => s + h, 0) + V_GAP * (ids.length - 1);

    let y = -totalHeight / 2;
    for (let i = 0; i < ids.length; i++) {
      nodePositions.set(ids[i], { x, y });
      y += heights[i] + V_GAP;
    }
  }

  // Shift to start at top-left (80, 80)
  const minX = Math.min(...Array.from(nodePositions.values()).map((p) => p.x));
  const minY = Math.min(...Array.from(nodePositions.values()).map((p) => p.y));

  const positionedNodes = nodes.map((n) => {
    const pos = nodePositions.get(n.id) ?? { x: 0, y: 0 };
    return {
      ...n,
      position: {
        x: pos.x - minX + 80,
        y: pos.y - minY + 80,
      },
    };
  });

  return { nodes: positionedNodes, edges };
}
