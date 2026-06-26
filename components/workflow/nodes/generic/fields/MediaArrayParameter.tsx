"use client";

import React from "react";
import * as LucideIcons from "lucide-react";
import FieldInfoTooltip from "../FieldInfoTooltip";
import { UploadPopup } from "../UploadPopup";
import { resolvePropagatedEdgeValue } from "@/lib/utils";

interface MediaArrayParameterProps {
  param: any;
  value: any;
  disabled: boolean;
  updateInput: (key: string, val: any) => void;
  showAddToRequestBtn: boolean;
  isLocked: boolean;
  handlePromoteInput: (param: any) => void;
  removeFileValue: (key: string, index?: number) => void;
  activeUploadPopup: string | null;
  setActiveUploadPopup: (key: string | null) => void;
  uploadingField: string | null;
  handleFileUpload: (key: string, files: FileList | null, isArray?: boolean) => Promise<void>;
  id: string;
  readOnly: boolean;
  isWired: boolean;
  edges: any[];
  nodes: any[];
  definition: any;
  edgeResolveOpts: any;
  handleId: string;
  parentInputs?: any;
}

function getMediaArrayMax(
  definition: any,
  param: { key: string; type?: string }
): number {
  const limit = definition.limits?.[param.key as keyof typeof definition.limits];
  if (limit?.maxCount != null) return limit.maxCount;
  if (param.type === "image-array") return 10;
  if (param.type === "video-array") return 7;
  if (param.type === "audio-array") return 5;
  return 10;
}

