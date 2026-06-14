import type { Edge, Node } from "@xyflow/react";
import type { Blueprint } from "@/lib/chat/types";

const GRID_X = 240;
const GRID_Y = 140;

/** Convert a Blueprint draft into React Flow nodes/edges for read-only Canvas preview. */
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
    position: { x: 80 + GRID_X * (blueprint.nodes.length + 1), y: 200 },
    data: { label: "Output", results: [] },
  };

  const execNodes: Node[] = blueprint.nodes.map((n, i) => ({
    id: n.id,
    type: n.type,
    position: { x: 80 + GRID_X * (i + 1), y: 80 + (i % 2) * GRID_Y },
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

  return { nodes, edges };
}
