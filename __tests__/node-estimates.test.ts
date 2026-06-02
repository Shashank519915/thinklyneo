import { describe, it, expect } from "vitest";
import {
  sumWorkflowEstimateMillions,
  ESTIMATE_CROP_M,
  ESTIMATE_GEMINI_M,
} from "@/lib/node-estimates";
import type { Node } from "@xyflow/react";

function node(type: string): Node {
  return { id: type, type, position: { x: 0, y: 0 }, data: {} };
}

describe("sumWorkflowEstimateMillions", () => {
  it("returns 0 for empty node list", () => {
    expect(sumWorkflowEstimateMillions([])).toBe(0);
  });

  it("returns 0 for nodes with no known estimate (requestInputs, response)", () => {
    expect(sumWorkflowEstimateMillions([node("requestInputs"), node("response")])).toBe(0);
  });

  it("returns 0 for entirely unknown node types", () => {
    expect(sumWorkflowEstimateMillions([node("gptImage2"), node("klingV3")])).toBe(0);
  });

  it("counts cropImage cost correctly", () => {
    expect(sumWorkflowEstimateMillions([node("cropImage")])).toBe(ESTIMATE_CROP_M);
  });

  it("counts gemini cost correctly", () => {
    expect(sumWorkflowEstimateMillions([node("gemini")])).toBe(ESTIMATE_GEMINI_M);
  });

  it("sums multiple cropImage nodes", () => {
    const result = sumWorkflowEstimateMillions([node("cropImage"), node("cropImage")]);
    expect(result).toBeCloseTo(ESTIMATE_CROP_M * 2);
  });

  it("sums mixed cropImage + gemini pipeline", () => {
    const result = sumWorkflowEstimateMillions([
      node("requestInputs"),
      node("cropImage"),
      node("gemini"),
      node("response"),
    ]);
    expect(result).toBeCloseTo(ESTIMATE_CROP_M + ESTIMATE_GEMINI_M);
  });

  it("ignores gptImage2, klingV3 (not in this estimate map)", () => {
    const withUnknown = sumWorkflowEstimateMillions([node("cropImage"), node("gptImage2")]);
    const withoutUnknown = sumWorkflowEstimateMillions([node("cropImage")]);
    expect(withUnknown).toBe(withoutUnknown);
  });

  it("gemini costs more than cropImage", () => {
    expect(ESTIMATE_GEMINI_M).toBeGreaterThan(ESTIMATE_CROP_M);
  });
});
