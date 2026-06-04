import { describe, it, expect } from "vitest";
import {
  getRunnableNodeIds,
  getScopedRunNodeIds,
  resolveActiveRunNodeIds,
} from "@shashank519915/shared";

const n = (id: string, type: string) => ({ id, type });
const e = (source: string, target: string) => ({ source, target });

describe("getRunnableNodeIds", () => {
  it("excludes orphan islands not on Request → Response path", () => {
    const nodes = [
      n("ri", "requestInputs"),
      n("mid", "cropImage"),
      n("res", "response"),
      n("orphan", "cropImage"),
    ];
    const edges = [
      e("ri", "mid"),
      e("mid", "res"),
      // disconnected island
    ];
    const ids = getRunnableNodeIds(nodes, edges);
    expect(ids.has("ri")).toBe(true);
    expect(ids.has("mid")).toBe(true);
    expect(ids.has("res")).toBe(true);
    expect(ids.has("orphan")).toBe(false);
  });

  it("returns all nodes when request or response is missing", () => {
    const nodes = [n("a", "cropImage"), n("b", "cropImage")];
    const ids = getRunnableNodeIds(nodes, []);
    expect(ids.size).toBe(2);
  });
});

describe("getScopedRunNodeIds", () => {
  it("includes target and upstream deps only", () => {
    const nodes = [
      n("ri", "requestInputs"),
      n("a", "cropImage"),
      n("b", "gemini"),
      n("res", "response"),
      n("orphan", "cropImage"),
    ];
    const edges = [e("ri", "a"), e("a", "b"), e("b", "res")];
    const scoped = getScopedRunNodeIds(nodes, edges, ["b"]);
    expect(scoped.has("b")).toBe(true);
    expect(scoped.has("a")).toBe(true);
    expect(scoped.has("ri")).toBe(true);
    expect(scoped.has("orphan")).toBe(false);
    expect(scoped.has("res")).toBe(false);
  });
});

describe("resolveActiveRunNodeIds", () => {
  it("uses main-path set for full runs and scoped deps for partial", () => {
    const nodes = [
      n("ri", "requestInputs"),
      n("t", "cropImage"),
      n("res", "response"),
      n("orphan", "cropImage"),
    ];
    const edges = [e("ri", "t"), e("t", "res")];
    const full = resolveActiveRunNodeIds(nodes, edges, "full");
    const partial = resolveActiveRunNodeIds(nodes, edges, "partial", ["t"]);
    expect(full.has("orphan")).toBe(false);
    expect(partial.has("t")).toBe(true);
    expect(partial.has("ri")).toBe(true);
    expect(partial.has("res")).toBe(false);
    expect(partial.has("orphan")).toBe(false);
  });
});
