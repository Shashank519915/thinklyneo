"use client";

/**
 * @fileoverview Crop node: percentile sliders with external image handle, FFmpeg API execution via Trigger path, mirrored preview tooling.
 */

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useState } from "react";
import { Upload, X, Minus, Plus, RotateCcw, Coins } from "lucide-react";
import FieldInfoTooltip from "./FieldInfoTooltip";
import { useWorkflowStore, useNodePreview } from "@/store/workflow-store";
import NodeHeaderActions from "./NodeHeaderActions";
import { parseMediaList } from "@/lib/media-list";
import {
  classifyMediaUrl,
  generateEdgeId,
  resolvePropagatedEdgeValue,
  sanitizeError,
} from "@/lib/utils";
import { uploadFilesViaApi } from "@/lib/upload";
import { NODE_ESTIMATE_LABEL } from "@/lib/node-estimates";

/** Magica `border-workflow-accent-400/90` (violet-400 at 90% opacity). */
const CROP_FRAME_BORDER = "rgba(167, 139, 250, 0.9)";
const IMAGE_HANDLE_COLOR = "#3b82f6";
const IMAGE_PREVIEW_BORDER = "rgba(59, 130, 246, 0.3)";

const FIELD_TOOLTIPS: Record<"x" | "y" | "w" | "h", string> = {
  x: "Left edge of the crop region as a percentage of image width (0–100%).",
  y: "Top edge of the crop region as a percentage of image height (0–100%).",
  w: "Width of the crop region as a percentage of image width (1–100%).",
  h: "Height of the crop region as a percentage of image height (1–100%).",
};

interface CropImageData {
  label: string;
  locked?: boolean;
  inputs: {
    inputImage: string | null;
    x: number;
    y: number;
    w: number;
    h: number;
  };
  output: string | null;
  connectedHandles?: string[];
}

const CROP_SLIDER_DEFAULT: Record<"x" | "y" | "w" | "h", number> = {
  x: 0,
  y: 0,
  w: 100,
  h: 100,
};

interface CropSliderRowProps {
  label: string;
  tooltip: string;
  value: number;
  onChange: (v: number) => void;
  handleId: string;
  fieldKey: "x" | "y" | "w" | "h";
  min: number;
  max: number;
  disabled: boolean;
  /** Visual-only: "add to request" pressed → muted look */
  requestMuted: boolean;
  onRequestMutedChange: (muted: boolean) => void;
}

/** Clamps UX slider percentages to whole numbers within min–max. */
function clampPct(n: number, min = 0, max = 100): number {
  const x = Number.isFinite(n) ? Math.round(n) : min;
  return Math.min(max, Math.max(min, x));
}

/** Magica-style dimmed regions + accent crop frame. */
function CropPreviewOverlay({
  x,
  y,
  w,
  h,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  const xPct = clampPct(x);
  const yPct = clampPct(y);
  const wPct = clampPct(w, 1, 100);
  const hPct = clampPct(h, 1, 100);
  const rightPct = Math.min(100, xPct + wPct);
  const bottomPct = Math.min(100, yPct + hPct);

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-0 right-0 top-0 bg-black/35" style={{ height: `${yPct}%` }} />
      <div
        className="absolute left-0 right-0 bg-black/35"
        style={{ top: `${bottomPct}%`, bottom: 0 }}
      />
      <div
        className="absolute left-0 bg-black/35"
        style={{ top: `${yPct}%`, width: `${xPct}%`, height: `${bottomPct - yPct}%` }}
      />
      <div
        className="absolute bg-black/35"
        style={{
          top: `${yPct}%`,
          left: `${rightPct}%`,
          right: 0,
          height: `${bottomPct - yPct}%`,
        }}
      />
      <div
        className="absolute border-2"
        style={{
          left: `${xPct}%`,
          top: `${yPct}%`,
          width: `${wPct}%`,
          height: `${hPct}%`,
          borderColor: CROP_FRAME_BORDER,
        }}
      />
    </div>
  );
}

