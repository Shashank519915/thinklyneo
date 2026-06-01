"use client";

/**
 * @fileoverview Execution History drawer: REST-backed run list with filters, live run pill, node drill-down, replay preview wiring.
 */

import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Check } from "lucide-react";
import type { Node as FlowNode } from "@xyflow/react";
import { useWorkflowStore } from "@/store/workflow-store";
import { classifyMediaUrl, formatDuration, sanitizeError } from "@/lib/utils";
import {
  cropImageDefinition,
  openrouterLlmDefinition,
  geminiDefinition,
  gptImage2Definition,
  klingV3Definition,
  mergeVideoDefinition,
  mergeAVDefinition,
  extractAudioDefinition,
  type NodeDefinition,
} from "@galaxy/shared";
import { SpinningLogo } from "@/components/SpinningLogo";

interface NodeRunData {
  id: string;
  nodeId: string;
  nodeName: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  inputs?: Record<string, unknown>;
  output?: unknown;
  error?: string;
  providerUsed?: string | null;
  providerAttempts?: Array<{ providerId: string; status: "success" | "failed"; error?: string; durationMs: number }> | null;
  logs?: string | null;
  creditCost?: number | null;
}

interface RunHistoryItem {
  id: string;
  scope: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  nodeRuns: NodeRunData[];
}

interface RightHistoryPanelProps {
  workflowId: string;
}

/**
 * Fires canonical auto-arrange after layout settles so expanded history rows don't overlap nodes blindly.
 *
 * NOTE: RAF + 160ms timeout mirrors React Flow measurement timing used after collapsing preview overlays.
 */
function scheduleAutoArrangeAfterHistoryPreviewToggle(): void {
  requestAnimationFrame(() => {
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("nextflow:auto-arrange"));
    }, 160);
  });
}

type FilterStatus = "all" | "queued" | "running" | "waiting" | "success" | "failed" | "canceled";

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: "all",      label: "All"       },
  { value: "queued",   label: "Queued"    },
  { value: "running",  label: "Running"   },
  { value: "waiting",  label: "Waiting"   },
  { value: "success",  label: "Completed" },
  { value: "failed",   label: "Failed"    },
  { value: "canceled", label: "Canceled"  },
];

const statusDot: Record<string, { color: string; label: string; pulse?: boolean }> = {
  success:  { color: "#10B981", label: "Completed" },
  failed:   { color: "#EF4444", label: "Failed"    },
  partial:  { color: "#F59E0B", label: "Partial"   },
  running:  { color: "#3B82F6", label: "Running", pulse: true },
  queued:   { color: "#8B5CF6", label: "Queued"    },
  waiting:  { color: "#F59E0B", label: "Waiting"   },
  canceled: { color: "#9CA3AF", label: "Canceled"  },
};

function getNodeTypeColor(nodeName: string): string {
  const lower = nodeName.toLowerCase();
  if (lower.includes("crop") || lower.includes("image")) return "#F97316";
  if (lower.includes("gemini") || lower.includes("gpt")) return "#3B82F6";
  if (lower.includes("response")) return "#3B82F6";
  if (lower.includes("request")) return "#6B7280";
  return "#6B7280";
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB") + ", " + d.toLocaleTimeString("en-GB");
}

function formatScopeLabel(scope: string): string {
  if (scope === "full") return "Full workflow";
  if (scope === "partial") return "Partial run";
  if (scope === "single") return "Single node";
  return scope;
}

const DEFINITIONS_BY_NAME: Record<string, NodeDefinition> = {
  [cropImageDefinition.name]: cropImageDefinition,
  [geminiDefinition.name]: geminiDefinition,
  [openrouterLlmDefinition.name]: openrouterLlmDefinition,
  [gptImage2Definition.name]: gptImage2Definition,
  [klingV3Definition.name]: klingV3Definition,
  [mergeVideoDefinition.name]: mergeVideoDefinition,
  [mergeAVDefinition.name]: mergeAVDefinition,
  [extractAudioDefinition.name]: extractAudioDefinition,
};

