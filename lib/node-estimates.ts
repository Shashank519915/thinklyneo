/**
 * @fileoverview Workflow cost estimates for canvas chrome — uses @shashank519915/shared
 * registry + per-node dynamic rules (OpenRouter/Gemini inputs update the total live).
 */

import type { Node } from "@xyflow/react";
import {
  estimateWorkflowCostMicrocredits,
  formatMillionsValueFromMicrocredits,
} from "@shashank519915/shared";

function toEstimateNodes(nodeList: Node[]) {
  return nodeList.map((n) => ({
    type: n.type ?? "",
    inputs: (n.data as { inputs?: Record<string, unknown> } | undefined)?.inputs,
  }));
}

/** Total estimated cost in microcredits (matches per-node badges + billing holds use credits.base). */
export function getWorkflowEstimateMicrocredits(nodeList: Node[]): number {
  return estimateWorkflowCostMicrocredits(toEstimateNodes(nodeList));
}

/** Total estimated cost in millions (e.g. 1.54). */
export function sumWorkflowEstimateMillions(nodeList: Node[]): number {
  return getWorkflowEstimateMicrocredits(nodeList) / 1_000_000;
}

/** Formatted value for `Est ~{x}M` chrome — adapts precision for small OpenRouter totals. */
export function formatWorkflowEstimateDisplay(nodeList: Node[]): string {
  const micro = getWorkflowEstimateMicrocredits(nodeList);
  if (micro === 0) return "0.00";
  return formatMillionsValueFromMicrocredits(micro);
}