/** + when unmuted, − when muted; same slot as Gemini node. */
function AddToRequestToggle({
  muted,
  disabled,
  onMutedChange,
}: {
  muted: boolean;
  disabled?: boolean;
  onMutedChange: (muted: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onMutedChange(!muted)}
      aria-label={muted ? "Remove from request (visual)" : "Add to request (visual)"}
      className="nodrag flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-40"
    >
      {muted ? (
        <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
      ) : (
        <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
      )}
    </button>
  );
}

/** Row tying a magenta target handle to range input, reset shortcut, plus visual-only request muting parity with Gemini UX. */
function CropSliderRow({
  label,
  tooltip,
  value,
  onChange,
  handleId,
  fieldKey,
  min,
  max,
  disabled,
  requestMuted,
  onRequestMutedChange,
}: CropSliderRowProps) {
  const v = clampPct(value, min, max);
  const sliderLocked = disabled || requestMuted;

  return (
    <div
      className={`relative overflow-visible transition-opacity ${
        requestMuted && !disabled ? "opacity-60" : ""
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id={handleId}
        className="!relative !transform-none"
        style={{
          background: "#EC4899",
          border: "2px solid rgba(236, 72, 153, 0.5)",
          width: 14,
          height: 14,
          left: -21,
          top: 14,
          transform: "translateY(-50%)",
          boxShadow: "rgba(236, 72, 153, 0.314) 0px 0px 8px",
        }}
      />
      <div className="space-y-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            data-handle-anchor="label"
            className="flex min-w-0 shrink items-center gap-0 text-xs text-gray-500"
          >
            <span className="truncate">{label}</span>
            <FieldInfoTooltip text={tooltip} />
          </span>
          <input
            type="range"
            min={min}
            max={max}
            step={1}
            value={v}
            disabled={sliderLocked}
            onChange={(e) => onChange(clampPct(Number(e.target.value), min, max))}
            className="nodrag h-2 min-w-[60px] flex-1 appearance-none rounded-lg bg-gray-200 accent-[#8B5CF6] disabled:opacity-50"
          />
          <input
            type="number"
            min={min}
            max={max}
            step={1}
            value={v}
            disabled={sliderLocked}
            onChange={(e) => onChange(clampPct(Number(e.target.value), min, max))}
            className="nodrag w-12 shrink-0 rounded-lg border border-gray-200 bg-[#F5F5F5] px-1.5 py-1 text-center text-xs text-gray-900 outline-none disabled:opacity-50"
          />
          <button
            type="button"
            aria-label={`Reset ${label} to default`}
            disabled={disabled}
            onClick={() => onChange(CROP_SLIDER_DEFAULT[fieldKey])}
            className="nodrag flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-[#F5F5F5] text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <AddToRequestToggle
            muted={requestMuted}
            disabled={disabled}
            onMutedChange={onRequestMutedChange}
          />
        </div>
      </div>
    </div>
  );
}

/** Canvas node emitting cropped JPEG URLs resolved through `/api/execute/crop-image`. */
export default function CropImageNode({ id, data }: NodeProps) {
  const nodeData = data as unknown as CropImageData;
  const { updateNodeData, deleteNode, addNode, setEdges, setNodes, edges, nodes, previewRunId, previewNodeOutputs } =
    useWorkflowStore();
  const { isPreviewMode, isDimmed, isExecuting, output, error } = useNodePreview(id);
  const nodeError = error as string | null;
  const isLocked = !!nodeData.locked;

  /** Visual-only: “add to request” mute per handle (not read by execution). */
  const [requestMuteByHandle, setRequestMuteByHandle] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState(false);

  const connectedTargets = new Set(
    (edges ?? []).filter((e) => e.target === id).map((e) => e.targetHandle)
  );

  const edgeResolveOpts =
    previewRunId !== null ? { previewOutputsByNodeId: previewNodeOutputs } : undefined;

  // ── Live upstream image resolution (before execution) ────────────────────
  // Walk edges to find what is connected to in:inputImage and read its current value.
  const upstreamInputImage: string | null = (() => {
    const edge = (edges ?? []).find(
      (e) => e.target === id && e.targetHandle === "in:inputImage"
    );
    if (!edge) return null;
    const v = resolvePropagatedEdgeValue(edge, nodes ?? [], edgeResolveOpts);
    return typeof v === "string" && v.length > 0 ? v : null;
  })();

  const updateInput = (key: keyof CropImageData["inputs"], val: number | string | null) => {
    if (isLocked) return;
    updateNodeData(id, {
      inputs: { ...nodeData.inputs, [key]: val },
    } as Partial<CropImageData>);
  };

  const isInputWired = connectedTargets.has("in:inputImage");
  /** Wired: preview upstream only. Unwired: local single upload (replace on re-upload). */
  const previewImageUrl = isInputWired
    ? upstreamInputImage
    : nodeData.inputs.inputImage;

  const wiredImageCount = (() => {
    if (!isInputWired) return 0;
    const edge = (edges ?? []).find(
      (e) => e.target === id && e.targetHandle === "in:inputImage"
    );
    if (!edge) return 0;
    const val = resolvePropagatedEdgeValue(edge, nodes ?? [], edgeResolveOpts);
    return parseMediaList(val).filter((u) => classifyMediaUrl(u)?.kind === "image").length;
  })();
  const multiImageFromWire = isInputWired && wiredImageCount > 1;

  const handleImageUpload = async (files: FileList | null) => {
    if (!files?.length || isLocked || isInputWired) return;
    setUploading(true);
    try {
      const { urls, firstError } = await uploadFilesViaApi([files[0]!]);
      if (firstError) window.alert(firstError);
      if (urls[0]) updateInput("inputImage", urls[0]);
    } finally {
      setUploading(false);
    }
  };

  const handleSingleRun = () => {
    window.dispatchEvent(
      new CustomEvent("nextflow:run-node", { detail: { nodeId: id } })
    );
  };

  const handleReset = () => {
    updateNodeData(id, {
      inputs: { inputImage: null, x: 0, y: 0, w: 100, h: 100 },
      output: null,
    } as Partial<CropImageData>);
  };

  const handleLockToggle = () => {
    const nextLocked = !isLocked;
    setNodes(
      nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              draggable: !nextLocked,
              // Keep selectable:true so clicks/menus still work on a locked node.
              // The purple ring is suppressed via CSS (data-locked attribute + globals.css).
              selected: nextLocked ? false : n.selected,
              data: { ...n.data, locked: nextLocked },
            }
          : n
      )
    );
  };

  const handleDuplicate = () => {
    const thisNode = nodes.find((n) => n.id === id);
    if (!thisNode) return;
    const newId = `cropImage-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newNode = {
      ...thisNode,
      id: newId,
      position: { x: thisNode.position.x + 60, y: thisNode.position.y - 60 },
      selected: true,
      data: { ...thisNode.data },
    };
    setNodes([...nodes.map((n) => n.id === id ? { ...n, selected: false } : n), newNode]);
  };

  const handleDuplicateWithEdges = () => {
    const thisNode = nodes.find((n) => n.id === id);
    if (!thisNode) return;
    const newId = `cropImage-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newNode = {
      ...thisNode,
      id: newId,
      position: { x: thisNode.position.x + 60, y: thisNode.position.y - 60 },
      selected: true,
      data: { ...thisNode.data },
    };
    setNodes([...nodes.map((n) => n.id === id ? { ...n, selected: false } : n), newNode]);
    const incomingEdges = edges.filter((e) => e.target === id);
    const newEdges = incomingEdges.map((e) => ({
      ...e,
      id: generateEdgeId(),
      target: newId,
    }));
    setEdges([...edges, ...newEdges]);
  };

  return (
    <div
      data-locked={isLocked ? "true" : undefined}
      className={`w-[380px] rounded-xl border bg-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] overflow-visible transition-all ${
        isExecuting ? "node-executing" : ""
      } ${isLocked ? "border-yellow-400" : nodeError ? "border-red-300" : "border-gray-200"} ${isDimmed ? "opacity-40 grayscale pointer-events-none" : ""}`}
      style={{ minWidth: 380 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-gray-100 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="w-full min-w-0 cursor-grab select-none truncate text-sm font-medium text-gray-900">
            Crop Image
          </div>
        </div>
        <NodeHeaderActions
          nodeId={id}
          description="Crop an image to specified dimensions"
          isExecuting={isExecuting}
          isLocked={isLocked}
          onRun={handleSingleRun}
          onReset={handleReset}
          onLockToggle={handleLockToggle}
          onDuplicate={handleDuplicate}
          onDuplicateWithEdges={handleDuplicateWithEdges}
          onDelete={() => deleteNode(id)}
        />
      </div>

      {/* Error state */}
      {nodeError && (
        <div className="mx-4 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-600">
          {sanitizeError(nodeError)}
        </div>
      )}

      <div className="px-4 py-4 overflow-visible">
        <div className="space-y-4">
          {/* Input Image */}
          <div className="relative overflow-visible">
            <Handle
              type="target"
              position={Position.Left}
              id="in:inputImage"
              className="!relative !transform-none"
              style={{
                background: IMAGE_HANDLE_COLOR,
                border: "2px solid rgba(59, 130, 246, 0.5)",
                width: 14,
                height: 14,
                left: -21,
                top: 12,
                transform: "translateY(-50%)",
                boxShadow: "rgba(59, 130, 246, 0.314) 0px 0px 8px",
              }}
            />
            <div className="flex items-start gap-3">
              <span data-handle-anchor="label" className="shrink-0 pt-2 text-xs text-gray-500">
                Input Image<span className="text-red-400">*</span>
              </span>
              <div className="flex-1">
                {!isLocked && (
                  <button
                    type="button"
                    tabIndex={-1}
                    disabled={isInputWired || uploading || multiImageFromWire}
                    onClick={() => {
                      if (!isInputWired) {
                        document.getElementById(`crop-file-${id}`)?.click();
                      }
                    }}
                    className="nodrag flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-[#F5F5F5] px-3 py-2.5 text-xs text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    title={
                      isInputWired
                        ? "Image is supplied by an upstream connection"
                        : previewImageUrl
                          ? "Change image"
                          : "Upload image"
                    }
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span className="capitalize">
                      {uploading
                        ? "Uploading..."
                        : previewImageUrl
                          ? "Change image"
                          : "Upload image"}
                    </span>
                  </button>
                )}
                <input
                  id={`crop-file-${id}`}
                  type="file"
                  hidden
                  accept="image/*"
                  disabled={isInputWired || isLocked}
                  onChange={(e) => {
                    void handleImageUpload(e.target.files).finally(() => {
                      e.target.value = "";
                    });
                  }}
                />
              </div>
            </div>
            {multiImageFromWire && (
              <p className="mt-2 text-[11px] text-amber-600">
                Only one image is allowed. Upstream field has multiple images — use a single-image
                source.
              </p>
            )}
            {previewImageUrl && !multiImageFromWire ? (
              <div className="mt-2 flex justify-end">
                <div className="flex flex-col items-end gap-1">
                  <div
                    className="relative overflow-hidden rounded-md"
                    style={{ border: `2px solid ${IMAGE_PREVIEW_BORDER}` }}
                  >
                    <div className="relative">
                      <img
                        alt=""
                        src={previewImageUrl}
                        className="block rounded-sm"
                        style={{ maxWidth: 240, maxHeight: 160 }}
                      />
                      <CropPreviewOverlay
                        x={nodeData.inputs.x}
                        y={nodeData.inputs.y}
                        w={nodeData.inputs.w}
                        h={nodeData.inputs.h}
                      />
                      {!isInputWired && !isLocked && (
                        <button
                          type="button"
                          onClick={() => updateInput("inputImage", null)}
                          className="absolute right-1 top-1 z-10 rounded bg-black/60 p-0.5 text-white hover:bg-red-500"
                          title="Remove image"
                        >
                          <X className="h-2.5 w-2.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : isInputWired ? (
              <p className="mt-2 text-[11px] text-gray-400 italic">Waiting for upstream image…</p>
            ) : null}
          </div>

          <CropSliderRow
            label="X Position (%)"
            tooltip={FIELD_TOOLTIPS.x}
            value={nodeData.inputs.x}
            onChange={(v) => updateInput("x", v)}
            handleId="in:x"
            fieldKey="x"
            min={0}
            max={100}
            disabled={isLocked || connectedTargets.has("in:x")}
            requestMuted={!!requestMuteByHandle["in:x"]}
            onRequestMutedChange={(muted) =>
              setRequestMuteByHandle((m) => ({ ...m, "in:x": muted }))
            }
          />
          <CropSliderRow
            label="Y Position (%)"
            tooltip={FIELD_TOOLTIPS.y}
            value={nodeData.inputs.y}
            onChange={(v) => updateInput("y", v)}
            handleId="in:y"
            fieldKey="y"
            min={0}
            max={100}
            disabled={isLocked || connectedTargets.has("in:y")}
            requestMuted={!!requestMuteByHandle["in:y"]}
            onRequestMutedChange={(muted) =>
              setRequestMuteByHandle((m) => ({ ...m, "in:y": muted }))
            }
          />
          <CropSliderRow
            label="Width (%)"
            tooltip={FIELD_TOOLTIPS.w}
            value={nodeData.inputs.w}
            onChange={(v) => updateInput("w", v)}
            handleId="in:w"
            fieldKey="w"
            min={1}
            max={100}
            disabled={isLocked || connectedTargets.has("in:w")}
            requestMuted={!!requestMuteByHandle["in:w"]}
            onRequestMutedChange={(muted) =>
              setRequestMuteByHandle((m) => ({ ...m, "in:w": muted }))
            }
          />
          <CropSliderRow
            label="Height (%)"
            tooltip={FIELD_TOOLTIPS.h}
            value={nodeData.inputs.h}
            onChange={(v) => updateInput("h", v)}
            handleId="in:h"
            fieldKey="h"
            min={1}
            max={100}
            disabled={isLocked || connectedTargets.has("in:h")}
            requestMuted={!!requestMuteByHandle["in:h"]}
            onRequestMutedChange={(muted) =>
              setRequestMuteByHandle((m) => ({ ...m, "in:h": muted }))
            }
          />
        </div>

        <div className="relative mt-4 overflow-visible border-t border-gray-100 pt-4">
          <div
            className="absolute flex items-center"
            style={{ right: "-22px", top: "8px", transform: "translateY(-50%)", zIndex: 50 }}
          >
            <Handle
              type="source"
              position={Position.Right}
              id="out:outputImage"
              className="!relative !transform-none source connectable connectablestart connectableend connectionindicator"
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: IMAGE_HANDLE_COLOR,
                border: `2px solid ${IMAGE_HANDLE_COLOR}80`,
                boxShadow: `${IMAGE_HANDLE_COLOR}50 0px 0px 8px`,
                cursor: "crosshair",
              }}
            />
          </div>
          <div data-handle-anchor="label" className="mb-1.5 text-xs text-gray-500">
            Output Image
          </div>
          {(isPreviewMode ? output : nodeData.output) ? (
            <div className="nodrag nowheel min-h-[120px] rounded-lg border border-gray-200 bg-[#F5F5F5] p-2">
              <img
                src={String(isPreviewMode ? output : nodeData.output)}
                alt="Output"
                className="mx-auto block w-full max-h-[160px] object-contain rounded-sm"
              />
            </div>
          ) : (
            <div className="min-h-[120px] rounded-lg border border-gray-200 bg-[#F5F5F5] p-2">
              <div className="py-10 text-center text-xs text-gray-400">No output yet</div>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pb-3 flex items-center justify-end gap-1 text-[10px] text-gray-400">
        <Coins className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
        <span>{NODE_ESTIMATE_LABEL.cropImage}</span>
      </div>
    </div>
  );
}
