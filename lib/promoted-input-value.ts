/**
 * Live values for handles promoted to Request-Inputs (UI + optional input sync).
 */

import type { Edge, Node } from "@xyflow/react";
import {
  getInboundRequestEdge,
  findLinkedRequestField,
} from "@/lib/promote-to-request";
import {
  resolvePropagatedEdgeValue,
  type ResolvePropagatedEdgeOptions,
} from "@/lib/utils";
import type { WorkflowField } from "@/store/workflow-store";

export function getPromotedFieldValue(
  nodes: Node[],
  edges: Edge[],
  targetNodeId: string,
  targetHandle: string,
  options?: ResolvePropagatedEdgeOptions
): unknown | undefined {
  const edge = getInboundRequestEdge(nodes, edges, targetNodeId, targetHandle);
  if (!edge) return undefined;
  return resolvePropagatedEdgeValue(edge, nodes, options);
}

export function parseWorkflowFieldValue(
  field: Pick<WorkflowField, "type" | "value">
): unknown {
  const v = field.value;
  if (field.type === "boolean_field") return v === "true";
  if (field.type === "number_field") {
    if (v === null || v === undefined || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  if (v === null || v === undefined) return undefined;
  return v;
}

/** Value shown on a muted/promoted target control (request field wins when set). */
export function resolveEffectiveParamValue(opts: {
  requestPromoted: boolean;
  localValue: unknown;
  defaultValue?: unknown;
  nodes: Node[];
  edges: Edge[];
  targetNodeId: string;
  targetHandle: string;
  paramType?: string;
  previewOpts?: ResolvePropagatedEdgeOptions;
}): unknown {
  const fallback = opts.localValue ?? opts.defaultValue ?? "";
  if (!opts.requestPromoted) return fallback;

  const promoted = getPromotedFieldValue(
    opts.nodes,
    opts.edges,
    opts.targetNodeId,
    opts.targetHandle,
    opts.previewOpts
  );
  if (promoted === undefined || promoted === null || promoted === "") {
    return fallback;
  }

  if (opts.paramType === "number" || opts.paramType === "slider") {
    const n = typeof promoted === "number" ? promoted : Number(promoted);
    return Number.isFinite(n) ? n : fallback;
  }
  return promoted;
}

/** Mirror request field value into the linked target node's `inputs` (muted field dependency). */
export function syncLinkedTargetInputFromField(
  nodes: Node[],
  field: WorkflowField
): Node[] {
  const link = field.linkedTarget;
  if (!link) return nodes;

  const paramKey = link.handle.replace(/^in:/, "");
  const parsed = parseWorkflowFieldValue(field);
  if (parsed === undefined) return nodes;

  return nodes.map((n) => {
    if (n.id !== link.nodeId) return n;
    const data = n.data as { inputs?: Record<string, unknown> };
    const inputs = { ...(data.inputs ?? {}), [paramKey]: parsed };
    return { ...n, data: { ...data, inputs } };
  });
}

/** After promotion, keep target inputs aligned with the new request field. */
export function syncTargetFromRequestField(
  nodes: Node[],
  requestNodeId: string,
  fieldId: string
): Node[] {
  const req = nodes.find((n) => n.id === requestNodeId);
  if (!req) return nodes;
  const fields = (req.data as { fields?: WorkflowField[] }).fields ?? [];
  const field = fields.find((f) => f.id === fieldId);
  if (!field) return nodes;
  return syncLinkedTargetInputFromField(nodes, field);
}
