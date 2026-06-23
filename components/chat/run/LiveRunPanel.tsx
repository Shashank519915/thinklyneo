"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Edge, Node } from "@xyflow/react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import Canvas from "@/components/workflow/Canvas";
import { buildPlaygroundOutputSections } from "@/lib/playground-output";
import { PlaygroundOutputMedia } from "@/components/playground/PlaygroundOutputMedia";
import {
  acquireWorkflowStoreLease,
  releaseWorkflowStoreLease,
} from "@/lib/chat/workflow-store-lease";
import { useWorkflowStore } from "@/store/workflow-store";

type LiveNodeState = {
  status: string;
  output?: unknown;
  error?: string;
};

type StoreSnapshot = {
  nodes: Node[];
  edges: Edge[];
  workflowId: string | null;
  workflowName: string;
  readOnly: boolean;
};

type LiveRunPanelProps = {
  workflowId: string;
  orchestratorRunId: string;
  chatId?: string;
  onComplete?: (sections: import("@/lib/playground-output").PlaygroundOutputSection[]) => void;
};

function LiveRunSubscriber({
  orchestratorRunId,
  publicAccessToken,
  onNodeStates,
  onComplete,
  onTerminal,
}: {
  orchestratorRunId: string;
  publicAccessToken: string;
  onNodeStates: (states: Record<string, LiveNodeState>) => void;
  onComplete?: () => void;
  onTerminal?: (status: string) => void;
}) {
  const { run } = useRealtimeRun(orchestratorRunId, {
    accessToken: publicAccessToken,
  });

  useEffect(() => {
    const nodeStates = (run?.metadata as Record<string, unknown> | undefined)?.nodeStates;
    if (nodeStates && typeof nodeStates === "object") {
      onNodeStates(nodeStates as Record<string, LiveNodeState>);
    }
  }, [run?.metadata, onNodeStates]);

  useEffect(() => {
    if (run?.status === "COMPLETED" || run?.status === "FAILED") {
      onComplete?.();
      onTerminal?.(run.status === "COMPLETED" ? "success" : "failed");
    }
  }, [run?.status, onComplete, onTerminal]);

  return null;
}

