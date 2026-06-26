import { describe, it, expect } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import {
  normalizeArrayParamValue,
  resolveEffectiveParamValue,
  syncLinkedTargetInputFromField,
} from "@/lib/promoted-input-value";
import { promoteInputToRequest, resolveRequestFieldType } from "@/lib/promote-to-request";

describe("resolveRequestFieldType", () => {
  it("maps slider params to slider_field even when handle type is text", () => {
    expect(resolveRequestFieldType("slider", "text")).toBe("slider_field");
  });

  it("maps select params to select_field", () => {
    expect(resolveRequestFieldType("select", "text")).toBe("select_field");
  });
});

describe("resolveEffectiveParamValue", () => {
  it("reads live value from request field when promoted", () => {
    const nodes: Node[] = [
      {
        id: "ri",
        type: "requestInputs",
        position: { x: 0, y: 0 },
        data: {
          label: "Request",
          fields: [
            {
              id: "field_number_x_1",
              type: "number_field",
              label: "X",
              value: "42",
              linkedTarget: { nodeId: "crop", handle: "in:x" },
            },
          ],
        },
      },
      {
        id: "crop",
        type: "cropImage",
        position: { x: 0, y: 0 },
        data: { label: "Crop", inputs: { x: 0, y: 0, w: 100, h: 100 } },
      },
    ];
    const edges: Edge[] = [
      {
        id: "e1",
        source: "ri",
        target: "crop",
        sourceHandle: "field_number_x_1",
        targetHandle: "in:x",
      },
    ];
    expect(
      resolveEffectiveParamValue({
        requestPromoted: true,
        localValue: 0,
        nodes,
        edges,
        targetNodeId: "crop",
        targetHandle: "in:x",
        paramType: "number",
      })
    ).toBe(42);
  });
});

describe("syncLinkedTargetInputFromField", () => {
  it("updates target node inputs when request field changes", () => {
    const nodes: Node[] = [
      {
        id: "ri",
        type: "requestInputs",
        position: { x: 0, y: 0 },
        data: { label: "R", fields: [] },
      },
      {
        id: "mv",
        type: "mergeVideo",
        position: { x: 0, y: 0 },
        data: { label: "M", inputs: { transition: "none" } },
      },
    ];
    const promoted = promoteInputToRequest({
      nodes,
      edges: [],
      targetNodeId: "mv",
      targetHandle: "in:transition",
      paramKey: "transition",
      paramLabel: "Transition",
      paramType: "select",
      handleType: "text",
      currentValue: "fade",
      selectOptions: [
        { value: "none", label: "none" },
        { value: "fade", label: "fade" },
      ],
    });
    const field = (
      promoted.nodes.find((n) => n.id === "ri")?.data as { fields: { id: string }[] }
    ).fields[0];
    const synced = syncLinkedTargetInputFromField(promoted.nodes, {
      ...field,
      type: "select_field",
      label: "Transition",
      value: "dissolve",
      selectOptions: [
        { value: "none", label: "none" },
        { value: "dissolve", label: "dissolve" },
      ],
      linkedTarget: { nodeId: "mv", handle: "in:transition" },
    });
    const merge = synced.find((n) => n.id === "mv");
    expect((merge?.data as { inputs: { transition: string } }).inputs.transition).toBe(
      "dissolve"
    );
  });

  it("syncs promoted image_field to images array on target node", () => {
    const nodes: Node[] = [
      {
        id: "ri",
        type: "requestInputs",
        position: { x: 0, y: 0 },
        data: { label: "R", fields: [] },
      },
      {
        id: "llm",
        type: "openRouter",
        position: { x: 0, y: 0 },
        data: { label: "LLM", inputs: { images: [] } },
      },
    ];
    const synced = syncLinkedTargetInputFromField(nodes, {
      id: "field_image_1",
      type: "image_field",
      label: "Images",
      value: "https://example.com/a.jpg,https://example.com/b.jpg",
      linkedTarget: { nodeId: "llm", handle: "in:images" },
    });
    const llm = synced.find((n) => n.id === "llm");
    expect((llm?.data as { inputs: { images: string[] } }).inputs.images).toEqual([
      "https://example.com/a.jpg",
      "https://example.com/b.jpg",
    ]);
  });
});

describe("normalizeArrayParamValue", () => {
  it("parses comma-separated promoted string for image-array UI", () => {
    expect(normalizeArrayParamValue("https://a.jpg,https://b.jpg")).toEqual([
      "https://a.jpg",
      "https://b.jpg",
    ]);
  });
});
