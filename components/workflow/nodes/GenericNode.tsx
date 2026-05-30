"use client";

import React, { useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import * as LucideIcons from "lucide-react";
import { useWorkflowStore, useNodePreview } from "@/store/workflow-store";
import { generateEdgeId, resolvePropagatedEdgeValue, sanitizeError } from "@/lib/utils";
import NodeHeaderActions from "./NodeHeaderActions";
import {
  cropImageDefinition,
  openrouterLlmDefinition,
  gptImage2Definition,
  klingV3Definition,
  mergeVideoDefinition,
  mergeAVDefinition,
  extractAudioDefinition,
  type NodeDefinition,
} from "@galaxy/shared";

// Map React Flow type strings to their shared configurations
const DEFINITIONS: Record<string, NodeDefinition> = {
  cropImage: cropImageDefinition,
  gemini: openrouterLlmDefinition,
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

interface AddToRequestToggleProps {
  muted: boolean;
  disabled?: boolean;
  onMutedChange: (muted: boolean) => void;
}

function AddToRequestToggle({ muted, disabled, onMutedChange }: AddToRequestToggleProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onMutedChange(!muted)}
      aria-label={muted ? "Remove from request" : "Add to request"}
      className="nodrag inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-[#F5F5F5] text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
    >
      {muted ? (
        <LucideIcons.Minus className="h-4 w-4" />
      ) : (
        <LucideIcons.Plus className="h-4 w-4" />
      )}
    </button>
  );
}

