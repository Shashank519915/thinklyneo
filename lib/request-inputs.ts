/**
 * Shared helpers for Request-Inputs field typing (canvas node + Playground tab).
 */

import type { WorkflowField } from "@/store/workflow-store";

/** Normalized UI / upload kind for a request field. */
export type RequestFieldKind =
  | "text"
  | "select"
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
    case "select_field":
      return "select";
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
export function isMultiAssetField(
  kind: RequestFieldKind,
  mediaMaxCount?: number
): boolean {
  if (mediaMaxCount === 1) return false;
  return kind === "image" || kind === "video";
}

export function maxAssetsForField(field: Pick<WorkflowField, "type" | "mediaMaxCount">): number {
  if (field.mediaMaxCount != null) return field.mediaMaxCount;
  if (field.type === "video_field" || field.type === "image_field") return 10;
  return 10;
}

/** Default for select fields (extract format → mp3). */
export function defaultSelectFieldValue(field: Pick<WorkflowField, "id" | "label" | "selectOptions">): string {
  if (/format/i.test(field.id) || /format/i.test(field.label)) {
    const hasMp3 = field.selectOptions?.some((o) => o.value === "mp3");
    if (hasMp3) return "mp3";
  }
  return field.selectOptions?.[0]?.value ?? "";
}

/** Build playground/API input map from node field definitions. */
export function buildInputValuesFromFields(
  fields: WorkflowField[],
  existing?: Record<string, string>
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const f of fields) {
    const prior = existing?.[f.id];
    if (prior !== undefined && prior !== "") {
      next[f.id] = prior;
    } else if (f.value != null && f.value !== "") {
      next[f.id] = f.value;
    } else if (f.type === "boolean_field") {
      next[f.id] = "false";
    } else if (f.type === "select_field") {
      next[f.id] = defaultSelectFieldValue(f);
    } else {
      next[f.id] = "";
    }
  }
  return next;
}

/** Playground/history: overlay a past run's inputValues onto current field definitions. */
export function hydrateInputValuesFromRun(
  fields: WorkflowField[],
  runInputValues: Record<string, unknown> | null | undefined,
  fallback?: Record<string, string>
): Record<string, string> {
  const fromRun: Record<string, string> = {};
  if (runInputValues && typeof runInputValues === "object") {
    for (const [key, val] of Object.entries(runInputValues)) {
      if (val == null) continue;
      if (Array.isArray(val)) {
        fromRun[key] = val.map(String).filter(Boolean).join(",");
      } else if (typeof val === "boolean") {
        fromRun[key] = val ? "true" : "false";
      } else {
        fromRun[key] = String(val);
      }
    }
  }
  return buildInputValuesFromFields(fields, { ...fallback, ...fromRun });
}

/** Fill empty select values before execute / API (e.g. format → mp3). */
export function normalizeInputValuesForRun(
  fields: WorkflowField[],
  values: Record<string, string>
): Record<string, string> {
  const next = { ...values };
  for (const f of fields) {
    if (f.type !== "select_field") continue;
    const v = (next[f.id] ?? "").trim();
    if (!v) next[f.id] = defaultSelectFieldValue(f);
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