export function MediaArrayParameter({
  param,
  value,
  disabled,
  updateInput,
  showAddToRequestBtn,
  isLocked,
  handlePromoteInput,
  removeFileValue,
  activeUploadPopup,
  setActiveUploadPopup,
  uploadingField,
  handleFileUpload,
  id,
  readOnly,
  isWired,
  edges,
  nodes,
  definition,
  edgeResolveOpts,
  handleId,
  parentInputs,
}: MediaArrayParameterProps) {

  // --- Kling-style Image Upload ---
  if (param.type === "file-upload" && param.uiVariant === "kling-image-upload") {
    return (
      <div className="flex items-start gap-3">
        <span
          data-handle-anchor="label"
          className="shrink-0 pt-2 text-xs text-zinc-400"
        >
          {param.label}
          {param.required && <span className="text-red-400">*</span>}
        </span>
        <div className="flex-1">
          <div className="relative">
            <button
              type="button"
              tabIndex={-1}
              disabled={isWired || disabled}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => {
                if (!isWired && !disabled)
                  setActiveUploadPopup(activeUploadPopup === param.key ? null : param.key);
              }}
              className="nodrag flex w-full items-center justify-center gap-2 rounded-lg border border-dashed transition-colors disabled:opacity-50 border-white/10 bg-[#0C0C0E]/60 px-3 py-2.5 text-xs text-zinc-400 hover:border-[#7C3AED]/40 hover:text-zinc-200 hover:bg-white/[0.02]"
              title={
                isWired
                  ? "Image is supplied by an upstream connection"
                  : value
                    ? "Change image"
                    : "Upload image"
              }
            >
              {uploadingField === param.key ? (
                <LucideIcons.Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LucideIcons.Upload className="h-3.5 w-3.5" />
              )}
              <span className="capitalize font-semibold">
                {uploadingField === param.key
                  ? "Uploading..."
                  : value
                    ? "Change image"
                    : "Upload image"}
              </span>
            </button>
            <input
              id={`file-input-kling-${id}-${param.key}`}
              type="file"
              hidden
              accept="image/*"
              disabled={isWired || disabled}
              onChange={(e) => void handleFileUpload(param.key, e.target.files)}
            />
            <UploadPopup
              open={activeUploadPopup === param.key}
              onClose={() => setActiveUploadPopup(null)}
              onUpload={() => document.getElementById(`file-input-kling-${id}-${param.key}`)?.click()}
            />
          </div>
          {/* Show preview if a local image is set */}
          {value && !isWired && (
            <div className="mt-2 flex justify-end">
              <div className="flex flex-col items-end gap-1">
                <div
                  className="relative overflow-hidden rounded-md"
                  style={{ border: "2px solid rgba(59,130,246,0.3)" }}
                >
                  <img
                    alt=""
                    src={String(value)}
                    className="block rounded-sm"
                    style={{ maxWidth: 200, maxHeight: 120 }}
                  />
                  <button
                    type="button"
                    className="absolute right-1 top-1 z-10 rounded bg-black/60 p-0.5 text-white hover:bg-red-500 border-0"
                    onClick={() => updateInput(param.key, null)}
                  >
                    <LucideIcons.X className="h-2.5 w-2.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        {!isWired && showAddToRequestBtn && (
          <button
            type="button"
            className="nodrag mt-1.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200 transition-colors"
            disabled={isLocked}
            onClick={() => handlePromoteInput(param)}
            title="Add to request inputs"
          >
            <LucideIcons.Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    );
  }

  // --- Crop Overlay Preview ---
  if (param.type === "file-upload" && param.uiVariant === "crop-overlay-preview") {
    // Resolve image: wired edge takes priority, fall back to locally stored value
    const imgUrl: string | null =
      (isWired
        ? (() => {
            const edge = (edges ?? []).find(
              (e) => e.target === id && e.targetHandle === handleId
            );
            if (!edge) return null;
            const v = resolvePropagatedEdgeValue(edge, nodes ?? [], edgeResolveOpts);
            return typeof v === "string" && v.length > 0 ? v : null;
          })()
        : (Array.isArray(value) && value.length > 0 ? String(value[0]) : typeof value === "string" ? value : null)) ?? null;

    if (!imgUrl) {
      return isWired ? (
        <div className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#7C3AED]/30 bg-[#0A0A0C]/60 px-2.5 py-1.5 text-[10px] text-zinc-500 font-mono">
          <LucideIcons.Link2 className="w-3 h-3 text-[#7C3AED] shrink-0" />
          <span className="truncate">Wired Upstream (Awaiting Image)</span>
        </div>
      ) : (
        <div className="relative">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setActiveUploadPopup(activeUploadPopup === param.key ? null : param.key)}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/[0.12] bg-[#0C0C0E]/60 px-3 py-1.5 text-xs text-zinc-400 hover:border-[#7C3AED]/40 hover:text-zinc-200 hover:bg-white/[0.02] transition-colors disabled:opacity-50 nodrag font-semibold"
          >
            {uploadingField === param.key ? (
              <LucideIcons.Loader2 className="w-3 h-3 animate-spin shrink-0" />
            ) : (
              <LucideIcons.Upload className="w-3 h-3 text-zinc-500 shrink-0" />
            )}
            <span className="capitalize">
              {uploadingField === param.key ? "Uploading..." : `Upload image`}
            </span>
          </button>
          <input
            id={`file-input-${id}-${param.key}`}
            type="file"
            disabled={disabled}
            accept="image/*"
            className="hidden"
            onChange={(e) => void handleFileUpload(param.key, e.target.files)}
          />
          <UploadPopup
            open={activeUploadPopup === param.key}
            onClose={() => setActiveUploadPopup(null)}
            onUpload={() => {
              const input = document.getElementById(`file-input-${id}-${param.key}`);
              if (input) (input as HTMLInputElement).click();
            }}
          />
        </div>
      );
    }

    const clampPct = (n: number, min = 0, max = 100) =>
      Math.min(
        max,
        Math.max(min, Number.isFinite(n) ? Math.round(n) : min)
      );

    // Look up parent node inputs for coordinates (from prop)
    const activeInputs = parentInputs || {};
    const xv = clampPct(Number(activeInputs.x ?? 0));
    const yv = clampPct(Number(activeInputs.y ?? 0));
    const wv = clampPct(Number(activeInputs.w ?? 100), 1, 100);
    const hv = clampPct(Number(activeInputs.h ?? 100), 1, 100);
    const rightPct = Math.min(100, xv + wv);
    const bottomPct = Math.min(100, yv + hv);

    return (
      <div className="mt-2 flex justify-end">
        <div className="flex flex-col items-end gap-1.5 w-full max-w-[240px]">
          <div
            className="relative overflow-hidden rounded-md w-full"
            style={{ border: "2px solid rgba(59,130,246,0.3)" }}
          >
            <img
              alt=""
              src={imgUrl}
              className="block rounded-sm w-full"
              style={{ maxWidth: 240, maxHeight: 160 }}
            />
            {/* Dimmed overlay regions */}
            <div className="pointer-events-none absolute inset-0">
              <div
                className="absolute left-0 right-0 top-0 bg-black/35"
                style={{ height: `${yv}%` }}
              />
              <div
                className="absolute left-0 right-0 bg-black/35"
                style={{ top: `${bottomPct}%`, bottom: 0 }}
              />
              <div
                className="absolute left-0 bg-black/35"
                style={{
                  top: `${yv}%`,
                  width: `${xv}%`,
                  height: `${bottomPct - yv}%`,
                }}
              />
              <div
                className="absolute bg-black/35"
                style={{
                  top: `${yv}%`,
                  left: `${rightPct}%`,
                  right: 0,
                  height: `${bottomPct - yv}%`,
                }}
              />
              {/* Crop frame */}
              <div
                className="absolute border-2"
                style={{
                  left: `${xv}%`,
                  top: `${yv}%`,
                  width: `${wv}%`,
                  height: `${hv}%`,
                  borderColor: "rgba(167,139,250,0.9)",
                }}
              />
            </div>
            {/* Remove button — only when image is local (not wired) */}
            {!isWired && !isLocked && !readOnly && (
              <button
                type="button"
                onClick={() => removeFileValue(param.key)}
                className="nodrag absolute right-1 top-1 z-10 rounded bg-black/60 p-0.5 text-white hover:bg-red-500 border-0 cursor-pointer"
                title="Remove image"
              >
                <LucideIcons.X className="h-2.5 w-2.5" aria-hidden="true" />
              </button>
            )}
          </div>
          {/* Change Image Button — only when image is local (not wired) */}
          {!isWired && !isLocked && !readOnly && (
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => setActiveUploadPopup(activeUploadPopup === param.key ? null : param.key)}
                className="nodrag flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/5 bg-[#0C0C0E]/60 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02] hover:border-[#7C3AED]/20 transition-all cursor-pointer font-semibold"
              >
                {uploadingField === param.key ? (
                  <LucideIcons.Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <LucideIcons.RefreshCw className="w-3 h-3 text-zinc-500" />
                )}
                <span>Change Image</span>
              </button>
              <input
                id={`file-input-${id}-${param.key}`}
                type="file"
                disabled={disabled}
                accept="image/*"
                className="hidden"
                onChange={(e) => void handleFileUpload(param.key, e.target.files)}
              />
              <UploadPopup
                open={activeUploadPopup === param.key}
                onClose={() => setActiveUploadPopup(null)}
                onUpload={() => {
                  const input = document.getElementById(`file-input-${id}-${param.key}`);
                  if (input) (input as HTMLInputElement).click();
                }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Standard Single File Upload ---
  if (param.type === "file-upload") {
    const singleVal = typeof value === "string" ? value : "";
    return (
      <div className="space-y-2">
        {singleVal ? (
          <div className="relative rounded-lg border border-white/5 bg-[#050507] overflow-hidden p-2 flex items-center gap-3">
            {singleVal.startsWith("data:image") ||
            (singleVal.startsWith("http") &&
              (singleVal.includes(".jpg") ||
                singleVal.includes(".png") ||
                singleVal.includes(".jpeg") ||
                singleVal.includes(".webp") ||
                singleVal.match(/cropImage|gemini|openRouter|execute/i))) ? (
              <img
                src={singleVal}
                alt="Upload preview"
                className="w-12 h-12 object-contain bg-[#050507] rounded border border-white/5"
              />
            ) : (
              <div className="w-12 h-12 flex items-center justify-center bg-white/5 rounded text-zinc-400">
                {param.key.includes("video") ? (
                  <LucideIcons.Video className="w-5 h-5 text-zinc-500" />
                ) : param.key.includes("audio") ? (
                  <LucideIcons.Music className="w-5 h-5 text-zinc-500" />
                ) : (
                  <LucideIcons.File className="w-5 h-5 text-zinc-500" />
                )}
              </div>
            )}
            <span className="truncate flex-1 text-xs pr-8 text-zinc-300 font-mono">
              {singleVal.startsWith("data:")
                ? "base64 file buffer"
                : singleVal.split("/").pop()}
            </span>
            {!readOnly && (
              <button
                type="button"
                disabled={isLocked}
                onClick={() => removeFileValue(param.key)}
                className="nodrag absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-zinc-400 hover:text-red-400 hover:bg-white/5 disabled:opacity-30 transition-all active:scale-[0.9] duration-150 border-0"
                title="Clear file"
              >
                <LucideIcons.Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="relative">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setActiveUploadPopup(activeUploadPopup === param.key ? null : param.key)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/[0.12] bg-white/[0.015] px-3 py-2 text-xs text-zinc-400 hover:border-white/[0.22] hover:text-zinc-200 hover:bg-white/[0.03] transition-all active:scale-[0.98] duration-150 ease-out disabled:opacity-50 nodrag"
            >
              {uploadingField === param.key ? (
                <LucideIcons.Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LucideIcons.Upload className="w-3.5 h-3.5 text-zinc-500" />
              )}
              <span className="font-semibold">
                {uploadingField === param.key ? "Uploading..." : `Upload ${param.label.toLowerCase()}`}
              </span>
            </button>
            <input
              id={`file-input-${id}-${param.key}`}
              type="file"
              disabled={disabled}
              accept={
                param.key.includes("image")
                  ? "image/*"
                  : param.key.includes("video")
                    ? "video/*"
                    : param.key.includes("audio")
                      ? "audio/*"
                      : "*"
              }
              className="hidden"
              onChange={(e) => void handleFileUpload(param.key, e.target.files)}
            />
            <UploadPopup
              open={activeUploadPopup === param.key}
              onClose={() => setActiveUploadPopup(null)}
              onUpload={() => {
                const input = document.getElementById(`file-input-${id}-${param.key}`);
                if (input) (input as HTMLInputElement).click();
              }}
            />
          </div>
        )}
      </div>
    );
  }

  // --- Media Arrays (Image, Video, Audio) ---
  const arr = Array.isArray(value) ? value : [];
  const maxItems = getMediaArrayMax(definition, param);
  const atMax = arr.length >= maxItems;
  const isVideo = param.type === "video-array";
  const isAudio = param.type === "audio-array";
  const acceptTypes = isVideo ? "video/*" : isAudio ? "audio/*" : "image/*";

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span
          data-handle-anchor="label"
          className="shrink-0 pt-2 text-xs text-zinc-400 flex items-center gap-0.5"
        >
          {param.label}
          {param.required && <span className="text-red-400 ml-0.5">*</span>}
          {param.tooltip && <FieldInfoTooltip text={param.tooltip} />}
        </span>

        <div className="flex-1">
          {!readOnly && !isWired ? (
            <div className="relative">
              <button
                type="button"
                tabIndex={-1}
                disabled={disabled || atMax}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setActiveUploadPopup(activeUploadPopup === param.key ? null : param.key)}
                className="nodrag flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 bg-[#0C0C0E]/60 px-3 py-2.5 text-xs text-zinc-400 hover:border-[#7C3AED]/40 hover:text-zinc-200 hover:bg-white/[0.02] transition-colors disabled:opacity-50"
                title={`Upload ${isVideo ? "video" : isAudio ? "audio" : "image"}`}
              >
                {uploadingField === param.key ? (
                  <LucideIcons.Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LucideIcons.Upload className="h-3.5 w-3.5" />
                )}
                <span className="capitalize font-semibold">
                  {uploadingField === param.key ? "Uploading..." : `Upload ${isVideo ? "video" : isAudio ? "audio" : "image"}`}
                </span>
              </button>
              <input
                id={`file-input-${id}-${param.key}`}
                type="file"
                accept={acceptTypes}
                multiple
                className="hidden"
                disabled={disabled || atMax}
                onChange={(e) => {
                  void handleFileUpload(param.key, e.target.files, true).finally(() => {
                    e.target.value = "";
                  });
                }}
              />
              <UploadPopup
                open={activeUploadPopup === param.key}
                onClose={() => setActiveUploadPopup(null)}
                onUpload={() => document.getElementById(`file-input-${id}-${param.key}`)?.click()}
              />
            </div>
          ) : (
            arr.length === 0 && (
              <div className="text-xs text-zinc-500 italic">
                No items uploaded
              </div>
            )
          )}

          {!readOnly && !isWired && (
            <div className="mt-1 flex items-center gap-1">
              <span className="inline-flex cursor-pointer">
                <LucideIcons.Info className="h-3 w-3 text-zinc-500" />
              </span>
              <span className="text-[10px] text-zinc-500">Upload requirements</span>
              {param.tooltip && <FieldInfoTooltip text={param.tooltip} />}
            </div>
          )}

          {arr.length > 0 && (
            <div className={`mt-3 grid gap-2 ${isVideo || isAudio ? "grid-cols-2" : "grid-cols-3"}`}>
              {arr.map((url: string, idx: number) => (
                <div
                  key={idx}
                  className="nodrag nopan relative overflow-hidden rounded-lg border border-white/5 bg-black"
                  style={{ aspectRatio: isVideo || isAudio ? "4 / 3" : "1 / 1" }}
                  title={`${param.label} ${idx + 1}`}
                >
                  <div className="absolute left-1 top-1 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                    {idx + 1}
                  </div>
                  {isVideo ? (
                    <video src={url} className="h-full w-full object-cover" preload="metadata" playsInline />
                  ) : isAudio ? (
                    <div className="flex h-full w-full items-center justify-center p-1">
                      <audio src={url} controls className="w-full" preload="metadata" />
                    </div>
                  ) : (
                    <img src={url} alt="" className="h-full w-full object-cover" draggable={false} />
                  )}
                  {!readOnly && !isWired && (
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => removeFileValue(param.key, idx)}
                      className="nodrag absolute right-1 top-1 rounded bg-black/60 p-1 text-white hover:bg-red-500 disabled:opacity-50 border-0"
                      title="Remove"
                    >
                      <LucideIcons.X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              {!readOnly && !isWired && !atMax && (
                <button
                  type="button"
                  disabled={disabled}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => setActiveUploadPopup(activeUploadPopup === param.key ? null : param.key)}
                  className="nodrag relative overflow-hidden rounded-lg border border-dashed border-white/10 bg-[#0C0C0E]/60 hover:border-[#7C3AED]/40 cursor-pointer"
                  style={{ aspectRatio: isVideo || isAudio ? "4 / 3" : "1 / 1" }}
                  title={`Add ${isVideo ? "video" : isAudio ? "audio" : "image"}`}
                >
                  <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors">
                    <LucideIcons.Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="text-[9px] font-medium">Add</span>
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {param.handle && showAddToRequestBtn && (
        <button
          type="button"
          disabled={isLocked}
          onClick={() => handlePromoteInput(param)}
          className="nodrag mt-1.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
          <LucideIcons.Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
