"use client";

/**
 * @fileoverview Presentational shell for GenericNode — renders the outer card
 * structure (header, mode toggle, error, param sections, outputs, credit label,
 * text-expand modal). All state and handlers live in GenericNode.tsx; this file
 * only receives them as props and renders JSX.
 */

import React from "react";
import { Handle, Position } from "@xyflow/react";
import * as LucideIcons from "lucide-react";
import { sanitizeError } from "@/lib/utils";
import {
  estimateNodeDisplayMicrocredits,
  formatNodeEstimateMillions,
  type NodeDefinition,
} from "@shashank519915/shared";
import { getNodeRunBorderClass, getNodeRunButtonState } from "@/lib/node-run-chrome";
import NodeHeaderActions from "./NodeHeaderActions";
import TextExpandModal from "../TextExpandModal";

export interface GenericNodeShellProps {
  // Node identity
  id: string;
  // Definition & theme
  definition: NodeDefinition;
  theme: {
    bg: string;
    text: string;
    border: string;
    accent: string;
    accentHover: string;
  };
  // Node data (raw)
  nodeData: any;
  // Run/preview state
  isDimmed: boolean;
  isExecuting: boolean;
  isRunPending: boolean;
  isRunCompleted: boolean;
  isRunFailed: boolean;
  isPreviewMode: boolean;
  nodeError: string | null;
  output: unknown;
  // Read-only / locked
  isLocked: boolean;
  readOnly: boolean;
  // Mode tab (GPT-Image-2 / Kling v3)
  hasModeTab: boolean;
  modeLabels: [string, string];
  modeTab: "text" | "image";
  onModeChange: (mode: "text" | "image") => void;
  // Collapsible section states
  showAdvanced: boolean;
  onShowAdvancedChange: (v: boolean) => void;
  showSettings: boolean;
  onShowSettingsChange: (v: boolean) => void;
  // Param groups (pre-filtered by GenericNode)
  primaryParams: any[];
  advancedParams: any[];
  imageModeParams: any[];
  settingsParams: any[];
  // Text expand modal state
  activeExpandParamKey: string | null;
  onCloseExpandModal: () => void;
  onExpandParamChange: (val: string) => void;
  // Renderer for individual parameter inputs (stays in GenericNode for closure access)
  renderParameterInput: (param: any) => React.ReactNode;
  // Header action handlers
  onRun: () => void;
  onReset: () => void;
  onLockToggle: () => void;
  onDuplicate: () => void;
  onDuplicateWithEdges: () => void;
  onDelete: () => void;
}

