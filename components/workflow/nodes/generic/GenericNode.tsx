"use client";

import React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import * as LucideIcons from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import {
  resolvePropagatedEdgeValue,
} from "@/lib/utils";
import {
  getNodeRunBorderClass,
} from "@/lib/node-run-chrome";
import FieldInfoTooltip from "./FieldInfoTooltip";
import { GenericNodeShell } from "./GenericNodeShell";
import { UpstreamWiredPanel } from "./fields/UpstreamWiredPanel";
import { BooleanParameter } from "./fields/BooleanParameter";
import { SliderParameter } from "./fields/SliderParameter";
import { SelectParameter } from "./fields/SelectParameter";
import { TextParameter } from "./fields/TextParameter";
import { MediaArrayParameter } from "./fields/MediaArrayParameter";
import { useGenericNodeState } from "./useGenericNodeState";
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
} from "@shashank519915/shared";

// Map React Flow type strings to their shared configurations
const DEFINITIONS: Record<string, NodeDefinition> = {
  cropImage: cropImageDefinition,
  gemini: geminiDefinition,
  openRouter: openrouterLlmDefinition,
  gptImage2: gptImage2Definition,
  klingV3: klingV3Definition,
  mergeVideo: mergeVideoDefinition,
  mergeAV: mergeAVDefinition,
  extractAudio: extractAudioDefinition,
};

// Color theme mapper for CSS classes
function getColorTheme(color: string) {
  switch (color) {
    case "orange":
      return {
        bg: "bg-orange-50",
        text: "text-orange-500",
        border: "border-orange-200",
        accent: "accent-orange-500",
        accentHover: "hover:accent-orange-600",
      };
    case "blue":
      return {
        bg: "bg-blue-50",
        text: "text-blue-500",
        border: "border-blue-200",
        accent: "accent-blue-500",
        accentHover: "hover:accent-blue-600",
      };
    case "purple":
      return {
        bg: "bg-purple-50",
        text: "text-purple-500",
        border: "border-purple-200",
        accent: "accent-purple-500",
        accentHover: "hover:accent-purple-600",
      };
    case "green":
      return {
        bg: "bg-green-50",
        text: "text-green-500",
        border: "border-green-200",
        accent: "accent-green-500",
        accentHover: "hover:accent-green-600",
      };
    case "red":
      return {
        bg: "bg-red-50",
        text: "text-red-500",
        border: "border-red-200",
        accent: "accent-red-500",
        accentHover: "hover:accent-red-600",
      };
    case "teal":
      return {
        bg: "bg-teal-50",
        text: "text-teal-600",
        border: "border-teal-200",
        accent: "accent-teal-500",
        accentHover: "hover:accent-teal-600",
      };
    case "cyan":
      return {
        bg: "bg-cyan-50",
        text: "text-cyan-500",
        border: "border-cyan-200",
        accent: "accent-cyan-500",
        accentHover: "hover:accent-cyan-600",
      };
    case "amber":
      return {
        bg: "bg-amber-50",
        text: "text-amber-500",
        border: "border-amber-200",
        accent: "accent-amber-500",
        accentHover: "hover:accent-amber-600",
      };
    default:
      return {
        bg: "bg-gray-50",
        text: "text-gray-500",
        border: "border-gray-200",
        accent: "accent-indigo-600",
        accentHover: "hover:accent-indigo-700",
      };
  }
}

import { AddToRequestToggle } from "@/components/workflow/AddToRequestToggle";
import {
  normalizeArrayParamValue,
  resolveEffectiveParamValue,
} from "@/lib/promoted-input-value";
import {
  isRequestPromoted,
  shouldShowAddToRequest,
} from "@/lib/promote-to-request";

function isSettingsCompactNumber(param: {
  group?: string;
  type?: string;
}): boolean {
  return param.group === "settings" && param.type === "number";
}

