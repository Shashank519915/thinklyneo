"use client";

/**
 * @fileoverview Crop node: percentile sliders with external image handle, FFmpeg API execution via Trigger path, mirrored preview tooling.
 */

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useState } from "react";
import { Crop, Upload, Image, Minus, Plus, RotateCcw, Coins } from "lucide-react";
import { useWorkflowStore, useNodePreview } from "@/store/workflow-store";
import NodeHeaderActions from "./NodeHeaderActions";
import { generateEdgeId, resolvePropagatedEdgeValue, sanitizeError } from "@/lib/utils";
import { NODE_ESTIMATE_LABEL } from "@/lib/node-estimates";

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
  value: number;
  onChange: (v: number) => void;
  handleId: string;
  fieldKey: "x" | "y" | "w" | "h";
  disabled: boolean;
  /** Visual-only: "add to request" pressed → muted look */
  requestMuted: boolean;
  onRequestMutedChange: (muted: boolean) => void;
}

/** Clamps UX slider percentages to whole numbers within 0–100. */
function clampPct(n: number): number {
  const x = Number.isFinite(n) ? Math.round(n) : 0;
  return Math.min(100, Math.max(0, x));
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
  value,
  onChange,
  handleId,
  fieldKey,
  disabled,
  requestMuted,
  onRequestMutedChange,
}: CropSliderRowProps) {
  const v = clampPct(value);
  const sliderLocked = disabled || requestMuted;

  return (
    <div
      className={`relative flex items-center gap-2 py-1.5 overflow-visible min-h-[36px] rounded-md transition-opacity ${
        requestMuted && !disabled ? "opacity-60 bg-gray-50/80" : ""
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id={handleId}
        style={{
          background: "#EC4899",
          border: "2px solid #EC4899",
          width: 14,
          height: 14,
          left: -21,
          boxShadow: "0 0 8px rgba(236,72,153,0.314)",
        }}
      />
      <label className="text-[12px] text-gray-600 w-[108px] flex-shrink-0 leading-tight">{label}</label>
      <div
        className={`flex flex-1 min-w-0 items-center gap-2 ${
          disabled ? "input-connected rounded-md px-0.5" : ""
        }`}
      >
        <div
          className={`flex flex-1 min-w-0 items-center gap-2 ${
            requestMuted && !disabled ? "pointer-events-none opacity-70" : ""
          }`}
        >
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={v}
            disabled={sliderLocked}
            onChange={(e) => onChange(clampPct(Number(e.target.value)))}
            className={`nodrag nowheel flex-1 min-w-[56px] h-2 cursor-pointer accent-[#7C3AED] ${
              sliderLocked ? "opacity-70" : "hover:accent-[#6D28D9]"
            }`}
          />
          <span className="w-8 text-center text-[13px] font-medium tabular-nums text-gray-800 flex-shrink-0">
            {v}
          </span>
        </div>
        <button
          type="button"
          aria-label={`Reset ${label} to default`}
          disabled={disabled}
          onClick={() => onChange(CROP_SLIDER_DEFAULT[fieldKey])}
          className="nodrag flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-40"
        >
          <RotateCcw className="w-3.5 h-3.5" strokeWidth={2.25} />
        </button>
        <AddToRequestToggle
          muted={requestMuted}
          disabled={disabled}
          onMutedChange={onRequestMutedChange}
        />
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
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
            <Crop className="w-4 h-4 text-orange-500" />
          </div>
          <span className="text-[14px] font-semibold text-gray-900">
            Crop Image
          </span>
        </div>
        <NodeHeaderActions
          nodeId={id}
          description="Crop an image using percentage-based coordinates. Connect an image from a RequestInputs field or another node's output."
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

      {/* Inputs */}
      <div className="px-4 py-4 overflow-visible">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Inputs
        </p>

        {/* Input Image */}
        <div className="relative flex items-start gap-2 py-1 overflow-visible mb-2">
          <Handle
            type="target"
            position={Position.Left}
            id="in:inputImage"
            style={{
              background: "#F97316",
              border: "2px solid #F97316",
              width: 14,
              height: 14,
              left: -21,
              top: 14,
              transform: "translateY(-50%)",
              boxShadow: "0 0 8px rgba(249,115,22,0.314)",
            }}
          />
          <label className="text-[12px] text-gray-500 w-24 flex-shrink-0 pt-1">
            Input Image <span className="text-red-400">*</span>
          </label>
          {connectedTargets.has("in:inputImage") ? (
            <div className="flex-1 space-y-1">
              {/* Use upstreamInputImage (live) or stored inputImage (post-execution) */}
              {(upstreamInputImage || nodeData.inputs.inputImage) ? (
                /* Connected + image available — show preview with crop overlay */
                <div className="relative w-full rounded-lg overflow-hidden border border-gray-200 bg-[#F5F5F5]">
                  <img
                    src={upstreamInputImage ?? nodeData.inputs.inputImage!}
                    alt="Input"
                    className="w-full object-contain block"
                    style={{ maxHeight: 160 }}
                  />
                  {/* Dark overlay on areas outside the crop rectangle */}
                  <div className="absolute inset-0 bg-black/40 pointer-events-none" />
                  {/* Crop window — transparent area with grey border */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: `${nodeData.inputs.x}%`,
                      top: `${nodeData.inputs.y}%`,
                      width: `${nodeData.inputs.w}%`,
                      height: `${nodeData.inputs.h}%`,
                      boxShadow: "0 0 0 9999px rgba(0,0,0,0.4)",
                      border: "2px solid #6B7280",
                      borderRadius: 2,
                    }}
                  />
                  {/* Crop dimension label — hidden per UX
                  <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-mono pointer-events-none">
                    {nodeData.inputs.x},{nodeData.inputs.y} · {nodeData.inputs.w}×{nodeData.inputs.h}%
                  </div>
                  */}
                </div>
              ) : (
                <>
                  <div className="px-3 py-1.5 rounded-lg border border-gray-200 bg-[#F5F5F5] text-[12px] text-[#7C3AED]">
                    Connected — waiting for image
                  </div>
                  {nodeData.output === null && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-700">
                      <span className="font-semibold">⚠</span>
                      No image received from upstream node yet.
                    </div>
                  )}
                </>
              )}
            </div>
          ) : nodeData.inputs.inputImage ? (
            <img
              src={nodeData.inputs.inputImage}
              alt="Input"
              className="w-12 h-12 object-cover rounded-lg border border-gray-200"
            />
          ) : (
            <label className="nodrag flex-1 flex items-center justify-center gap-2 h-9 rounded-lg border-2 border-dashed border-gray-200 bg-[#F5F5F5] hover:border-[#7C3AED] cursor-pointer text-[12px] text-gray-400">
              <Upload className="w-3.5 h-3.5" />
              Upload Image
              <input type="file" accept="image/*" className="sr-only" />
            </label>
          )}
        </div>

        {/* Crop sliders (% ) */}
        <CropSliderRow
          label="X Position (%)"
          value={nodeData.inputs.x}
          onChange={(v) => updateInput("x", v)}
          handleId="in:x"
          fieldKey="x"
          disabled={isLocked || connectedTargets.has("in:x")}
          requestMuted={!!requestMuteByHandle["in:x"]}
          onRequestMutedChange={(muted) =>
            setRequestMuteByHandle((m) => ({ ...m, "in:x": muted }))
          }
        />
        <CropSliderRow
          label="Y Position (%)"
          value={nodeData.inputs.y}
          onChange={(v) => updateInput("y", v)}
          handleId="in:y"
          fieldKey="y"
          disabled={isLocked || connectedTargets.has("in:y")}
          requestMuted={!!requestMuteByHandle["in:y"]}
          onRequestMutedChange={(muted) =>
            setRequestMuteByHandle((m) => ({ ...m, "in:y": muted }))
          }
        />
        <CropSliderRow
          label="Width (%)"
          value={nodeData.inputs.w}
          onChange={(v) => updateInput("w", v)}
          handleId="in:w"
          fieldKey="w"
          disabled={isLocked || connectedTargets.has("in:w")}
          requestMuted={!!requestMuteByHandle["in:w"]}
          onRequestMutedChange={(muted) =>
            setRequestMuteByHandle((m) => ({ ...m, "in:w": muted }))
          }
        />
        <CropSliderRow
          label="Height (%)"
          value={nodeData.inputs.h}
          onChange={(v) => updateInput("h", v)}
          handleId="in:h"
          fieldKey="h"
          disabled={isLocked || connectedTargets.has("in:h")}
          requestMuted={!!requestMuteByHandle["in:h"]}
          onRequestMutedChange={(muted) =>
            setRequestMuteByHandle((m) => ({ ...m, "in:h": muted }))
          }
        />
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-gray-100" />

      {/* Output */}
      <div className="px-4 py-4 overflow-visible">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Output
        </p>

        <div className="relative overflow-visible">
          <Handle
            type="source"
            position={Position.Right}
            id="out:outputImage"
            style={{
              background: "#F97316",
              border: "2px solid #F97316",
              width: 14,
              height: 14,
              right: -21,
              boxShadow: "0 0 8px rgba(249,115,22,0.314)",
            }}
          />
          <label className="text-[12px] font-medium text-gray-500 mb-2 block">
            Output Image
          </label>

          {(isPreviewMode ? output : nodeData.output) ? (
            <div className="nodrag nowheel rounded-lg border border-gray-200 bg-[#F5F5F5] p-3">
              <div className="flex flex-col gap-2">
                <img
                  src={String(isPreviewMode ? output : nodeData.output)}
                  alt="Output"
                  className="mx-auto block w-full max-h-[200px] object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const linkDiv = e.currentTarget.nextElementSibling as HTMLElement;
                    if (linkDiv) linkDiv.style.display = 'block';
                  }}
                />
                <div style={{ display: 'none' }}>
                  <a href={String(isPreviewMode ? output : nodeData.output)} target="_blank" rel="noreferrer" className="text-[12px] text-blue-500 hover:underline break-all">
                    {String(isPreviewMode ? output : nodeData.output)}
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="nodrag nowheel flex min-h-[4.5rem] items-center justify-center rounded-lg border border-gray-200 bg-[#F5F5F5] p-3">
              <div className="flex items-center gap-1.5 text-[12px] text-gray-400">
                <Image className="w-3.5 h-3.5" />
                <span>No output yet</span>
              </div>
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
