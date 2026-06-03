import { describe, it, expect } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import type { WorkflowField } from "@/store/workflow-store";
import {
  isRequestPromoted,
  promoteInputToRequest,
  removeRequestFieldAndEdges,
  resolveRequestFieldType,
  shouldShowAddToRequest,
} from "@/lib/promote-to-request";

const reqNode = (): Node => ({
  id: "ri",
  type: "requestInputs",
  position: { x: 0, y: 0 },
  data: { label: "Request", fields: [] },
});

const mergeNode = (): Node => ({
  id: "mv",
  type: "mergeVideo",
  position: { x: 200, y: 0 },
  data: {
    label: "Merge",
    inputs: { video_urls: [], transition: "fade" },
  },
});

describe("promoteInputToRequest", () => {
  it("creates request field, linkedTarget, and edge to target handle", () => {
    const nodes = [reqNode(), mergeNode()];
    const result = promoteInputToRequest({
      nodes,
      edges: [],
      targetNodeId: "mv",
      targetHandle: "in:transition",
      paramKey: "transition",
      paramLabel: "Transition",
      paramType: "select",
      handleType: "text",
      currentValue: "fade",
    });
    expect(result.error).toBeUndefined();
    const req = result.nodes.find((n) => n.id === "ri");
    const fields = (req?.data as { fields: WorkflowField[] }).fields;
    expect(fields).toHaveLength(1);
    expect(fields[0].linkedTarget).toEqual({ nodeId: "mv", handle: "in:transition" });
    expect(fields[0].type).toBe("select_field");
    expect(fields[0].value).toBe("fade");
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].targetHandle).toBe("in:transition");
    expect(isRequestPromoted(result.nodes, result.edges, "mv", "in:transition")).toBe(
      true
    );
  });

  it("does not promote when handle is wired from a non-request node", () => {
    const nodes = [reqNode(), mergeNode(), { id: "g", type: "gemini", position: { x: 0, y: 0 }, data: {} }];
    const edges: Edge[] = [
      {
        id: "e1",
        source: "g",
        target: "mv",
        sourceHandle: "out:response",
        targetHandle: "in:transition",
      },
    ];
    const result = promoteInputToRequest({
      nodes,
      edges,
      targetNodeId: "mv",
      targetHandle: "in:transition",
      paramKey: "transition",
      paramLabel: "Transition",
    });
    expect(result.error).toBe("Handle is already wired");
    expect(result.edges).toHaveLength(1);
  });

  it("reuses existing promotion without duplicating fields", () => {
    const nodes = [reqNode(), mergeNode()];
    const first = promoteInputToRequest({
      nodes,
      edges: [],
      targetNodeId: "mv",
      targetHandle: "in:transition",
      paramKey: "transition",
      paramLabel: "Transition",
    });
    const second = promoteInputToRequest({
      nodes: first.nodes,
      edges: first.edges,
      targetNodeId: "mv",
      targetHandle: "in:transition",
      paramKey: "transition",
      paramLabel: "Transition",
    });
    const req = second.nodes.find((n) => n.id === "ri");
    const fields = (req?.data as { fields: unknown[] }).fields;
    expect(fields).toHaveLength(1);
    expect(second.alreadyPromoted).toBe(true);
  });
});

describe("removeRequestFieldAndEdges", () => {
  it("removes field and edge so target is no longer promoted", () => {
    const promoted = promoteInputToRequest({
      nodes: [reqNode(), mergeNode()],
      edges: [],
      targetNodeId: "mv",
      targetHandle: "in:transition",
      paramKey: "transition",
      paramLabel: "Transition",
    });
    const fieldId = promoted.fieldId;
    const cleared = removeRequestFieldAndEdges(promoted.nodes, promoted.edges, "ri", fieldId);
    expect(cleared.edges).toHaveLength(0);
    expect(
      (cleared.nodes.find((n) => n.id === "ri")?.data as { fields: unknown[] }).fields
    ).toHaveLength(0);
    expect(isRequestPromoted(cleared.nodes, cleared.edges, "mv", "in:transition")).toBe(false);
  });
});

describe("isRequestPromoted vs manual request wire", () => {
  it("returns false for manual request wire without linkedTarget", () => {
    const nodes = [
      reqNode(),
      {
        id: "llm",
        type: "openRouter",
        position: { x: 200, y: 0 },
        data: { inputs: {} },
      },
    ];
    const edges: Edge[] = [
      {
        id: "e1",
        source: "ri",
        target: "llm",
        sourceHandle: "field_text_1",
        targetHandle: "in:prompt",
      },
    ];
    expect(isRequestPromoted(nodes, edges, "llm", "in:prompt")).toBe(false);
  });
});

describe("resolveRequestFieldType", () => {
  it("promotes audio_volume as number_field", () => {
    expect(resolveRequestFieldType("slider", "text")).toBe("number_field");
  });
});

describe("shouldShowAddToRequest", () => {
  it("hides when wired", () => {
    expect(shouldShowAddToRequest({ hasHandle: true, wired: true })).toBe(false);
  });
  it("shows when unwired with handle", () => {
    expect(shouldShowAddToRequest({ hasHandle: true, wired: false })).toBe(true);
  });
});
