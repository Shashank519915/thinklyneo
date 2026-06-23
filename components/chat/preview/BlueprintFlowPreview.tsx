"use client";

import { useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Blueprint } from "@/lib/chat/types";

function blueprintToFlow(blueprint: Blueprint): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = blueprint.nodes.map((n, i) => ({
    id: n.id,
    type: n.type === "requestInputs" ? "default" : n.type === "response" ? "default" : "default",
    position: { x: (i % 4) * 220, y: Math.floor(i / 4) * 120 },
    data: { label: n.label || n.type },
    style: {
      padding: 8,
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.1)",
      background: "#141416",
      color: "#e4e4e7",
      fontSize: 11,
      minWidth: 120,
    },
  }));

  const edges: Edge[] = blueprint.edges.map((e, i) => ({
    id: `e-${i}`,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    animated: true,
    style: { stroke: "rgba(139,92,246,0.5)" },
  }));

  return { nodes, edges };
}

function FlowInner({ blueprint }: { blueprint: Blueprint }) {
  const { nodes, edges } = useMemo(() => blueprintToFlow(blueprint), [blueprint]);

  return (
    <div className="h-full min-h-[200px] w-full rounded-xl border border-white/[0.06] bg-[#08080A]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#333" />
      </ReactFlow>
    </div>
  );
}

export function BlueprintFlowPreview({ blueprint }: { blueprint: Blueprint }) {
  return (
    <ReactFlowProvider>
      <FlowInner blueprint={blueprint} />
    </ReactFlowProvider>
  );
}

export function BlueprintSummary({ blueprint }: { blueprint: Blueprint }) {
  return (
    <div className="space-y-3 text-sm">
      <div>
        <h3 className="font-semibold text-white">{blueprint.title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">{blueprint.summary}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
          {blueprint.nodes.length} nodes
        </span>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
          {blueprint.edges.length} edges
        </span>
        {blueprint.confidence && (
          <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-mono text-purple-300">
            {blueprint.confidence}
          </span>
        )}
      </div>
      {blueprint.openQuestions?.length ? (
        <ul className="space-y-1 text-xs text-zinc-500">
          {blueprint.openQuestions.map((q) => (
            <li key={q}>· {q}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
