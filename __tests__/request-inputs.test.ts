import { describe, it, expect } from "vitest";
import {
  getRequestFieldKind,
  buildInputValuesFromFields,
  isMultiAssetField,
} from "@/lib/request-inputs";
import type { WorkflowField } from "@/store/workflow-store";

describe("request-inputs field kinds", () => {
  it("maps explicit field types to UI kinds", () => {
    expect(getRequestFieldKind({ id: "x", type: "image_field" })).toBe("image");
    expect(getRequestFieldKind({ id: "x", type: "number_field" })).toBe("number");
    expect(getRequestFieldKind({ id: "x", type: "boolean_field" })).toBe("boolean");
    expect(getRequestFieldKind({ id: "x", type: "video_field" })).toBe("video");
  });

  it("infers kind from legacy field id prefixes", () => {
    expect(getRequestFieldKind({ id: "field_image_123", type: "text_field" })).toBe("image");
  });

  it("builds input values for all defined fields", () => {
    const fields: WorkflowField[] = [
      { id: "field_text_1", type: "text_field", label: "Prompt", value: "hello" },
      { id: "field_image_1", type: "image_field", label: "Ref", value: null },
    ];
    const vals = buildInputValuesFromFields(fields);
    expect(vals.field_text_1).toBe("hello");
    expect(vals.field_image_1).toBe("");
  });

  it("only image fields are multi-asset", () => {
    expect(isMultiAssetField("image")).toBe(true);
    expect(isMultiAssetField("video")).toBe(false);
  });
});
