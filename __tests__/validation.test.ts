import { describe, it, expect } from "vitest";
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  runWorkflowSchema,
  workflowFilePayloadSchema,
} from "@/lib/validation";

// ─── createWorkflowSchema ───────────────────────────────────────────────────

describe("createWorkflowSchema", () => {
  it("accepts a valid name", () => {
    expect(createWorkflowSchema.safeParse({ name: "My pipeline" }).success).toBe(true);
  });

  it("accepts name with optional description", () => {
    const result = createWorkflowSchema.safeParse({
      name: "Pipeline",
      description: "Does image processing",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createWorkflowSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 120 characters", () => {
    const result = createWorkflowSchema.safeParse({ name: "a".repeat(121) });
    expect(result.success).toBe(false);
  });

  it("accepts name exactly 120 characters long", () => {
    const result = createWorkflowSchema.safeParse({ name: "a".repeat(120) });
    expect(result.success).toBe(true);
  });

  it("rejects description longer than 5000 characters", () => {
    const result = createWorkflowSchema.safeParse({
      name: "Valid",
      description: "x".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts description exactly 5000 characters", () => {
    const result = createWorkflowSchema.safeParse({
      name: "Valid",
      description: "x".repeat(5000),
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = createWorkflowSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ─── updateWorkflowSchema ───────────────────────────────────────────────────

describe("updateWorkflowSchema", () => {
  it("accepts an empty update (all fields optional)", () => {
    expect(updateWorkflowSchema.safeParse({}).success).toBe(true);
  });

  it("accepts name-only update", () => {
    expect(updateWorkflowSchema.safeParse({ name: "Renamed" }).success).toBe(true);
  });

  it("rejects an empty nodes array", () => {
    const result = updateWorkflowSchema.safeParse({ nodes: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes("empty graph"))).toBe(true);
    }
  });

  it("rejects nodes without requestInputs", () => {
    const result = updateWorkflowSchema.safeParse({
      nodes: [{ type: "gptImage2" }, { type: "response" }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes("requestInputs"))).toBe(true);
    }
  });

  it("rejects nodes without response", () => {
    const result = updateWorkflowSchema.safeParse({
      nodes: [{ type: "requestInputs" }, { type: "gptImage2" }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid nodes array with required scaffold types", () => {
    const result = updateWorkflowSchema.safeParse({
      nodes: [{ type: "requestInputs" }, { type: "gptImage2" }, { type: "response" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid status values", () => {
    for (const status of ["idle", "running", "done", "error"]) {
      expect(updateWorkflowSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it("rejects invalid status value", () => {
    expect(updateWorkflowSchema.safeParse({ status: "pending" }).success).toBe(false);
  });

  it("accepts null description (clearing it)", () => {
    expect(updateWorkflowSchema.safeParse({ description: null }).success).toBe(true);
  });
});

// ─── runWorkflowSchema ──────────────────────────────────────────────────────

describe("runWorkflowSchema", () => {
  it("accepts full scope with inputValues", () => {
    const result = runWorkflowSchema.safeParse({
      scope: "full",
      inputValues: { field_text_default: "A prompt" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts partial scope with nodeIds", () => {
    const result = runWorkflowSchema.safeParse({
      scope: "partial",
      nodeIds: ["node-1"],
      inputValues: {},
    });
    expect(result.success).toBe(true);
  });

  it("accepts single scope", () => {
    const result = runWorkflowSchema.safeParse({
      scope: "single",
      nodeIds: ["node-1"],
      inputValues: {},
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid scope", () => {
    const result = runWorkflowSchema.safeParse({
      scope: "all",
      inputValues: {},
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing inputValues", () => {
    const result = runWorkflowSchema.safeParse({ scope: "full" });
    expect(result.success).toBe(false);
  });

  it("accepts empty inputValues object", () => {
    const result = runWorkflowSchema.safeParse({ scope: "full", inputValues: {} });
    expect(result.success).toBe(true);
  });

  it("accepts inputValues with mixed types", () => {
    const result = runWorkflowSchema.safeParse({
      scope: "full",
      inputValues: {
        field_text: "hello",
        field_num: 42,
        field_bool: true,
        field_image: ["https://example.com/img.png"],
      },
    });
    expect(result.success).toBe(true);
  });
});

// ─── workflowFilePayloadSchema ──────────────────────────────────────────────

describe("workflowFilePayloadSchema", () => {
  it("accepts a valid export bundle", () => {
    const result = workflowFilePayloadSchema.safeParse({
      version: "1.0",
      name: "My workflow",
      exportedAt: "2026-06-02T00:00:00.000Z",
      nodes: [{ id: "a", type: "requestInputs" }],
      edges: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts bundle without optional fields", () => {
    const result = workflowFilePayloadSchema.safeParse({
      nodes: [],
      edges: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing nodes array", () => {
    const result = workflowFilePayloadSchema.safeParse({ edges: [] });
    expect(result.success).toBe(false);
  });

  it("rejects missing edges array", () => {
    const result = workflowFilePayloadSchema.safeParse({ nodes: [] });
    expect(result.success).toBe(false);
  });
});
