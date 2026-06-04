/**
 * Playground output panel: merge history nodeRuns with live orchestrator nodeStates.
 */

import { getRunnableNodeIds, type GraphEdge, type GraphNode } from "@shashank519915/shared";

export interface PlaygroundNodeRunLike {
  nodeId: string;
  nodeName?: string;
  status: string;
  output?: unknown;
  error?: string | null;
  creditCost?: number | null;
}

export interface PlaygroundOutputSection {
  nodeId: string;
  label: string;
  kind: "image" | "video" | "audio" | "text" | "error";
  url?: string;
  text?: string;
  error?: string;
}

export function sumRunCreditsMicro(nodeRuns: PlaygroundNodeRunLike[]): number {
  return nodeRuns.reduce((sum, nr) => sum + (nr.creditCost ?? 0), 0);
}

export function formatCreditsMillions(micro: number): string {
  return `${(micro / 1_000_000).toFixed(2)}M`;
}

export function extractMediaUrl(output: unknown): string | null {
  if (output == null) return null;
  if (typeof output === "string" && /^https?:\/\//i.test(output)) return output;
  if (typeof output !== "object") return null;
  const o = output as Record<string, unknown>;
  const keys = [
    "result",
    "outputUrl",
    "outputVideo",
    "outputAudio",
    "outputImage",
    "croppedImage",
    "mergedVideo",
    "response",
  ];
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && /^https?:\/\//i.test(v)) return v;
  }
  return null;
}

export function classifyOutputUrl(url: string): "image" | "video" | "audio" | "text" {
  if (/\.(jpe?g|png|gif|webp)(\?|$)/i.test(url)) return "image";
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return "video";
  if (/\.(mp3|wav|aac|m4a|ogg)(\?|$)/i.test(url)) return "audio";
  return "text";
}

const SKIP_OUTPUT_TYPES = new Set(["requestInputs", "response"]);

function executableRunnableIds(nodes: GraphNode[], edges: GraphEdge[]): string[] {
  return Array.from(getRunnableNodeIds(nodes, edges)).filter((id) => {
    const t = nodes.find((n) => n.id === id)?.type ?? "";
    return !SKIP_OUTPUT_TYPES.has(t);
  });
}

export function countRunnableNodes(nodes: GraphNode[], edges: GraphEdge[]): number {
  return executableRunnableIds(nodes, edges).length;
}

export function countCompletedFromStates(
  nodes: GraphNode[],
  edges: GraphEdge[],
  nodeStates: Record<string, { status: string }>
): number {
  return executableRunnableIds(nodes, edges).filter(
    (id) => nodeStates[id]?.status === "completed"
  ).length;
}

/** Merge DB nodeRuns with live SSE states (live wins when present). */
export function mergeNodeRunsWithLive(
  nodeRuns: PlaygroundNodeRunLike[],
  liveStates: Record<string, { status: string; output?: unknown; error?: string }> | null
): PlaygroundNodeRunLike[] {
  if (!liveStates || Object.keys(liveStates).length === 0) return nodeRuns;
  const byId = new Map(nodeRuns.map((nr) => [nr.nodeId, { ...nr }]));
  for (const [nodeId, st] of Object.entries(liveStates)) {
    const prev = byId.get(nodeId);
    const status =
      st.status === "completed"
        ? "success"
        : st.status === "failed"
          ? "failed"
          : st.status === "running"
            ? "running"
            : st.status;
    byId.set(nodeId, {
      nodeId,
      nodeName: prev?.nodeName,
      status,
      output: st.output ?? prev?.output,
      error: st.error ?? prev?.error,
      creditCost: prev?.creditCost,
    });
  }
  return Array.from(byId.values());
}

export function buildPlaygroundOutputSections(
  workflowNodes: Array<{ id: string; type?: string; data?: { label?: string } }>,
  nodeRuns: PlaygroundNodeRunLike[],
  opts?: { workflowFailed?: boolean; workflowError?: string | null }
): { sections: PlaygroundOutputSection[]; workflowError?: string } {
  if (opts?.workflowFailed && opts.workflowError) {
    return {
      sections: [],
      workflowError: opts.workflowError,
    };
  }

  const sections: PlaygroundOutputSection[] = [];
  const order = workflowNodes.map((n) => n.id);

  const sorted = [...nodeRuns].sort(
    (a, b) => order.indexOf(a.nodeId) - order.indexOf(b.nodeId)
  );

  for (const nr of sorted) {
    const node = workflowNodes.find((n) => n.id === nr.nodeId);
    const type = node?.type ?? "";
    if (SKIP_OUTPUT_TYPES.has(type)) continue;

    const label =
      (node?.data as { label?: string } | undefined)?.label ??
      nr.nodeName ??
      nr.nodeId;

    if (nr.status === "failed" && nr.error) {
      sections.push({
        nodeId: nr.nodeId,
        label,
        kind: "error",
        error: nr.error,
      });
      continue;
    }

    if (nr.status !== "success" && nr.status !== "completed") continue;

    const url = extractMediaUrl(nr.output);
    if (url) {
      sections.push({
        nodeId: nr.nodeId,
        label,
        kind: classifyOutputUrl(url),
        url,
      });
      continue;
    }

    if (nr.output != null && typeof nr.output === "object") {
      const response = (nr.output as Record<string, unknown>).result;
      if (typeof response === "string" && response.length > 0) {
        sections.push({
          nodeId: nr.nodeId,
          label,
          kind: "text",
          text: response,
        });
      }
    }
  }

  const failed = nodeRuns.find((nr) => nr.status === "failed" && nr.error);
  if (sections.length === 0 && failed?.error) {
    return { sections: [], workflowError: failed.error };
  }

  return { sections };
}

export function resolvePlaygroundRunStatus(
  runStatus: string | undefined,
  isRunning: boolean
): "idle" | "running" | "success" | "failed" {
  if (isRunning) return "running";
  if (runStatus === "success" || runStatus === "completed") return "success";
  if (runStatus === "failed" || runStatus === "error") return "failed";
  return "idle";
}
