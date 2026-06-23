"use client";

import React from "react";
import { Handle, Position } from "@xyflow/react";
import * as LucideIcons from "lucide-react";
import FieldInfoTooltip from "../FieldInfoTooltip";
import { UploadPopup } from "../UploadPopup";
import { parseMediaList } from "@/lib/media-list";
import { isLikelyVideoUrl } from "@shashank519915/shared";
import { AddToRequestToggle } from "@/components/workflow/AddToRequestToggle";
import ElasticSlider from "@/components/ui/ElasticSlider";

interface MergeAVParametersProps {
  param: any;
  value: any;
  disabled: boolean;
  isWired: boolean;
  requestPromoted: boolean;
  wiredValue: any;
  updateInput: (key: string, val: any) => void;
  showAddToRequestBtn: boolean;
  isLocked: boolean;
  handlePromoteInput: (param: any) => void;
  removeFileValue: (key: string) => void;
  activeUploadPopup: string | null;
  setActiveUploadPopup: (key: string | null) => void;
  uploadingField: string | null;
  handleFileUpload: (key: string, files: FileList | null) => Promise<void>;
  id: string;
  readOnly: boolean;
  handleId: string;
}

export function MergeAVParameters({
  param,
  value,
  disabled,
  isWired,
  requestPromoted,
  wiredValue,
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
  handleId,
}: MergeAVParametersProps) {
  if (param.uiVariant === "magica-volume-row") {
    const vol =
      value !== "" && value !== null && value !== undefined
        ? Number(value)
        : (param.defaultValue ?? 0.5);

    return (
      <div className="relative overflow-visible">
        {param.handle && (
          <div
            className="absolute flex items-center"
            style={{
              left: "-22px",
              top: "14px",
              transform: "translateY(-50%)",
              zIndex: 50,
            }}
          >
            <Handle
              type="target"
              position={Position.Left}
              id={handleId}
              className="!relative !transform-none target connectable connectablestart connectableend connectionindicator"
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: param.handle.color,
                border: `2px solid ${param.handle.color}80`,
                cursor: "crosshair",
                ["--handle-color" as any]: param.handle.color,
              }}
            />
          </div>
        )}
        <div className="space-y-1.5">
          <div className="flex min-w-0 items-center gap-2">
            <span
              data-handle-anchor="label"
              className="flex w-[110px] flex-shrink-0 items-center text-xs text-zinc-400 font-semibold pr-1"
            >
              <span className="truncate">{param.label}</span>
              {param.tooltip ? <FieldInfoTooltip text={param.tooltip} /> : null}
            </span>
            <ElasticSlider
              value={vol}
              onChange={(val) => updateInput(param.key, val)}
              disabled={disabled}
              startingValue={param.min ?? 0}
              maxValue={param.max ?? 2}
              stepSize={param.step ?? 0.1}
              isStepped={param.step != null}
              className="flex-1 min-w-[60px]"
              activeColor="#7C3AED"
            />
            <input
              type="number"
              min={param.min ?? 0}
              max={param.max ?? 2}
              step={param.step ?? 0.1}
              value={vol}
              onChange={(e) => updateInput(param.key, Number(e.target.value))}
              disabled={disabled}
              className="nodrag w-12 shrink-0 rounded-lg border border-white/5 bg-[#050507] px-2 py-1 text-center font-mono text-xs text-zinc-100 outline-none focus:border-white/15 focus:ring-1 focus:ring-white/10 disabled:opacity-50 transition-colors"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => updateInput(param.key, param.defaultValue ?? 0.5)}
              className="nodrag flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50 active:scale-[0.9]"
              title="Reset to default"
            >
              <LucideIcons.RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            {showAddToRequestBtn && (
              <div className="ml-auto shrink-0">
                <AddToRequestToggle
                  disabled={isLocked}
                  onPromote={() => handlePromoteInput(param)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Side-label layout (magica-side-label)
  const isVideoField = param.key === "video_url";
  const isMediaWired = isWired;
  const canEditLocally = !isMediaWired && !readOnly && !isLocked;
  const mediaSource = isMediaWired
    ? requestPromoted
      ? value
      : wiredValue
    : value;
  const mediaUrls = parseMediaList(mediaSource);
  const videoUrls = isVideoField
    ? mediaUrls.filter(isLikelyVideoUrl)
    : mediaUrls;
  const displayUrls =
    isVideoField && videoUrls.length > 0 ? videoUrls : mediaUrls;
  const primaryUrl = displayUrls[0];
  const multiVideoRejected =
    isVideoField && isMediaWired && (videoUrls.length > 1 || mediaUrls.length > 1);
  const accept =
    param.key === "video_url"
      ? "video/*"
      : param.key === "audio_url"
        ? "audio/*,video/*"
        : "*";
  const borderColor =
    param.handle?.color === "#06b6d4"
      ? "rgba(6, 182, 212, 0.3)"
      : "rgba(34, 197, 94, 0.3)";
  const mediaLabel = param.label.toLowerCase();

  return (
    <div className="relative overflow-visible">
      {param.handle && (
        <div
          className="absolute flex items-center"
          style={{
            left: "-22px",
            top: "12px",
            transform: "translateY(-50%)",
            zIndex: 50,
          }}
        >
          <Handle
            type="target"
            position={Position.Left}
            id={handleId}
            className="!relative !transform-none target connectable connectablestart connectableend connectionindicator"
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: param.handle.color,
              border: `2px solid ${param.handle.color}80`,
              cursor: "crosshair",
              ["--handle-color" as any]: param.handle.color,
            }}
          />
        </div>
      )}
      <div
        className={`flex items-start gap-3 ${
          (requestPromoted || isMediaWired) && !isLocked ? "opacity-60" : ""
        }`}
      >
        <span
          data-handle-anchor="label"
          className="flex shrink-0 items-center gap-1 pt-2 text-xs text-zinc-400"
        >
          <span>
            {param.label}
            {param.required && <span className="text-red-400">*</span>}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          {!readOnly && (
            <div className="relative">
              <button
                type="button"
                tabIndex={-1}
                disabled={
                  !canEditLocally ||
                  uploadingField === param.key ||
                  multiVideoRejected
                }
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => {
                  if (canEditLocally)
                    setActiveUploadPopup(
                      activeUploadPopup === param.key ? null : param.key
                    );
                }}
                className="nodrag flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 bg-[#050507] px-3 py-2 text-xs text-zinc-400 hover:border-white/20 hover:text-zinc-200 hover:bg-white/[0.02] transition-all disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] duration-150 ease-out"
                title={
                  isMediaWired
                    ? `${param.label} is supplied by a connection`
                    : primaryUrl
                      ? `Change ${mediaLabel}`
                      : `Upload ${mediaLabel}`
                }
              >
                {uploadingField === param.key ? (
                  <LucideIcons.Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LucideIcons.Upload className="h-3.5 w-3.5 text-zinc-500" />
                )}
                <span className="capitalize font-semibold">
                  {uploadingField === param.key
                    ? "Uploading..."
                    : primaryUrl
                      ? `Change ${mediaLabel}`
                      : `Upload ${mediaLabel}`}
                </span>
              </button>
              <input
                id={`file-input-${id}-${param.key}`}
                type="file"
                hidden
                accept={accept}
                disabled={!canEditLocally}
                onChange={(e) => {
                  void handleFileUpload(param.key, e.target.files).finally(
                    () => {
                      e.target.value = "";
                    }
                  );
                }}
              />
              <UploadPopup
                open={activeUploadPopup === param.key}
                onClose={() => setActiveUploadPopup(null)}
                onUpload={() =>
                  document
                    .getElementById(`file-input-${id}-${param.key}`)
                    ?.click()
                }
              />
            </div>
          )}
        </div>
        {showAddToRequestBtn && (
          <div className="ml-auto shrink-0 self-start pt-2">
            <AddToRequestToggle
              disabled={isLocked}
              onPromote={() => handlePromoteInput(param)}
            />
          </div>
        )}
      </div>
      {multiVideoRejected && (
        <p className="mt-2 text-[11px] text-amber-500">
          Only one video is allowed. Use Merge Videos to combine multiple clips.
        </p>
      )}
      {primaryUrl && !multiVideoRejected && (
        <div className="mt-2">
          {param.handle?.type === "audio" ||
          /\.(mp3|wav|ogg|m4a)(\?|$)/i.test(primaryUrl) ? (
            <div className="relative inline-block">
              <audio src={primaryUrl} controls className="w-[160px]" />
              {canEditLocally && (
                <button
                  type="button"
                  onClick={() => removeFileValue(param.key)}
                  className="absolute right-1 top-1 z-10 rounded bg-black/60 p-0.5 text-white hover:bg-red-500 border-0"
                  title={`Remove ${mediaLabel}`}
                >
                  <LucideIcons.X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          ) : (
            <div
              className="relative max-w-[160px] overflow-hidden rounded-md"
              style={{ border: `2px solid ${borderColor}` }}
            >
              <video
                src={primaryUrl}
                controls
                className="w-full rounded-sm"
                style={{ maxHeight: 120 }}
              />
              {canEditLocally && (
                <button
                  type="button"
                  onClick={() => removeFileValue(param.key)}
                  className="absolute right-1 top-1 z-10 rounded bg-black/60 p-0.5 text-white hover:bg-red-500 border-0"
                  title={`Remove ${mediaLabel}`}
                >
                  <LucideIcons.X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {isMediaWired && !primaryUrl && !multiVideoRejected && (
        <p className="mt-2 text-[11px] text-zinc-500 italic">
          Waiting for upstream {mediaLabel}…
        </p>
      )}
    </div>
  );
}
