import { describe, it, expect } from "vitest";
import { hasCycle, validateNewEdge } from "@/lib/execution";
import type { Node, Edge } from "@xyflow/react";

function node(id: string): Node {
  return { id, type: "cropImage", position: { x: 0, y: 0 }, data: {} };
}

function edge(source: string, target: string): Edge {
  return { id: `${source}-${target}`, source, target };
}

describe("frontend DAG cycle validation", () => {
  it("rejects cyclic connections", () => {
    const nodes = [node("a"), node("b")];
    const edges = [edge("a", "b")];
    expect(validateNewEdge(nodes, edges, { source: "b", target: "a" }).valid).toBe(false);
  });

  it("detects cycle when new edge closes the loop", () => {
    const nodes = [node("a"), node("b"), node("c")];
    const edges = [edge("a", "b"), edge("b", "c")];
    expect(hasCycle(nodes, edges, { source: "c", target: "a" })).toBe(true);
    expect(validateNewEdge(nodes, edges, { source: "c", target: "a" }).valid).toBe(false);
  });
});
