/**
 * @fileoverview Canvas connection rules (datatype, duplicate target, cycle) via shared helper.
 */
import { describe, it, expect } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import { evaluateCanvasConnection } from "@/lib/canvas-connection";

function node(id: string, type: string): Node {
  return { id, type, position: { x: 0, y: 0 }, data: { label: id } };
}

function edge(
  source: string,
  target: string,
  sourceHandle?: string,
  targetHandle?: string
): Edge {
  return {
    id: `${source}-${target}-${targetHandle ?? "t"}`,
    source,
    target,
    sourceHandle,
    targetHandle,
  };
}

describe("evaluateCanvasConnection", () => {
  it("accepts a valid text edge between request inputs and OpenRouter prompt", () => {
    const nodes = [node("ri", "requestInputs"), node("llm", "openRouter")];
    const result = evaluateCanvasConnection(nodes, [], {
      source: "ri",
      target: "llm",
      sourceHandle: "field_text_default",
      targetHandle: "in:prompt",
    });
    expect(result).toEqual({ allowed: true });
  });

  it("rejects incompatible handle datatypes", () => {
    const nodes = [node("ri", "requestInputs"), node("llm", "openRouter")];
    const result = evaluateCanvasConnection(nodes, [], {
      source: "ri",
      target: "llm",
      sourceHandle: "field_image_default",
      targetHandle: "in:prompt",
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("invalid-type");
  });

  it("rejects a second wire to the same target handle (except in:images)", () => {
    const nodes = [node("a", "requestInputs"), node("b", "openRouter"), node("c", "requestInputs")];
    const edges = [
      edge("a", "b", "field_text_1", "in:prompt"),
    ];
    const result = evaluateCanvasConnection(nodes, edges, {
      source: "c",
      target: "b",
      sourceHandle: "field_text_2",
      targetHandle: "in:prompt",
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("duplicate-target");
  });

  it("allows multiple wires into Gemini in:images", () => {
    const nodes = [
      node("crop1", "cropImage"),
      node("crop2", "cropImage"),
      node("gem", "gemini"),
    ];
    const edges = [edge("crop1", "gem", "out:outputImage", "in:images")];
    const result = evaluateCanvasConnection(nodes, edges, {
      source: "crop2",
      target: "gem",
      sourceHandle: "out:outputImage",
      targetHandle: "in:images",
    });
    expect(result.allowed).toBe(true);
  });

  it("rejects edges that would create a cycle", () => {
    const nodes = [node("a", "openRouter"), node("b", "openRouter"), node("c", "openRouter")];
    const edges = [edge("a", "b", "out:response", "in:prompt"), edge("b", "c", "out:response", "in:prompt")];
    const result = evaluateCanvasConnection(nodes, edges, {
      source: "c",
      target: "a",
      sourceHandle: "out:response",
      targetHandle: "in:prompt",
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("cycle");
    expect(result.error).toMatch(/cycle/i);
  });
});
