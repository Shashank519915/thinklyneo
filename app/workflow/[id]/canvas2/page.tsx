"use client";

/**
 * @fileoverview `/workflow/[id]/canvas2` client page: legacy snapshot of the canvas editor that keeps the
 * original inline run-preview + node drill-down behavior (via RightHistoryPanel2). Reachable only by
 * navigating to `/canvas2` manually; the primary `/canvas` route hosts the modal-based run history UI.
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkflowStore } from "@/store/workflow-store";
import LeftSidebar from "@/components/workflow/LeftSidebar";
import RightHistoryPanel from "@/components/workflow/RightHistoryPanel2";
import Canvas from "@/components/workflow/Canvas";
import { type Node, type Edge } from "@xyflow/react";
import { Download, Upload } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { workflowFilePayloadSchema } from "@/lib/validation";
import { SpinningLogo } from "@/components/SpinningLogo";
import { sumWorkflowEstimateMillions } from "@/lib/node-estimates";
import { resolveActiveRunNodeIds, validateWorkflowInputsSync } from "@shashank519915/shared";
import WorkflowSaveToast, {
  type WorkflowSaveToastPhase,
} from "@/components/workflow/WorkflowSaveToast";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { useAttachLiveRunOnFocus } from "@/lib/use-attach-live-run-on-focus";

export default function WorkflowCanvasPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;

  const {
    setNodes,
    setEdges,
    setWorkflowId,
    setWorkflowName,
    nodes,
    edges,
    isHistoryPanelOpen,
    setIsHistoryPanelOpen,
    isRunning,
    setIsRunning,
    setActiveRunNodeIds,
    setCurrentRunId,
    currentRunId,
    setNodeExecuting,
    setNodeOutput,
    setNodeError,
    clearExecutionState,
    addRunHistory,
    setCurrentRunScope,
    nodeOutputs,
    selectedNodeIds,
    updateNodeData,
    workflowName,
    clearPreviewRun,
    previewRunId,
    previewRunTimestamp,
    clearCanvasNodeData,
  } = useWorkflowStore();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(workflowName);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const saveGenRef = useRef(0);
  const reconciliationTriggeredRef = useRef(false);
  const isRunningRef = useRef(false);

  const [savePhase, setSavePhase] = useState<WorkflowSaveToastPhase>("idle");
  const [saveToastCycle, setSaveToastCycle] = useState(0);

  const [balance, setBalance] = useState<number | null>(null);

  const fetchBalance = useCallback(async () => {
    try {
      const resp = await fetch("/api/credits/balance");
      const data = await resp.json();
      if (data.balance !== undefined) {
        setBalance(data.balance);
      }
    } catch (err) {
      console.error("Failed to fetch balance:", err);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchBalance();
    };
    window.addEventListener("nextflow:refresh-history", handleRefresh);
    return () => window.removeEventListener("nextflow:refresh-history", handleRefresh);
  }, [fetchBalance]);

  const [orchestratorState, setOrchestratorState] = useState<{
    orchestratorRunId: string;
    publicAccessToken: string;
  } | null>(null);
  const orchestratorStateRef = useRef(orchestratorState);
  useEffect(() => {
    orchestratorStateRef.current = orchestratorState;
  }, [orchestratorState]);

  const handleRun = useCallback(
    async (scope: "full" | "single" | "partial", targetIds?: string[]) => {
      if (isRunning || isRunningRef.current) return;
      isRunningRef.current = true;

      clearPreviewRun();
      clearExecutionState();
      clearCanvasNodeData();
      setIsRunning(true);
      setCurrentRunScope(scope);

      const inputValues: Record<string, unknown> = {};
      const requestNode = nodesRef.current.find((n) => n.type === "requestInputs");
      if (requestNode) {
        const fields = (
          requestNode.data as { fields?: Array<{ id: string; value: unknown }> }
        ).fields ?? [];
        for (const f of fields) {
          inputValues[f.id] = f.value;
        }
      }

      let existingOutputs: Record<string, unknown> = {};
      if (scope === "single" || scope === "partial") {
        existingOutputs = useWorkflowStore.getState().nodeOutputs;
      }

      const graphNodes = nodesRef.current.map((n) => ({
        id: n.id,
        type: n.type ?? "",
      }));
      const graphEdges = edgesRef.current.map((e) => ({
        source: e.source,
        target: e.target,
      }));
      setActiveRunNodeIds(
        resolveActiveRunNodeIds(
          graphNodes,
          graphEdges,
          scope,
          targetIds,
          Object.keys(existingOutputs)
        )
      );

      const limitErr = validateWorkflowInputsSync({
        nodes: nodesRef.current.map((n) => ({
          id: n.id,
          type: n.type ?? "",
          data: n.data as Record<string, unknown>,
        })),
        inputValues,
        scope,
        targetNodeIds: targetIds,
      });
      if (limitErr) {
        window.alert(limitErr.message);
        isRunningRef.current = false;
        setActiveRunNodeIds(new Set());
        setIsRunning(false);
        setCurrentRunScope(null);
        return;
      }

      try {
        const resp = await fetch(`/api/workflows/${workflowId}/execute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope, inputValues, nodeIds: targetIds, existingOutputs }),
        });

        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({ error: "Execute failed" }));
          console.error("[NextFlow] Execute API error:", errData.error);
          window.alert(errData.error || "Execute failed");
          isRunningRef.current = false;
          setIsRunning(false);
          setCurrentRunScope(null);
          return;
        }

        const data = await resp.json();
        const { runId, orchestratorRunId, publicAccessToken } = data.data ?? {};

        if (!runId || !orchestratorRunId || !publicAccessToken) {
          console.error("[NextFlow] Missing execute response data:", data);
          isRunningRef.current = false;
          setIsRunning(false);
          setCurrentRunScope(null);
          return;
        }

        setCurrentRunId(runId);
        setOrchestratorState({ orchestratorRunId, publicAccessToken });
        fetchBalance();

        console.log(`[NextFlow] Run ${runId} started. Orchestrator: ${orchestratorRunId}`);
      } catch (err) {
        console.error("[NextFlow] Execute failed:", err);
        isRunningRef.current = false;
        setIsRunning(false);
        setCurrentRunScope(null);
      }
    },
    [isRunning, workflowId, clearPreviewRun, clearExecutionState, clearCanvasNodeData, setIsRunning, setActiveRunNodeIds, setCurrentRunId, setCurrentRunScope, fetchBalance]
  );

  const handleCancelRun = useCallback(async () => {
    if (!isRunning) return;
    try {
      const resp = await fetch(`/api/workflows/${workflowId}/cancel`, {
        method: "POST",
      });
      if (resp.ok) {
        console.log("[NextFlow] Run cancelled successfully.");
        isRunningRef.current = false;
        setIsRunning(false);
        setCurrentRunId(null);
        setCurrentRunScope(null);
        setOrchestratorState(null);
        window.dispatchEvent(new CustomEvent("nextflow:refresh-history"));
      }
    } catch (err) {
      console.error("[NextFlow] Cancel failed:", err);
    }
  }, [isRunning, workflowId, setIsRunning, setCurrentRunId, setCurrentRunScope]);

  const runWorkflow = handleRun;

  const handleNodeStatesUpdate = useCallback(
    (nodeStates: Record<string, { status: string; output?: unknown; error?: string }>) => {
      for (const [nodeId, state] of Object.entries(nodeStates)) {
        switch (state.status) {
          case "running":
            setNodeExecuting(nodeId, true);
            break;
          case "completed": {
            setNodeExecuting(nodeId, false);
            let resolvedOutput: unknown = state.output;
            if (state.output && typeof state.output === "object") {
              const o = state.output as Record<string, unknown>;
              if ("outputUrl" in o) resolvedOutput = o.outputUrl;
              else if ("response" in o) resolvedOutput = o.response;
            }
            setNodeOutput(nodeId, resolvedOutput);
            const node = nodesRef.current.find((n) => n.id === nodeId);
            if (node?.type === "response" && state.output && typeof state.output === "object") {
              const currentResults = (node.data as any).results || [];
              const updatedResults = currentResults.map((r: any) => ({
                ...r,
                value: (state.output as Record<string, unknown>)[r.id] ?? null,
              }));
              updateNodeData(nodeId, { results: updatedResults, error: null } as any);
            } else {
              // Persist the FULL output (object or string) on the node so media outputs
              // (video/audio/image) keep rendering on the canvas after execution state is
              // cleared on run completion — not just single string outputs.
              updateNodeData(nodeId, { output: state.output ?? resolvedOutput ?? null, error: null } as any);
            }
            break;
          }
          case "failed":
            setNodeExecuting(nodeId, false);
            setNodeError(nodeId, state.error ?? "Unknown error");
            updateNodeData(nodeId, { error: state.error ?? "Unknown error" } as any);
            break;
          case "skipped":
            setNodeExecuting(nodeId, false);
            setNodeError(nodeId, state.error ?? "Skipped due to upstream failure");
            updateNodeData(nodeId, { error: state.error ?? "Skipped due to upstream failure" } as any);
            break;
        }
      }
    },
    [setNodeExecuting, setNodeOutput, setNodeError, updateNodeData]
  );

  const handleOrchestratorComplete = useCallback(
    (finalStatus: string, output?: unknown) => {
      const completedRunId = currentRunId;
      isRunningRef.current = false;
      setIsRunning(false);
      setCurrentRunId(null);
      setCurrentRunScope(null);
      setOrchestratorState(null);
      clearExecutionState();

      if (completedRunId && finalStatus === "failed") {
        fetch(`/api/workflows/${workflowId}/runs/${completedRunId}/reconcile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ finalStatus: "failed" }),
        })
          .then(() => {
            window.dispatchEvent(new CustomEvent("nextflow:refresh-history"));
          })
          .catch((err) => console.error("[NextFlow] Reconcile failed:", err));
      }

      requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent("nextflow:auto-arrange"));
        window.dispatchEvent(new CustomEvent("nextflow:refresh-history"));
      });
    },
    [workflowId, currentRunId, setIsRunning, setCurrentRunId, setCurrentRunScope, clearExecutionState]
  );

  const restoreLiveRun = useCallback(async (options?: { force?: boolean }) => {
    try {
      const historyResp = await fetch(`/api/workflows/${workflowId}/history`);
      const historyData = await historyResp.json();
      const runsList: Array<{
        id: string;
        scope: string;
        status: string;
        orchestratorRunId: string | null;
        startedAt: string;
        nodeRuns: Array<{
          nodeId: string;
          nodeName: string;
          status: string;
          output: unknown;
          error?: string | null;
         }>;
      }> = historyData.data ?? [];

      const runningRun = runsList.find((r) => r.status === "running");
      if (!runningRun) return;

      if (
        !options?.force &&
        runningRun.orchestratorRunId &&
        orchestratorStateRef.current?.orchestratorRunId === runningRun.orchestratorRunId
      ) {
        return;
      }

      if (!runningRun.orchestratorRunId) {
        console.log(`[NextFlow] Run ${runningRun.id} has no orchestrator — finalizing.`);
        try {
          await fetch(`/api/workflows/${workflowId}/node-runs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              runId: runningRun.id,
              nodeRuns: [],
              finalStatus: "partial",
            }),
          });
        } catch {}
        window.dispatchEvent(new CustomEvent("nextflow:refresh-history"));
        return;
      }

      console.log(
        `[NextFlow] Active run found: ${runningRun.id}. Restoring SSE to orchestrator ${runningRun.orchestratorRunId}...`
      );

      for (const nr of runningRun.nodeRuns) {
        if (nr.status === "success" && nr.output !== null && nr.output !== undefined) {
          let resolvedOutput: unknown = nr.output;
          if (nr.output && typeof nr.output === "object") {
            const o = nr.output as Record<string, unknown>;
            if ("outputUrl" in o) resolvedOutput = o.outputUrl;
            else if ("response" in o) resolvedOutput = o.response;
          }
          setNodeOutput(nr.nodeId, resolvedOutput);
          // Persist full output (object or string) so media nodes re-render on reload.
          updateNodeData(nr.nodeId, { output: nr.output } as any);
        } else if (nr.status === "failed") {
          setNodeError(nr.nodeId, nr.error ?? "Failed");
          updateNodeData(nr.nodeId, { error: nr.error ?? "Failed" } as any);
        } else if (nr.status === "skipped") {
          setNodeError(nr.nodeId, nr.error ?? "Skipped due to upstream failure");
          updateNodeData(nr.nodeId, { error: nr.error ?? "Skipped due to upstream failure" } as any);
        } else if (nr.status === "running") {
          setNodeExecuting(nr.nodeId, true);
        }
      }

      const tokenResp = await fetch(`/api/workflows/${workflowId}/node-runs/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orchestratorRunId: runningRun.orchestratorRunId,
        }),
      });

      if (!tokenResp.ok) {
        console.warn("[NextFlow] Failed to mint orchestrator token — run may have ended.");
        window.dispatchEvent(new CustomEvent("nextflow:refresh-history"));
        return;
      }

      const tokenData = await tokenResp.json();
      const { publicAccessToken } = tokenData.data ?? {};

      if (!publicAccessToken) {
        console.warn("[NextFlow] No token returned for orchestrator.");
        return;
      }

      // Rebuild the in-scope node set so restored runs highlight (not blur) the
      // nodes that belong to this run. Without this, isRunning is true while
      // activeRunNodeIds is empty, so every node is dimmed on refresh.
      const scope = runningRun.scope as "full" | "partial" | "single";
      const graphNodes = nodesRef.current.map((n) => ({ id: n.id, type: n.type ?? "" }));
      const graphEdges = edgesRef.current.map((e) => ({ source: e.source, target: e.target }));
      if (scope === "full") {
        setActiveRunNodeIds(resolveActiveRunNodeIds(graphNodes, graphEdges, "full"));
      } else {
        // Recorded node runs are exactly the scoped set chosen at run start.
        const recordedIds = runningRun.nodeRuns.map((nr) => nr.nodeId);
        setActiveRunNodeIds(
          recordedIds.length
            ? resolveActiveRunNodeIds(graphNodes, graphEdges, scope, recordedIds)
            : resolveActiveRunNodeIds(graphNodes, graphEdges, "full")
        );
      }

      isRunningRef.current = true;
      setIsRunning(true);
      setCurrentRunId(runningRun.id);
      setCurrentRunScope(scope);
      setOrchestratorState({
        orchestratorRunId: runningRun.orchestratorRunId,
        publicAccessToken,
      });

      console.log(`[NextFlow] SSE restored to orchestrator ${runningRun.orchestratorRunId}`);
    } catch (err) {
      console.error("[NextFlow] SSE restore failed:", err);
    }
  }, [
    workflowId,
    setIsRunning,
    setCurrentRunId,
    setCurrentRunScope,
    setActiveRunNodeIds,
    setNodeOutput,
    setNodeError,
    setNodeExecuting,
    updateNodeData,
  ]);

  useEffect(() => {
    if (loading && !reconciliationTriggeredRef.current) {
      reconciliationTriggeredRef.current = true;
      restoreLiveRun();
    }
  }, [loading, restoreLiveRun]);

  useAttachLiveRunOnFocus(() => restoreLiveRun(), !!orchestratorState);

  useEffect(() => {
    if (savePhase !== "saved") return;
    const t = setTimeout(() => setSavePhase("idle"), 2000);
    return () => clearTimeout(t);
  }, [savePhase]);

  const viewingPillActive = isRunning || !!previewRunId;
  type ViewingPillPhase = "hidden" | "visible" | "leaving";
  const [viewingPillPhase, setViewingPillPhase] =
    useState<ViewingPillPhase>("hidden");

  useEffect(() => {
    if (viewingPillActive) {
      setViewingPillPhase("visible");
      return;
    }
    setViewingPillPhase((prev) => (prev === "hidden" ? "hidden" : "leaving"));
  }, [viewingPillActive]);

  useEffect(() => {
    if (viewingPillPhase === "leaving") {
      const t = window.setTimeout(() => setViewingPillPhase("hidden"), 200);
      return () => clearTimeout(t);
    }
  }, [viewingPillPhase]);

  const viewingPillDisplayRef = useRef({
    isRunning: false,
    currentRunId: null as string | null,
    previewRunId: null as string | null,
    previewRunTimestamp: null as string | null,
  });

  useEffect(() => {
    if (viewingPillPhase === "visible") {
      viewingPillDisplayRef.current = {
        isRunning,
        currentRunId,
        previewRunId,
        previewRunTimestamp,
      };
    }
  }, [viewingPillPhase, isRunning, currentRunId, previewRunId, previewRunTimestamp]);

  const canPersistWorkflowGraph = useCallback((n: typeof nodes) => {
    if (n.length < 2) return false;
    let hasRequest = false;
    let hasResponse = false;
    for (const node of n) {
      if (node.type === "requestInputs") hasRequest = true;
      if (node.type === "response") hasResponse = true;
    }
    return hasRequest && hasResponse;
  }, []);

  const estimateWorkflowCostDisplay = (): string => {
    const sum = sumWorkflowEstimateMillions(nodes);
    if (sum === 0) return "0.00";
    return sum.toFixed(2);
  };

  useEffect(() => { setEditNameValue(workflowName); }, [workflowName]);
  useEffect(() => { if (isEditingName) nameInputRef.current?.focus(); }, [isEditingName]);

  const handleNameSave = async () => {
    const trimmed = editNameValue.trim();
    setIsEditingName(false);
    if (!trimmed || trimmed === workflowName) { setEditNameValue(workflowName); return; }
    setWorkflowName(trimmed);
    const myId = ++saveGenRef.current;
    setSavePhase("saving");
    setSaveToastCycle((c) => c + 1);
    try {
      const resp = await fetch(`/api/workflows/${workflowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (myId !== saveGenRef.current) return;
      if (resp.ok) setSavePhase("saved");
      else setSavePhase("idle");
    } catch {
      if (myId !== saveGenRef.current) return;
      setSavePhase("idle");
    }
  };

  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  useEffect(() => {
    let cancelled = false;

    clearPreviewRun();
    setLoading(true);
    setNodes([]);
    setEdges([]);
    const fetchWorkflow = async () => {
      try {
        const resp = await fetch(`/api/workflows/${workflowId}`);
        const data = await resp.json();
        if (!data.data || cancelled) return;

        const wf = data.data;
        setWorkflowId(workflowId);
        setWorkflowName(wf.name);

        const rawNodes = wf.nodes as Node[];
        if (!Array.isArray(rawNodes)) {
          console.error("workflow.nodes is not an array:", workflowId);
          return;
        }

        const cleanNodes = rawNodes.map((node) => {
          const d = node.data as Record<string, unknown>;
          const cleaned: Record<string, unknown> = { ...d };
          if ("output" in cleaned) {
            cleaned.output = null;
          }
          cleaned.error = null;
          if (cleaned.inputs && typeof cleaned.inputs === "object") {
            const inputs = cleaned.inputs as Record<string, unknown>;
            const cleanedInputs = { ...inputs };
            if ("images" in cleanedInputs) cleanedInputs.images = [];
            if ("inputImage" in cleanedInputs && node.type === "cropImage") {
              cleanedInputs.inputImage = null;
            }
            cleaned.inputs = cleanedInputs;
          }
          if (node.type === "response" && Array.isArray(cleaned.results)) {
            cleaned.results = (cleaned.results as Array<Record<string, unknown>>).map((r) => ({
              ...r,
              value: null,
            }));
          }
          return { ...node, data: cleaned };
        });

        if (cancelled) return;
        setNodes(cleanNodes);
        setEdges(Array.isArray(wf.edges) ? (wf.edges as Edge[]) : []);
        clearPreviewRun();
      } catch (err) {
        console.error("Failed to load workflow:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchWorkflow();
    return () => {
      cancelled = true;
    };
  }, [workflowId, setWorkflowId, setWorkflowName, setNodes, setEdges, clearPreviewRun, canPersistWorkflowGraph]);

  useEffect(() => {
    if (loading) return;
    if (!canPersistWorkflowGraph(nodes)) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      if (!canPersistWorkflowGraph(nodesRef.current)) return;
      const myId = ++saveGenRef.current;
      setSavePhase("saving");
      setSaveToastCycle((c) => c + 1);
      try {
        const resp = await fetch(`/api/workflows/${workflowId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nodes: nodesRef.current,
            edges: edgesRef.current,
          }),
        });
        if (myId !== saveGenRef.current) return;
        if (resp.ok) setSavePhase("saved");
        else setSavePhase("idle");
      } catch {
        if (myId !== saveGenRef.current) return;
        setSavePhase("idle");
      }
    }, 1000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [nodes, edges, loading, workflowId, canPersistWorkflowGraph]);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ nodeId: string }>;
      const nodeId = customEvent.detail.nodeId;
      if (nodeId) {
        runWorkflow("single", [nodeId]);
      }
    };
    window.addEventListener("nextflow:run-node", handler);
    return () => window.removeEventListener("nextflow:run-node", handler);
  }, [runWorkflow]);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ nodeIds: string[] }>;
      const nodeIds = customEvent.detail.nodeIds;
      if (nodeIds?.length === 1) {
        runWorkflow("single", nodeIds);
      } else if (nodeIds?.length > 1) {
        runWorkflow("partial", nodeIds);
      }
    };
    window.addEventListener("nextflow:run-selected", handler);
    return () => window.removeEventListener("nextflow:run-selected", handler);
  }, [runWorkflow]);

  const handleExportWorkflow = useCallback(async () => {
    if (loading) return;
    try {
      const resp = await fetch(`/api/workflows/${workflowId}/export`);
      const data = await resp.json();
      if (!resp.ok) {
        window.alert(typeof data.error === "string" ? data.error : "Export failed");
        return;
      }
      const check = workflowFilePayloadSchema.safeParse(data);
      if (!check.success) {
        window.alert("Export data was not in the expected format.");
        return;
      }
      const { downloadJson } = await import("@/lib/utils");
      const safeName = (workflowName || "workflow").replace(/\s+/g, "-").toLowerCase();
      downloadJson(check.data, `${safeName}.json`);
    } catch {
      window.alert("Export failed");
    }
  }, [workflowId, workflowName, loading]);

  const handleImportWorkflow = useCallback(() => {
    if (loading) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      input.value = "";
      if (!file) return;
      try {
        const text = await file.text();
        const resp = await fetch("/api/workflows/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ json: text }),
        });
        const data = await resp.json();
        if (!resp.ok) {
          const err = typeof data.error === "string" ? data.error : "Import failed";
          const issues = Array.isArray(data.issues)
            ? data.issues
              .map((item: { path?: unknown; message?: string }) => {
                const p = Array.isArray(item.path)
                  ? (item.path as (string | number)[]).filter((x) => x !== "").join(".")
                  : "";
                return p ? `${p}: ${item.message ?? ""}` : (item.message ?? "");
              })
              .filter(Boolean)
              .join("\n")
            : "";
          window.alert(issues ? `${err}\n\n${issues}` : err);
          return;
        }
        if (data.data?.id) {
          router.push(`/workflow/${data.data.id}/canvas2`);
        } else {
          window.alert("Import completed but the server did not return a workflow id.");
        }
      } catch {
        window.alert("Import failed");
      }
    };
    input.click();
  }, [loading, router]);

  const importExportButtons = (
    <>
      <div className="group relative">
        <button
          type="button"
          onClick={handleExportWorkflow}
          disabled={loading}
          className="flex h-8 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm transition-all hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Export workflow"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
        </button>
        <span className="pointer-events-none absolute right-0 top-full z-50 mt-2 hidden whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[11px] font-medium text-white shadow-md group-hover:block">
          Export workflow
        </span>
      </div>
      <div className="group relative">
        <button
          type="button"
          onClick={handleImportWorkflow}
          disabled={loading}
          className="flex h-8 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm transition-all hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Import workflow"
        >
          <Upload className="h-3.5 w-3.5" aria-hidden />
        </button>
        <span className="pointer-events-none absolute right-0 top-full z-50 mt-2 hidden whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[11px] font-medium text-white shadow-md group-hover:block">
          Import workflow
        </span>
      </div>
    </>
  );

  const viewingPillVisual =
    viewingPillPhase === "leaving"
      ? viewingPillDisplayRef.current
      : {
          isRunning,
          currentRunId,
          previewRunId,
          previewRunTimestamp,
        };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F5F5]">
      <WorkflowSaveToast
        phase={savePhase}
        enterCycle={saveToastCycle}
        onLeaveComplete={() => setSavePhase("idle")}
      />

      {/* Left Sidebar */}
      <LeftSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Canvas area */}
      <div className="flex flex-1 min-w-0 overflow-hidden relative">
        <div className="flex flex-col flex-1 min-w-0 relative overflow-hidden h-full">
          {loading ? (
            <div className="flex flex-1 min-h-0 items-center justify-center bg-[#F5F5F5]">
              <div className="flex flex-col items-center gap-3">
                <SpinningLogo size="md" />
                <p className="text-[13px] text-gray-500">Loading workflow...</p>
              </div>
            </div>
          ) : (
            <div className="workflow-page-canvas-enter flex flex-1 min-h-0 flex-col relative overflow-hidden">
              <Canvas />

              {/* Floating top-left panel */}
              <div className="pointer-events-none absolute left-4 top-[11px] z-50">
                <div className="pointer-events-auto flex flex-col gap-2">
                  <div className="inline-flex items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white/85 px-2 py-1.5 shadow-md backdrop-blur">
                      <button
                        onClick={() => router.push(`/workflow/${workflowId}`)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 transition-colors flex-shrink-0"
                        title="Back to Workflow Details"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                      </button>
                      <input
                        ref={nameInputRef}
                        placeholder="Untitled"
                        maxLength={120}
                        value={isEditingName ? editNameValue : workflowName}
                        onChange={(e) => setEditNameValue(e.target.value)}
                        onFocus={() => { setIsEditingName(true); setEditNameValue(workflowName); }}
                        onBlur={handleNameSave}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleNameSave();
                          if (e.key === "Escape") { setEditNameValue(workflowName); setIsEditingName(false); }
                        }}
                        className="h-8 w-[120px] sm:w-[160px] bg-transparent text-[14px] font-normal text-gray-900 outline-none placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating top-right */}
              <div className="absolute top-[11px] right-4 z-10 flex items-start gap-2 pointer-events-auto">
                <div className="flex items-center gap-2">
                  {viewingPillPhase !== "hidden" && (
                    <span className={cn("inline-flex max-w-[min(100vw-8rem,18rem)] sm:max-w-none", viewingPillPhase === "leaving" ? "wf-viewing-pill--leave" : "wf-viewing-pill--enter")}>
                      {viewingPillVisual.isRunning ? (
                        <button
                          type="button"
                          title="Click to reconnect to live run stream"
                          onClick={() => restoreLiveRun({ force: true })}
                          className="inline-flex h-7 max-w-full min-w-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white/90 px-2.5 text-[11px] font-medium text-gray-800 shadow-sm backdrop-blur cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                        >
                          <span className="h-2 w-2 shrink-0 rounded-full bg-[#6366f1] animate-pulse" aria-hidden />
                          <span className="shrink-0">Viewing live run</span>
                          <span className="font-mono text-[10px] text-gray-500 truncate tabular-nums">
                            {viewingPillVisual.currentRunId
                              ? viewingPillVisual.currentRunId.length > 14
                                ? `${viewingPillVisual.currentRunId.slice(0, 8)}…`
                                : viewingPillVisual.currentRunId
                              : "…"}
                          </span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-indigo-400" aria-hidden><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                        </button>
                      ) : (
                        <span className="inline-flex h-7 max-w-full min-w-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white/90 px-2.5 text-[11px] font-medium text-gray-800 shadow-sm backdrop-blur">
                          <span className="shrink-0">Viewing run</span>
                          <span className="font-mono text-[10px] text-gray-500 truncate tabular-nums">
                            {viewingPillVisual.previewRunId && viewingPillVisual.previewRunId.length > 14
                              ? `${viewingPillVisual.previewRunId.slice(0, 8)}…`
                              : viewingPillVisual.previewRunId}
                          </span>
                          {viewingPillVisual.previewRunTimestamp && (
                            <span className="hidden sm:inline shrink-0 text-gray-400 font-normal">
                              · {formatRelativeTime(viewingPillVisual.previewRunTimestamp)}
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                  )}
                  <span className="hidden sm:inline-flex">
                    <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-gray-200 bg-white/90 px-2.5 text-[11px] font-medium text-gray-700 shadow-sm backdrop-blur">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="h-3.5 w-3.5" aria-hidden="true"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>
                      <span className="text-gray-500">Est</span>
                      <span className="tabular-nums">~{estimateWorkflowCostDisplay()}</span>
                      <span className="text-gray-500">M</span>
                    </span>
                  </span>

                  <span className="hidden sm:inline-flex">
                    <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-gray-200 bg-white/90 px-2.5 text-[11px] font-medium text-gray-700 shadow-sm backdrop-blur">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="h-3.5 w-3.5" aria-hidden="true"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>
                      <span className="text-gray-500">Bal</span>
                      <span className="tabular-nums">{balance !== null ? (balance / 1000000).toFixed(2) : "0.00"}</span>
                      <span className="text-gray-500">M</span>
                    </span>
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1">
                    <div className="group relative">
                      <button
                        type="button"
                        onClick={() => !isRunning && runWorkflow("full")}
                        disabled={isRunning}
                        className={`flex h-8 w-9 items-center justify-center rounded-lg border shadow-sm transition-all ${
                          isRunning 
                            ? "border-[#818cf8] bg-[#818cf8] text-white/90 cursor-not-allowed" 
                            : "border-[#6366f1] bg-[#6366f1] text-white hover:bg-[#4f46e5] hover:border-[#4f46e5]"
                        }`}
                      >
                        {isRunning ? (
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" stroke-linecap="round" stroke-linejoin="round" className="h-3.5 w-3.5" aria-hidden="true"><polygon points="6 3 20 12 6 21 6 3"/></svg>
                        )}
                      </button>
                      <span className="pointer-events-none absolute right-0 top-full z-50 mt-2 hidden whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[11px] font-medium text-white shadow-md group-hover:block">
                        {isRunning ? "Running..." : "Run Workflow"}
                      </span>
                    </div>

                    {isRunning && (
                      <div className="group relative animate-in fade-in slide-in-from-right-2 duration-300">
                        <button
                          type="button"
                          onClick={handleCancelRun}
                          className="flex h-8 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 shadow-sm transition-all hover:bg-red-100"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="h-4 w-4"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                        </button>
                        <span className="pointer-events-none absolute right-0 top-full z-50 mt-2 hidden whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[11px] font-medium text-white shadow-md group-hover:block">
                          Cancel Run
                        </span>
                      </div>
                    )}
                  </div>
                  {isHistoryPanelOpen ? importExportButtons : null}
                </div>

                {!isHistoryPanelOpen && (
                  <div className="flex flex-col items-center gap-1">
                    <div className="group relative">
                      <button
                        type="button"
                        onClick={() => setIsHistoryPanelOpen(true)}
                        className="flex h-8 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm transition-all hover:bg-gray-100"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="h-3.5 w-3.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      </button>
                      <span className="pointer-events-none absolute right-0 top-full z-50 mt-2 hidden whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[11px] font-medium text-white shadow-md group-hover:block">
                        Execution History
                      </span>
                    </div>
                    {importExportButtons}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {isHistoryPanelOpen && (
          <RightHistoryPanel workflowId={workflowId} />
        )}
      </div>

      {orchestratorState && (
        <OrchestratorSubscriber
          orchestratorRunId={orchestratorState.orchestratorRunId}
          publicAccessToken={orchestratorState.publicAccessToken}
          onNodeStatesUpdate={handleNodeStatesUpdate}
          onComplete={handleOrchestratorComplete}
        />
      )}
    </div>
  );
}

interface OrchestratorSubscriberProps {
  orchestratorRunId: string;
  publicAccessToken: string;
  onNodeStatesUpdate: (
    nodeStates: Record<string, { status: string; output?: unknown; error?: string }>
  ) => void;
  onComplete: (finalStatus: string, output?: unknown) => void;
}

function OrchestratorSubscriber({
  orchestratorRunId,
  publicAccessToken,
  onNodeStatesUpdate,
  onComplete,
}: OrchestratorSubscriberProps) {
  const { run, error } = useRealtimeRun(orchestratorRunId, {
    accessToken: publicAccessToken,
  });

  const firedCompleteRef = useRef(false);
  const prevNodeStatesRef = useRef<string>("");

  useEffect(() => {
    if (!run?.metadata) return;
    const nodeStates = (run.metadata as Record<string, unknown>)["nodeStates"];
    if (!nodeStates || typeof nodeStates !== "object") return;

    const statesJson = JSON.stringify(nodeStates);
    if (statesJson === prevNodeStatesRef.current) return;
    prevNodeStatesRef.current = statesJson;

    onNodeStatesUpdate(
      nodeStates as Record<string, { status: string; output?: unknown; error?: string }>
    );
  }, [run?.metadata, onNodeStatesUpdate]);

  useEffect(() => {
    if (error && !firedCompleteRef.current) {
      console.error("[OrchestratorSubscriber] SSE error:", error);
    }
  }, [error]);

  useEffect(() => {
    if (!run || firedCompleteRef.current) return;

    const ACTIVE_STATUSES = new Set([
      "PENDING_VERSION", "QUEUED", "DEQUEUED", "EXECUTING", "WAITING", "DELAYED",
    ]);

    if (run.status === "COMPLETED") {
      firedCompleteRef.current = true;
      const finalStatus =
        ((run.metadata as Record<string, unknown>)?.["finalStatus"] as string) ?? "success";
      onComplete(finalStatus, run.output);
    } else if (!ACTIVE_STATUSES.has(run.status)) {
      firedCompleteRef.current = true;
      const metaStatus = ((run.metadata as Record<string, unknown>)?.["finalStatus"] as string);
      onComplete(metaStatus || "failed", run.output);
    }
  }, [run, onComplete]);

  return null;
}
