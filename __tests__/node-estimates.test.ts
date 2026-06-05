import { describe, it, expect } from "vitest";
import {
  formatWorkflowEstimateDisplay,
  getWorkflowEstimateMicrocredits,
  sumWorkflowEstimateMillions,
} from "@/lib/node-estimates";
import { estimateWorkflowCostMillions } from "@shashank519915/shared";
import type { Node } from "@xyflow/react";

function node(
  type: string,
  inputs?: Record<string, unknown>,
): Node {
  return {
    id: type,
    type,
    position: { x: 0, y: 0 },
    data: inputs ? { inputs } : {},
  };
}

describe("sumWorkflowEstimateMillions", () => {
  it("returns 0 for empty node list", () => {
    expect(sumWorkflowEstimateMillions([])).toBe(0);
  });

  it("returns 0 for nodes with no billable type", () => {
    expect(
      sumWorkflowEstimateMillions([node("requestInputs"), node("response")]),
    ).toBe(0);
  });

  it("matches shared estimateWorkflowCostMillions for all executable types", () => {
    const types = [
      "cropImage",
      "gemini",
      "openRouter",
      "gptImage2",
      "klingV3",
      "mergeVideo",
      "mergeAV",
      "extractAudio",
    ];
    const list = types.map((t) => node(t));
    expect(sumWorkflowEstimateMillions(list)).toBe(
      estimateWorkflowCostMillions(types.map((t) => ({ type: t }))),
    );
  });

  it("sums a realistic pipeline", () => {
    const list = [
      node("requestInputs"),
      node("gptImage2"),
      node("klingV3"),
      node("response"),
    ];
    expect(sumWorkflowEstimateMillions(list)).toBeCloseTo(0.21 + 0.84);
  });

  it("uses billing base for OpenRouter in workflow total (not per-node display estimate)", () => {
    const list = [
      node("openRouter", {
        prompt: "x".repeat(200),
        image_urls: ["https://a.jpg"],
      }),
    ];
    expect(getWorkflowEstimateMicrocredits(list)).toBe(450_000);
    expect(formatWorkflowEstimateDisplay(list)).toBe("0.45");
  });
});
