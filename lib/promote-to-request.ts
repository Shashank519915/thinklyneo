/**
 * @fileoverview Promote a node input handle to a Request-Inputs field + edge (frontend-only).
 */

import type { Edge, Node } from "@xyflow/react";
import type { NodeParameter } from "@galaxy/shared";
import { evaluateCanvasConnection } from "@/lib/canvas-connection";
import { generateEdgeId } from "@/lib/utils";
import type { RequestInputsData, WorkflowField } from "@/store/workflow-store";

export function findRequestInputsNode(nodes: Node[]): Node | undefined {
  return nodes.find((n) => n.type === "requestInputs");
}

export function getInboundEdgeForHandle(
  edges: Edge[],
  targetNodeId: string,
  targetHandle: string
): Edge | undefined {
  return edges.find((e) => e.target === targetNodeId && e.targetHandle === targetHandle);
}

/** Inbound edge whose source is the Request-Inputs node. */
export function getInboundRequestEdge(
  nodes: Node[],
  edges: Edge[],
  targetNodeId: string,
  targetHandle: string
): Edge | undefined {
  const edge = getInboundEdgeForHandle(edges, targetNodeId, targetHandle);
  if (!edge) return undefined;
  const source = nodes.find((n) => n.id === edge.source);
  return source?.type === "requestInputs" ? edge : undefined;
}

/** True only for handles promoted via “Add to request” (field has linkedTarget). */
export function isRequestPromoted(
  nodes: Node[],
  edges: Edge[],
  targetNodeId: string,
  targetHandle: string
): boolean {
  const edge = getInboundRequestEdge(nodes, edges, targetNodeId, targetHandle);
  if (!edge) return false;
  return !!findLinkedRequestField(nodes, edge.source, targetNodeId, targetHandle);
}

/** Any inbound edge (Request or upstream node). */
export function isHandleWired(
  edges: Edge[],
  targetNodeId: string,
  targetHandle: string
): boolean {
  return !!getInboundEdgeForHandle(edges, targetNodeId, targetHandle);
}

export function shouldShowAddToRequest(opts: {
  hasHandle: boolean;
  readOnly?: boolean;
  isLocked?: boolean;
  wired: boolean;
}): boolean {
  return !!opts.hasHandle && !opts.readOnly && !opts.isLocked && !opts.wired;
}

export function resolveRequestFieldType(
  paramType: NodeParameter["type"] | undefined,
  handleType: NodeParameter["handle"] extends infer H ? (H extends { type: infer T } ? T : never) : never
): WorkflowField["type"] {
  const ht = handleType as string | undefined;
  if (ht === "image") return "image_field";
  if (ht === "video") return "video_field";
  if (ht === "audio") return "audio_field";
  if (ht === "file") return "file_field";
  if (paramType === "number" || paramType === "slider") return "number_field";
  if (paramType === "select" || paramType === "text" || paramType === "textarea") return "text_field";
  return "text_field";
}

function valueToRequestFieldValue(
  fieldType: WorkflowField["type"],
  currentValue: unknown,
  defaultValue?: unknown
): string | null {
  const raw = currentValue !== undefined && currentValue !== null && currentValue !== ""
    ? currentValue
    : defaultValue;
  if (raw === undefined || raw === null || raw === "") {
    return fieldType === "boolean_field" ? "false" : null;
  }
  if (typeof raw === "boolean") return raw ? "true" : "false";
  if (typeof raw === "number") return String(raw);
  if (Array.isArray(raw)) return raw.filter(Boolean).join(",");
  return String(raw);
}

function fieldIdForType(fieldType: WorkflowField["type"], paramKey: string): string {
  const suffix = paramKey.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 40) || "input";
  const prefix = fieldType.replace("_field", "");
  return `field_${prefix}_${suffix}_${Date.now()}`;
}

export function findLinkedRequestField(
  nodes: Node[],
  requestNodeId: string,
  targetNodeId: string,
  targetHandle: string
): WorkflowField | undefined {
  const req = nodes.find((n) => n.id === requestNodeId);
  if (!req) return undefined;
  const fields = ((req.data as unknown as RequestInputsData).fields ?? []) as WorkflowField[];
  return fields.find(
    (f) =>
      f.linkedTarget?.nodeId === targetNodeId && f.linkedTarget?.handle === targetHandle
  );
}

