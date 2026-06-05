import { describe, expect, it } from "vitest";
import {
  mergeNodeRunsWithLive,
  resolveHistoryRowCreditsMicro,
  sumLiveStatesCreditsMicro,
} from "@/lib/playground-output";

describe("playground-output credits", () => {
  it("sumLiveStatesCreditsMicro totals creditCost from SSE metadata", () => {
    expect(
      sumLiveStatesCreditsMicro({
        a: { creditCost: 450000 },
        b: { creditCost: 40000 },
        c: { status: "running" },
      })
    ).toBe(490000);
  });

  it("mergeNodeRunsWithLive overlays creditCost from live states", () => {
    const merged = mergeNodeRunsWithLive(
      [{ nodeId: "n1", status: "running", creditCost: null }],
      { n1: { status: "completed", output: "ok", creditCost: 210000 } }
    );
    expect(merged[0]?.creditCost).toBe(210000);
  });

  it("resolveHistoryRowCreditsMicro uses live overlay for selected running row", () => {
    expect(
      resolveHistoryRowCreditsMicro({
        nodeRuns: [],
        isSelected: true,
        isRunning: true,
        liveCreditsMicro: 840000,
      })
    ).toBe(840000);
  });

  it("resolveHistoryRowCreditsMicro uses nodeRuns when not live-selected", () => {
    expect(
      resolveHistoryRowCreditsMicro({
        nodeRuns: [{ nodeId: "n1", status: "success", creditCost: 450000 }],
        isSelected: false,
        isRunning: true,
        liveCreditsMicro: 840000,
      })
    ).toBe(450000);
  });
});
