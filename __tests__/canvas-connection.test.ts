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

  it("allows multiple wires into Merge Videos in:video_urls", () => {
    const nodes = [node("ri", "requestInputs"), node("mv", "mergeVideo")];
    const edges = [
      edge("ri", "mv", "field_video_a", "in:video_urls"),
    ];
    const result = evaluateCanvasConnection(nodes, edges, {
      source: "ri",
      target: "mv",
      sourceHandle: "field_video_b",
      targetHandle: "in:video_urls",
    });
    expect(result.allowed).toBe(true);
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

  it("rejects multiple videos wired into Merge A/V in:video_url", () => {
    const nodes: Node[] = [
      {
        id: "ri",
        type: "requestInputs",
        position: { x: 0, y: 0 },
        data: {
          fields: [
            {
              id: "field_video_multi",
              value: "https://a/1.mp4,https://a/2.mp4",
            },
          ],
        },
      },
      node("mav", "mergeAV"),
    ];
    const result = evaluateCanvasConnection(nodes, [], {
      source: "ri",
      target: "mav",
      sourceHandle: "field_video_multi",
      targetHandle: "in:video_url",
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("single-video-only");
  });

  it("rejects a second wire to Merge A/V in:video_url", () => {
    const nodes = [node("a", "klingV3"), node("b", "mergeVideo"), node("mav", "mergeAV")];
    const edges = [edge("a", "mav", "out:outputVideo", "in:video_url")];
    const result = evaluateCanvasConnection(nodes, edges, {
      source: "b",
      target: "mav",
      sourceHandle: "out:outputVideo",
      targetHandle: "in:video_url",
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("duplicate-target");
    expect(result.error).toMatch(/only one video/i);
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
