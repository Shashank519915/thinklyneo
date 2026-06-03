/**
 * Shared helpers for Request-Inputs field typing (canvas node + Playground tab).
 */

import type { WorkflowField } from "@/store/workflow-store";

/** Normalized UI / upload kind for a request field. */
export type RequestFieldKind =
  | "text"
  | "number"
  | "boolean"
  | "image"
  | "video"
  | "audio"
  | "file";

/**
 * Resolves the display and control kind for a Request-Inputs field.
 * Uses explicit `field.type` first, then legacy id prefixes (`field_image_*`, etc.).
 */
export function getRequestFieldKind(field: Pick<WorkflowField, "id" | "type">): RequestFieldKind {
  // Legacy ids win over a stale/wrong `type` (common when older workflows omit field.type).
  if (field.id.includes("image")) return "image";
  if (field.id.includes("video")) return "video";
  if (field.id.includes("audio")) return "audio";
  if (field.id.includes("number")) return "number";
  if (field.id.includes("boolean")) return "boolean";
  if (field.id.startsWith("field_text_")) return "text";

  switch (field.type) {
    case "text_field":
      return "text";
    case "number_field":
      return "number";
    case "boolean_field":
      return "boolean";
    case "image_field":
      return "image";
    case "video_field":
      return "video";
    case "audio_field":
      return "audio";
    case "file_field":
    case "media_field":
      return "file";
    default:
      break;
  }

  return "text";
}

/** Whether the field supports multiple comma-separated asset URLs (images, videos). */
export function isMultiAssetField(kind: RequestFieldKind): boolean {
  return kind === "image" || kind === "video";
}

/** Build playground/API input map from node field definitions. */
export function buildInputValuesFromFields(
  fields: WorkflowField[],
  existing?: Record<string, string>
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const f of fields) {
    const prior = existing?.[f.id];
    if (prior !== undefined) {
      next[f.id] = prior;
    } else if (f.value != null && f.value !== "") {
      next[f.id] = f.value;
    } else {
      next[f.id] = f.type === "boolean_field" ? "false" : "";
    }
  }
  return next;
}

/** MIME accept attribute for file inputs. */
export function acceptForFieldKind(kind: RequestFieldKind): string {
  switch (kind) {
    case "image":
      return "image/*";
    case "video":
      return "video/*";
    case "audio":
      return "audio/*";
    default:
      return "*/*";
  }
}
