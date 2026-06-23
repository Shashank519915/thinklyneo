"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Edge, Node } from "@xyflow/react";
import Canvas from "@/components/workflow/Canvas";
import {
  acquireWorkflowStoreLease,
  releaseWorkflowStoreLease,
} from "@/lib/chat/workflow-store-lease";
import { useWorkflowStore } from "@/store/workflow-store";
import { Maximize2, X } from "lucide-react";

type StoreSnapshot = {
  nodes: Node[];
  edges: Edge[];
  workflowId: string | null;
  workflowName: string;
};

/**
 * Temporarily loads nodes/edges into the global workflow store for read-only Canvas preview.
 * Restores prior store state on unmount so canvas edits and live runs do not leak.
 */
export function WorkflowCanvasPreview({
  nodes,
  edges,
  workflowId,
  workflowName = "Preview",
  className,
}: {
  nodes: Node[];
  edges: Edge[];
  workflowId?: string;
  workflowName?: string;
  className?: string;
}) {
  const leaseOwner = useId();
  const hasLease = useMemo(() => acquireWorkflowStoreLease(leaseOwner), [leaseOwner]);
  const [expanded, setExpanded] = useState(false);

  const setNodes = useWorkflowStore((s) => s.setNodes);
  const setEdges = useWorkflowStore((s) => s.setEdges);
  const setWorkflowId = useWorkflowStore((s) => s.setWorkflowId);
  const setWorkflowName = useWorkflowStore((s) => s.setWorkflowName);
  const setReadOnly = useWorkflowStore((s) => s.setReadOnly);
  const snapshotRef = useRef<StoreSnapshot | null>(null);

  useEffect(() => {
    if (!hasLease) return;
    const state = useWorkflowStore.getState();
    snapshotRef.current = {
      nodes: state.nodes,
      edges: state.edges,
      workflowId: state.workflowId,
      workflowName: state.workflowName,
    };

    setReadOnly(true);
    setNodes(nodes);
    setEdges(edges);
    if (workflowId) setWorkflowId(workflowId);
    setWorkflowName(workflowName);

    return () => {
      const snap = snapshotRef.current;
      if (!snap) return;
      useWorkflowStore.setState({
        nodes: snap.nodes,
        edges: snap.edges,
        workflowId: snap.workflowId,
        workflowName: snap.workflowName,
        readOnly: false,
      });
      releaseWorkflowStoreLease(leaseOwner);
    };
  }, [
    hasLease,
    leaseOwner,
    nodes,
    edges,
    workflowId,
    workflowName,
    setNodes,
    setEdges,
    setWorkflowId,
    setWorkflowName,
    setReadOnly,
  ]);

  if (!hasLease) {
    return (
      <div
        className={
          className ??
          "flex h-[min(200px,32vh)] items-center justify-center rounded-xl border border-white/[0.08] bg-black/40 px-4 text-center text-xs text-zinc-500"
        }
      >
        Blueprint preview unavailable while another workflow view is active.
      </div>
    );
  }

  return (
    <div className="relative group">
      <div
        className={
          className ??
          "h-[min(360px,42vh)] overflow-hidden rounded-xl border border-white/[0.08] bg-[#050505] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
        }
      >
        <Canvas readOnly />
      </div>

      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="absolute bottom-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/60 text-zinc-400 backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 hover:bg-white/5 hover:text-zinc-200 shadow-md"
        title="Expand blueprint preview"
      >
        <Maximize2 className="h-4 w-4" />
      </button>

      {expanded && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-md p-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-white/[0.05] pb-3 mb-6">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">{workflowName}</h3>
              <p className="text-[11px] text-zinc-500 font-mono mt-0.5">Blueprint Canvas Preview</p>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.02] text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden rounded-xl border border-white/[0.08] bg-[#050505] shadow-2xl relative">
            <Canvas readOnly />
          </div>
        </div>
      )}
    </div>
  );
}
