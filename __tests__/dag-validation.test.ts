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
  // --- hasCycle (existing graph, no new edge) ---

  it("returns false for an empty graph", () => {
    expect(hasCycle([], [])).toBe(false);
  });

  it("returns false for a single isolated node", () => {
    expect(hasCycle([node("a")], [])).toBe(false);
  });

  it("returns false for a simple linear chain", () => {
    const nodes = [node("a"), node("b"), node("c")];
    const edges = [edge("a", "b"), edge("b", "c")];
    expect(hasCycle(nodes, edges)).toBe(false);
  });

  it("returns false for a branching DAG (diamond)", () => {
    const nodes = [node("a"), node("b"), node("c"), node("d")];
    const edges = [edge("a", "b"), edge("a", "c"), edge("b", "d"), edge("c", "d")];
    expect(hasCycle(nodes, edges)).toBe(false);
  });

  it("detects a direct self-loop", () => {
    const nodes = [node("a")];
    const edges = [edge("a", "a")];
    expect(hasCycle(nodes, edges)).toBe(true);
  });

  it("detects a 2-node cycle", () => {
    const nodes = [node("a"), node("b")];
    const edges = [edge("a", "b"), edge("b", "a")];
    expect(hasCycle(nodes, edges)).toBe(true);
  });

  it("detects a 3-node cycle", () => {
    const nodes = [node("a"), node("b"), node("c")];
    const edges = [edge("a", "b"), edge("b", "c"), edge("c", "a")];
    expect(hasCycle(nodes, edges)).toBe(true);
  });

  it("detects a long cycle in a larger graph", () => {
    const nodes = ["a", "b", "c", "d", "e"].map(node);
    const edges = [
      edge("a", "b"),
      edge("b", "c"),
      edge("c", "d"),
      edge("d", "e"),
      edge("e", "b"), // cycle: b -> c -> d -> e -> b
    ];
    expect(hasCycle(nodes, edges)).toBe(true);
  });

  // --- validateNewEdge (would adding this edge create a cycle?) ---

  it("rejects a direct cyclic back-edge (2 nodes)", () => {
    const nodes = [node("a"), node("b")];
    const edges = [edge("a", "b")];
    const result = validateNewEdge(nodes, edges, { source: "b", target: "a" });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/cycle/i);
  });

  it("rejects a new edge that closes a 3-node loop", () => {
    const nodes = [node("a"), node("b"), node("c")];
    const edges = [edge("a", "b"), edge("b", "c")];
    const result = validateNewEdge(nodes, edges, { source: "c", target: "a" });
    expect(result.valid).toBe(false);
  });

  it("accepts a valid new edge that does not create a cycle", () => {
    const nodes = [node("a"), node("b"), node("c")];
    const edges = [edge("a", "b")];
    const result = validateNewEdge(nodes, edges, { source: "b", target: "c" });
    expect(result.valid).toBe(true);
  });

  it("accepts the first edge in an empty graph", () => {
    const nodes = [node("a"), node("b")];
    const result = validateNewEdge(nodes, [], { source: "a", target: "b" });
    expect(result.valid).toBe(true);
  });

  it("accepts a new branch that extends an existing DAG without cycling", () => {
    // a -> b -> c, adding a -> c (valid — no cycle, just a shortcut)
    const nodes = [node("a"), node("b"), node("c")];
    const edges = [edge("a", "b"), edge("b", "c")];
    const result = validateNewEdge(nodes, edges, { source: "a", target: "c" });
    expect(result.valid).toBe(true);
  });

  it("rejects a self-loop via validateNewEdge", () => {
    const nodes = [node("a")];
    const result = validateNewEdge(nodes, [], { source: "a", target: "a" });
    expect(result.valid).toBe(false);
  });
});
