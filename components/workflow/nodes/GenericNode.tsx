"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import * as LucideIcons from "lucide-react";
import { useWorkflowStore, useNodePreview } from "@/store/workflow-store";
import { parseMediaList } from "@/lib/media-list";
import { isLikelyVideoUrl } from "@shashank519915/shared";
import {
  classifyMediaUrl,
  generateEdgeId,
  resolvePropagatedEdgeValue,
  sanitizeError,
} from "@/lib/utils";
import { uploadFilesViaApi } from "@/lib/upload";
import {
  getNodeRunBorderClass,
  getNodeRunButtonState,
} from "@/lib/node-run-chrome";
import NodeHeaderActions from "./NodeHeaderActions";
import FieldInfoTooltip from "./FieldInfoTooltip";
import { UploadPopup } from "./UploadPopup";
import TextExpandModal from "../TextExpandModal";
import {
  cropImageDefinition,
  openrouterLlmDefinition,
  geminiDefinition,
  gptImage2Definition,
  klingV3Definition,
  mergeVideoDefinition,
  mergeAVDefinition,
  extractAudioDefinition,
  estimateNodeDisplayMicrocredits,
  formatNodeEstimateMillions,
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

// Dynamic icon resolver
function getIcon(name: string, colorClass: string) {
  const IconComponent = (LucideIcons as any)[name];
  if (IconComponent) {
    return <IconComponent className={`w-4 h-4 ${colorClass}`} />;
  }
  return <LucideIcons.HelpCircle className={`w-4 h-4 ${colorClass}`} />;
}

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
  promoteInputToRequest,
  shouldShowAddToRequest,
} from "@/lib/promote-to-request";

function getMediaArrayMax(
  definition: NodeDefinition,
  param: { key: string; type?: string },
): number {
  const limit = definition.limits?.[param.key as keyof typeof definition.limits];
  if (limit?.maxCount != null) return limit.maxCount;
  if (param.type === "image-array") return 10;
  if (param.type === "video-array") return 7;
  if (param.type === "audio-array") return 5;
  return 10;
}

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

