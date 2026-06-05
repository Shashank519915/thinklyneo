/**
 * @fileoverview Shared formatting + label-resolution helpers for the run-history detail modals
 * (`RunDetailsModal`, `NodeDetailModal`) used on `/workflow/[id]/canvas`. Keeps presentation logic
 * in one place so both modals render run/node data identically to the right-panel drill-down.
 */

import type { Node as FlowNode } from "@xyflow/react";
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

export interface NodeRunData {
  id: string;
  nodeId: string;
  nodeName: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  inputs?: Record<string, unknown>;
  output?: unknown;
  error?: string;
  providerUsed?: string | null;
  providerAttempts?: Array<{ providerId: string; status: "success" | "failed"; error?: string; durationMs: number }> | null;
  logs?: string | null;
  creditCost?: number | null;
}

export interface RunHistoryItem {
  id: string;
  scope: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  nodeRuns: NodeRunData[];
}

/** Status dot color + human label, shared with the right history panel palette. */
export const STATUS_META: Record<string, { color: string; label: string; pulse?: boolean }> = {
  success: { color: "#10B981", label: "Completed" },
  failed: { color: "#EF4444", label: "Failed" },
  partial: { color: "#F59E0B", label: "Partial" },
  running: { color: "#3B82F6", label: "Running", pulse: true },
  queued: { color: "#8B5CF6", label: "Queued" },
  waiting: { color: "#F59E0B", label: "Waiting" },
  canceled: { color: "#9CA3AF", label: "Canceled" },
};

export function statusMeta(status: string) {
  return STATUS_META[status] ?? STATUS_META.failed;
}

/** Tailwind text color for a node-run status label. */
export function statusTextClass(status: string): string {
  switch (status) {
    case "success":
      return "text-emerald-600";
    case "failed":
      return "text-red-600";
    case "running":
      return "text-blue-600";
    default:
      return "text-amber-600";
  }
}

/** "03/06/2026, 21:24:56" — matches the reference modal header format. */
export function formatTimestampFull(iso: string | undefined | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB") + ", " + d.toLocaleTimeString("en-GB");
}

/** Capitalized run scope/mode, e.g. "Full". */
export function formatScopeMode(scope: string): string {
  if (!scope) return "—";
  return scope.charAt(0).toUpperCase() + scope.slice(1);
}

export const DEFINITIONS_BY_NAME: Record<string, NodeDefinition> = {
  [cropImageDefinition.name]: cropImageDefinition,
  [geminiDefinition.name]: geminiDefinition,
  [openrouterLlmDefinition.name]: openrouterLlmDefinition,
  [gptImage2Definition.name]: gptImage2Definition,
  [klingV3Definition.name]: klingV3Definition,
  [mergeVideoDefinition.name]: mergeVideoDefinition,
  [mergeAVDefinition.name]: mergeAVDefinition,
  [extractAudioDefinition.name]: extractAudioDefinition,
};

/** Prettify a raw key into Title Case as a fallback label. */
function prettifyKey(key: string): string {
  return key
    .replace(/^in:/, "")
    .replace(/^out:/, "")
    .replace(/^field_/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

export function isRequestInputsNodeRun(nr: { nodeId: string; nodeName: string }): boolean {
  return nr.nodeId === "request-inputs" || nr.nodeName === "Request-Inputs";
}

export function isResponseNodeRun(nr: { nodeId: string; nodeName: string }): boolean {
  return nr.nodeId === "response" || nr.nodeName === "Output" || nr.nodeName === "Response";
}

/** Resolve a processing-node input handle key to its definition label. */
export function resolveInputLabel(nodeName: string, key: string): string {
  const def = DEFINITIONS_BY_NAME[nodeName];
  const cleaned = key.replace(/^in:/, "");
  const param = def?.inputs?.find((i) => i.key === cleaned);
  if (param?.label) return param.label;
  return prettifyKey(key);
}

/** Resolve a processing-node output handle key to its definition label. */
export function resolveOutputLabel(nodeName: string, key: string): string {
  const def = DEFINITIONS_BY_NAME[nodeName];
  const cleaned = key.replace(/^out:/, "");
  const param = def?.outputs?.find((o) => o.key === cleaned);
  if (param?.label) return param.label;
  return prettifyKey(key);
}

/** Resolve a Request-Inputs field id to its user-defined label. */
export function getRequestFieldLabel(fieldId: string, nodes: FlowNode[]): string {
  const reqNode = nodes.find((n) => n.type === "requestInputs" || n.id === "request-inputs");
  const fields = ((reqNode?.data as { fields?: Array<{ id: string; label?: string }> })?.fields) ?? [];
  const field = fields.find((f) => f.id === fieldId);
  return field?.label?.trim() || prettifyKey(fieldId);
}

/** Resolve a Response result-slot id to its user-defined label. */
export function getResponseSlotLabel(slotId: string, nodes: FlowNode[]): string {
  const respNode = nodes.find((n) => n.type === "response" || n.id === "response");
  const results = ((respNode?.data as { results?: Array<{ id: string; label?: string }> })?.results) ?? [];
  const slot = results.find((r) => r.id === slotId);
  return slot?.label?.trim() || prettifyKey(slotId);
}

/** Normalize an output value to a record when it is (or stringifies to) a keyed object. */
export function parseOutputAsRecord(output: unknown): Record<string, unknown> | null {
  if (output == null) return null;
  if (typeof output === "object" && !Array.isArray(output)) return output as Record<string, unknown>;
  if (typeof output === "string") {
    try {
      const j = JSON.parse(output) as unknown;
      if (j && typeof j === "object" && !Array.isArray(j)) return j as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

/** Middle-truncate a long URL/string for compact link display. */
export function truncateMiddle(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  const half = Math.floor((maxLen - 1) / 2);
  return s.slice(0, half) + "…" + s.slice(s.length - half);
}

/** Heuristic: very long base64-ish blobs we should not dump into the DOM. */
export function looksLikeOpaquePayload(s: string): boolean {
  if (s.length < 240) return false;
  const sample = s.slice(0, 120).replace(/\s/g, "");
  if (/^data:image\//i.test(s)) return false;
  if (/^https?:\/\//i.test(s.trim())) return false;
  return /^[A-Za-z0-9+/=]+$/.test(sample);
}

export interface RunField {
  key: string;
  label: string;
  value: unknown;
}

/** Build the ordered list of Input fields for a node-run, with resolved labels. */
export function buildInputFields(nr: NodeRunData, nodes: FlowNode[]): RunField[] {
  const raw = nr.inputs ?? {};
  const isRequest = isRequestInputsNodeRun(nr);
  return Object.keys(raw)
    .filter((k) => k !== "__runId")
    .map((key) => ({
      key,
      label: isRequest ? getRequestFieldLabel(key, nodes) : resolveInputLabel(nr.nodeName, key),
      value: raw[key],
    }));
}

/** Build the ordered list of Output fields for a node-run, with resolved labels. */
export function buildOutputFields(nr: NodeRunData, nodes: FlowNode[]): RunField[] {
  const isResponse = isResponseNodeRun(nr);
  const rec = parseOutputAsRecord(nr.output);
  if (rec) {
    return Object.keys(rec).map((key) => ({
      key,
      label: isResponse ? getResponseSlotLabel(key, nodes) : resolveOutputLabel(nr.nodeName, key),
      value: rec[key],
    }));
  }
  if (nr.output === null || nr.output === undefined) return [];
  // Single scalar/string output — label from the node's primary output definition.
  return [
    {
      key: "output",
      label: resolveOutputLabel(nr.nodeName, "output"),
      value: nr.output,
    },
  ];
}
