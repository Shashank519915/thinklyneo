/**
 * @fileoverview Canvas graph validation helpers (cycle detection, handle type compatibility).
 * Workflow execution runs server-side via Trigger.dev `workflow-orchestrator` + `useRealtimeRun`.
 */

import { type Node, type Edge } from "@xyflow/react";
import {
  cropImageDefinition,
  openrouterLlmDefinition,
  geminiDefinition,
  gptImage2Definition,
  klingV3Definition,
  mergeVideoDefinition,
  mergeAVDefinition,
  extractAudioDefinition,
  type NodeDefinition,
} from "@shashank519915/shared";

// Map React Flow node type strings to shared definitions
export const DEFINITIONS: Record<string, NodeDefinition> = {
  cropImage: cropImageDefinition,
  gemini: geminiDefinition,
  openRouter: openrouterLlmDefinition,
  gptImage2: gptImage2Definition,
  klingV3: klingV3Definition,
  mergeVideo: mergeVideoDefinition,
  mergeAV: mergeAVDefinition,
  extractAudio: extractAudioDefinition,
};

export function getTargetParamType(
  nodeType: string | undefined,
  handleId: string | null | undefined
): string | undefined {
  if (!nodeType || !handleId || !handleId.startsWith("in:")) return undefined;
  const def = DEFINITIONS[nodeType];
  if (def) {
    const paramKey = handleId.slice(3); // strip "in:"
    const param = def.inputs.find((p: any) => p.key === paramKey);
    return param?.type;
  }
  return undefined;
}


/**
 * DFS cycle detection treating the workflow graph as directed from source → target.
 *
 * @param newEdge — When provided, probes whether adding this edge introduces a cycle.
 */
export function hasCycle(
  nodes: Node[],
  edges: Edge[],
  newEdge?: { source: string; target: string }
): boolean {
  const allEdges = newEdge ? [...edges, newEdge] : edges;
  const adjacency = new Map<string, string[]>();

  for (const n of nodes) {
    adjacency.set(n.id, []);
  }
  for (const e of allEdges) {
    const arr = adjacency.get(e.source) ?? [];
    arr.push(e.target);
    adjacency.set(e.source, arr);
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    if (inStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    visited.add(nodeId);
    inStack.add(nodeId);
    for (const neighbor of adjacency.get(nodeId) ?? []) {
      if (dfs(neighbor)) return true;
    }
    inStack.delete(nodeId);
    return false;
  }

  for (const n of nodes) {
    if (!visited.has(n.id)) {
      if (dfs(n.id)) return true;
    }
  }
  return false;
}

/** Public hook for canvas `onConnect` — rejects cyclic graphs before committing an edge. */
export function validateNewEdge(
  nodes: Node[],
  edges: Edge[],
  newEdge: { source: string; target: string }
): { valid: boolean; error?: string } {
  if (hasCycle(nodes, edges, newEdge)) {
    return { valid: false, error: "This connection would create a cycle." };
  }
  return { valid: true };
}

function getHandleDataType(
  handleId: string | null | undefined,
  nodeType: string | undefined
): string {
  if (!handleId) return "generic";

  if (handleId === "result") return "response";

  if (handleId.startsWith("field_")) {
    if (handleId.includes("image")) return "image";
    if (handleId.includes("video")) return "video";
    if (handleId.includes("audio")) return "audio";
    if (handleId.includes("media")) return "media";
    if (handleId.includes("file")) return "file";
    if (handleId.includes("slider")) return "slider";
    if (handleId.includes("number")) return "number";
    if (handleId.includes("boolean")) return "boolean";
    if (handleId.includes("select")) return "select";
    if (handleId.includes("text")) return "text";
    return "generic";
  }

  // For target handles (in:paramKey), look up the node definition to determine
  // if the parameter is a slider or select — allows strict type-matching.
  if (handleId.startsWith("in:") && nodeType) {
    const def = DEFINITIONS[nodeType];
    if (def) {
      const paramKey = handleId.slice(3); // strip "in:"
      const param = def.inputs.find((p: any) => p.key === paramKey);
      if (param) {
        if (param.type === "slider") return "slider";
        if (param.type === "select") return "select";
      }
    }
  }

  if (
    handleId.includes("Image") ||
    handleId.includes("image") ||
    handleId === "in:inputImage" ||
    handleId === "out:outputImage" ||
    (handleId === "out:result" && nodeType === "gptImage2")
  )
    return "image";
  if (handleId === "in:images" || handleId === "in:image_urls") return "image";
  if (handleId === "in:video_urls") return "video";
  if (handleId === "in:audio_urls") return "audio";
  if (handleId === "in:audio_volume") return "number";
  if (handleId === "in:format") return "text";
  // klingV3 image inputs
  if (handleId === "in:start_image_url" || handleId === "in:end_image_url") return "image";
  // extractAudio / mergeAV specific handles
  if (handleId === "in:videoUrl" || handleId === "in:video_url") return "video";
  if (handleId === "in:audio_url") return "audio";
  if (handleId === "out:outputAudio") return "audio";
  if (handleId === "out:video_url") return "video";
  if (
    handleId === "in:temperature" ||
    handleId === "in:maxTokens" ||
    handleId === "in:topP" ||
    handleId === "in:topK" ||
    handleId === "in:frequencyPenalty" ||
    handleId === "in:presencePenalty" ||
    handleId === "in:repetitionPenalty" ||
    handleId === "in:minP" ||
    handleId === "in:topA" ||
    handleId === "in:seed" ||
    handleId === "in:reasoning" ||
    handleId === "in:response_format"
  )
    return "generic";
  if (handleId === "in:stop") return "text";
  if (handleId.includes("Video") || handleId.includes("video")) return "video";
  if (handleId.includes("Audio") || handleId.includes("audio")) return "audio";
  if (handleId.includes("media") || handleId.includes("Media")) return "media";
  if (handleId.includes("file") || handleId.includes("File") || handleId === "in:file") return "file";
  if (handleId.includes("prompt") || handleId === "in:prompt" || handleId === "in:systemPrompt") return "text";
  if (handleId === "out:response") return "text";
  if (handleId === "in:x" || handleId === "in:y" || handleId === "in:w" || handleId === "in:h")
    return "slider";

  if (nodeType === "cropImage") return "image";
  if (nodeType === "gemini") return "text";
  if (nodeType === "openRouter") return "text";

  return "generic";
}

/**
 * Determines whether dropping an edge between two handles should succeed.
 */
export function isValidConnection(
  sourceHandle: string | null | undefined,
  targetHandle: string | null | undefined,
  sourceNodeType: string | undefined,
  targetNodeType: string | undefined
): boolean {
  // Response node accepts any output type — slots are user-named and type-agnostic.
  if (targetNodeType === "response") return true;

  const sourceType = getHandleDataType(sourceHandle, sourceNodeType);
  const targetType = getHandleDataType(targetHandle, targetNodeType);

  if (sourceType === "generic" || targetType === "generic") return true;
  if (targetType === "response") return true;

  if (
    (targetHandle === "in:images" || targetHandle === "in:image_urls") &&
    sourceType === "image"
  )
    return true;

  if (targetHandle === "in:video_urls" && sourceType === "video") return true;
  if (targetHandle === "in:audio_urls" && sourceType === "audio") return true;

  const isNumeric = (t: string) => t === "number" || t === "slider";
  const isTextual = (t: string) => t === "text" || t === "select";

  if (isNumeric(sourceType) && isNumeric(targetType)) return true;
  if (isTextual(sourceType) && isTextual(targetType)) return true;

  return sourceType === targetType;
}

