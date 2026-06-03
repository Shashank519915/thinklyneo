import { describe, it, expect } from "vitest";
import {
  getRequestFieldKind,
  buildInputValuesFromFields,
  isMultiAssetField,
} from "@/lib/request-inputs";
import type { WorkflowField } from "@/store/workflow-store";

// Helper to build a minimal WorkflowField
function field(id: string, type: string, value: unknown = null): WorkflowField {
  return { id, type, label: id, value } as WorkflowField;
}

describe("getRequestFieldKind — explicit type mapping", () => {
  it("maps image_field to image", () => {
    expect(getRequestFieldKind(field("x", "image_field"))).toBe("image");
  });

  it("maps video_field to video", () => {
    expect(getRequestFieldKind(field("x", "video_field"))).toBe("video");
  });

  it("maps audio_field to audio", () => {
    expect(getRequestFieldKind(field("x", "audio_field"))).toBe("audio");
  });

  it("maps file_field to file", () => {
    expect(getRequestFieldKind(field("x", "file_field"))).toBe("file");
  });

  it("maps number_field to number", () => {
    expect(getRequestFieldKind(field("x", "number_field"))).toBe("number");
  });

  it("maps boolean_field to boolean", () => {
    expect(getRequestFieldKind(field("x", "boolean_field"))).toBe("boolean");
  });

  it("maps text_field to text", () => {
    expect(getRequestFieldKind(field("x", "text_field"))).toBe("text");
  });

  it("maps plain text type to text", () => {
    expect(getRequestFieldKind(field("x", "text"))).toBe("text");
  });
});

describe("getRequestFieldKind — id-prefix inference (legacy)", () => {
  it("infers image from field_image_* prefix even if type is text_field", () => {
    expect(getRequestFieldKind(field("field_image_123", "text_field"))).toBe("image");
  });

  it("infers video from field_video_* prefix", () => {
    expect(getRequestFieldKind(field("field_video_abc", "text_field"))).toBe("video");
  });

  it("infers audio from field_audio_* prefix", () => {
    expect(getRequestFieldKind(field("field_audio_xyz", "text_field"))).toBe("audio");
  });
});

describe("buildInputValuesFromFields", () => {
  it("carries over string values", () => {
    const fields: WorkflowField[] = [
      field("field_text_1", "text_field", "hello world"),
    ];
    expect(buildInputValuesFromFields(fields).field_text_1).toBe("hello world");
  });

  it("returns empty string for null image field value", () => {
    const fields: WorkflowField[] = [field("field_image_1", "image_field", null)];
    const vals = buildInputValuesFromFields(fields);
    expect(vals.field_image_1).toBe("");
  });

  it("returns empty string for null text field value", () => {
    const fields: WorkflowField[] = [field("field_text_1", "text_field", null)];
    expect(buildInputValuesFromFields(fields).field_text_1).toBe("");
  });

  it("handles multiple fields of mixed types", () => {
    const fields: WorkflowField[] = [
      field("field_text_1", "text_field", "A retro synthwave city"),
      field("field_image_1", "image_field", null),
      field("field_num_1", "number_field", 42),
    ];
    const vals = buildInputValuesFromFields(fields);
    expect(vals.field_text_1).toBe("A retro synthwave city");
    expect(vals.field_image_1).toBe("");
    expect(vals.field_num_1).toBe(42);
  });

  it("returns empty object for empty fields array", () => {
    expect(buildInputValuesFromFields([])).toEqual({});
  });
});

describe("isMultiAssetField", () => {
  it("image and video support multiple assets", () => {
    expect(isMultiAssetField("image")).toBe(true);
    expect(isMultiAssetField("video")).toBe(true);
  });

  it("audio is not multi-asset", () => {
    expect(isMultiAssetField("audio")).toBe(false);
  });

  it("text is not multi-asset", () => {
    expect(isMultiAssetField("text")).toBe(false);
  });

  it("file is not multi-asset", () => {
    expect(isMultiAssetField("file")).toBe(false);
  });
});
