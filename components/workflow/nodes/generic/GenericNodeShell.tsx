"use client";

/**
 * @fileoverview Presentational shell for GenericNode — renders the outer card
 * structure (header, mode toggle, error, param sections, outputs, credit label,
 * text-expand modal). All state and handlers live in GenericNode.tsx; this file
 * only receives them as props and renders JSX.
 */

import React from "react";
import { Handle, Position, useUpdateNodeInternals } from "@xyflow/react";
import BorderGlow from "@/components/ui/BorderGlow";
import * as LucideIcons from "lucide-react";
import { sanitizeError } from "@/lib/utils";
import {
  estimateNodeDisplayMicrocredits,
  formatNodeEstimateMillions,
  type NodeDefinition,
} from "@shashank519915/shared";
import { getNodeRunBorderClass, getNodeRunButtonState } from "@/lib/node-run-chrome";
import NodeHeaderActions from "./NodeHeaderActions";
import TextExpandModal from "../../TextExpandModal";
import { SettingsPanelOverlay } from "./SettingsPanelOverlay";

export interface GenericNodeShellProps {
  // Node identity
  id: string;
  selected?: boolean;
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
  isSettingsDimmed?: boolean;
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
  onDragHover?: () => void;
}

export function GenericNodeShell({
  id,
  selected = false,
  definition,
  nodeData,
  isDimmed,
  isSettingsDimmed = false,
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
  onDragHover,
}: GenericNodeShellProps) {
  const updateNodeInternals = useUpdateNodeInternals();

  // Force React Flow to recalculate handles when settings panel opens or closes
  React.useEffect(() => {
    // Delay slightly to allow DOM to update before measuring
    const timeout = setTimeout(() => updateNodeInternals(id), 50);
    return () => clearTimeout(timeout);
  }, [showSettings, id, updateNodeInternals]);
  return (
    <BorderGlow
      selected={selected}
      nodeColor={definition.color}
      borderRadius={20}
      glowIntensity={0.85}
      fillOpacity={0.15}
    >
      <div
        data-locked={isLocked ? "true" : undefined}
        onMouseEnter={onDragHover}
        className={`wf-node-card w-[380px] max-w-[380px] rounded-[1.25rem] bg-white/[0.03] border border-white/5 p-[5px] backdrop-blur-md transition-all duration-500 hover:bg-white/[0.05] hover:border-white/10 overflow-visible ${isDimmed ? "opacity-40 grayscale pointer-events-none" : ""} ${isSettingsDimmed ? "wf-node-dimmed-blur" : ""}`}
        style={{ overflow: "visible", width: "380px" }}
      >
      <div
        className={`w-full h-full rounded-[calc(1.25rem-5px)] bg-[#0A0A0A] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border transition-all duration-300 relative ${getNodeRunBorderClass(
          {
            isDimmed,
            isLocked,
            isExecuting,
            hasError: !!nodeError,
            isRunPending,
          },
        )}`}
        style={{ overflow: "visible" }}
      >
        <div className="absolute inset-0 pointer-events-none glass-noise z-0 rounded-[calc(1.25rem-5px)]" />
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <div className="w-full min-w-0 cursor-grab select-none truncate text-[15px] font-semibold tracking-wide text-zinc-100 uppercase font-mono leading-none">
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
        <div className="px-4 pt-3.5">
          <div className="nodrag flex w-full items-center rounded-xl border border-white/5 bg-[#050507] p-1">
            <button
              type="button"
              onClick={() => onModeChange("text")}
              className={`flex-1 rounded-[8px] px-3 py-1.5 text-center text-xs font-semibold transition-all active:scale-[0.98] duration-150 ease-out ${
                modeTab === "text"
                  ? "bg-white/10 text-zinc-100 shadow-md"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {modeLabels[0]}
            </button>
            <button
              type="button"
              onClick={() => onModeChange("image")}
              className={`flex-1 rounded-[8px] px-3 py-1.5 text-center text-xs font-semibold transition-all active:scale-[0.98] duration-150 ease-out ${
                modeTab === "image"
                  ? "bg-white/10 text-zinc-100 shadow-md"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {modeLabels[1]}
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {nodeError && (
        <div className="mx-4 mt-3 px-3.5 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-[12px] text-red-400 font-mono">
          {sanitizeError(nodeError)}
        </div>
      )}      {/* Media Display Area (Inputs or Output) */}
      <div className="px-4 py-3">
        {/* If there is an output image/video, show it here. Else if there's an input image, show that. */}
        {(() => {
          const outDef = definition.outputs.find((o) => o.type === "image" || o.type === "video");
          const inDef = definition.inputs.find((i) => i.type === "image-array" || i.type === "file-upload" || i.handle?.type === "image");
          
          let mediaUrl: string | null = null;
          let isOutput = false;
          
          if (outDef && output) {
            const currentOutput = isPreviewMode ? output : (output ?? nodeData.output);
            if (currentOutput && typeof currentOutput === "object" && outDef.key in currentOutput) {
              mediaUrl = String((currentOutput as any)[outDef.key]);
              isOutput = true;
            } else if (typeof currentOutput === "string") {
              mediaUrl = currentOutput;
              isOutput = true;
            }
          }
          
          if (!mediaUrl && inDef && inDef.uiVariant !== "crop-overlay-preview") {
            const inVal = nodeData?.inputs?.[inDef.key];
            if (Array.isArray(inVal) && inVal.length > 0) mediaUrl = String(inVal[0]);
            else if (inVal && typeof inVal === "string") mediaUrl = inVal;
          }

          if (mediaUrl) {
            const isVideo = mediaUrl.endsWith(".mp4") || mediaUrl.endsWith(".webm") || outDef?.type === "video";
            return (
              <div className="relative w-full rounded-xl overflow-hidden bg-black/40 border border-white/5 aspect-video flex items-center justify-center">
                {isVideo ? (
                  <video src={mediaUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                ) : (
                  <img src={mediaUrl} className="w-full h-full object-cover" alt="Media preview" />
                )}
                {isOutput && (
                  <div className="absolute top-2 right-2 bg-green-500/20 text-green-400 text-[10px] px-2 py-0.5 rounded font-mono uppercase border border-green-500/20 backdrop-blur-md">
                    Generated
                  </div>
                )}
              </div>
            );
          }
          return null;
        })()}
      </div>

      {/* Inputs configured to show ON the node */}
      {(() => {
        const onNodeParams = definition.inputs.filter(
          (p: any) => p.showOnNode === true || ["inputImage", "inputVideo", "prompt", "video_url", "image_url", "uploadedImages"].includes(p.key)
        );

        const visibleOnNodeParams = hasModeTab
          ? onNodeParams.filter((p: any) => p.group !== "image-mode" || modeTab === "image")
          : onNodeParams;

        if (visibleOnNodeParams.length === 0) return null;

        if (visibleOnNodeParams.length === 0) return null;

        return (
          <div className="px-4 pb-4 space-y-4">
            {visibleOnNodeParams.map(renderParameterInput)}
          </div>
        );
      })()}

      {/* Settings Button & Panel */}
      <div className="px-4 pb-4">
        <div className="relative">
          <button
            type="button"
            className={`w-full flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${
              showSettings 
                ? "bg-white/10 border-white/10 text-white" 
                : "bg-white/[0.03] border-white/5 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
            }`}
            onClick={() => onShowSettingsChange(!showSettings)}
          >
            <LucideIcons.Settings2 className="w-4 h-4" />
            Configure Node
          </button>
          
          {/* Dummy Handles: When settings panel is CLOSED, all incoming parameter edges route directly to a single dummy dot on this button! */}
          {!showSettings && (() => {
            const visibleParamKeys = new Set<string>();
            if (modeTab === "text" || imageModeParams.length === 0) {
              primaryParams.forEach((p) => visibleParamKeys.add(p.key));
            }
            if (imageModeParams.length > 0 && modeTab === "image") {
              const hasPrimaryInImageTab = definition.type === "gptImage2";
              if (hasPrimaryInImageTab) {
                definition.inputs
                  .filter((p: any) => p.group === "primary" || p.group === "image-mode")
                  .forEach((p: any) => visibleParamKeys.add(p.key));
              } else {
                imageModeParams.forEach((p) => visibleParamKeys.add(p.key));
              }
            }
            advancedParams.forEach((p) => visibleParamKeys.add(p.key));
            settingsParams.forEach((p) => visibleParamKeys.add(p.key));
            if (imageModeParams.length > 0 && modeTab === "image") {
              primaryParams
                .filter((p) => p.key === "generate_audio")
                .forEach((p) => visibleParamKeys.add(p.key));
            }

            const handles = definition.inputs
              .filter((p: any) => p.handle && visibleParamKeys.has(p.key))
              .map((p: any) => {
                const isOnNode = p.showOnNode === true || ["inputImage", "inputVideo", "prompt", "video_url", "image_url"].includes(p.key);
                if (isOnNode) return null;
                return (
                <Handle
                  key={`dummy-${p.key}`}
                  type="target"
                  position={Position.Left}
                  id={`in:${p.key}`}
                  className="target connectable"
                  style={{ 
                    width: 20, 
                    height: 20, 
                    position: "absolute", 
                    left: -14,
                    top: "50%", 
                    transform: "translate(-50%, -50%)",
                    opacity: 0, 
                    zIndex: 50
                  }}
                />
              )});
              
            if (handles.every(h => h === null)) return null;

            return (
              <>
                <div
                   className="absolute pointer-events-none rounded-full bg-white z-[51] border-2 border-white/80 shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                   style={{ left: -14, top: "50%", transform: "translateY(-50%)", width: 14, height: 14 }}
                />
                {handles}
              </>
            );
          })()}
        </div>

        {/* Global Settings Panel Overlay */}
        <SettingsPanelOverlay
          isOpen={showSettings}
          nodeId={id}
          nodeName={definition.name}
          onClose={() => onShowSettingsChange(false)}
        >
          <div className="pt-2 space-y-4">
            {/* Standard Primary Params */}
            {modeTab === "text" || imageModeParams.length === 0
              ? primaryParams.filter((p: any) => !(p.showOnNode === true || ["inputImage", "inputVideo", "prompt", "video_url", "image_url"].includes(p.key))).map(renderParameterInput)
              : null}

            {/* Image Tab Params */}
            {imageModeParams.length > 0 && modeTab === "image" && (() => {
              const hasPrimaryInImageTab = definition.type === "gptImage2";
              if (hasPrimaryInImageTab) {
                return definition.inputs
                  .filter((p: any) => (p.group === "primary" || p.group === "image-mode") && !(p.showOnNode === true || ["inputImage", "inputVideo", "prompt", "video_url", "image_url"].includes(p.key)))
                  .map(renderParameterInput);
              }
              return imageModeParams.filter((p: any) => !(p.showOnNode === true || ["inputImage", "inputVideo", "prompt", "video_url", "image_url"].includes(p.key))).map(renderParameterInput);
            })()}

            {/* Advanced Params */}
            {advancedParams.filter((p: any) => !(p.showOnNode === true || ["inputImage", "inputVideo", "prompt", "video_url", "image_url"].includes(p.key))).length > 0 && (
              <div className="pt-4 border-t border-white/10 space-y-4">
                <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Advanced</div>
                {advancedParams.filter((p: any) => !(p.showOnNode === true || ["inputImage", "inputVideo", "prompt", "video_url", "image_url"].includes(p.key))).map(renderParameterInput)}
              </div>
            )}

            {/* Settings Params */}
            {settingsParams.length > 0 && (imageModeParams.length === 0 || modeTab === "image") && (() => {
              const extraInSettings = imageModeParams.length > 0 && modeTab === "image"
                ? primaryParams.filter((p) => p.key === "generate_audio")
                : [];
              const allSettingsItems = [...settingsParams, ...extraInSettings].filter((p: any) => !(p.showOnNode === true || ["inputImage", "inputVideo", "prompt", "video_url", "image_url"].includes(p.key)));
              if (allSettingsItems.length === 0) return null;
              return (
                <div className="pt-4 border-t border-white/10 space-y-4">
                  <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Configuration</div>
                  {allSettingsItems.map(renderParameterInput)}
                </div>
              );
            })()}
          </div>
        </SettingsPanelOverlay>
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
            <div key={out.key} className="pt-4 border-t border-white/5">
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
                    className="mb-1.5 text-xs text-zinc-400 font-semibold"
                  >
                    {out.label}
                  </div>

                  {/* If image/video, it's rendered in the hero section. For text/file, render it here. */}
                  {out.type !== "image" && out.type !== "video" && (
                    displayValue ? (
                      <div className="nodrag nowheel rounded-lg border border-white/5 bg-[#050507] p-3 min-h-[120px] max-h-[220px] overflow-y-auto nowheel">
                        {out.type === "audio" && (
                          <audio
                            src={String(displayValue)}
                            controls
                            className="w-full h-9 rounded"
                          />
                        )}

                        {out.type === "text" && (
                          <p className="select-text text-[13px] text-zinc-200 leading-relaxed whitespace-pre-wrap">
                            {String(displayValue)}
                          </p>
                        )}

                        {out.type === "file" && (
                          <a
                            href={String(displayValue)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[12px] text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1.5 transition-colors font-mono"
                          >
                            <LucideIcons.ExternalLink className="w-3.5 h-3.5" />
                            View Output File
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="nodrag nowheel min-h-[84px] rounded-lg border border-white/5 bg-[#050507]/40 p-3">
                        <div className="py-6 text-center text-xs text-zinc-500 font-mono uppercase tracking-wider">
                          No output yet
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Credit Estimate label */}
      <div className="mt-3 flex items-center justify-end gap-1 px-4 pb-3 text-[10px] text-zinc-500">
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
    </div>
    </BorderGlow>
  );
}