/** Side-by-side label + dropdown (Merge Videos transition, Extract Audio format). */
function isCompactSelectParam(
  nodeType: string,
  param: { key: string; type?: string },
): boolean {
  return (
    param.type === "select" &&
    (param.key === "transition" ||
      (nodeType === "extractAudio" && param.key === "format") ||
      (nodeType === "klingV3" &&
        (param.key === "aspect_ratio" || param.key === "duration" || param.key === "duration_text")) ||
      (nodeType === "gptImage2" &&
        (param.key === "quality" || param.key === "n" || param.key === "background" || param.key === "output_format")))
  );
}

interface GenericNodeProps extends NodeProps {
  customRenderParameterInput?: (
    param: any,
    defaultRender: (param: any) => React.ReactNode,
    state: ReturnType<typeof useGenericNodeState>
  ) => React.ReactNode;
}

export default function GenericNode({ id, data, type, selected = false, customRenderParameterInput }: GenericNodeProps) {
  const definition =
    DEFINITIONS[type as string] ||
    DEFINITIONS[data.type as string] ||
    DEFINITIONS[data.model as string] ||
    cropImageDefinition;
  const theme = getColorTheme(definition.color);

  const { edges, nodes, deleteNode } = useWorkflowStore();

  const state = useGenericNodeState(id, definition);
  const {
    nodeData,
    isPreviewMode,
    isDimmed,
    isExecuting,
    isRunPending,
    isRunCompleted,
    isRunFailed,
    output,
    nodeError,
    isLocked,
    readOnly,
    hasModeTab,
    modeLabels,
    modeTab,
    connectedTargets,
    edgeResolveOpts,
    updateInput,
    handleModeChange,
    handleSingleRun,
    handleReset,
    handleLockToggle,
    handleDuplicate,
    handleDuplicateWithEdges,
    handleFileUpload,
    handlePromoteInput,
    removeFileValue,
    showAdvanced,
    setShowAdvanced,
    showSettings,
    setShowSettings,
    uploadingField,
    activeUploadPopup,
    setActiveUploadPopup,
    activeDropdown,
    setActiveDropdown,
    activeExpandParamKey,
    setActiveExpandParamKey,
    primaryParams,
    advancedParams,
    imageModeParams,
    settingsParams,
  } = state;

  const renderParameterInput = (param: any) => {
    if (customRenderParameterInput) {
      return customRenderParameterInput(param, defaultRenderParameterInput, state);
    }
    return defaultRenderParameterInput(param);
  };

  const defaultRenderParameterInput = (param: any) => {
    const handleId = `in:${param.key}`;
    const isWired = connectedTargets.has(handleId);
    const requestPromoted = isRequestPromoted(
      nodes ?? [],
      edges ?? [],
      id,
      handleId,
    );
    // boolean parameters stay in their own layout even when wired — no upstream panel
    const showUpstreamPanel =
      isWired &&
      !requestPromoted &&
      param.type !== "boolean";
    const showAddToRequestBtn = shouldShowAddToRequest({
      hasHandle: !!param.handle,
      readOnly,
      isLocked,
      wired: isWired,
    });
    const rawValue = resolveEffectiveParamValue({
      requestPromoted,
      localValue: nodeData?.inputs?.[param.key],
      defaultValue: param.defaultValue,
      nodes: nodes ?? [],
      edges: edges ?? [],
      targetNodeId: id,
      targetHandle: handleId,
      paramType: param.type,
      previewOpts: edgeResolveOpts,
    });
    const value =
      param.type === "number" || param.type === "slider"
        ? typeof rawValue === "number"
          ? rawValue
          : Number(rawValue)
        : param.type === "image-array" ||
            param.type === "video-array" ||
            param.type === "audio-array"
          ? normalizeArrayParamValue(rawValue, param.defaultValue)
          : (rawValue ?? param.defaultValue ?? "");

    // Hide inputImage and uploadedImages if mode is text
    if (
      (param.key === "inputImage" || param.key === "uploadedImages") &&
      hasModeTab &&
      modeTab === "text"
    )
      return null;

    // Resolve upstream wire value dynamically
    let wiredValue: any = null;
    if (isWired) {
      if (isCompactSelectParam(definition.type, param)) {
        const inboundEdge = (edges ?? []).find(
          (e) => e.target === id && e.targetHandle === handleId,
        );
        if (inboundEdge) {
          wiredValue = resolvePropagatedEdgeValue(
            inboundEdge,
            nodes ?? [],
            edgeResolveOpts,
          );
        }
      } else if (param.type === "image-array" || param.type === "video-array") {
        const inboundEdges = (edges ?? []).filter(
          (e) => e.target === id && e.targetHandle === handleId,
        );
        if (inboundEdges.length > 0) {
          wiredValue = inboundEdges
            .map((e) =>
              resolvePropagatedEdgeValue(e, nodes ?? [], edgeResolveOpts),
            )
            .filter((v) => v !== undefined && v !== null);
        }
      } else {
        const inboundEdge = (edges ?? []).find(
          (e) => e.target === id && e.targetHandle === handleId,
        );
        if (inboundEdge) {
          wiredValue = resolvePropagatedEdgeValue(
            inboundEdge,
            nodes ?? [],
            edgeResolveOpts,
          );
        }
      }
    }

    const disabled = readOnly || isLocked || requestPromoted;

    return (
      <div
        key={param.key}
        className={`relative overflow-visible transition-opacity ${
          requestPromoted && !isLocked
            ? "opacity-60 bg-white/[0.02] rounded-lg p-1"
            : ""
        }`}
      >
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

        {param.type !== "image-array" &&
          param.type !== "video-array" &&
          param.type !== "audio-array" &&
          !isCompactSelectParam(definition.type, param) &&
          param.type !== "slider" &&
          !isSettingsCompactNumber(param) &&
          param.type !== "boolean" && (
            <div
              data-handle-anchor="label"
              className="mb-1.5 flex items-center text-xs text-zinc-400 font-semibold"
            >
              <span>{param.label}</span>
              {param.required && <span className="text-red-400 ml-0.5">*</span>}
              {param.tooltip && <FieldInfoTooltip text={param.tooltip} />}
              {param.handle && (
                <span className="ml-auto">
                  {showAddToRequestBtn && (
                    <AddToRequestToggle
                      disabled={isLocked}
                      onPromote={() => handlePromoteInput(param)}
                    />
                  )}
                </span>
              )}
            </div>
          )}

        {/* Dynamic Controls based on type */}
        {showUpstreamPanel ? (
          <UpstreamWiredPanel
            param={param}
            wiredValue={wiredValue}
            handleId={handleId}
          />
        ) : (
          <div className="relative">
            {(param.type === "textarea" || param.type === "text") && (
              <TextParameter
                param={param}
                value={value}
                disabled={disabled}
                updateInput={updateInput}
                definition={definition}
                modeTab={modeTab}
                setActiveExpandParamKey={setActiveExpandParamKey}
              />
            )}

            {param.type === "number" && isSettingsCompactNumber(param) && (
              <div className="flex min-w-0 items-center gap-3">
                <span
                  data-handle-anchor="label"
                  className="flex min-w-0 shrink items-center truncate text-xs text-zinc-400 font-semibold pr-1"
                >
                  <span className="truncate">{param.label}</span>
                  {param.tooltip && <FieldInfoTooltip text={param.tooltip} />}
                </span>
                <input
                  type="number"
                  min={param.min}
                  max={param.max}
                  step={param.step ?? 1}
                  value={value}
                  onChange={(e) =>
                    updateInput(param.key, Number(e.target.value))
                  }
                  disabled={disabled}
                  className="nodrag w-20 shrink-0 rounded-lg border border-white/5 bg-[#050507] px-3 py-1.5 text-center font-mono text-xs text-zinc-100 outline-none focus:border-white/15 focus:ring-1 focus:ring-white/10 transition-all disabled:opacity-50"
                />
                {showAddToRequestBtn && (
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => handlePromoteInput(param)}
                    className="nodrag inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-[#0C0C0E]/60 text-zinc-400 hover:bg-white/10 hover:text-zinc-200 transition-all active:scale-[0.9] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <LucideIcons.Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            )}

            {param.type === "number" && !isSettingsCompactNumber(param) && (
              <input
                type="number"
                min={param.min}
                max={param.max}
                value={value}
                onChange={(e) =>
                  updateInput(param.key, Number(e.target.value))
                }
                disabled={disabled}
                className="nodrag nowheel w-full rounded-lg border border-white/5 bg-[#050507] px-3 py-2 font-mono text-xs text-zinc-100 outline-none focus:border-white/15 focus:ring-1 focus:ring-white/10 transition-all disabled:opacity-50 h-9"
              />
            )}

            {param.type === "slider" && (
              <SliderParameter
                param={param}
                value={value}
                disabled={disabled}
                isWired={isWired}
                updateInput={updateInput}
                showAddToRequestBtn={showAddToRequestBtn}
                isLocked={isLocked}
                handlePromoteInput={handlePromoteInput}
              />
            )}

            {param.type === "select" && (
              <SelectParameter
                param={param}
                value={value}
                disabled={disabled}
                updateInput={updateInput}
                showAddToRequestBtn={showAddToRequestBtn}
                isLocked={isLocked}
                handlePromoteInput={handlePromoteInput}
                activeDropdown={activeDropdown}
                setActiveDropdown={setActiveDropdown}
                nodeType={definition.type}
              />
            )}

            {param.type === "boolean" && (
              <BooleanParameter
                param={param}
                value={value}
                disabled={disabled}
                updateInput={updateInput}
                showAddToRequestBtn={showAddToRequestBtn}
                isLocked={isLocked}
                handlePromoteInput={handlePromoteInput}
              />
            )}

            {(param.type === "file-upload" ||
              param.type === "image-array" ||
              param.type === "video-array" ||
              param.type === "audio-array") && (
              <MediaArrayParameter
                param={param}
                value={value}
                disabled={disabled}
                updateInput={updateInput}
                showAddToRequestBtn={showAddToRequestBtn}
                isLocked={isLocked}
                handlePromoteInput={handlePromoteInput}
                removeFileValue={removeFileValue}
                activeUploadPopup={activeUploadPopup}
                setActiveUploadPopup={setActiveUploadPopup}
                uploadingField={uploadingField}
                handleFileUpload={handleFileUpload}
                id={id}
                readOnly={readOnly}
                isWired={isWired}
                edges={edges ?? []}
                nodes={nodes ?? []}
                definition={definition}
                edgeResolveOpts={edgeResolveOpts}
                handleId={handleId}
              />
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <GenericNodeShell
      id={id}
      selected={selected}
      definition={definition}
      theme={theme}
      nodeData={nodeData}
      isDimmed={isDimmed}
      isExecuting={isExecuting}
      isRunPending={isRunPending}
      isRunCompleted={isRunCompleted}
      isRunFailed={isRunFailed}
      isPreviewMode={isPreviewMode}
      nodeError={nodeError}
      output={output}
      isLocked={isLocked}
      readOnly={readOnly}
      hasModeTab={hasModeTab}
      modeLabels={modeLabels}
      modeTab={modeTab}
      onModeChange={handleModeChange}
      showAdvanced={showAdvanced}
      onShowAdvancedChange={setShowAdvanced}
      showSettings={showSettings}
      onShowSettingsChange={setShowSettings}
      primaryParams={primaryParams}
      advancedParams={advancedParams}
      imageModeParams={imageModeParams}
      settingsParams={settingsParams}
      activeExpandParamKey={activeExpandParamKey}
      onCloseExpandModal={() => setActiveExpandParamKey(null)}
      onExpandParamChange={(val) => updateInput(activeExpandParamKey!, val)}
      renderParameterInput={renderParameterInput}
      onRun={handleSingleRun}
      onReset={handleReset}
      onLockToggle={handleLockToggle}
      onDuplicate={handleDuplicate}
      onDuplicateWithEdges={handleDuplicateWithEdges}
      onDelete={() => deleteNode(id)}
    />
  );
}