export function LiveRunPanel({
  workflowId,
  orchestratorRunId,
  chatId,
  onComplete,
}: LiveRunPanelProps) {
  const leaseOwner = useId();
  const hasLease = useMemo(() => acquireWorkflowStoreLease(leaseOwner), [leaseOwner]);

  const setNodes = useWorkflowStore((s) => s.setNodes);
  const setEdges = useWorkflowStore((s) => s.setEdges);
  const setWorkflowId = useWorkflowStore((s) => s.setWorkflowId);
  const setWorkflowName = useWorkflowStore((s) => s.setWorkflowName);
  const setReadOnly = useWorkflowStore((s) => s.setReadOnly);
  const setNodeExecuting = useWorkflowStore((s) => s.setNodeExecuting);
  const setNodeOutput = useWorkflowStore((s) => s.setNodeOutput);
  const setNodeError = useWorkflowStore((s) => s.setNodeError);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const setIsRunning = useWorkflowStore((s) => s.setIsRunning);
  const nodes = useWorkflowStore((s) => s.nodes);

  const snapshotRef = useRef<StoreSnapshot | null>(null);
  const [liveStates, setLiveStates] = useState<Record<string, LiveNodeState>>({});
  const [tokenState, setTokenState] = useState<{
    publicAccessToken: string;
    runId: string;
  } | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [terminalStatus, setTerminalStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!hasLease) return;
    const state = useWorkflowStore.getState();
    snapshotRef.current = {
      nodes: state.nodes,
      edges: state.edges,
      workflowId: state.workflowId,
      workflowName: state.workflowName,
      readOnly: state.readOnly,
    };
    setReadOnly(true);

    return () => {
      const snap = snapshotRef.current;
      if (!snap) return;
      useWorkflowStore.setState({
        nodes: snap.nodes,
        edges: snap.edges,
        workflowId: snap.workflowId,
        workflowName: snap.workflowName,
        readOnly: snap.readOnly,
      });
      setIsRunning(false);
      releaseWorkflowStoreLease(leaseOwner);
    };
  }, [hasLease, leaseOwner, setReadOnly, setIsRunning]);

  useEffect(() => {
    if (!hasLease || !workflowId) return;
    let cancelled = false;
    void (async () => {
      const wfRes = await fetch(`/api/workflows/${workflowId}`);
      if (!wfRes.ok) {
        if (!cancelled) setTokenError("Failed to load workflow for live run.");
        return;
      }
      const wfJson = await wfRes.json();
      if (!cancelled && wfJson.data) {
        setWorkflowId(workflowId);
        setNodes(wfJson.data.nodes ?? []);
        setEdges(wfJson.data.edges ?? []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasLease, workflowId, setWorkflowId, setNodes, setEdges]);

  useEffect(() => {
    if (!hasLease) return;
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/chat/run-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orchestratorRunId, workflowId }),
      });
      const json = await res.json();
      if (!cancelled) {
        if (res.ok && json.data?.publicAccessToken) {
          setTokenState({
            publicAccessToken: json.data.publicAccessToken,
            runId: json.data.runId,
          });
          setTokenError(null);
        } else {
          setTokenError(json.error ?? "Could not subscribe to live run stream.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasLease, orchestratorRunId, workflowId]);

  useEffect(() => {
    if (!hasLease) return;
    setIsRunning(true);
    for (const [nodeId, state] of Object.entries(liveStates)) {
      switch (state.status) {
        case "running":
          setNodeExecuting(nodeId, true);
          break;
        case "completed": {
          setNodeExecuting(nodeId, false);
          setNodeOutput(nodeId, state.output);
          updateNodeData(nodeId, { output: state.output, error: null } as Record<string, unknown>);
          break;
        }
        case "failed":
          setNodeExecuting(nodeId, false);
          setNodeError(nodeId, state.error ?? "Failed");
          updateNodeData(nodeId, { error: state.error ?? "Failed" } as Record<string, unknown>);
          break;
        default:
          break;
      }
    }
  }, [
    hasLease,
    liveStates,
    setNodeExecuting,
    setNodeOutput,
    setNodeError,
    updateNodeData,
    setIsRunning,
  ]);

  const outputResult = useMemo(() => {
    const nodeRuns = Object.entries(liveStates).map(([nodeId, st]) => ({
      nodeId,
      status: st.status,
      output: st.output,
      error: st.error,
    }));
    return buildPlaygroundOutputSections(nodes, nodeRuns);
  }, [nodes, liveStates]);

  const sections = outputResult.sections;

  const completedRef = useRef(false);
  useEffect(() => {
    if (completedRef.current) return;

    const stateValues = Object.values(liveStates);
    const hasStates = stateValues.length > 0;
    const allDone = hasStates
      ? stateValues.every((s) => s.status === "completed" || s.status === "failed")
      : Boolean(terminalStatus);
    const hasRunning = stateValues.some((s) => s.status === "running");

    if ((allDone && !hasRunning && tokenState?.runId) || terminalStatus) {
      completedRef.current = true;
      onComplete?.(sections);

      if (chatId) {
        void fetch(`/api/chat/${chatId}/run-complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orchestratorRunId,
            workflowRunId: tokenState?.runId,
            sectionCount: sections.length,
            status: terminalStatus === "FAILED" ? "failed" : "success",
            summary:
              sections.length > 0
                ? `Run completed with ${sections.length} output section(s).`
                : `Run ${orchestratorRunId.slice(0, 8)} completed.`,
          }),
        });
      }
    }
  }, [sections, liveStates, tokenState?.runId, terminalStatus, onComplete, chatId, orchestratorRunId]);

  if (!hasLease) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-100">
        Live run preview unavailable — another workflow view is active. Close canvas previews and retry.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-purple-500/25 bg-gradient-to-br from-purple-500/[0.08] to-transparent p-4 shadow-[0_20px_50px_-24px_rgba(124,58,237,0.45)]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-purple-200/90">
          Live run
        </span>
        <span className="text-[10px] font-mono text-zinc-500">{orchestratorRunId.slice(0, 8)}…</span>
      </div>
      {tokenError && (
        <p className="text-xs text-red-300/90">{tokenError}</p>
      )}
      <div className="h-[min(280px,40vh)] overflow-hidden rounded-xl border border-white/[0.08] bg-[#050505] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <Canvas readOnly />
      </div>
      {tokenState && (
        <LiveRunSubscriber
          orchestratorRunId={orchestratorRunId}
          publicAccessToken={tokenState.publicAccessToken}
          onNodeStates={setLiveStates}
          onTerminal={(status) => setTerminalStatus(status)}
        />
      )}
      {sections.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {sections.map((section) => (
            <div
              key={section.nodeId}
              className="rounded-lg border border-white/[0.06] bg-black/40 p-2"
            >
              <p className="mb-1 text-[10px] font-mono text-zinc-500">{section.label}</p>
              <PlaygroundOutputMedia section={section} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