function resolveInputLabel(nodeName: string, key: string): string {
  const def = DEFINITIONS_BY_NAME[nodeName];
  const param = def?.inputs?.find((i) => i.key === key);
  if (param?.label) return param.label;
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function getRequestFieldLabel(fieldId: string, nodes: FlowNode[]): string {
  const reqNode = nodes.find((n) => n.type === "requestInputs" || n.id === "request-inputs");
  if (!reqNode) return fieldId.replace(/^field_/, "").replace(/_/g, " ");
  const fields = ((reqNode.data as { fields?: Array<{ id: string; label?: string }> }).fields) ?? [];
  const field = fields.find((f) => f.id === fieldId);
  return field?.label?.trim() || fieldId.replace(/^field_/, "").replace(/_/g, " ");
}

function getResponseSlotLabel(slotId: string, nodes: FlowNode[]): string {
  const respNode = nodes.find((n) => n.type === "response" || n.id === "response");
  if (!respNode) return slotId;
  const results = ((respNode.data as { results?: Array<{ id: string; label?: string }> }).results) ?? [];
  const slot = results.find((r) => r.id === slotId);
  return slot?.label?.trim() || slotId;
}

function isImageMediaUrl(s: string): boolean {
  const m = classifyMediaUrl(s.trim());
  return m?.kind === "image";
}

function truncateMiddle(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  const half = Math.floor((maxLen - 1) / 2);
  return s.slice(0, half) + "…" + s.slice(s.length - half);
}

/** Summarize multi-key output objects for collapsed history rows. */
function summarizeMultiKeyOutput(obj: Record<string, unknown>): string {
  let videos = 0;
  let audios = 0;
  let images = 0;
  let files = 0;
  let other = 0;

  for (const v of Object.values(obj)) {
    if (typeof v !== "string") {
      other++;
      continue;
    }
    const m = classifyMediaUrl(v);
    if (!m) {
      other++;
      continue;
    }
    if (m.kind === "video") videos++;
    else if (m.kind === "audio") audios++;
    else if (m.kind === "image") images++;
    else files++;
  }

  const parts: string[] = [];
  if (videos) parts.push(`${videos} video${videos > 1 ? "s" : ""}`);
  if (audios) parts.push(`${audios} audio${audios > 1 ? "s" : ""}`);
  if (images) parts.push(`${images} image${images > 1 ? "s" : ""}`);
  if (files) parts.push(`${files} file${files > 1 ? "s" : ""}`);
  if (other) parts.push(`${other} result${other > 1 ? "s" : ""}`);
  return parts.length > 0 ? `[${parts.join(" + ")}]` : `[${Object.keys(obj).length} results]`;
}

function extractPlayableMediaFromObject(output: unknown): { url: string; kind: "video" | "audio" | "file" } | null {
  if (output && typeof output === "object" && !Array.isArray(output)) {
    const o = output as Record<string, unknown>;
    for (const k of ["outputVideo", "outputAudio", "outputUrl", "url", "result", "href"]) {
      const v = o[k];
      if (typeof v === "string") {
        const m = classifyMediaUrl(v);
        if (m && m.kind !== "image") return m as { url: string; kind: "video" | "audio" | "file" };
      }
    }
  }
  return null;
}

/** Inline preview (with controls) for image/video/audio/file history values, plus a source link. */
function MediaPreview({
  url,
  kind,
  showLink = true,
  compact = false,
}: {
  url: string;
  kind: "image" | "video" | "audio" | "file";
  showLink?: boolean;
  compact?: boolean;
}) {
  if (kind === "file") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block truncate text-[10px] text-blue-600 hover:underline"
        title={url}
      >
        {truncateMiddle(url, 48)}
      </a>
    );
  }
  const mediaMaxH = compact ? "max-h-16" : "max-h-20";
  return (
    <div className="space-y-1">
      {kind === "video" ? (
        <video
          src={url}
          controls
          preload="metadata"
          controlsList="nodownload nofullscreen"
          className={`${mediaMaxH} w-full rounded-md border border-gray-200 bg-black/5 object-contain`}
        />
      ) : kind === "audio" ? (
        <audio src={url} controls preload="metadata" className="w-full max-h-8" />
      ) : (
        <div className={`${mediaMaxH} overflow-hidden rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className={`${mediaMaxH} max-w-full object-contain`} loading="lazy" />
        </div>
      )}
      {showLink && url.startsWith("http") && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-[10px] text-blue-600 hover:underline"
          title={url}
        >
          {truncateMiddle(url, 48)}
        </a>
      )}
    </div>
  );
}

/** Render any stored value with classifyMediaUrl-first detection. */
function ValuePreview({
  value,
  compact = false,
}: {
  value: unknown;
  compact?: boolean;
}) {
  if (value === null || value === undefined) {
    return <p className="text-[11px] text-gray-400">—</p>;
  }

  if (typeof value === "string") {
    const media = classifyMediaUrl(value);
    if (media) return <MediaPreview url={media.url} kind={media.kind} compact={compact} />;
    if (looksLikeOpaquePayload(value)) {
      return <p className="text-[11px] text-amber-700">Large/binary output omitted in history.</p>;
    }
    return (
      <div className="max-h-20 overflow-y-auto rounded-md border border-gray-100 bg-white px-2 py-1.5 text-[11px] text-gray-800 leading-snug whitespace-pre-wrap break-words">
        {value}
      </div>
    );
  }

  const nestedMedia = extractPlayableMediaFromObject(value);
  if (nestedMedia) {
    return <MediaPreview url={nestedMedia.url} kind={nestedMedia.kind} compact={compact} />;
  }

  return (
    <div className="max-h-20 overflow-y-auto rounded-md border border-gray-100 bg-white px-2 py-1.5 text-[11px] text-gray-800 leading-snug whitespace-pre-wrap break-words">
      {JSON.stringify(value, null, 2)}
    </div>
  );
}

function looksLikeOpaquePayload(s: string): boolean {
  if (s.length < 240) return false;
  const sample = s.slice(0, 120).replace(/\s/g, "");
  if (/^data:image\//i.test(s)) return false;
  if (/^https?:\/\//i.test(s.trim())) return false;
  return /^[A-Za-z0-9+/=]+$/.test(sample);
}

function parseOutputAsRecord(output: unknown): Record<string, unknown> | null {
  if (output == null) return null;
  if (typeof output === "object" && !Array.isArray(output)) return output as Record<string, unknown>;
  if (typeof output === "string") {
    try {
      const j = JSON.parse(output) as unknown;
      if (j && typeof j === "object" && !Array.isArray(j)) return j as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

function isRequestInputsNodeRun(nr: NodeRunData): boolean {
  if (nr.nodeId === "request-inputs" || nr.nodeName === "Request-Inputs") return true;
  const out = parseOutputAsRecord(nr.output);
  if (!out) return false;
  const keys = Object.keys(out);
  if (keys.length === 0) return false;
  return keys.every((k) => k.startsWith("field_"));
}

function isResponseNodeRun(nr: NodeRunData): boolean {
  return nr.nodeId === "response" || nr.nodeName === "Output" || nr.nodeName === "Response";
}

/** data:/https image URLs, or raw base64 when the field key suggests an image upload. */
function valueToImagePreviewSrc(value: unknown, fieldKey: string): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  if (!t) return null;
  if (isImageMediaUrl(t) || t.startsWith("data:image/")) return t;
  const imageishKey = /image|photo|picture|img/i.test(fieldKey);
  const compact = t.replace(/\s/g, "");
  if (
    imageishKey &&
    compact.length >= 80 &&
    /^[A-Za-z0-9+/]+=*$/.test(compact)
  ) {
    return `data:image/png;base64,${compact}`;
  }
  return null;
}

function summarizeOutputForRow(output: unknown): string | null {
  if (typeof output === "string") {
    const m = classifyMediaUrl(output);
    if (m?.kind === "image") return "[Image output]";
    if (m?.kind === "video") return "[Video output]";
    if (m?.kind === "audio") return "[Audio output]";
    if (m?.kind === "file") return "[File output]";
    return null;
  }
  if (output && typeof output === "object" && !Array.isArray(output)) {
    const obj = output as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 0) return null;
    if (keys.length === 1 && typeof obj[keys[0]] === "string") {
      const m = classifyMediaUrl(obj[keys[0]] as string);
      if (m?.kind === "image") return "[Image output]";
      if (m?.kind === "video") return "[Video output]";
      if (m?.kind === "audio") return "[Audio output]";
      if (m?.kind === "file") return "[File output]";
      return null;
    }
    return summarizeMultiKeyOutput(obj);
  }
  const nested = extractPlayableMediaFromObject(output);
  if (nested) {
    return nested.kind === "video" ? "[Video output]" : nested.kind === "audio" ? "[Audio output]" : "[File output]";
  }
  return null;
}

function nodeRowSummary(nr: NodeRunData): { text: string; kind: "error" | "ok" | "empty" } {
  if (nr.error) return { text: sanitizeError(nr.error), kind: "error" };
  if (isRequestInputsNodeRun(nr)) {
    const n = Object.keys(nr.inputs ?? {}).filter((k) => k.startsWith("field_")).length;
    return { text: n > 0 ? `Input fields (${n})` : "Input fields", kind: "ok" };
  }
  if (nr.output !== null && nr.output !== undefined) {
    const mediaSummary = summarizeOutputForRow(nr.output);
    if (mediaSummary) return { text: mediaSummary, kind: "ok" };

    let rawText = "";
    if (typeof nr.output === "object" && !Array.isArray(nr.output) && nr.output !== null) {
      const obj = nr.output as Record<string, unknown>;
      const keys = Object.keys(obj);
      if (keys.length === 1 && typeof obj[keys[0]] === "string") {
        rawText = obj[keys[0]] as string;
      } else {
        rawText = summarizeMultiKeyOutput(obj);
      }
    } else {
      rawText = typeof nr.output === "string" ? nr.output : JSON.stringify(nr.output);
    }

    if (looksLikeOpaquePayload(rawText)) return { text: "[Output hidden — large/binary]", kind: "ok" };
    const t = rawText.length > 100 ? `${rawText.slice(0, 100)}…` : rawText;
    return { text: t, kind: "ok" };
  }
  return { text: "—", kind: "empty" };
}

function ScrollText({
  label,
  value,
  empty = "—",
}: {
  label: string;
  value: string | null | undefined;
  empty?: string;
}) {
  const v = value?.trim() ? value : "";
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">
        {label}
      </p>
      <div className="max-h-16 overflow-y-auto rounded-md border border-gray-100 bg-white px-2 py-1.5 text-[11px] text-gray-800 leading-snug whitespace-pre-wrap break-words">
        {v || empty}
      </div>
    </div>
  );
}

function SmallImageStrip({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
        Images
      </p>
      <div className="flex flex-wrap gap-1.5">
        {urls.map((src, i) => (
          <div
            key={`${i}-${src.slice(0, 48)}`}
            className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
          </div>
        ))}
      </div>
    </div>
  );
}

function OutputDetail({
  output,
  labelForKey,
}: {
  output: unknown;
  labelForKey?: (key: string) => string;
}) {
  if (output === null || output === undefined) {
    return <p className="text-[11px] text-gray-400">—</p>;
  }

  // Prisma usually returns parsed Json, but normalize stringified objects if present.
  const normalized = parseOutputAsRecord(output) ?? output;

  if (typeof normalized === "object" && !Array.isArray(normalized) && normalized !== null) {
    const obj = normalized as Record<string, unknown>;
    const keys = Object.keys(obj);

    if (keys.length === 0) {
      return <p className="text-[11px] text-gray-400">{}</p>;
    }

    if (keys.length === 1) {
      return <ValuePreview value={obj[keys[0]]} compact />;
    }

    return (
      <div className="space-y-2 rounded-md border border-gray-100 bg-white p-2">
        {keys.map((k) => (
          <div key={k} className="border-b border-gray-50 pb-1.5 last:border-0 last:pb-0">
            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">
              {labelForKey ? labelForKey(k) : k}
            </p>
            <ValuePreview value={obj[k]} compact />
          </div>
        ))}
      </div>
    );
  }

  return <ValuePreview value={normalized} compact />;
}

function RequestInputsHistoryBody({
  nr,
  fieldLabel,
}: {
  nr: NodeRunData;
  fieldLabel: (fieldId: string) => string;
}) {
  const raw = nr.inputs ?? {};
  const keys = Object.keys(raw)
    .filter((k) => k !== "__runId" && k.startsWith("field_"))
    .sort();

  return (
    <div className="space-y-3 border-t border-gray-100 pt-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Form inputs</p>
      {keys.length === 0 ? (
        <p className="text-[11px] text-gray-400">No field values recorded.</p>
      ) : (
        keys.map((key) => {
          const v = raw[key];
          const label = fieldLabel(key);
          const media = typeof v === "string" ? classifyMediaUrl(v) : null;
          const base64Img = !media && typeof v === "string" ? valueToImagePreviewSrc(v, key) : null;
          if (media || base64Img) {
            return (
              <div key={key}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                  {label}
                </p>
                {media ? (
                  <MediaPreview url={media.url} kind={media.kind} compact />
                ) : (
                  <MediaPreview url={base64Img!} kind="image" showLink={false} compact />
                )}
              </div>
            );
          }
          const text = v == null ? "" : typeof v === "string" ? v : JSON.stringify(v, null, 2);
          return <ScrollText key={key} label={label} value={text} />;
        })
      )}
    </div>
  );
}

function ExpandedNodePanel({ nr }: { nr: NodeRunData }) {
  const nodes = useWorkflowStore((s) => s.nodes);
  const isRequest = isRequestInputsNodeRun(nr);
  const isResponse = isResponseNodeRun(nr);

  const inputs = nr.inputs ?? {};
  const prompt =
    typeof inputs.prompt === "string" ? inputs.prompt : inputs.prompt != null ? String(inputs.prompt) : "";
  const systemPrompt =
    typeof inputs.systemPrompt === "string"
      ? inputs.systemPrompt
      : inputs.systemPrompt != null
        ? String(inputs.systemPrompt)
        : "";

  const imageArrayUrls = isRequest || isResponse
    ? []
    : (Array.isArray((inputs as Record<string, unknown>).images)
        ? ((inputs as Record<string, unknown>).images as unknown[]).filter(
            (x): x is string => typeof x === "string" && isImageMediaUrl(x)
          )
        : []);

  // Response node inputs duplicate output — only show the Output block for that node.
  const mediaInputs = isRequest || isResponse
    ? []
    : Object.entries(inputs).flatMap(([k, v]) => {
        const m = typeof v === "string" ? classifyMediaUrl(v) : null;
        return m ? [{ key: k, url: m.url, kind: m.kind }] : [];
      });
  const mediaInputKeys = new Set(mediaInputs.map((m) => m.key));

  const skippedKeys = new Set([
    "prompt",
    "systemPrompt",
    "images",
    "temperature",
    "maxTokens",
    "topP",
  ]);
  const otherEntries = isRequest || isResponse
    ? []
    : Object.entries(inputs).filter(([k]) => !skippedKeys.has(k) && !mediaInputKeys.has(k));

  const outputLabelForKey = (key: string) =>
    isResponse ? getResponseSlotLabel(key, nodes) : key;

  return (
    <div className="mt-2 space-y-2 border border-gray-200 rounded-lg bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[10px] text-gray-500">
        <span>
          Started:{" "}
          <span className="font-medium tabular-nums text-gray-700">{formatTimestamp(nr.startedAt)}</span>
        </span>
        <span>
          Duration:{" "}
          <span className="font-medium tabular-nums text-gray-700">{formatDuration(nr.durationMs)}</span>
        </span>
        <span>
          Cost:{" "}
          <span className="font-medium text-gray-700">
            {nr.creditCost !== undefined && nr.creditCost !== null
              ? `${(nr.creditCost / 1000000).toFixed(2)}M`
              : "0.00M"}
          </span>
        </span>
        {nr.providerUsed && (
          <span>
            Provider:{" "}
            <span className="font-medium text-indigo-600">{nr.providerUsed}</span>
          </span>
        )}
      </div>

      {isRequest ? (
        <RequestInputsHistoryBody
          nr={nr}
          fieldLabel={(fieldId) => getRequestFieldLabel(fieldId, nodes)}
        />
      ) : (
        <>
          {(prompt || systemPrompt || imageArrayUrls.length > 0 || mediaInputs.length > 0) && (
            <div className="space-y-2 border-b border-gray-100 pb-2">
              {prompt ? <ScrollText label="Prompt" value={prompt} /> : null}
              {systemPrompt ? <ScrollText label="System prompt" value={systemPrompt} /> : null}
              <SmallImageStrip urls={imageArrayUrls} />
              {mediaInputs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Inputs</p>
                  <div className={mediaInputs.length > 1 ? "grid grid-cols-2 gap-2" : "space-y-2"}>
                    {mediaInputs.map((m) => (
                      <div key={m.key}>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">
                          {resolveInputLabel(nr.nodeName, m.key)}
                        </p>
                        <MediaPreview url={m.url} kind={m.kind} compact />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {otherEntries.length > 0 && (
            <details className="text-[11px]">
              <summary className="cursor-pointer text-gray-500 hover:text-gray-700">Other inputs</summary>
              <div className="mt-1 max-h-24 overflow-y-auto rounded-md bg-gray-50 px-2 py-1 font-mono text-[10px] text-gray-700">
                {otherEntries.map(([k, v]) => {
                  if (typeof v === "string" && isImageMediaUrl(v)) {
                    return (
                      <div key={k} className="py-1">
                        <span className="font-semibold text-gray-600">{k}:</span>{" "}
                        <span className="italic text-gray-500">[image]</span>
                      </div>
                    );
                  }
                  let str = typeof v === "object" ? JSON.stringify(v) : String(v ?? "—");
                  if (typeof v === "string" && looksLikeOpaquePayload(v)) {
                    str = "[Large value hidden]";
                  }
                  return (
                    <div key={k} className="py-0.5 break-words">
                      <span className="font-semibold text-gray-600">{k}:</span>{" "}
                      {str.length > 200 ? `${str.slice(0, 200)}…` : str}
                    </div>
                  );
                })}
              </div>
            </details>
          )}

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">
              {isResponse ? "Results" : "Output"}
            </p>
            <OutputDetail output={nr.output} labelForKey={outputLabelForKey} />
          </div>
        </>
      )}

      {nr.providerAttempts && nr.providerAttempts.length > 0 && (
        <div className="border-t border-gray-100 pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Attempts</p>
          <div className="space-y-1">
            {nr.providerAttempts.map((attempt, idx) => (
              <div key={idx} className="flex flex-col gap-0.5 bg-gray-50 px-2 py-1.5 rounded border border-gray-200 text-[10px]">
                <div className="flex items-center justify-between font-medium">
                  <span className="text-gray-700 font-semibold">{attempt.providerId}</span>
                  <div className="flex items-center gap-1.5 shrink-0 font-mono text-[9px]">
                    <span className={attempt.status === "success" ? "text-green-600 font-bold" : "text-red-500"}>
                      {attempt.status.toUpperCase()}
                    </span>
                    <span className="text-gray-400">({attempt.durationMs}ms)</span>
                  </div>
                </div>
                {attempt.error && (
                  <p className="text-[9px] text-red-500 font-normal leading-normal whitespace-pre-wrap break-words mt-0.5">
                    Error: {attempt.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {nr.logs && (
        <div className="border-t border-gray-100 pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Execution Logs</p>
          <pre className="max-h-36 overflow-y-auto rounded-md bg-neutral-900 px-3 py-2 font-mono text-[9px] text-neutral-200 leading-snug whitespace-pre-wrap break-words">
            {nr.logs}
          </pre>
        </div>
      )}

      {nr.error && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-red-400 mb-0.5">Error</p>
          <p className="text-[11px] text-red-600 leading-snug">{sanitizeError(nr.error)}</p>
        </div>
      )}
    </div>
  );
}

// ── Custom dropdown ───────────────────────────────────────────────────────────

function FilterDropdown({
  value,
  onChange,
}: {
  value: FilterStatus;
  onChange: (v: FilterStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = FILTER_OPTIONS.find((o) => o.value === value)!;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        {selected.label}
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 opacity-60" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-36 rounded-xl border border-gray-100 bg-white shadow-xl py-1 overflow-hidden">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-800 hover:bg-gray-50 transition-colors"
            >
              <span className="w-4 flex-shrink-0">
                {value === opt.value && <Check className="w-3.5 h-3.5 text-gray-700" />}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── RunItem ───────────────────────────────────────────────────────────────────

function RunItem({
  run,
  isExpanded,
  onToggle,
  expandedNodeRunId,
  onExpandedNodeChange,
}: {
  run: RunHistoryItem;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  expandedNodeRunId: string | null;
  onExpandedNodeChange: (nodeRunId: string | null) => void;
}) {
  const { setPreviewRun, clearPreviewRun } = useWorkflowStore();
  const sd = statusDot[run.status] ?? statusDot.failed;
  const isLive = run.status === "running";

  const handleToggle = () => {
    if (isLive) return;
    const willExpand = !isExpanded;
    onToggle();
    if (willExpand) {
      setPreviewRun(run as Parameters<typeof setPreviewRun>[0]);
    } else {
      clearPreviewRun();
    }
    scheduleAutoArrangeAfterHistoryPreviewToggle();
  };

  return (
    <div
      className={`rounded-xl border transition-colors mb-2 overflow-hidden ${
        isLive
          ? "border-[#3B82F6] bg-[#EFF6FF]"
          : isExpanded
          ? "border-[#7C3AED] bg-[#F8F5FF]"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={handleToggle}
        disabled={isLive}
      >
        <div className="flex items-start gap-3 min-w-0">
          <span className="mt-[3px] flex-shrink-0 relative">
            <span
              className="block w-3 h-3 rounded-full"
              style={{ background: sd.color }}
            />
            {sd.pulse && (
              <span
                className="absolute inset-0 rounded-full animate-ping opacity-60"
                style={{ background: sd.color }}
              />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-gray-900 leading-tight">
              {sd.label}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {isLive
                ? "In progress…"
                : `Credits: ${(() => {
                    const totalCost = run.nodeRuns.reduce((sum, nr) => sum + (nr.creditCost ?? 0), 0);
                    return `${(totalCost / 1000000).toFixed(2)}M`;
                  })()}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className="text-[11px] text-gray-400 tabular-nums">
            {formatTimestamp(run.startedAt)}
          </span>
          {!isLive &&
            (isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" aria-hidden />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" aria-hidden />
            ))}
        </div>
      </button>

      {/* Expanded node list */}
      {isExpanded && run.nodeRuns.length > 0 && (
        <div className="border-t border-[#E9E3FF] bg-[#FAF8FF]/80 px-4 py-2">
          <p className="text-[11px] font-medium text-gray-600 mb-2">
            Scope — {formatScopeLabel(run.scope)}
          </p>
          <div className="divide-y divide-gray-100/90">
            {run.nodeRuns.map((nr) => {
              const rowBg =
                nr.status === "success"
                  ? "bg-[#F0FDF4]/90"
                  : nr.status === "failed"
                  ? "bg-[#FFF5F5]/90"
                  : "bg-[#FFFBEB]/90";
              const borderColor =
                nr.status === "success"
                  ? "border-l-[#10B981]"
                  : nr.status === "failed"
                  ? "border-l-[#EF4444]"
                  : "border-l-[#F59E0B]";
              const summary = nodeRowSummary(nr);
              const nodeOpen = expandedNodeRunId === nr.id;

              return (
                <div key={nr.id} className={`border-l-[3px] ${borderColor} ${rowBg}`}>
                  <button
                    type="button"
                    className="nodrag flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-black/[0.02]"
                    onClick={(e) => {
                      e.stopPropagation();
                      onExpandedNodeChange(nodeOpen ? null : nr.id);
                    }}
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0 mt-1"
                      style={{ background: getNodeTypeColor(nr.nodeName) }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-medium text-gray-800 truncate">
                          {nr.nodeName}
                        </span>
                        <span className="text-[11px] text-gray-400 shrink-0 tabular-nums">
                          {formatDuration(nr.durationMs)}
                        </span>
                      </div>
                      <p
                        className={`text-[11px] mt-0.5 pl-0 leading-snug line-clamp-2 ${
                          summary.kind === "error" ? "text-red-600" : "text-gray-600"
                        }`}
                      >
                        {summary.kind === "error" ? "✗ " : summary.kind === "ok" ? "→ " : ""}
                        {summary.text}
                      </p>
                    </div>
                    {nodeOpen ? (
                      <ChevronUp className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" aria-hidden />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" aria-hidden />
                    )}
                  </button>
                  {nodeOpen && (
                    <div className="px-3 pb-3">
                      <ExpandedNodePanel nr={nr} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

/** Sidebar listing `/api/workflows/:id/history` + synthetic in-flight run mirrored from workflow store preview state. */
export default function RightHistoryPanel({ workflowId }: RightHistoryPanelProps) {
  const {
    setIsHistoryPanelOpen,
    runHistory,
    setRunHistory,
    clearPreviewRun,
    isRunning,
    currentRunId,
    currentRunScope,
  } = useWorkflowStore();

  const [activeTab, setActiveTab] = useState<"ui" | "api">("ui");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [loading, setLoading] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [expandedNodeDetail, setExpandedNodeDetail] = useState<{
    runId: string;
    nodeRunId: string;
  } | null>(null);

  // Auto-switch to UI Runs tab when a run starts
  useEffect(() => {
    if (isRunning) setActiveTab("ui");
  }, [isRunning]);

  const handleRunToggle = (runId: string) => {
    setExpandedNodeDetail(null);
    setExpandedRunId((prev) => (prev === runId ? null : runId));
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/workflows/${workflowId}/history`);
      const data = await resp.json();
      if (data.data) setRunHistory(data.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, [workflowId]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchHistory();
    };
    window.addEventListener("nextflow:refresh-history", handleRefresh);
    return () => window.removeEventListener("nextflow:refresh-history", handleRefresh);
  }, [workflowId]);

  // Build the synthetic "running" entry to show at the top while executing
  const liveRun: RunHistoryItem | null = isRunning
    ? {
        id: currentRunId ?? "__live__",
        scope: currentRunScope ?? "full",
        status: "running",
        startedAt: new Date().toISOString(),
        nodeRuns: [],
      }
    : null;

  // The live pill only shows when filter is "all" or "running"
  const showLive = liveRun && (filter === "all" || filter === "running");

  // Filter completed history (never show "running" status from DB in the list since we use liveRun for that)
  const filteredRuns = runHistory.filter((r) => {
    // If this run is exactly the one we're showing as liveRun, hide it from the DB list
    if (showLive && r.id === liveRun.id) return false;
    
    if (filter === "all") return true;
    // Map filter values to actual stored statuses
    if (filter === "success") return r.status === "success";
    if (filter === "failed") return r.status === "failed";
    if (filter === "canceled") return r.status === "canceled";
    if (filter === "running") return r.status === "running";
    if (filter === "queued") return r.status === "queued";
    if (filter === "waiting") return r.status === "waiting";
    return true;
  });

  return (
    <div className="flex-shrink-0 relative h-full">
      <div className="h-full min-h-0 w-[360px] border-l border-gray-200 bg-gray-50">
        <div className="flex h-full min-h-0 flex-col">

          {/* Sticky header */}
          <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-gray-900">Execution History</div>
              <button
                onClick={() => {
                  const hadPreview = useWorkflowStore.getState().previewRunId !== null;
                  clearPreviewRun();
                  setExpandedRunId(null);
                  setExpandedNodeDetail(null);
                  setIsHistoryPanelOpen(false);
                  if (hadPreview) scheduleAutoArrangeAfterHistoryPreviewToggle();
                }}
                className="inline-flex items-center justify-center rounded-[18px] h-8 px-3 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
            </div>

            {/* Tab toggle + refresh */}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex flex-1 rounded-lg border border-gray-200 bg-gray-100 p-0.5">
                <button
                  onClick={() => setActiveTab("ui")}
                  className={`flex-1 rounded-md py-1.5 px-3 text-[11px] font-medium transition-colors ${
                    activeTab === "ui"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  UI Runs
                </button>
                <button
                  onClick={() => setActiveTab("api")}
                  className={`flex-1 rounded-md py-1.5 px-3 text-[11px] font-medium transition-colors ${
                    activeTab === "api"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  API Runs
                </button>
              </div>
              <button
                onClick={fetchHistory}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[18px] border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                title="Refresh"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {/* Filter row */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="text-xs font-medium text-gray-600">Run history</div>
              <FilterDropdown value={filter} onChange={setFilter} />
            </div>

            {/* Run list */}
            {activeTab === "api" ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
                <p className="text-[12px] font-medium text-gray-600 mb-1">No API runs yet</p>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Trigger this workflow externally via{" "}
                  <code className="bg-gray-100 px-1 py-0.5 rounded text-[10px] font-mono text-gray-600">
                    POST /api/workflows/{"{id}"}/run
                  </code>{" "}
                  with a valid session to see runs here.
                </p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-8">
                <SpinningLogo size="sm" />
              </div>
            ) : !showLive && filteredRuns.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center text-xs text-gray-500">
                No runs for this filter yet.
              </div>
            ) : (
              <div className="space-y-2">
                {/* Live running pill — always at top */}
                {showLive && (
                  <RunItem
                    key="__live__"
                    run={liveRun!}
                    index={0}
                    isExpanded={false}
                    onToggle={() => {}}
                    expandedNodeRunId={null}
                    onExpandedNodeChange={() => {}}
                  />
                )}
                {filteredRuns.map((run, i) => (
                  <RunItem
                    key={run.id}
                    run={run}
                    index={filteredRuns.length - 1 - i}
                    isExpanded={expandedRunId === run.id}
                    onToggle={() => handleRunToggle(run.id)}
                    expandedNodeRunId={
                      expandedNodeDetail?.runId === run.id ? expandedNodeDetail.nodeRunId : null
                    }
                    onExpandedNodeChange={(nodeRunId) => {
                      setExpandedNodeDetail((prev) => {
                        if (nodeRunId === null) {
                          return prev?.runId === run.id ? null : prev;
                        }
                        if (prev?.runId === run.id && prev.nodeRunId === nodeRunId) return null;
                        return { runId: run.id, nodeRunId };
                      });
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
