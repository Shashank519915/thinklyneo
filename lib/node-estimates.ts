/**
 * @fileoverview Static workflow cost estimates for canvas chrome — sourced from @shashank519915/shared definitions.
 */

import type { Node } from "@xyflow/react";
import { estimateWorkflowCostMillions } from "@shashank519915/shared";

/** @deprecated Use estimateWorkflowCostMillions from shared; kept for CropImageNode label compat */
export const ESTIMATE_CROP_M = 0.21;
/** @deprecated Use estimateWorkflowCostMillions from shared; kept for CropImageNode label compat */
export const ESTIMATE_GEMINI_M = 0.45;

export const NODE_ESTIMATE_LABEL: Record<"cropImage" | "gemini", string> = {
  cropImage: `~${ESTIMATE_CROP_M}M`,
  gemini: `~${ESTIMATE_GEMINI_M}M`,
};

/**
 * Sums credits.base for all executable nodes on the canvas (microcredits → millions).
 */
export function sumWorkflowEstimateMillions(nodeList: Node[]): number {
  return estimateWorkflowCostMillions(
    nodeList.map((n) => ({ type: n.type ?? "" }))
  );
}