export default function GenericNode({ id, data, type }: NodeProps) {
  const definition =
    DEFINITIONS[type as string] ||
    DEFINITIONS[data.type as string] ||
    DEFINITIONS[data.model as string] ||
    cropImageDefinition;
  const theme = getColorTheme(definition.color);

  const nodeData = data as any;
  const {
    updateNodeData,
    deleteNode,
    setNodes,
    setEdges,
    edges,
    nodes,
    previewRunId,
    previewNodeOutputs,
    readOnly,
  } = useWorkflowStore();
  const {
    isPreviewMode,
    isDimmed,
    isExecuting,
    isRunPending,
    isRunCompleted,
    isRunFailed,
    output,
    error,
  } = useNodePreview(id);

  const nodeError = error as string | null;
  const isLocked = !!nodeData.locked;

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSettings, setShowSettings] = useState(
    definition.type === "openRouter",
  );
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  // Elements array state for Kling v3 Image-to-Video
  const [elementItems, setElementItems] = useState<Record<string, Record<string, string | string[]>>>(() => {
    const saved = (nodeData.inputs as any)?.elements;
    if (Array.isArray(saved) && saved.length > 0) {
      return Object.fromEntries(saved.map((el: any, i: number) => [String(i), el]));
    }
    return {};
  });
  const [uploadingElementField, setUploadingElementField] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<Record<string, boolean>>({});
  const [activeUploadPopup, setActiveUploadPopup] = useState<string | null>(
    null,
  );
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [activeExpandParamKey, setActiveExpandParamKey] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!activeUploadPopup && !activeDropdown) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (activeUploadPopup && !target.closest(".upload-popup-container")) {
        setActiveUploadPopup(null);
      }
      if (activeDropdown && !target.closest(".custom-select-container")) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [activeUploadPopup, activeDropdown]);

  const hasModeTab = type === "gptImage2" || type === "klingV3";
  const modeLabels =
    type === "gptImage2"
      ? ["Text to Image", "Image to Image"]
      : ["Text to Video", "Image to Video"];
  const [modeTab, setModeTab] = useState<"text" | "image">(() =>
    nodeData.inputs?.inputImage ||
    (nodeData.inputs?.inputImage as any)?.start_image_url ||
    (nodeData.inputs as any)?.start_image_url ||
    (nodeData.inputs?.uploadedImages &&
      nodeData.inputs.uploadedImages.length > 0)
      ? "image"
      : "text",
  );

  const connectedTargets = new Set(
    (edges ?? []).filter((e) => e.target === id).map((e) => e.targetHandle),
  );

  const edgeResolveOpts =
    previewRunId !== null
      ? { previewOutputsByNodeId: previewNodeOutputs }
      : undefined;

  const updateInput = (key: string, val: any) => {
    if (isLocked || readOnly) return;
    if (key === "model") {
      updateNodeData(id, { model: val } as any);
    } else {
      const currentInputs = nodeData.inputs || {};
      updateNodeData(id, {
        inputs: { ...currentInputs, [key]: val },
      } as any);
    }
  };

  const handleModeChange = (mode: "text" | "image") => {
    setModeTab(mode);
    if (mode === "text") {
      updateInput("inputImage", null);
      updateInput("uploadedImages", null);
    }
  };

  const handleSingleRun = () => {
    window.dispatchEvent(
      new CustomEvent("nextflow:run-node", { detail: { nodeId: id } }),
    );
  };

  const handleReset = () => {
    const defaultInputs: Record<string, any> = {};
    definition.inputs.forEach((param) => {
      defaultInputs[param.key] =
        param.defaultValue !== undefined ? param.defaultValue : null;
    });
    updateNodeData(id, {
      inputs: defaultInputs,
      output: null,
    } as any);
  };

  const handleLockToggle = () => {
    const nextLocked = !isLocked;
    setNodes(
      nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              draggable: !nextLocked,
              selected: nextLocked ? false : n.selected,
              data: { ...n.data, locked: nextLocked },
            }
          : n,
      ),
    );
  };

  const handleDuplicate = () => {
    const thisNode = nodes.find((n) => n.id === id);
    if (!thisNode) return;
    const newId = `${definition.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newNode = {
      ...thisNode,
      id: newId,
      position: { x: thisNode.position.x + 60, y: thisNode.position.y - 60 },
      selected: true,
      data: JSON.parse(JSON.stringify(thisNode.data)),
    };
    setNodes([
      ...nodes.map((n) => (n.id === id ? { ...n, selected: false } : n)),
      newNode,
    ]);
  };

  const handleDuplicateWithEdges = () => {
    const thisNode = nodes.find((n) => n.id === id);
    if (!thisNode) return;
    const newId = `${definition.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newNode = {
      ...thisNode,
      id: newId,
      position: { x: thisNode.position.x + 60, y: thisNode.position.y - 60 },
      selected: true,
      data: JSON.parse(JSON.stringify(thisNode.data)),
    };
    setNodes([
      ...nodes.map((n) => (n.id === id ? { ...n, selected: false } : n)),
      newNode,
    ]);
    const incomingEdges = edges.filter((e) => e.target === id);
    const newEdges = incomingEdges.map((e) => ({
      ...e,
      id: generateEdgeId(),
      target: newId,
    }));
    setEdges([...edges, ...newEdges]);
  };

  const handleFileUpload = async (
    key: string,
    files: FileList | null,
    isArray = false,
  ) => {
    if (!files?.length || isLocked || readOnly) return;
    setUploadingField(key);

    try {
      let filesToUpload = Array.from(files);
      if (isArray) {
        const paramDef = definition.inputs.find((p) => p.key === key);
        const maxItems = paramDef
          ? getMediaArrayMax(definition, paramDef)
          : 10;
        const currentInputs = nodeData.inputs || {};
        const currentArr = currentInputs[key] || [];
        const remaining = maxItems - currentArr.length;
        if (remaining <= 0) {
          alert(`You can upload a maximum of ${maxItems} files.`);
          setUploadingField(null);
          return;
        }
        filesToUpload = filesToUpload.slice(0, remaining);
      }

      const { urls: validUrls, firstError } =
        await uploadFilesViaApi(filesToUpload);
      if (firstError) {
        window.alert(firstError);
      }

      if (validUrls.length > 0) {
        const store = useWorkflowStore.getState();
        const latestNode = store.nodes.find((n) => n.id === id);
        const currentInputs = (latestNode?.data as any)?.inputs || {};

        if (isArray) {
          const arr = currentInputs[key] || [];
          const cleanArr = arr.filter(
            (url: string) => !url.startsWith("data:"),
          );
          const paramDef = definition.inputs.find((p) => p.key === key);
          const maxItems = paramDef
            ? getMediaArrayMax(definition, paramDef)
            : 10;
          updateInput(key, [...cleanArr, ...validUrls].slice(0, maxItems));
        } else {
          updateInput(key, validUrls[0]);
        }
      }
    } catch (err) {
      console.error(`[GenericNode] Upload failed for ${key}:`, err);
    } finally {
      setUploadingField(null);
    }
  };

  const handlePromoteInput = useCallback(
    (param: {
      key: string;
      label: string;
      type?: string;
      handle?: { type?: string };
      defaultValue?: unknown;
      options?: Array<{ value: string; label: string }>;
      min?: number;
      max?: number;
      step?: number;
    }) => {
      if (readOnly || isLocked) return;
      const handleId = `in:${param.key}`;
      const mediaMaxCount =
        param.type === "image-array" ||
        param.type === "video-array" ||
        param.type === "audio-array"
          ? getMediaArrayMax(definition, param)
          : param.key === "video_url" || param.handle?.type === "video"
            ? param.type === "video-array" || param.key === "video_urls"
              ? getMediaArrayMax(definition, param)
              : 1
            : definition.limits?.[param.key as keyof typeof definition.limits]
                ?.maxCount;
      const result = promoteInputToRequest({
        nodes: nodes ?? [],
        edges: edges ?? [],
        targetNodeId: id,
        targetHandle: handleId,
        paramKey: param.key,
        paramLabel: param.label,
        paramType: param.type as never,
        handleType: param.handle?.type,
        currentValue: nodeData.inputs?.[param.key],
        defaultValue: param.defaultValue,
        selectOptions: param.type === "select" ? param.options : undefined,
        numberMin: param.min,
        numberMax: param.max,
        numberStep: param.step,
        mediaMaxCount,
      });
      if (result.error) {
        console.warn("[Add to request]", result.error);
        return;
      }
      setNodes(result.nodes);
      setEdges(result.edges);
    },
    [
      readOnly,
      isLocked,
      nodes,
      edges,
      id,
      nodeData.inputs,
      setNodes,
      setEdges,
      definition,
    ],
  );

  const removeFileValue = (key: string, indexToRemove?: number) => {
    if (isLocked || readOnly) return;
    const currentInputs = nodeData.inputs || {};
    if (indexToRemove !== undefined) {
      const arr = [...(currentInputs[key] || [])];
      arr.splice(indexToRemove, 1);
      updateInput(key, arr);
    } else {
      updateInput(key, null);
    }
  };

  const renderParameterInput = (param: any) => {
    const handleId = `in:${param.key}`;
    const isWired = connectedTargets.has(handleId);
    const requestPromoted = isRequestPromoted(
      nodes ?? [],
      edges ?? [],
      id,
      handleId,
    );
    // boolean and crop-overlay-preview/kling-image-upload params stay in their own layout even when wired — no upstream panel
    const showUpstreamPanel =
      isWired &&
      !requestPromoted &&
      param.uiVariant !== "crop-overlay-preview" &&
      param.uiVariant !== "kling-image-upload" &&
      param.type !== "boolean" &&
      param.type !== "element-array";
    const showAddToRequestBtn = shouldShowAddToRequest({
      hasHandle: !!param.handle,
      readOnly,
      isLocked,
      wired: isWired,
    });
    const rawValue = resolveEffectiveParamValue({
      requestPromoted,
      localValue: nodeData.inputs?.[param.key],
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
    const expanded = !!isExpanded[param.key];

    if (
      definition.type === "mergeAV" &&
      param.uiVariant === "magica-volume-row"
    ) {
      const vol =
        value !== "" && value !== null && value !== undefined
          ? Number(value)
          : (param.defaultValue ?? 0.5);
      return (
        <div key={param.key} className="relative overflow-visible">
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
                className="flex min-w-0 shrink items-center text-xs text-gray-500"
              >
                <span className="truncate">{param.label}</span>
                {param.tooltip ? (
                  <FieldInfoTooltip text={param.tooltip} />
                ) : null}
              </span>
              <input
                type="range"
                min={param.min ?? 0}
                max={param.max ?? 2}
                step={param.step ?? 0.1}
                value={vol}
                onChange={(e) => updateInput(param.key, Number(e.target.value))}
                disabled={disabled}
                className={`nodrag h-2 min-w-[60px] flex-1 appearance-none rounded-lg bg-gray-200 ${theme.accent} disabled:opacity-50`}
              />
              <input
                type="number"
                min={param.min ?? 0}
                max={param.max ?? 2}
                step={param.step ?? 0.1}
                value={vol}
                onChange={(e) => updateInput(param.key, Number(e.target.value))}
                disabled={disabled}
                className="nodrag w-12 shrink-0 rounded-lg border border-gray-200 bg-[#F5F5F5] px-1.5 py-1 text-center text-xs text-gray-900 outline-none disabled:opacity-50"
              />
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  updateInput(param.key, param.defaultValue ?? 0.5)
                }
                className="nodrag flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-[#F5F5F5] text-gray-400 hover:text-gray-600 disabled:opacity-50"
                title="Reset to default"
              >
                <LucideIcons.RotateCcw
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                />
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

    if (
      definition.type === "mergeAV" &&
      param.uiVariant === "magica-side-label"
    ) {
      const isVideoField = param.key === "video_url";
      /** Any inbound wire (upstream node or Request-Inputs) — mirrors Crop Image `isInputWired`. */
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
        isVideoField &&
        isMediaWired &&
        (videoUrls.length > 1 || mediaUrls.length > 1);
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
        <div key={param.key} className="relative overflow-visible">
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
              className="flex shrink-0 items-center gap-1 pt-2 text-xs text-gray-500"
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
                    onMouseDown={(e) => e.stopPropagation()} onClick={() => {
                      if (canEditLocally)
                        setActiveUploadPopup(activeUploadPopup === param.key ? null : param.key);
                    }}
                    className="nodrag flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-[#F5F5F5] px-3 py-2.5 text-xs text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                      <LucideIcons.Upload className="h-3.5 w-3.5" />
                    )}
                    <span className="capitalize">
                      {uploadingField === param.key
                        ? "Uploading..."
                        : primaryUrl
                          ? `Change ${mediaLabel}`
                          : `Upload ${mediaLabel}`}
                    </span>
                  </button>
                  <input
                    id={`file-input-${param.key}`}
                    type="file"
                    hidden
                    accept={accept}
                    disabled={!canEditLocally}
                    onChange={(e) => {
                      void handleFileUpload(param.key, e.target.files).finally(
                        () => {
                          e.target.value = "";
                        },
                      );
                    }}
                  />
                  <UploadPopup
                    open={activeUploadPopup === param.key}
                    onClose={() => setActiveUploadPopup(null)}
                    onUpload={() => document.getElementById(`file-input-${param.key}`)?.click()}
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
            <p className="mt-2 text-[11px] text-amber-600">
              Only one video is allowed. Use Merge Videos to combine multiple
              clips.
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
                      className="absolute right-1 top-1 z-10 rounded bg-black/60 p-0.5 text-white hover:bg-red-500"
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
                      className="absolute right-1 top-1 z-10 rounded bg-black/60 p-0.5 text-white hover:bg-red-500"
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
            <p className="mt-2 text-[11px] text-gray-400 italic">
              Waiting for upstream {mediaLabel}…
            </p>
          )}
        </div>
      );
    }

    return (
      <div
        key={param.key}
        className={`relative overflow-visible transition-opacity ${
          requestPromoted && !isLocked
            ? "opacity-60 bg-gray-50/50 rounded-lg p-1"
            : ""
        }`}
      >
        {/* Render Handle if specified */}
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

        {((param.type !== "image-array" &&
          param.type !== "video-array" &&
          param.type !== "audio-array") ||
          isWired) &&
          !isCompactSelectParam(definition.type, param) &&
          param.uiVariant !== "magica-side-label" &&
          param.uiVariant !== "magica-volume-row" &&
          param.uiVariant !== "crop-overlay-preview" &&
          param.uiVariant !== "kling-image-upload" &&
          param.type !== "slider" &&
          !isSettingsCompactNumber(param) &&
          param.type !== "boolean" &&
          param.type !== "element-array" && (
            <div
              data-handle-anchor="label"
              className="mb-1.5 flex items-center text-xs text-gray-500"
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
          (() => {
            const wiredIsMedia =
              param.type === "image-array" ||
              param.type === "video-array" ||
              param.type === "audio-array" ||
              param.type === "file-upload" ||
              param.handle?.type === "image" ||
              param.handle?.type === "video" ||
              param.handle?.type === "audio" ||
              param.handle?.type === "file" ||
              (typeof wiredValue === "string" &&
                wiredValue.length > 0 &&
                classifyMediaUrl(wiredValue) !== null);

            return (
              <div
                className={`nodrag rounded-lg border border-gray-100 bg-[#FAFAFB] px-3 py-2 min-h-[3rem] text-[13px] ${wiredIsMedia ? "input-connected-media" : "input-connected"}`}
              >
                <p className="text-[9px] font-medium uppercase tracking-wide text-gray-400 mb-1">
                  Connected upstream
                </p>
                {param.type === "image-array" ||
                param.type === "video-array" ||
                param.type === "audio-array" ? (
                  (() => {
                    const mediaUrls = parseMediaList(wiredValue);
                    const isVideo = param.type === "video-array";
                    const isAudio = param.type === "audio-array";

                    if (mediaUrls.length > 0) {
                      return (
                        <div className="flex flex-col gap-2 mt-1">
                          <div
                            className={`grid gap-2 ${
                              isVideo || isAudio
                                ? "grid-cols-2"
                                : "grid-cols-3"
                            }`}
                          >
                            {mediaUrls.map((url, idx) => (
                              <div
                                key={idx}
                                className={`relative overflow-hidden bg-black rounded-lg border border-gray-200 ${
                                  isVideo || isAudio ? "" : ""
                                }`}
                                style={{
                                  aspectRatio:
                                    isVideo || isAudio ? "4 / 3" : "1 / 1",
                                }}
                              >
                                <div className="absolute left-1 top-1 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                                  {idx + 1}
                                </div>
                                {isVideo ? (
                                  <video
                                    src={url}
                                    className="w-full h-full object-cover"
                                    preload="metadata"
                                    playsInline
                                  />
                                ) : isAudio ? (
                                  <div className="flex h-full w-full items-center justify-center p-1">
                                    <audio
                                      src={url}
                                      controls
                                      className="w-full"
                                      preload="metadata"
                                    />
                                  </div>
                                ) : (
                                  <img
                                    src={url}
                                    alt={`preview-${idx}`}
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                          {!isVideo && !isAudio && (
                            <div className="flex flex-col gap-1 max-h-20 overflow-y-auto">
                              {mediaUrls.map((url, idx) => (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="truncate text-[10px] text-blue-500 hover:underline font-mono"
                                >
                                  {url}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return (
                      <span className="italic text-xs text-gray-400">
                        {isVideo
                          ? "Waiting for videos..."
                          : "Waiting for images..."}
                      </span>
                    );
                  })()
                ) : param.type === "file-upload" ||
                  param.handle?.type === "image" ||
                  param.handle?.type === "video" ||
                  param.handle?.type === "audio" ||
                  param.handle?.type === "file" ? (
                  (() => {
                    const mediaUrls = parseMediaList(wiredValue);
                    const primaryUrl = mediaUrls[0];
                    const wiredStr =
                      typeof wiredValue === "string"
                        ? wiredValue
                        : (primaryUrl ?? "");

                    if (!primaryUrl) {
                      return (
                        <span className="italic text-xs text-gray-400">
                          Waiting for file URL...
                        </span>
                      );
                    }

                    return (
                      <div className="mt-2">
                        {/* Audio handle type check FIRST — mp4 files in audio fields must render as <audio> */}
                        {param.handle?.type === "audio" ||
                        wiredStr.endsWith(".mp3") ||
                        wiredStr.endsWith(".wav") ||
                        wiredStr.endsWith(".ogg") ||
                        wiredStr.endsWith(".m4a") ? (
                          <div className="flex flex-col gap-2">
                            {mediaUrls.map((url, idx) => (
                              <div
                                key={idx}
                                className="relative inline-block w-full"
                              >
                                <audio
                                  src={url}
                                  controls
                                  preload="metadata"
                                  className="nodrag w-full"
                                  style={{ minWidth: 160 }}
                                />
                              </div>
                            ))}
                          </div>
                        ) : param.handle?.type === "video" ||
                          mediaUrls.some((u) =>
                            /\.(mp4|webm|mov)(\?|$)/i.test(u),
                          ) ? (
                          mediaUrls.length > 1 ? (
                            <div className="grid grid-cols-2 gap-2">
                              {mediaUrls.map((url, idx) => (
                                <div
                                  key={idx}
                                  className="relative w-full overflow-hidden rounded-md"
                                  style={{
                                    border: "2px solid rgba(34, 197, 94, 0.3)",
                                  }}
                                >
                                  <video
                                    src={url}
                                    controls
                                    preload="metadata"
                                    className="nodrag w-full rounded-sm"
                                    style={{ maxHeight: 120 }}
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div
                              className="relative w-full max-w-[260px] overflow-hidden rounded-md"
                              style={{
                                border: "2px solid rgba(34, 197, 94, 0.3)",
                              }}
                            >
                              <video
                                src={primaryUrl}
                                controls
                                preload="metadata"
                                className="nodrag w-full rounded-sm"
                                style={{ maxHeight: 160 }}
                              />
                            </div>
                          )
                        ) : param.handle?.type === "image" ||
                          primaryUrl.startsWith("data:image") ||
                          /\.(jpeg|jpg|gif|png|webp)(\?|$)/i.test(
                            primaryUrl,
                          ) ? (
                          mediaUrls.length > 1 ? (
                            <div className="flex flex-wrap gap-2">
                              {mediaUrls.map((url, idx) => (
                                <div
                                  key={idx}
                                  className="relative max-w-[100px] overflow-hidden rounded-md"
                                  style={{
                                    border: "2px solid rgba(59, 130, 246, 0.3)",
                                  }}
                                >
                                  <img
                                    src={url}
                                    alt={`Inbound preview ${idx + 1}`}
                                    className="nodrag w-full h-full object-cover"
                                    style={{ maxHeight: 100 }}
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div
                              className="relative max-w-[200px] overflow-hidden rounded-md"
                              style={{
                                border: "2px solid rgba(59, 130, 246, 0.3)",
                              }}
                            >
                              <img
                                src={primaryUrl}
                                alt="Inbound preview"
                                className="nodrag w-full h-full object-cover"
                                style={{ maxHeight: 140 }}
                              />
                            </div>
                          )
                        ) : (
                          <div className="flex flex-col gap-1">
                            {mediaUrls.map((url, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 overflow-hidden rounded-md px-2 py-1.5 bg-white max-w-[240px]"
                                style={{
                                  border: "2px solid rgba(168, 85, 247, 0.3)",
                                }}
                              >
                                <LucideIcons.FileText className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                <span className="truncate text-xs text-gray-600 font-mono">
                                  {url.split("/").pop() || "Document"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="max-h-[120px] overflow-y-auto nowheel whitespace-pre-wrap break-words text-xs leading-normal text-gray-500">
                    {wiredValue !== null && wiredValue !== undefined
                      ? String(wiredValue)
                      : "Waiting for upstream value..."}
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          <div className="relative">
            {param.type === "textarea" && (
              <div className="space-y-1">
                <div className="relative">
                  <textarea
                    rows={3}
                    placeholder={
                      param.placeholder ||
                      (definition.type === "gptImage2" && modeTab === "image"
                        ? "Describe how you want to edit the image..."
                        : `Describe the ${param.label.toLowerCase()} you want to create...`)
                    }
                    value={value}
                    onChange={(e) => updateInput(param.key, e.target.value)}
                    disabled={disabled}
                    className="nodrag nowheel w-full resize-y rounded-lg border border-gray-200 bg-[#F5F5F5] p-3 text-sm text-gray-900 outline-none focus:border-[#7C3AED] disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setActiveExpandParamKey(param.key)}
                    className="nodrag absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-md bg-gray-200/80 text-gray-500 transition-colors hover:bg-gray-300 hover:text-gray-700 shadow-sm"
                    title="Expand"
                  >
                    <LucideIcons.Maximize2 className="h-3 w-3" />
                  </button>
                </div>
                {definition.type !== "openRouter" && (
                  <div className="mt-1 text-right text-[10px] tabular-nums text-gray-400">
                    {value ? String(value).length : 0}/
                    {definition.limits?.[param.key]?.maxLength ?? 4000}
                  </div>
                )}
              </div>
            )}

            {param.type === "text" && (
              <input
                type="text"
                placeholder={`Enter ${param.label.toLowerCase()}...`}
                value={value}
                onChange={(e) => updateInput(param.key, e.target.value)}
                disabled={disabled}
                className="nodrag nowheel w-full rounded-lg border border-gray-200 bg-[#F5F5F5] px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#7C3AED] disabled:opacity-50 h-10"
              />
            )}

            {param.type === "number" && isSettingsCompactNumber(param) && (
              <div className="flex min-w-0 items-center gap-3">
                <span
                  data-handle-anchor="label"
                  className="flex min-w-0 shrink items-center truncate text-xs text-gray-500"
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
                  className="nodrag w-20 shrink-0 rounded-lg border border-gray-200 bg-[#F5F5F5] px-3 py-2 text-center text-sm text-gray-900 outline-none focus:border-[#7C3AED] disabled:opacity-50"
                />
                {showAddToRequestBtn && (
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => handlePromoteInput(param)}
                    className="nodrag inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-[#F5F5F5] text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
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
                onChange={(e) => updateInput(param.key, Number(e.target.value))}
                disabled={disabled}
                className="nodrag nowheel w-full rounded-lg border border-gray-200 bg-[#F5F5F5] px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#7C3AED] disabled:opacity-50 h-10"
              />
            )}

            {param.type === "slider" && (
              <div className="space-y-1.5">
                {/* One-line Magica layout: label + tooltip | slider | number input | reset | add-to-request */}
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    data-handle-anchor="label"
                    className="flex min-w-0 shrink items-center gap-0 text-xs text-gray-500"
                  >
                    <span className="truncate">{param.label}</span>
                    {param.tooltip && <FieldInfoTooltip text={param.tooltip} />}
                  </span>
                  <input
                    type="range"
                    min={param.min ?? 0}
                    max={param.max ?? 100}
                    step={param.step ?? 1}
                    value={value !== "" ? value : (param.defaultValue ?? 0)}
                    onChange={(e) =>
                      updateInput(param.key, Number(e.target.value))
                    }
                    disabled={disabled || isWired}
                    className="nodrag nowheel h-2 min-w-[60px] flex-1 appearance-none rounded-lg bg-gray-200 accent-[#7C3AED] disabled:opacity-50"
                  />
                  <input
                    type="number"
                    min={param.min ?? 0}
                    max={param.max ?? 100}
                    step={param.step ?? 1}
                    value={Number(
                      value !== "" ? value : (param.defaultValue ?? 0),
                    ).toFixed(param.step && param.step < 1 ? 2 : 0)}
                    onChange={(e) => {
                      const n = parseFloat(e.target.value);
                      if (!Number.isFinite(n)) return;
                      const clamped = Math.min(
                        param.max ?? 100,
                        Math.max(param.min ?? 0, n),
                      );
                      updateInput(param.key, clamped);
                    }}
                    disabled={disabled || isWired}
                    className="nodrag nowheel w-12 shrink-0 rounded-lg border border-gray-200 bg-[#F5F5F5] px-1.5 py-1 text-center text-xs text-gray-900 outline-none disabled:opacity-50"
                  />
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      updateInput(param.key, param.defaultValue ?? 0)
                    }
                    className="nodrag flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-[#F5F5F5] text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    title={`Reset ${param.label} to default`}
                  >
                    <LucideIcons.RotateCcw
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                  </button>
                  {showAddToRequestBtn && (
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => handlePromoteInput(param)}
                      className="nodrag inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-[#F5F5F5] text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <LucideIcons.Plus
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                    </button>
                  )}
                </div>
              </div>
            )}

            {param.type === "select" && (
              <div
                className={`${
                  isCompactSelectParam(definition.type, param)
                    ? "flex min-w-0 items-center gap-2"
                    : "relative custom-select-container"
                }`}
              >
                {isCompactSelectParam(definition.type, param) && (
                  <span
                    data-handle-anchor="label"
                    className="flex min-w-0 shrink items-center gap-1 text-xs text-gray-500"
                  >
                    <span className="truncate">{param.label}</span>
                    {param.tooltip ? (
                      <FieldInfoTooltip text={param.tooltip} />
                    ) : null}
                  </span>
                )}
                <div
                  className={`relative ${
                    isCompactSelectParam(definition.type, param)
                      ? "min-w-0 flex-1 custom-select-container"
                      : ""
                  }`}
                >
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      setActiveDropdown(
                        activeDropdown === param.key ? null : param.key,
                      )
                    }
                    className="flex h-10 w-full items-center justify-between rounded-lg border border-gray-200 bg-[#F5F5F5] px-3 py-2 text-sm text-gray-900 disabled:opacity-50 outline-none focus:border-[#7C3AED] cursor-pointer nodrag"
                  >
                    <span className="truncate">
                      {param.options?.find((opt: any) => opt.value === value)
                        ?.label ||
                        value ||
                        "Select option..."}
                    </span>
                    <LucideIcons.ChevronDown
                      className="h-4 w-4 text-gray-500 opacity-50 shrink-0"
                      aria-hidden="true"
                    />
                  </button>

                  {/* Dropdown Menu Popup */}
                  {activeDropdown === param.key && (
                    <div className="absolute left-0 top-full mt-1.5 z-50 flex min-w-full flex-col rounded-2xl border border-gray-100 bg-white p-1.5 shadow-xl text-left">
                      <div className="max-h-[260px] overflow-y-auto nowheel flex flex-col gap-0.5">
                        {param.options?.map((opt: any) => {
                          const isSelected = opt.value === value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                updateInput(param.key, opt.value);
                                setActiveDropdown(null);
                              }}
                              className={`flex items-center gap-1.5 w-full px-3 py-2 text-[13px] font-medium transition-colors rounded-xl text-left ${
                                isSelected
                                  ? "bg-gray-100/60 text-gray-900"
                                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                              }`}
                            >
                              <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                                {isSelected && (
                                  <LucideIcons.Check className="w-3.5 h-3.5 text-gray-900 stroke-[2.5]" />
                                )}
                              </span>
                              <span className="truncate">{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                {isCompactSelectParam(definition.type, param) &&
                  param.handle &&
                  showAddToRequestBtn && (
                    <div className="ml-auto shrink-0">
                      <AddToRequestToggle
                        disabled={isLocked}
                        onPromote={() => handlePromoteInput(param)}
                      />
                    </div>
                  )}
              </div>
            )}

            {param.type === "boolean" && (
              // Single-line: [label] [False] [toggle switch] [True] [+ add-to-request?]
              <div className="flex min-w-0 items-center gap-3">
                <span
                  data-handle-anchor="label"
                  className="flex min-w-0 shrink items-center truncate text-xs text-gray-500"
                >
                  {param.label}
                  {param.tooltip && <FieldInfoTooltip text={param.tooltip} />}
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={`text-[10px] font-medium ${!value ? "text-gray-600" : "text-gray-400"}`}
                  >
                    False
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!!value}
                    data-state={value ? "checked" : "unchecked"}
                    disabled={disabled}
                    onClick={() => updateInput(param.key, !value)}
                    className={`nodrag peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      value ? "bg-[#7C3AED]" : "bg-input bg-gray-200"
                    }`}
                  >
                    <span
                      data-state={value ? "checked" : "unchecked"}
                      className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
                    />
                  </button>
                  <span
                    className={`text-[10px] font-medium ${value ? "text-gray-600" : "text-gray-400"}`}
                  >
                    True
                  </span>
                </div>
                {showAddToRequestBtn && (
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => handlePromoteInput(param)}
                    className="nodrag inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-[#F5F5F5] text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Add to request inputs"
                  >
                    <LucideIcons.Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            )}

            {param.type === "file-upload" &&
              param.uiVariant === "crop-overlay-preview" && (
                // Crop image: single-line layout — [label] [upload button flex-1] [+ add-to-request?]
                // Add-to-request is only shown when not wired (same rule as other params).
                <div className="flex items-center gap-2">
                  <span
                    data-handle-anchor="label"
                    className="shrink-0 text-xs text-gray-500"
                  >
                    {param.label}
                    {param.required && <span className="text-red-400">*</span>}
                  </span>
                  <div className="relative min-w-0 flex-1">
                    <button
                      type="button"
                      tabIndex={-1}
                      disabled={isWired || disabled}
                      onMouseDown={(e) => e.stopPropagation()} onClick={() => {
                        if (!isWired && !disabled)
                          setActiveUploadPopup(activeUploadPopup === param.key ? null : param.key);
                      }}
                      className="nodrag flex w-full items-center justify-center gap-2 rounded-lg border border-dashed transition-colors disabled:opacity-50 border-gray-300 bg-[#F5F5F5] px-3 py-2 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700"
                      title={
                        isWired
                          ? "Image is supplied by an upstream connection"
                          : value
                            ? "Change image"
                            : "Upload image"
                      }
                    >
                      {uploadingField === param.key ? (
                        <LucideIcons.Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <LucideIcons.Upload className="w-3.5 h-3.5" />
                      )}
                      <span className="capitalize">
                        {uploadingField === param.key
                          ? "Uploading..."
                          : value
                            ? "Change image"
                            : "Upload image"}
                      </span>
                    </button>
                    <input
                      id={`file-input-crop-${id}-${param.key}`}
                      type="file"
                      hidden
                      accept="image/*"
                      disabled={isWired || disabled}
                      onChange={(e) =>
                        void handleFileUpload(param.key, e.target.files)
                      }
                    />
                    <UploadPopup
                      open={activeUploadPopup === param.key}
                      onClose={() => setActiveUploadPopup(null)}
                      onUpload={() => document.getElementById(`file-input-crop-${id}-${param.key}`)?.click()}
                    />
                  </div>
                  {!isWired && showAddToRequestBtn && (
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => handlePromoteInput(param)}
                      className="nodrag inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-[#F5F5F5] text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Add to request inputs"
                    >
                      <LucideIcons.Plus
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                    </button>
                  )}
                </div>
              )}

            {/* Kling-style image upload: [label] [upload button flex-1] [+ add-to-request?] — side-label layout, no crop overlay */}
            {param.type === "file-upload" &&
              param.uiVariant === "kling-image-upload" && (
                <div className="flex items-start gap-3">
                  <span
                    data-handle-anchor="label"
                    className="shrink-0 pt-2 text-xs text-gray-500"
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
                        onMouseDown={(e) => e.stopPropagation()} onClick={() => {
                          if (!isWired && !disabled)
                            setActiveUploadPopup(activeUploadPopup === param.key ? null : param.key);
                        }}
                        className="nodrag flex w-full items-center justify-center gap-2 rounded-lg border border-dashed transition-colors disabled:opacity-50 border-gray-300 bg-[#F5F5F5] px-3 py-2.5 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700"
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
                        <span className="capitalize">
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
                        onChange={(e) =>
                          void handleFileUpload(param.key, e.target.files)
                        }
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
                              className="absolute right-1 top-1 z-10 rounded bg-black/60 p-0.5 text-white hover:bg-red-500"
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
                      className="nodrag mt-1.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-[#F5F5F5] text-gray-500 hover:bg-gray-100"
                      disabled={isLocked}
                      onClick={() => handlePromoteInput(param)}
                      title="Add to request inputs"
                    >
                      <LucideIcons.Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}

            {param.type === "file-upload" &&
              param.uiVariant !== "crop-overlay-preview" &&
              param.uiVariant !== "kling-image-upload" && (
                <div className="space-y-2">
                  {value ? (
                    <div className="relative rounded-lg border border-gray-200 bg-[#F5F5F5] overflow-hidden p-2 flex items-center gap-3">
                      {value.startsWith("data:image") ||
                      (value.startsWith("http") &&
                        (value.includes(".jpg") ||
                          value.includes(".png") ||
                          value.includes(".jpeg") ||
                          value.includes(".webp") ||
                          value.match(
                            /cropImage|gemini|openRouter|execute/i,
                          ))) ? (
                        <img
                          src={value}
                          alt="Upload preview"
                          className="w-12 h-12 object-contain bg-white rounded border border-gray-200"
                        />
                      ) : (
                        <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded text-gray-500">
                          {param.key.includes("video") ? (
                            <LucideIcons.Video className="w-5 h-5" />
                          ) : param.key.includes("audio") ? (
                            <LucideIcons.Music className="w-5 h-5" />
                          ) : (
                            <LucideIcons.File className="w-5 h-5" />
                          )}
                        </div>
                      )}
                      <span className="truncate flex-1 text-xs font-mono select-all pr-8">
                        {value.startsWith("data:")
                          ? "base64 file buffer"
                          : value.split("/").pop()}
                      </span>
                      {!readOnly && (
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => removeFileValue(param.key)}
                          className="nodrag absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 disabled:opacity-30"
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
                        onClick={() =>
                          setActiveUploadPopup(
                            activeUploadPopup === param.key ? null : param.key,
                          )
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed transition-colors disabled:opacity-50 nodrag border-gray-300 bg-[#F5F5F5] px-3 py-2.5 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700"
                      >
                        {uploadingField === param.key ? (
                          <LucideIcons.Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <LucideIcons.Upload className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {uploadingField === param.key
                            ? "Uploading..."
                            : `Upload ${param.label.toLowerCase()}`}
                        </span>
                      </button>
                      <input
                        id={`file-input-${param.key}`}
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
                        onChange={(e) =>
                          void handleFileUpload(param.key, e.target.files)
                        }
                      />

                      {/* Popover modal */}
                      <UploadPopup
                        open={activeUploadPopup === param.key}
                        onClose={() => setActiveUploadPopup(null)}
                        onUpload={() => { const input = document.getElementById(`file-input-${param.key}`); if (input) (input as HTMLInputElement).click(); }}
                      />
                    </div>
                  )}
                </div>
              )}

            {/* Crop overlay preview — rendered after the inputImage file-upload when
                uiVariant === "crop-overlay-preview" is set on the param definition. */}
            {param.uiVariant === "crop-overlay-preview" &&
              (() => {
                // Resolve image: wired edge takes priority, fall back to locally stored value
                const imgUrl: string | null =
                  (isWired
                    ? (() => {
                        const edge = (edges ?? []).find(
                          (e) => e.target === id && e.targetHandle === handleId,
                        );
                        if (!edge) return null;
                        const v = resolvePropagatedEdgeValue(
                          edge,
                          nodes ?? [],
                          edgeResolveOpts,
                        );
                        return typeof v === "string" && v.length > 0 ? v : null;
                      })()
                    : (nodeData.inputs?.[param.key] as string | null)) ?? null;

                if (!imgUrl) return null;

                const clampPct = (n: number, min = 0, max = 100) =>
                  Math.min(
                    max,
                    Math.max(min, Number.isFinite(n) ? Math.round(n) : min),
                  );

                const xv = clampPct(Number(nodeData.inputs?.x ?? 0));
                const yv = clampPct(Number(nodeData.inputs?.y ?? 0));
                const wv = clampPct(Number(nodeData.inputs?.w ?? 100), 1, 100);
                const hv = clampPct(Number(nodeData.inputs?.h ?? 100), 1, 100);
                const rightPct = Math.min(100, xv + wv);
                const bottomPct = Math.min(100, yv + hv);

                return (
                  <div className="mt-2 flex justify-end">
                    <div className="flex flex-col items-end gap-1">
                      <div
                        className="relative overflow-hidden rounded-md"
                        style={{ border: "2px solid rgba(59,130,246,0.3)" }}
                      >
                        <img
                          alt=""
                          src={imgUrl}
                          className="block rounded-sm"
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
                            className="nodrag absolute right-1 top-1 z-10 rounded bg-black/60 p-0.5 text-white hover:bg-red-500"
                            title="Remove image"
                          >
                            <LucideIcons.X
                              className="h-2.5 w-2.5"
                              aria-hidden="true"
                            />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

            {/* element-array: Kling v3 Elements repeatable section — no overall handle, each item has its own sub-handles */}
            {param.type === "element-array" && (() => {
              const items = elementItems;
              const itemKeys = Object.keys(items).sort((a, b) => Number(a) - Number(b));
              const handleElementFileUpload = async (itemIdx: string, fieldKey: string, files: FileList | null, isMulti = false, maxCount = 10) => {
                if (!files?.length || isLocked || readOnly) return;
                const uploadKey = `${itemIdx}-${fieldKey}`;
                setUploadingElementField(uploadKey);
                try {
                  const { urls: validUrls, firstError } = await uploadFilesViaApi(Array.from(files));
                  if (firstError) window.alert(firstError);
                  if (validUrls.length > 0) {
                    setElementItems(prev => {
                      const item = { ...(prev[itemIdx] || {}) };
                      if (isMulti) {
                        const existing = (item[fieldKey] as string[]) || [];
                        item[fieldKey] = [...existing, ...validUrls].slice(0, maxCount);
                      } else {
                        item[fieldKey] = validUrls[0];
                      }
                      const next = { ...prev, [itemIdx]: item };
                      // Sync to node data
                      const arr = Object.keys(next).sort((a, b) => Number(a) - Number(b)).map(k => next[k]);
                      updateInput(param.key, arr);
                      return next;
                    });
                  }
                } catch (err) {
                  console.error("[GenericNode] Element upload failed:", err);
                } finally {
                  setUploadingElementField(null);
                }
              };
              const addItem = () => {
                const newIdx = String(itemKeys.length > 0 ? Math.max(...itemKeys.map(Number)) + 1 : 0);
                setElementItems(prev => {
                  const next = { ...prev, [newIdx]: {} };
                  const arr = Object.keys(next).sort((a, b) => Number(a) - Number(b)).map(k => next[k]);
                  updateInput(param.key, arr);
                  return next;
                });
              };
              const removeItem = (itemIdx: string) => {
                setElementItems(prev => {
                  const next = { ...prev };
                  delete next[itemIdx];
                  // Re-index to keep array compact
                  const reindexed: typeof next = {};
                  Object.keys(next).sort((a, b) => Number(a) - Number(b)).forEach((k, i) => {
                    reindexed[String(i)] = next[k];
                  });
                  const arr = Object.values(reindexed);
                  updateInput(param.key, arr);
                  return reindexed;
                });
              };
              const removeElementImage = (itemIdx: string, fieldKey: string, imgIdx?: number) => {
                setElementItems(prev => {
                  const item = { ...(prev[itemIdx] || {}) };
                  if (imgIdx !== undefined) {
                    const arr = [...((item[fieldKey] as string[]) || [])];
                    arr.splice(imgIdx, 1);
                    item[fieldKey] = arr;
                  } else {
                    item[fieldKey] = "";
                  }
                  const next = { ...prev, [itemIdx]: item };
                  const arr2 = Object.keys(next).sort((a, b) => Number(a) - Number(b)).map(k => next[k]);
                  updateInput(param.key, arr2);
                  return next;
                });
              };

              return (
                <div className="space-y-2">
                  {/* Section header: bold black label + info tooltip */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-900">{param.label}</span>
                    {param.tooltip && (
                      <FieldInfoTooltip text={param.tooltip} />
                    )}
                  </div>

                  {itemKeys.map((itemIdx) => {
                    const item = items[itemIdx];
                    // frontal image drives conditional behaviour for other fields
                    const frontalVal = typeof item["frontal_image_url"] === "string" ? item["frontal_image_url"] : "";
                    const hasFrontal = frontalVal.length > 0;

                    return (
                      <div
                        key={itemIdx}
                        className="relative space-y-2.5 rounded-lg border border-gray-200 bg-white p-3"
                      >
                        {/* Delete button */}
                        <button
                          type="button"
                          className="nodrag absolute -right-2 -top-2 rounded-full bg-gray-200 p-1 text-gray-500 transition-colors hover:bg-red-100 hover:text-red-500"
                          title="Remove item"
                          onClick={() => removeItem(itemIdx)}
                        >
                          <LucideIcons.Trash2 className="h-3 w-3" aria-hidden="true" />
                        </button>

                        {(param.elementFields || []).map((field: any) => {
                          const fieldUploadKey = `${itemIdx}-${field.key}`;
                          const fieldValue = item[field.key];
                          const handleId_sub = `in:elements.${itemIdx}.${field.key}`;
                          const isFieldWired = connectedTargets.has(handleId_sub);
                          const imgList = Array.isArray(fieldValue) ? fieldValue as string[] : [];
                          const singleVal = typeof fieldValue === "string" ? fieldValue : "";
                          const atMax = field.type === "file-upload-multi" && imgList.length >= (field.maxCount || 10);
                          const isVideo = field.accept?.includes("video");

                          // Video element is hidden once a frontal image is uploaded
                          if (field.key === "video_url" && hasFrontal) return null;

                          // Reference Images upload button is muted until frontal image is provided
                          const refImagesMuted = field.key === "reference_image_urls" && !hasFrontal && !isFieldWired;

                          return (
                            <div key={field.key} className="relative" style={{ overflow: "visible" }}>
                              {/* Sub-handle, positioned further left inside the card */}
                              {field.handle && !refImagesMuted && !(field.key === "video_url" && hasFrontal) && (
                                <div
                                  className="absolute flex items-center"
                                  style={{ left: "-35px", top: "14px", transform: "translateY(-50%)", zIndex: 50 }}
                                >
                                  <Handle
                                    type="target"
                                    position={Position.Left}
                                    id={handleId_sub}
                                    className="!relative !transform-none target connectable connectablestart connectableend connectionindicator"
                                    style={{
                                      width: 12,
                                      height: 12,
                                      borderRadius: "50%",
                                      background: field.handle.color,
                                      border: `2px solid ${field.handle.color}80`,
                                      cursor: "crosshair",
                                      ["--handle-color" as any]: field.handle.color,
                                    }}
                                  />
                                </div>
                              )}

                              {field.type === "file-upload-single" && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-3">
                                    <span className="shrink-0 text-xs text-gray-500">
                                      {field.label}
                                      {field.required && <span className="text-red-400">*</span>}
                                    </span>
                                    <div className="flex-1">
                                      {(() => {
                                        const elPopupKey = `el-popup-${itemIdx}-${field.key}`;
                                        return (
                                      <div className="relative">
                                        <button
                                          type="button"
                                          tabIndex={-1}
                                          disabled={isFieldWired || disabled}
                                          onMouseDown={(e) => e.stopPropagation()} onClick={() => !isFieldWired && !disabled && setActiveUploadPopup(activeUploadPopup === elPopupKey ? null : elPopupKey)}
                                          className="nodrag flex w-full items-center justify-center gap-2 rounded-lg border border-dashed transition-colors disabled:opacity-50 border-gray-300 bg-[#F5F5F5] px-3 py-2.5 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700"
                                          title={singleVal ? `Change ${isVideo ? "video" : "image"}` : `Upload ${isVideo ? "video" : "image"}`}
                                        >
                                          {uploadingElementField === fieldUploadKey ? (
                                            <LucideIcons.Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          ) : (
                                            <LucideIcons.Upload className="h-3.5 w-3.5" />
                                          )}
                                          <span className="capitalize">
                                            {uploadingElementField === fieldUploadKey
                                              ? "Uploading..."
                                              : singleVal
                                                ? `Change ${isVideo ? "video" : "image"}`
                                                : `Upload ${isVideo ? "video" : "image"}`}
                                          </span>
                                        </button>
                                        <input
                                          id={`el-file-${id}-${itemIdx}-${field.key}`}
                                          type="file"
                                          hidden
                                          accept={field.accept}
                                          disabled={isFieldWired || disabled}
                                          onChange={(e) => void handleElementFileUpload(itemIdx, field.key, e.target.files)}
                                        />
                                        <UploadPopup
                                          open={activeUploadPopup === elPopupKey}
                                          onClose={() => setActiveUploadPopup(null)}
                                          onUpload={() => document.getElementById(`el-file-${id}-${itemIdx}-${field.key}`)?.click()}
                                        />
                                      </div>
                                        );
                                      })()}
                                      
                                      {/* Upload requirements — aligned to left edge of button, inside flex-1 */}
                                      {field.uploadRequirementsTooltip && (
                                        <div className="mt-1 flex items-center gap-1">
                                          <FieldInfoTooltip text={field.uploadRequirementsTooltip} />
                                          <span className="text-[10px] text-gray-400">Upload requirements</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {/* Preview for single image upload */}
                                  {singleVal && !isFieldWired && !isVideo && (
                                    <div className="flex justify-end">
                                      <div className="flex flex-col items-end gap-1">
                                        <div
                                          className="relative overflow-hidden rounded-md"
                                          style={{ border: "2px solid rgba(59,130,246,0.3)" }}
                                        >
                                          <img
                                            alt=""
                                            className="block rounded-sm"
                                            src={singleVal}
                                            style={{ maxWidth: 200, maxHeight: 120 }}
                                          />
                                          <button
                                            className="absolute right-1 top-1 z-10 rounded bg-black/60 p-0.5 text-white hover:bg-red-500"
                                            onClick={() => removeElementImage(itemIdx, field.key)}
                                          >
                                            <LucideIcons.X className="h-2.5 w-2.5" aria-hidden="true" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {field.type === "file-upload-multi" && (
                                <div>
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="text-xs text-gray-500">
                                      {field.label}
                                      {field.required && <span className="text-red-400">*</span>}
                                    </span>
                                  </div>
                                  {(() => {
                                    const elPopupKeyMulti = `el-popup-${itemIdx}-${field.key}`;
                                    return (
                                  <div className="relative">
                                    <button
                                      type="button"
                                      tabIndex={-1}
                                      disabled={isFieldWired || disabled || atMax || refImagesMuted}
                                      onMouseDown={(e) => e.stopPropagation()} onClick={() => !isFieldWired && !disabled && !atMax && !refImagesMuted && setActiveUploadPopup(activeUploadPopup === elPopupKeyMulti ? null : elPopupKeyMulti)}
                                      className="nodrag flex w-full items-center justify-center gap-2 rounded-lg border border-dashed transition-colors border-gray-300 bg-[#F5F5F5] px-3 py-2.5 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700 disabled:opacity-50"
                                      title={refImagesMuted ? "Upload a Frontal Image first" : "Upload image"}
                                    >
                                      {uploadingElementField === fieldUploadKey ? (
                                        <LucideIcons.Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <LucideIcons.Upload className="h-3.5 w-3.5" />
                                      )}
                                      <span className="capitalize">
                                        {uploadingElementField === fieldUploadKey ? "Uploading..." : "Upload image"}
                                      </span>
                                    </button>
                                    <input
                                      id={`el-file-${id}-${itemIdx}-${field.key}`}
                                      type="file"
                                      hidden
                                      accept={field.accept}
                                      multiple
                                      disabled={isFieldWired || disabled || refImagesMuted}
                                      onChange={(e) => void handleElementFileUpload(itemIdx, field.key, e.target.files, true, field.maxCount || 10)}
                                    />
                                    <UploadPopup
                                      open={activeUploadPopup === elPopupKeyMulti}
                                      onClose={() => setActiveUploadPopup(null)}
                                      onUpload={() => document.getElementById(`el-file-${id}-${itemIdx}-${field.key}`)?.click()}
                                    />
                                  </div>
                                    );
                                  })()}
                                  
                                  {/* Upload requirements info — tooltip on info icon */}
                                  {field.uploadRequirementsTooltip && (
                                    <div className="mt-1 flex items-center gap-1">
                                      <FieldInfoTooltip text={field.uploadRequirementsTooltip} />
                                      <span className="text-[10px] text-gray-400">Upload requirements</span>
                                    </div>
                                  )}
                                  {/* Grid of uploaded images */}
                                  {imgList.length > 0 && (
                                    <div className="mt-2 grid gap-2" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                                      {imgList.map((imgUrl, imgIdx) => (
                                        <div
                                          key={imgIdx}
                                          className="nodrag nopan relative overflow-hidden rounded-lg border border-gray-200 bg-black"
                                          title={`Image ${imgIdx + 1}`}
                                          style={{ aspectRatio: "1 / 1" }}
                                        >
                                          <div className="absolute left-1 top-1 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                                            {imgIdx + 1}
                                          </div>
                                          <img
                                            alt=""
                                            className="h-full w-full object-cover"
                                            draggable={false}
                                            src={imgUrl}
                                          />
                                          <button
                                            type="button"
                                            className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white hover:bg-red-500 disabled:opacity-50"
                                            title="Remove"
                                            onClick={() => removeElementImage(itemIdx, field.key, imgIdx)}
                                          >
                                            <LucideIcons.X className="h-3 w-3" aria-hidden="true" />
                                          </button>
                                        </div>
                                      ))}
                                      {!atMax && (() => {
                                        const elPopupKeyAdd = `el-popup-${itemIdx}-${field.key}`;
                                        return (
                                        <div className="relative">
                                          <div
                                            className="nodrag relative overflow-hidden rounded-lg border border-dashed border-gray-300 bg-[#F5F5F5] cursor-pointer hover:border-gray-400"
                                            title="Add image"
                                            style={{ aspectRatio: "1 / 1" }}
                                            onMouseDown={(e) => e.stopPropagation()} onClick={() => !disabled && setActiveUploadPopup(activeUploadPopup === elPopupKeyAdd ? null : elPopupKeyAdd)}
                                          >
                                            <div className="flex h-full w-full items-center justify-center text-[10px] font-medium text-gray-400">
                                              Add Image
                                            </div>
                                          </div>
                                        </div>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    className="nodrag flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-900 transition-colors hover:border-[#7C3AED]/40 hover:text-[#7C3AED]"
                    onClick={addItem}
                  >
                    <LucideIcons.Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Add item
                  </button>
                </div>
              );
            })()}

            {param.type === "image-array" && (() => {
              const maxItems = getMediaArrayMax(definition, param);
              const atMax = value.length >= maxItems;
              return (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span
                      data-handle-anchor="label"
                      className="shrink-0 pt-2 text-xs text-gray-500"
                    >
                      {param.label}
                      {param.required && (
                        <span className="text-red-400 ml-0.5">*</span>
                      )}
                    </span>

                    <div className="flex-1">
                      {!readOnly && !isWired ? (
                        <div className="relative">
                          <button
                            type="button"
                            tabIndex={-1}
                            disabled={disabled || atMax}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={() =>
                              setActiveUploadPopup(
                                activeUploadPopup === param.key
                                  ? null
                                  : param.key,
                              )
                            }
                            className="nodrag flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-[#F5F5F5] px-3 py-2.5 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50"
                            title="Upload image"
                          >
                            {uploadingField === param.key ? (
                              <LucideIcons.Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <LucideIcons.Upload className="h-3.5 w-3.5" />
                            )}
                            <span className="capitalize">
                              {uploadingField === param.key
                                ? "Uploading..."
                                : "Upload image"}
                            </span>
                          </button>
                          <input
                            id={`file-input-${param.key}`}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            disabled={disabled || atMax}
                            onChange={(e) => {
                              void handleFileUpload(
                                param.key,
                                e.target.files,
                                true,
                              ).finally(() => {
                                e.target.value = "";
                              });
                            }}
                          />
                          <UploadPopup
                            open={activeUploadPopup === param.key}
                            onClose={() => setActiveUploadPopup(null)}
                            onUpload={() =>
                              document
                                .getElementById(`file-input-${param.key}`)
                                ?.click()
                            }
                          />
                        </div>
                      ) : (
                        value.length === 0 && (
                          <div className="text-xs text-gray-400 italic">
                            No images uploaded
                          </div>
                        )
                      )}

                      {!readOnly && !isWired && (
                        <div className="mt-1 flex items-center gap-1">
                          <span className="inline-flex cursor-pointer">
                            <LucideIcons.Info className="h-3 w-3 text-gray-400" />
                          </span>
                          <span className="text-[10px] text-gray-400">
                            Upload requirements
                          </span>
                          {param.tooltip && (
                            <FieldInfoTooltip text={param.tooltip} />
                          )}
                        </div>
                      )}

                      {(value.length > 0 || (!readOnly && !isWired && !atMax)) && (
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {value.map((url: string, idx: number) => (
                            <div
                              key={idx}
                              className="nodrag nopan relative overflow-hidden rounded-lg border border-gray-200 bg-black"
                              style={{ aspectRatio: "1 / 1" }}
                              title={`Image ${idx + 1}`}
                            >
                              <div className="absolute left-1 top-1 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                                {idx + 1}
                              </div>
                              <img
                                src={url}
                                alt=""
                                className="h-full w-full object-cover"
                                draggable={false}
                              />
                              {!readOnly && !isWired && (
                                <button
                                  type="button"
                                  disabled={isLocked}
                                  onClick={() =>
                                    removeFileValue(param.key, idx)
                                  }
                                  className="nodrag absolute right-1 top-1 rounded bg-black/60 p-1 text-white hover:bg-red-500 disabled:opacity-50"
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
                              onClick={() =>
                                setActiveUploadPopup(
                                  activeUploadPopup === param.key
                                    ? null
                                    : param.key,
                                )
                              }
                              className="nodrag relative overflow-hidden rounded-lg border border-dashed border-gray-300 bg-[#F5F5F5] hover:border-[#7C3AED]/40 cursor-pointer"
                              style={{ aspectRatio: "1 / 1" }}
                              title="Add image"
                            >
                              <span className="flex h-full w-full items-center justify-center text-[10px] font-medium text-gray-400">
                                Add Image
                              </span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {param.handle && showAddToRequestBtn && (
                      <button
                        type="button"
                        disabled={isLocked}
                        onClick={() => handlePromoteInput(param)}
                        className="nodrag mt-1.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-[#F5F5F5] text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <LucideIcons.Plus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {param.type === "video-array" && (() => {
              const maxItems = getMediaArrayMax(definition, param);
              const atMax = value.length >= maxItems;
              return (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span
                      data-handle-anchor="label"
                      className="shrink-0 pt-2 text-xs text-gray-500"
                    >
                      {param.label}
                      {param.required && (
                        <span className="text-red-400 ml-0.5">*</span>
                      )}
                    </span>

                    <div className="flex-1">
                      {!readOnly && !isWired && (
                        <div className="relative">
                          <button
                            type="button"
                            tabIndex={-1}
                            disabled={disabled || atMax}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={() =>
                              setActiveUploadPopup(
                                activeUploadPopup === param.key
                                  ? null
                                  : param.key,
                              )
                            }
                            className="nodrag flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-[#F5F5F5] px-3 py-2.5 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50"
                            title="Upload video"
                          >
                            {uploadingField === param.key ? (
                              <LucideIcons.Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <LucideIcons.Upload className="h-3.5 w-3.5" />
                            )}
                            <span className="capitalize">
                              {uploadingField === param.key
                                ? "Uploading..."
                                : "Upload video"}
                            </span>
                          </button>
                          <input
                            id={`file-input-${param.key}`}
                            type="file"
                            accept="video/*"
                            multiple
                            className="hidden"
                            disabled={disabled || atMax}
                            onChange={(e) => {
                              void handleFileUpload(
                                param.key,
                                e.target.files,
                                true,
                              ).finally(() => {
                                e.target.value = "";
                              });
                            }}
                          />
                          <UploadPopup
                            open={activeUploadPopup === param.key}
                            onClose={() => setActiveUploadPopup(null)}
                            onUpload={() =>
                              document
                                .getElementById(`file-input-${param.key}`)
                                ?.click()
                            }
                          />
                        </div>
                      )}

                      {(value.length > 0 ||
                        (!readOnly && !isWired && !atMax)) && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {value.map((url: string, idx: number) => (
                            <div
                              key={idx}
                              className="nodrag nopan relative overflow-hidden rounded-lg border border-gray-200 bg-black"
                              style={{ aspectRatio: "4 / 3" }}
                              title={`Video ${idx + 1}`}
                            >
                              <div className="absolute left-1 top-1 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                                {idx + 1}
                              </div>
                              <video
                                src={url}
                                className="h-full w-full object-cover"
                                preload="metadata"
                                playsInline
                              />
                              {!readOnly && !isWired && (
                                <button
                                  type="button"
                                  disabled={isLocked}
                                  onClick={() =>
                                    removeFileValue(param.key, idx)
                                  }
                                  className="nodrag absolute right-1 top-1 rounded bg-black/60 p-1 text-white hover:bg-red-500 disabled:opacity-50"
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
                              onClick={() =>
                                setActiveUploadPopup(
                                  activeUploadPopup === param.key
                                    ? null
                                    : param.key,
                                )
                              }
                              className="nodrag relative overflow-hidden rounded-lg border border-dashed border-gray-300 bg-[#F5F5F5] hover:border-[#7C3AED]/40 cursor-pointer"
                              style={{ aspectRatio: "4 / 3" }}
                              title="Add video"
                            >
                              <span className="flex h-full w-full items-center justify-center text-[10px] font-medium text-gray-400">
                                Add Video
                              </span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {param.handle && showAddToRequestBtn && (
                      <button
                        type="button"
                        disabled={isLocked}
                        onClick={() => handlePromoteInput(param)}
                        className="nodrag mt-1.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-[#F5F5F5] text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <LucideIcons.Plus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {param.type === "audio-array" && (() => {
              const maxItems = getMediaArrayMax(definition, param);
              const atMax = value.length >= maxItems;
              return (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span
                      data-handle-anchor="label"
                      className="shrink-0 pt-2 text-xs text-gray-500"
                    >
                      {param.label}
                      {param.required && (
                        <span className="text-red-400 ml-0.5">*</span>
                      )}
                    </span>

                    <div className="flex-1">
                      {!readOnly && !isWired && (
                        <div className="relative">
                          <button
                            type="button"
                            tabIndex={-1}
                            disabled={disabled || atMax}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={() =>
                              setActiveUploadPopup(
                                activeUploadPopup === param.key
                                  ? null
                                  : param.key,
                              )
                            }
                            className="nodrag flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-[#F5F5F5] px-3 py-2.5 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50"
                            title="Upload audio"
                          >
                            {uploadingField === param.key ? (
                              <LucideIcons.Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <LucideIcons.Upload className="h-3.5 w-3.5" />
                            )}
                            <span className="capitalize">
                              {uploadingField === param.key
                                ? "Uploading..."
                                : "Upload audio"}
                            </span>
                          </button>
                          <input
                            id={`file-input-${param.key}`}
                            type="file"
                            accept="audio/*,video/*"
                            multiple
                            className="hidden"
                            disabled={disabled || atMax}
                            onChange={(e) => {
                              void handleFileUpload(
                                param.key,
                                e.target.files,
                                true,
                              ).finally(() => {
                                e.target.value = "";
                              });
                            }}
                          />
                          <UploadPopup
                            open={activeUploadPopup === param.key}
                            onClose={() => setActiveUploadPopup(null)}
                            onUpload={() =>
                              document
                                .getElementById(`file-input-${param.key}`)
                                ?.click()
                            }
                          />
                        </div>
                      )}

                      {(value.length > 0 ||
                        (!readOnly && !isWired && !atMax)) && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {value.map((url: string, idx: number) => (
                            <div
                              key={idx}
                              className="nodrag nopan relative overflow-hidden rounded-lg border border-gray-200 bg-black"
                              style={{ aspectRatio: "4 / 3" }}
                              title={`Audio ${idx + 1}`}
                            >
                              <div className="absolute left-1 top-1 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                                {idx + 1}
                              </div>
                              <div className="flex h-full w-full items-center justify-center p-1">
                                <audio
                                  src={url}
                                  controls
                                  className="w-full"
                                  preload="metadata"
                                />
                              </div>
                              {!readOnly && !isWired && (
                                <button
                                  type="button"
                                  disabled={isLocked}
                                  onClick={() =>
                                    removeFileValue(param.key, idx)
                                  }
                                  className="nodrag absolute right-1 top-1 rounded bg-black/60 p-1 text-white hover:bg-red-500 disabled:opacity-50"
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
                              onClick={() =>
                                setActiveUploadPopup(
                                  activeUploadPopup === param.key
                                    ? null
                                    : param.key,
                                )
                              }
                              className="nodrag relative overflow-hidden rounded-lg border border-dashed border-gray-300 bg-[#F5F5F5] hover:border-[#7C3AED]/40 cursor-pointer"
                              style={{ aspectRatio: "4 / 3" }}
                              title="Add audio"
                            >
                              <span className="flex h-full w-full items-center justify-center text-[10px] font-medium text-gray-400">
                                Add Audio
                              </span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {param.handle && showAddToRequestBtn && (
                      <button
                        type="button"
                        disabled={isLocked}
                        onClick={() => handlePromoteInput(param)}
                        className="nodrag mt-1.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-[#F5F5F5] text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <LucideIcons.Plus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  const primaryParams = definition.inputs.filter((p) => p.group === "primary");
  const advancedParams = definition.inputs.filter(
    (p) => p.group === "advanced",
  );
  // image-mode params shown only on Image to Video tab (Kling v3 and similar)
  const imageModeParams = definition.inputs.filter((p) => (p as any).group === "image-mode");
  // settings params shown in collapsible Settings section (both tabs)
  const settingsParams = definition.inputs.filter((p) => (p as any).group === "settings");

  return (
    <div
      data-locked={isLocked ? "true" : undefined}
      className={`w-[380px] max-w-[380px] rounded-xl border bg-white shadow-2xl transition-all duration-300 overflow-visible ${getNodeRunBorderClass(
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
            onRun={handleSingleRun}
            onReset={handleReset}
            onLockToggle={handleLockToggle}
            onDuplicate={handleDuplicate}
            onDuplicateWithEdges={handleDuplicateWithEdges}
            onDelete={() => deleteNode(id)}
          />
        )}
      </div>

      {/* Mode Toggle (GPT-Image-2 / Kling v3) */}
      {hasModeTab && (
        <div className="px-4 pt-3">
          <div className="nodrag flex w-full items-center rounded-[18px] border border-gray-200 bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => handleModeChange("text")}
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
              onClick={() => handleModeChange("image")}
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

          {/* Collapsible Advanced Parameters (generic nodes) */}
          {advancedParams.length > 0 && (
            <>
              <div className="relative" style={{ overflow: "visible" }}>
                <button
                  type="button"
                  className="nodrag group mt-5 flex cursor-pointer items-center gap-2 bg-transparent border-0 p-0 outline-none"
                  onClick={() => setShowAdvanced(!showAdvanced)}
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
                    onClick={() => setShowSettings(!showSettings)}
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
              ? currentOutput[out.key]
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
              onChange={(val) => updateInput(activeExpandParamKey, val)}
              onClose={() => setActiveExpandParamKey(null)}
            />
          );
        })()}
    </div>
  );
}
