"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import type { Edge, Node } from "@xyflow/react";
import Canvas from "@/components/workflow/Canvas";
import {
  acquireWorkflowStoreLease,
  releaseWorkflowStoreLease,
} from "@/lib/chat/workflow-store-lease";
import { useWorkflowStore } from "@/store/workflow-store";

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
    <div
      className={
        className ??
        "h-[min(360px,42vh)] overflow-hidden rounded-xl border border-white/[0.08] bg-[#050505] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      }
    >
      <Canvas readOnly />
    </div>
  );
}