export default function GenericNode({ id, data, type }: NodeProps) {
  const definition = DEFINITIONS[type as string] || DEFINITIONS[data.type as string] || DEFINITIONS[data.model as string] || cropImageDefinition;
  const theme = getColorTheme(definition.color);

  const nodeData = data as any;
  const { updateNodeData, deleteNode, setNodes, setEdges, edges, nodes, previewRunId, previewNodeOutputs } =
    useWorkflowStore();
  const { isPreviewMode, isDimmed, isExecuting, output, error } = useNodePreview(id);

  const nodeError = error as string | null;
  const isLocked = !!nodeData.locked;

  const [requestMuteByHandle, setRequestMuteByHandle] = useState<Record<string, boolean>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<Record<string, boolean>>({});

  const hasModeTab = type === "gptImage2" || type === "klingV3";
  const modeLabels = type === "gptImage2" ? ["Text to Image", "Image to Image"] : ["Text to Video", "Image to Video"];
  const [modeTab, setModeTab] = useState<"text" | "image" >(() => (nodeData.inputs?.inputImage ? "image" : "text"));

  const connectedTargets = new Set(
    (edges ?? []).filter((e) => e.target === id).map((e) => e.targetHandle)
  );

  const edgeResolveOpts =
    previewRunId !== null ? { previewOutputsByNodeId: previewNodeOutputs } : undefined;

  const updateInput = (key: string, val: any) => {
    if (isLocked) return;
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
    }
  };

  const handleSingleRun = () => {
    window.dispatchEvent(
      new CustomEvent("nextflow:run-node", { detail: { nodeId: id } })
    );
  };

  const handleReset = () => {
    const defaultInputs: Record<string, any> = {};
    definition.inputs.forEach((param) => {
      defaultInputs[param.key] = param.defaultValue !== undefined ? param.defaultValue : null;
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
          : n
      )
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
    setNodes([...nodes.map((n) => n.id === id ? { ...n, selected: false } : n), newNode]);
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
    setNodes([...nodes.map((n) => n.id === id ? { ...n, selected: false } : n), newNode]);
    const incomingEdges = edges.filter((e) => e.target === id);
    const newEdges = incomingEdges.map((e) => ({
      ...e,
      id: generateEdgeId(),
      target: newId,
    }));
    setEdges([...edges, ...newEdges]);
  };

  // Upload handler for file uploads
  const handleFileUpload = async (key: string, files: FileList | null, isArray = false) => {
    if (!files?.length || isLocked) return;
    setUploadingField(key);

    try {
      for (const file of Array.from(files)) {
        // 1. Local preview
        const dataUrl = await new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        });

        if (!dataUrl) continue;

        // Add local preview first
        const currentInputs = nodeData.inputs || {};
        if (isArray) {
          const arr = currentInputs[key] || [];
          updateInput(key, [...arr, dataUrl]);
        } else {
          updateInput(key, dataUrl);
        }

        // 2. Cloud upload in background
        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();

        if (uploadData.url) {
          // Swap local preview for cloud URL
          const store = useWorkflowStore.getState();
          store.setNodes(
            store.nodes.map((n) => {
              if (n.id === id) {
                const nodeInputs = { ...(n.data as any).inputs };
                if (isArray) {
                  nodeInputs[key] = (nodeInputs[key] || []).map((img: string) =>
                    img === dataUrl ? uploadData.url : img
                  );
                } else {
                  if (nodeInputs[key] === dataUrl) {
                    nodeInputs[key] = uploadData.url;
                  }
                }
                return {
                  ...n,
                  data: {
                    ...n.data,
                    inputs: nodeInputs,
                  },
                };
              }
              return n;
            })
          );
        }
      }
    } catch (err) {
      console.error(`[GenericNode] Upload failed for ${key}:`, err);
    } finally {
      setUploadingField(null);
    }
  };

  const removeFileValue = (key: string, indexToRemove?: number) => {
    if (isLocked) return;
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
    const value = nodeData.inputs?.[param.key] ?? param.defaultValue ?? "";

    // Hide inputImage if mode is text
    if (param.key === "inputImage" && modeTab === "text") return null;

    // Resolve upstream wire value dynamically
    let wiredValue: any = null;
    if (isWired) {
      const inboundEdge = (edges ?? []).find((e) => e.target === id && e.targetHandle === handleId);
      if (inboundEdge) {
        wiredValue = resolvePropagatedEdgeValue(inboundEdge, nodes ?? [], edgeResolveOpts);
      }
    }

    const disabled = isLocked || isWired || requestMuteByHandle[handleId];
    const expanded = !!isExpanded[param.key];

    return (
      <div
        key={param.key}
        className={`relative overflow-visible transition-opacity ${
          requestMuteByHandle[handleId] && !isLocked ? "opacity-60 bg-gray-50/50 rounded-lg p-1" : ""
        }`}
      >
        {/* Render Handle if specified */}
        {param.handle && (
          <div
            className="absolute flex items-center"
            style={{ left: "-22px", top: "14px", transform: "translateY(-50%)", zIndex: 50 }}
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
                boxShadow: `${param.handle.color}50 0px 0px 8px`,
                cursor: "crosshair",
              }}
            />
          </div>
        )}

        <div
          data-handle-anchor="label"
          className="mb-1.5 flex items-center text-xs text-gray-500 dark:text-zinc-400"
        >
          <span>{param.label}</span>
          {param.required && <span className="text-red-400 ml-0.5">*</span>}
          {param.handle && (
            <span className="ml-auto">
              <AddToRequestToggle
                muted={!!requestMuteByHandle[handleId]}
                disabled={isLocked}
                onMutedChange={(m) =>
                  setRequestMuteByHandle((prev) => ({ ...prev, [handleId]: m }))
                }
              />
            </span>
          )}
        </div>

        {/* Dynamic Controls based on type */}
        {isWired ? (
          <div className="nodrag rounded-lg border border-gray-100 bg-[#FAFAFB] px-3 py-2 min-h-[3rem] input-connected text-[13px] text-gray-500">
            <p className="text-[9px] font-medium uppercase tracking-wide text-gray-400 mb-1">
              Connected upstream
            </p>
            {param.type === "file-upload" || param.type === "image-array" ? (
              wiredValue ? (
                <div className="flex items-center gap-2 mt-1">
                  {typeof wiredValue === "string" && (wiredValue.startsWith("http") || wiredValue.startsWith("data:image")) ? (
                    <img src={wiredValue} alt="Inbound preview" className="w-12 h-12 object-cover rounded border border-gray-200" />
                  ) : (
                    <LucideIcons.File className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="truncate max-w-[200px] text-xs font-mono">{String(wiredValue)}</span>
                </div>
              ) : (
                <span className="italic text-xs">Waiting for file URL...</span>
              )
            ) : (
              <div className="max-h-[120px] overflow-y-auto nowheel whitespace-pre-wrap break-words text-xs leading-normal">
                {wiredValue !== null && wiredValue !== undefined ? String(wiredValue) : "Waiting for upstream value..."}
              </div>
            )}
          </div>
        ) : (
          <div className="relative">
            {param.type === "textarea" && (
              <div className="space-y-1">
                <div className="relative">
                  <textarea
                    rows={expanded ? 8 : 3}
                    placeholder={param.placeholder || `Describe the ${param.label.toLowerCase()} you want to create...`}
                    value={value}
                    onChange={(e) => updateInput(param.key, e.target.value)}
                    disabled={disabled}
                    className="nodrag nowheel w-full resize-y rounded-lg border border-gray-200 bg-[#F5F5F5] p-3 text-sm text-gray-900 outline-none focus:border-[#7C3AED] disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setIsExpanded((prev) => ({ ...prev, [param.key]: !expanded }))}
                    className="nodrag absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-md bg-gray-200/80 text-gray-500 transition-colors hover:bg-gray-300 hover:text-gray-700 dark:bg-zinc-700/80 dark:text-zinc-400 dark:hover:bg-zinc-600 dark:hover:text-white"
                    title={expanded ? "Collapse" : "Expand"}
                  >
                    {expanded ? (
                      <LucideIcons.Minimize2 className="h-3 w-3" />
                    ) : (
                      <LucideIcons.Maximize2 className="h-3 w-3" />
                    )}
                  </button>
                </div>
                <div className="mt-1 text-right text-[10px] tabular-nums text-gray-400 dark:text-zinc-500">
                  {value ? String(value).length : 0}/4000
                </div>
              </div>
            )}

            {param.type === "text" && (
              <input
                type="text"
                placeholder={`Enter ${param.label.toLowerCase()}...`}
                value={value}
                onChange={(e) => updateInput(param.key, e.target.value)}
                disabled={disabled}
                className="nodrag nowheel w-full rounded-lg border border-gray-200 bg-[#F5F5F5] px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#7C3AED] disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white h-10"
              />
            )}

            {param.type === "number" && (
              <input
                type="number"
                min={param.min}
                max={param.max}
                value={value}
                onChange={(e) => updateInput(param.key, Number(e.target.value))}
                disabled={disabled}
                className="nodrag nowheel w-full rounded-lg border border-gray-200 bg-[#F5F5F5] px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#7C3AED] disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white h-10"
              />
            )}

            {param.type === "slider" && (
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={param.min ?? 0}
                  max={param.max ?? 100}
                  step={param.step ?? 1}
                  value={value !== "" ? value : (param.defaultValue ?? 0)}
                  onChange={(e) => updateInput(param.key, Number(e.target.value))}
                  disabled={disabled}
                  className="nodrag nowheel flex-1 h-1.5 cursor-pointer accent-[#7C3AED] disabled:opacity-50"
                />
                <span className="w-8 text-right text-[12px] font-semibold tabular-nums text-gray-700 dark:text-zinc-300">
                  {Number(value).toFixed(param.step && param.step < 1 ? 2 : 0)}
                </span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => updateInput(param.key, param.defaultValue ?? 0)}
                  className="nodrag h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 bg-[#F5F5F5] text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                  title="Reset to default"
                >
                  <LucideIcons.RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {param.type === "select" && (
              <div className="relative">
                <select
                  value={value || (nodeData[param.key] ?? "")}
                  onChange={(e) => updateInput(param.key, e.target.value)}
                  disabled={disabled}
                  className="nodrag nowheel w-full h-10 rounded-lg border border-gray-200 bg-[#F5F5F5] px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#7C3AED] disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white appearance-none pr-10 cursor-pointer"
                >
                  <option value="" disabled>Select option...</option>
                  {param.options?.map((opt: any) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <LucideIcons.ChevronDown className="h-4 w-4 text-gray-500 opacity-50" aria-hidden="true" />
                </div>
              </div>
            )}

            {param.type === "file-upload" && (
              <div className="space-y-2">
                {value ? (
                  <div className="relative rounded-lg border border-gray-200 bg-[#F5F5F5] dark:border-zinc-700 dark:bg-zinc-800 overflow-hidden p-2 flex items-center gap-3">
                    {value.startsWith("data:image") || value.startsWith("http") && (value.includes(".jpg") || value.includes(".png") || value.includes(".jpeg") || value.includes(".webp") || value.match(/cropImage|gemini|execute/i)) ? (
                      <img src={value} alt="Upload preview" className="w-12 h-12 object-contain bg-white rounded border border-gray-200" />
                    ) : (
                      <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded text-gray-500 dark:bg-zinc-700">
                        {param.key.includes("video") ? (
                          <LucideIcons.Video className="w-5 h-5" />
                        ) : param.key.includes("audio") ? (
                          <LucideIcons.Music className="w-5 h-5" />
                        ) : (
                          <LucideIcons.File className="w-5 h-5" />
                        )}
                      </div>
                    )}
                    <span className="truncate flex-1 text-xs font-mono select-all pr-8 dark:text-white">
                      {value.startsWith("data:") ? "base64 file buffer" : value.split("/").pop()}
                    </span>
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => removeFileValue(param.key)}
                      className="nodrag absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 disabled:opacity-30"
                      title="Clear file"
                    >
                      <LucideIcons.Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className={`nodrag flex min-h-[2.5rem] items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-[#F5F5F5] dark:border-zinc-700 dark:bg-zinc-800 px-3 text-[12px] text-gray-400 cursor-pointer hover:border-[#7C3AED] ${isLocked ? "pointer-events-none opacity-50" : ""}`}>
                    {uploadingField === param.key ? (
                      <LucideIcons.Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <LucideIcons.Upload className="w-3.5 h-3.5" />
                    )}
                    <span>{uploadingField === param.key ? "Uploading..." : `Upload ${param.label.toLowerCase()}`}</span>
                    <input
                      type="file"
                      disabled={isLocked}
                      accept={param.key.includes("image") ? "image/*" : param.key.includes("video") ? "video/*" : param.key.includes("audio") ? "audio/*" : "*"}
                      className="sr-only"
                      onChange={(e) => void handleFileUpload(param.key, e.target.files)}
                    />
                  </label>
                )}
              </div>
            )}

            {param.type === "image-array" && (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2">
                  {((value as string[]) || []).map((url, idx) => (
                    <div key={idx} className="group relative aspect-square rounded-lg border border-gray-200 bg-white overflow-hidden dark:bg-zinc-800 dark:border-zinc-700">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        disabled={isLocked}
                        onClick={() => removeFileValue(param.key, idx)}
                        className="nodrag absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-red-600 text-white rounded-md p-1 disabled:opacity-30"
                      >
                        <LucideIcons.X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <label className={`nodrag aspect-square flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-200 bg-[#F5F5F5] dark:border-zinc-700 dark:bg-zinc-800 text-gray-400 cursor-pointer hover:border-[#7C3AED] ${isLocked ? "pointer-events-none opacity-50" : ""}`}>
                    <LucideIcons.Plus className="w-4 h-4" />
                    <span className="text-[10px]">Add</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      disabled={isLocked}
                      onChange={(e) => void handleFileUpload(param.key, e.target.files, true)}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const primaryParams = definition.inputs.filter((p) => p.group === "primary");
  const advancedParams = definition.inputs.filter((p) => p.group === "advanced");

  return (
    <div
      data-locked={isLocked ? "true" : undefined}
      className={`w-[380px] max-w-[380px] rounded-xl border bg-white shadow-2xl transition-all duration-300 dark:bg-zinc-900 overflow-visible ${
        isExecuting ? "node-executing border-green-500" : ""
      } ${
        isLocked
          ? "border-yellow-400 dark:border-yellow-500"
          : nodeError
          ? "border-red-300 dark:border-red-500"
          : "border-gray-200 dark:border-zinc-700"
      } ${isDimmed ? "opacity-40 grayscale pointer-events-none" : ""}`}
      style={{ overflow: "visible", width: "380px" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-gray-100 px-4 py-3 dark:border-zinc-800">
        <div className="min-w-0 flex-1">
          <div className="w-full min-w-0 cursor-grab select-none truncate text-sm font-medium text-gray-900 dark:text-white">
            {definition.name}
          </div>
        </div>
        <NodeHeaderActions
          nodeId={id}
          description={`Execute a ${definition.name} operation inside the workflow.`}
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

      {/* Mode Toggle (GPT-Image-2 / Kling v3) */}
      {hasModeTab && (
        <div className="px-4 pt-3">
          <div className="nodrag flex w-full items-center rounded-[18px] border border-gray-200 bg-gray-100 p-1 dark:border-zinc-800 dark:bg-[#1F1F1F]">
            <button
              type="button"
              onClick={() => handleModeChange("text")}
              className={`flex-1 rounded-[14px] px-3 py-1.5 text-center text-xs font-medium transition-all ${
                modeTab === "text"
                  ? "bg-gray-900 text-white shadow-md dark:bg-white dark:text-gray-900"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {modeLabels[0]}
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("image")}
              className={`flex-1 rounded-[14px] px-3 py-1.5 text-center text-xs font-medium transition-all ${
                modeTab === "image"
                  ? "bg-gray-900 text-white shadow-md dark:bg-white dark:text-gray-900"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {modeLabels[1]}
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {nodeError && (
        <div className="mx-4 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-600 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400">
          {sanitizeError(nodeError)}
        </div>
      )}

      {/* Primary Parameters */}
      <div className="px-4 py-4" style={{ overflow: "visible" }}>
        <div className="space-y-4">
          {primaryParams.map(renderParameterInput)}

          {/* Collapsible Advanced Parameters */}
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
                  <span className="text-xs text-gray-400 group-hover:text-gray-600 dark:group-hover:text-zinc-300 font-medium">
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
        </div>
      </div>

      {/* Outputs */}
      <div className="px-4 pb-4 overflow-visible space-y-4">
        {definition.outputs.map((out) => {
          const handleId = `out:${out.key}`;
          const currentOutput = isPreviewMode ? output : nodeData.output;
          const displayValue = currentOutput !== null && typeof currentOutput === "object" && out.key in currentOutput 
            ? currentOutput[out.key] 
            : currentOutput;

          return (
            <div
              key={out.key}
              className="pt-4 border-t border-gray-100 dark:border-zinc-800"
            >
              <div className="relative" style={{ overflow: "visible" }}>
                <div
                  className="absolute flex items-center"
                  style={{ right: "-22px", top: "10px", transform: "translateY(-50%)", zIndex: 50 }}
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
                      boxShadow: `${out.handle.color}50 0px 0px 8px`,
                      cursor: "crosshair",
                    }}
                  />
                </div>

                <div>
                  <div
                    data-handle-anchor="label"
                    className="mb-1.5 text-xs text-gray-500 dark:text-zinc-400 font-medium"
                  >
                    {out.label}
                  </div>

                  {displayValue ? (
                    <div className="nodrag nowheel rounded-lg border border-gray-200 bg-[#F5F5F5] dark:border-zinc-700 dark:bg-zinc-800 p-2 min-h-[120px] max-h-[220px] overflow-y-auto nowheel">
                      {out.type === "image" && (
                        <div className="flex flex-col gap-2">
                          <img
                            src={String(displayValue)}
                            alt="Output"
                            className="mx-auto block w-full max-h-[160px] object-contain rounded"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              const link = e.currentTarget.nextElementSibling as HTMLElement;
                              if (link) link.style.display = "block";
                            }}
                          />
                          <div style={{ display: "none" }}>
                            <a href={String(displayValue)} target="_blank" rel="noreferrer" className="text-[12px] text-blue-500 hover:underline break-all">
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
                        <p className="select-text text-[13px] text-gray-900 leading-relaxed whitespace-pre-wrap dark:text-white">
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
                    <div className="nodrag nowheel rounded-lg border border-gray-200 bg-[#F5F5F5] dark:border-zinc-700 dark:bg-zinc-800 min-h-[120px] p-2">
                      <div className="text-center text-xs text-gray-400 dark:text-zinc-500 py-10">
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
      <div className="px-4 pb-3 flex items-center justify-end gap-1 text-[10px] text-gray-400 dark:text-zinc-500">
        <LucideIcons.Coins className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
        <span>~{(definition.credits.base / 1000000).toFixed(2)}M</span>
      </div>
    </div>
  );
}