export function GenericNodeShell({
  id,
  definition,
  nodeData,
  isDimmed,
  isExecuting,
  isRunPending,
  isRunCompleted,
  isRunFailed,
  isPreviewMode,
  nodeError,
  output,
  isLocked,
  readOnly,
  hasModeTab,
  modeLabels,
  modeTab,
  onModeChange,
  showAdvanced,
  onShowAdvancedChange,
  showSettings,
  onShowSettingsChange,
  primaryParams,
  advancedParams,
  imageModeParams,
  settingsParams,
  activeExpandParamKey,
  onCloseExpandModal,
  onExpandParamChange,
  renderParameterInput,
  onRun,
  onReset,
  onLockToggle,
  onDuplicate,
  onDuplicateWithEdges,
  onDelete,
}: GenericNodeShellProps) {
  return (
    <div
      data-locked={isLocked ? "true" : undefined}
      className={`wf-node-card w-[380px] max-w-[380px] rounded-xl border transition-all duration-300 overflow-visible ${getNodeRunBorderClass(
        {
          isDimmed,
          isLocked,
          isExecuting,
          hasError: !!nodeError,
          isRunPending,
        },
      )} ${isDimmed ? "opacity-40 grayscale pointer-events-none" : ""}`}
      style={{ overflow: "visible", width: "380px" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-gray-100 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="w-full min-w-0 cursor-grab select-none truncate text-sm font-medium text-gray-900">
            {definition.name}
          </div>
        </div>
        {!readOnly && (
          <NodeHeaderActions
            nodeId={id}
            description={
              definition.description ??
              `Execute a ${definition.name} operation inside the workflow.`
            }
            runState={getNodeRunButtonState(
              isExecuting,
              isRunPending,
              isRunCompleted,
              isRunFailed,
            )}
            isLocked={isLocked}
            onRun={onRun}
            onReset={onReset}
            onLockToggle={onLockToggle}
            onDuplicate={onDuplicate}
            onDuplicateWithEdges={onDuplicateWithEdges}
            onDelete={onDelete}
          />
        )}
      </div>

      {/* Mode Toggle (GPT-Image-2 / Kling v3) */}
      {hasModeTab && (
        <div className="px-4 pt-3">
          <div className="nodrag flex w-full items-center rounded-[18px] border border-gray-200 bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => onModeChange("text")}
              className={`flex-1 rounded-[14px] px-3 py-1.5 text-center text-xs font-medium transition-all ${
                modeTab === "text"
                  ? "bg-gray-900 text-white shadow-md"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {modeLabels[0]}
            </button>
            <button
              type="button"
              onClick={() => onModeChange("image")}
              className={`flex-1 rounded-[14px] px-3 py-1.5 text-center text-xs font-medium transition-all ${
                modeTab === "image"
                  ? "bg-gray-900 text-white shadow-md"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {modeLabels[1]}
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {nodeError && (
        <div className="mx-4 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-600">
          {sanitizeError(nodeError)}
        </div>
      )}

      {/* Primary Parameters */}
      <div className="px-4 py-4" style={{ overflow: "visible" }}>
        <div className="space-y-4">
          {/* Text-to-video / standard primary params — hidden when in image tab for nodes that have image-mode params */}
          {modeTab === "text" || imageModeParams.length === 0
            ? primaryParams.map(renderParameterInput)
            : null}

          {/* Image tab — for nodes like gptImage2 that interleave primary+image-mode in definition order.
              For klingV3-style nodes, image-mode params replace primary entirely. */}
          {imageModeParams.length > 0 && modeTab === "image" && (() => {
            // If the node has primary params alongside image-mode params (e.g. gptImage2),
            // render all primary+image-mode in their definition order so fields interleave correctly.
            // For nodes where primary params are hidden in image tab (klingV3), imageModeParams only.
            const hasPrimaryInImageTab = definition.type === "gptImage2";
            if (hasPrimaryInImageTab) {
              return definition.inputs
                .filter((p: any) => p.group === "primary" || p.group === "image-mode")
                .map(renderParameterInput);
            }
            return imageModeParams.map(renderParameterInput);
          })()}

          {/* Ghost handles for image-mode params — always mounted so React Flow can draw
              edges to in:start_image_url / in:description etc. even when the node is in
              text tab and the full param UI is hidden. Position 0×0 so they're invisible. */}
          {imageModeParams.length > 0 && modeTab === "text" &&
            imageModeParams
              .filter((p: any) => p.handle)
              .map((p: any) => (
                <Handle
                  key={`ghost-${p.key}`}
                  type="target"
                  position={Position.Left}
                  id={`in:${p.key}`}
                  style={{ opacity: 0, width: 0, height: 0, minWidth: 0, minHeight: 0, border: "none", background: "transparent", position: "absolute", left: 0, top: 0 }}
                />
              ))
          }

          {/* Collapsible Advanced Parameters (generic nodes) */}
          {advancedParams.length > 0 && (
            <>
              <div className="relative" style={{ overflow: "visible" }}>
                <button
                  type="button"
                  className="nodrag group mt-5 flex cursor-pointer items-center gap-2 bg-transparent border-0 p-0 outline-none"
                  onClick={() => onShowAdvancedChange(!showAdvanced)}
                >
                  <LucideIcons.ChevronDown
                    className={`h-4 w-4 text-gray-400 transition-transform ${
                      showAdvanced ? "" : "-rotate-90"
                    }`}
                    aria-hidden="true"
                  />
                  <span className="text-xs text-gray-400 group-hover:text-gray-600 font-medium">
                    Settings
                  </span>
                </button>
              </div>

              {showAdvanced && (
                <div className="space-y-4 pt-2">
                  {advancedParams.map(renderParameterInput)}
                </div>
              )}
            </>
          )}

          {/* Collapsible Settings section (Kling v3 style — group: "settings").
              Only shown on image tab (for nodes with image-mode params).
              For standard nodes with no image-mode, shown always.
              In image tab, also includes generate_audio from primary params. */}
          {settingsParams.length > 0 && (imageModeParams.length === 0 || modeTab === "image") && (() => {
            // In image tab, pull generate_audio from primaryParams into this section too
            const extraInSettings = imageModeParams.length > 0 && modeTab === "image"
              ? primaryParams.filter((p) => p.key === "generate_audio")
              : [];
            const allSettingsItems = [...settingsParams, ...extraInSettings];
            if (allSettingsItems.length === 0) return null;
            return (
              <>
                <div className="relative" style={{ overflow: "visible" }}>
                  <button
                    type="button"
                    className="nodrag group mt-5 flex cursor-pointer items-center gap-2 bg-transparent border-0 p-0 outline-none"
                    onClick={() => onShowSettingsChange(!showSettings)}
                  >
                    <LucideIcons.ChevronDown
                      className={`h-4 w-4 text-gray-400 transition-transform ${
                        showSettings ? "" : "-rotate-90"
                      }`}
                      aria-hidden="true"
                    />
                    <span
                      data-handle-anchor="label"
                      className="text-xs text-gray-400 group-hover:text-gray-600"
                    >
                      Settings
                    </span>
                  </button>
                </div>

                {showSettings && (
                  <div className="mt-4 space-y-4">
                    {allSettingsItems.map(renderParameterInput)}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Outputs */}
      <div className="px-4 pb-4 overflow-visible space-y-4">
        {definition.outputs.map((out) => {
          const handleId = `out:${out.key}`;
          // Preview mode: strictly use the previewed run's output (so nodes absent from that
          // run don't show stale values). Live mode: prefer the live store output (nodeOutputs)
          // and fall back to the value persisted on the node so media results stay visible
          // after the run completes and execution state is cleared.
          const currentOutput = isPreviewMode
            ? output
            : (output ?? nodeData.output);
          const displayValue =
            currentOutput !== null &&
            typeof currentOutput === "object" &&
            out.key in currentOutput
              ? (currentOutput as Record<string, unknown>)[out.key]
              : currentOutput;

          return (
            <div key={out.key} className="pt-4 border-t border-gray-100">
              <div className="relative" style={{ overflow: "visible" }}>
                <div
                  className="absolute flex items-center"
                  style={{
                    right: "-22px",
                    top: "10px",
                    transform: "translateY(-50%)",
                    zIndex: 50,
                  }}
                >
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={handleId}
                    className="!relative !transform-none target connectable connectablestart connectableend connectionindicator"
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: out.handle.color,
                      border: `2px solid ${out.handle.color}80`,
                      cursor: "crosshair",
                      ["--handle-color" as any]: out.handle.color,
                    }}
                  />
                </div>

                <div>
                  <div
                    data-handle-anchor="label"
                    className="mb-1.5 text-xs text-gray-500 font-medium"
                  >
                    {out.label}
                  </div>

                  {displayValue ? (
                    <div className="nodrag nowheel rounded-lg border border-gray-200 bg-[#F5F5F5] p-2 min-h-[120px] max-h-[220px] overflow-y-auto nowheel">
                      {out.type === "image" && (
                        <div className="flex flex-col gap-2">
                          <img
                            src={String(displayValue)}
                            alt="Output"
                            className="mx-auto block w-full max-h-[160px] object-contain rounded"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              const link = e.currentTarget
                                .nextElementSibling as HTMLElement;
                              if (link) link.style.display = "block";
                            }}
                          />
                          <div style={{ display: "none" }}>
                            <a
                              href={String(displayValue)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[12px] text-blue-500 hover:underline break-all"
                            >
                              {String(displayValue)}
                            </a>
                          </div>
                        </div>
                      )}

                      {out.type === "video" && (
                        <video
                          src={String(displayValue)}
                          controls
                          className="w-full max-h-[160px] rounded"
                        />
                      )}

                      {out.type === "audio" && (
                        <audio
                          src={String(displayValue)}
                          controls
                          className="w-full h-9 rounded"
                        />
                      )}

                      {out.type === "text" && (
                        <p className="select-text text-[13px] text-gray-900 leading-relaxed whitespace-pre-wrap">
                          {String(displayValue)}
                        </p>
                      )}

                      {out.type === "file" && (
                        <a
                          href={String(displayValue)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[12px] text-blue-500 hover:underline flex items-center gap-1.5"
                        >
                          <LucideIcons.ExternalLink className="w-3.5 h-3.5" />
                          View Output File
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="nodrag nowheel min-h-[84px] rounded-lg border border-gray-200 bg-[#F5F5F5] p-3">
                      <div className="py-6 text-center text-xs text-gray-400">
                        No output yet
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Credit Estimate label */}
      <div className="mt-3 flex items-center justify-end gap-1 px-4 pb-3 text-[10px] text-gray-400">
        <LucideIcons.Coins
          className="h-3 w-3 shrink-0"
          strokeWidth={2}
          aria-hidden
        />
        <span>
          {formatNodeEstimateMillions(
            estimateNodeDisplayMicrocredits(
              definition.type,
              nodeData.inputs,
              definition.credits.base,
            ),
          )}
        </span>
      </div>

      {activeExpandParamKey &&
        (() => {
          const param = definition.inputs.find(
            (p) => p.key === activeExpandParamKey,
          );
          if (!param) return null;
          const paramValue = nodeData.inputs?.[activeExpandParamKey] ?? "";

          return (
            <TextExpandModal
              title={param.label}
              value={String(paramValue)}
              readOnly={isPreviewMode || readOnly || isLocked}
              onChange={onExpandParamChange}
              onClose={onCloseExpandModal}
            />
          );
        })()}
    </div>
  );
}
