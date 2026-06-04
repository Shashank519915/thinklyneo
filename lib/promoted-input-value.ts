/**
 * Live values for handles promoted to Request-Inputs (UI + optional input sync).
 */

import type { Edge, Node } from "@xyflow/react";
import { parseMediaList } from "@/lib/media-list";
import {
  getInboundRequestEdge,
} from "@/lib/promote-to-request";
import {
  resolvePropagatedEdgeValue,
  type ResolvePropagatedEdgeOptions,
} from "@/lib/utils";
import type { WorkflowField } from "@/store/workflow-store";

/** Node input keys that store comma-separated media as string arrays. */
const ARRAY_MEDIA_INPUT_KEYS = new Set([
  "images",
  "uploadedImages",
  "image_urls",
  "video_urls",
  "audio_urls",
]);

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

/** Coerce request field storage into the shape expected on the target node's inputs. */
export function coerceSyncedInputValue(
  field: WorkflowField,
  paramKey: string
): unknown {
  const parsed = parseWorkflowFieldValue(field);
  if (parsed === undefined) return undefined;

  if (
    field.type === "image_field" ||
    field.type === "video_field" ||
    field.type === "audio_field"
  ) {
    const urls = parseMediaList(parsed);
    if (ARRAY_MEDIA_INPUT_KEYS.has(paramKey)) return urls;
    if (field.mediaMaxCount === 1) return urls[0] ?? null;
    return urls.length <= 1 ? (urls[0] ?? null) : urls.join(",");
  }

  if (field.type === "file_field") {
    const urls = parseMediaList(parsed);
    return urls[0] ?? (typeof parsed === "string" ? parsed : null);
  }

  return parsed;
}

/** Normalize image/video array param values for UI (always string[]). */
export function normalizeArrayParamValue(
  raw: unknown,
  defaultValue?: unknown
): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === "string" && x.length > 0);
  }
  if (typeof raw === "string" && raw.length > 0) return parseMediaList(raw);
  if (Array.isArray(defaultValue)) {
    return defaultValue.filter((x): x is string => typeof x === "string");
  }
  return [];
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
  const isArrayType =
    opts.paramType === "image-array" ||
    opts.paramType === "video-array" ||
    opts.paramType === "audio-array";

  const fallback = opts.localValue ?? opts.defaultValue ?? "";
  if (!opts.requestPromoted) {
    if (isArrayType) return normalizeArrayParamValue(fallback, opts.defaultValue);
    return fallback;
  }

  const promoted = getPromotedFieldValue(
    opts.nodes,
    opts.edges,
    opts.targetNodeId,
    opts.targetHandle,
    opts.previewOpts
  );
  if (promoted === undefined || promoted === null || promoted === "") {
    // Wire removed — fall back to defaultValue only (don't preserve stale local uploads)
    if (isArrayType) return normalizeArrayParamValue(opts.defaultValue, opts.defaultValue);
    return opts.defaultValue ?? "";
  }

  if (opts.paramType === "number" || opts.paramType === "slider") {
    const n = typeof promoted === "number" ? promoted : Number(promoted);
    return Number.isFinite(n) ? n : fallback;
  }

  if (isArrayType) return normalizeArrayParamValue(promoted, opts.defaultValue);

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
  const parsed = coerceSyncedInputValue(field, paramKey);
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