export interface PromoteInputOptions {
  nodes: Node[];
  edges: Edge[];
  targetNodeId: string;
  targetHandle: string;
  paramKey: string;
  paramLabel: string;
  paramType?: NodeParameter["type"];
  handleType?: string;
  currentValue?: unknown;
  defaultValue?: unknown;
}

export interface PromoteInputResult {
  nodes: Node[];
  edges: Edge[];
  /** Created or reused request field id */
  fieldId: string;
  /** True when promotion already existed */
  alreadyPromoted: boolean;
  error?: string;
}

/**
 * Adds (or reuses) a Request-Inputs field and edge for an unwired target handle.
 * Does nothing when the handle is already wired from a non-Request source.
 */
export function promoteInputToRequest(opts: PromoteInputOptions): PromoteInputResult {
  const {
    nodes,
    edges,
    targetNodeId,
    targetHandle,
    paramKey,
    paramLabel,
    paramType,
    handleType,
    currentValue,
    defaultValue,
  } = opts;

  const inbound = getInboundEdgeForHandle(edges, targetNodeId, targetHandle);
  if (inbound) {
    const source = nodes.find((n) => n.id === inbound.source);
    if (source?.type !== "requestInputs") {
      return {
        nodes,
        edges,
        fieldId: "",
        alreadyPromoted: false,
        error: "Handle is already wired",
      };
    }
    return {
      nodes,
      edges,
      fieldId: inbound.sourceHandle ?? "",
      alreadyPromoted: true,
    };
  }

  const requestNode = findRequestInputsNode(nodes);
  if (!requestNode) {
    return {
      nodes,
      edges,
      fieldId: "",
      alreadyPromoted: false,
      error: "Request-Inputs node not found",
    };
  }

  const fieldType = resolveRequestFieldType(paramType, handleType as never);
  let fieldId = "";
  let nextNodes = nodes;
  let nextEdges = edges;

  const existing = findLinkedRequestField(nodes, requestNode.id, targetNodeId, targetHandle);
  if (existing) {
    fieldId = existing.id;
  } else {
    fieldId = fieldIdForType(fieldType, paramKey);
    const newField: WorkflowField = {
      id: fieldId,
      type: fieldType,
      label: paramLabel.trim() || paramKey,
      value: valueToRequestFieldValue(fieldType, currentValue, defaultValue),
      linkedTarget: { nodeId: targetNodeId, handle: targetHandle },
    };
    const reqData = requestNode.data as unknown as RequestInputsData;
    const fields = [...(reqData.fields ?? []), newField];
    nextNodes = nodes.map((n) =>
      n.id === requestNode.id ? { ...n, data: { ...reqData, fields } } : n
    );
  }

  const connection = {
    source: requestNode.id,
    target: targetNodeId,
    sourceHandle: fieldId,
    targetHandle,
  };
  const evaluation = evaluateCanvasConnection(nextNodes, nextEdges, connection);
  if (!evaluation.allowed) {
    return {
      nodes,
      edges,
      fieldId: "",
      alreadyPromoted: false,
      error: evaluation.error ?? "Invalid connection",
    };
  }

  const edgeExists = nextEdges.some(
    (e) =>
      e.source === connection.source &&
      e.target === connection.target &&
      e.sourceHandle === connection.sourceHandle &&
      e.targetHandle === connection.targetHandle
  );
  if (!edgeExists) {
    nextEdges = [
      ...nextEdges,
      {
        id: generateEdgeId(),
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
      } as Edge,
    ];
  }

  return {
    nodes: nextNodes,
    edges: nextEdges,
    fieldId,
    alreadyPromoted: !!existing,
  };
}

/** Remove request field and any edges sourced from it (reverts promotion). */
export function removeRequestFieldAndEdges(
  nodes: Node[],
  edges: Edge[],
  requestNodeId: string,
  fieldId: string
): { nodes: Node[]; edges: Edge[] } {
  const req = nodes.find((n) => n.id === requestNodeId);
  if (!req) return { nodes, edges };
  const reqData = req.data as unknown as RequestInputsData;
  const fields = (reqData.fields ?? []).filter((f) => f.id !== fieldId);
  const nextNodes = nodes.map((n) =>
    n.id === requestNodeId ? { ...n, data: { ...reqData, fields } } : n
  );
  const nextEdges = edges.filter((e) => e.sourceHandle !== fieldId);
  return { nodes: nextNodes, edges: nextEdges };
}
