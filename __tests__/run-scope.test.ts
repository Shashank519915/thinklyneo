import { describe, it, expect } from "vitest";
import {
  isOutOfScopeSkippedNodeRun,
  OUT_OF_SCOPE_SKIP_ERROR,
} from "@/lib/run-scope";

describe("isOutOfScopeSkippedNodeRun", () => {
  it("matches orchestrator out-of-scope skip", () => {
    expect(
      isOutOfScopeSkippedNodeRun({
        status: "skipped",
        error: OUT_OF_SCOPE_SKIP_ERROR,
      })
    ).toBe(true);
  });

  it("does not match upstream skip", () => {
    expect(
      isOutOfScopeSkippedNodeRun({
        status: "skipped",
        error: "Skipped due to upstream failure",
      })
    ).toBe(false);
  });
});
