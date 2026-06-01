"use client";

import React, { useState, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import * as LucideIcons from "lucide-react";
import { useWorkflowStore, useNodePreview } from "@/store/workflow-store";
import { generateEdgeId, resolvePropagatedEdgeValue, sanitizeError } from "@/lib/utils";
import NodeHeaderActions from "./NodeHeaderActions";
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
  type NodeDefinition,
} from "@galaxy/shared";

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
      className="nodrag inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-[#F5F5F5] text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
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
  const { updateNodeData, deleteNode, setNodes, setEdges, edges, nodes, previewRunId, previewNodeOutputs, readOnly } =
    useWorkflowStore();
  const { isPreviewMode, isDimmed, isExecuting, output, error } = useNodePreview(id);

  const nodeError = error as string | null;
  const isLocked = !!nodeData.locked;

  const [requestMuteByHandle, setRequestMuteByHandle] = useState<Record<string, boolean>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<Record<string, boolean>>({});
  const [activeUploadPopup, setActiveUploadPopup] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [activeExpandParamKey, setActiveExpandParamKey] = useState<string | null>(null);

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
  const modeLabels = type === "gptImage2" ? ["Text to Image", "Image to Image"] : ["Text to Video", "Image to Video"];
  const [modeTab, setModeTab] = useState<"text" | "image" >(() => 
    (nodeData.inputs?.inputImage || (nodeData.inputs?.uploadedImages && nodeData.inputs.uploadedImages.length > 0)) ? "image" : "text"
  );

  const connectedTargets = new Set(
    (edges ?? []).filter((e) => e.target === id).map((e) => e.targetHandle)
  );

  const edgeResolveOpts =
    previewRunId !== null ? { previewOutputsByNodeId: previewNodeOutputs } : undefined;

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

  const handleFileUpload = async (key: string, files: FileList | null, isArray = false) => {
    if (!files?.length || isLocked || readOnly) return;
    setUploadingField(key);

    try {
      let filesToUpload = Array.from(files);
      if (isArray) {
        const currentInputs = nodeData.inputs || {};
        const currentArr = currentInputs[key] || [];
        const remaining = 10 - currentArr.length;
        if (remaining <= 0) {
          setUploadingField(null);
          return;
        }
        filesToUpload = filesToUpload.slice(0, remaining);
      }

      const uploadPromises = filesToUpload.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        return uploadData.url || null;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter((url): url is string => url !== null);

      if (validUrls.length > 0) {
        const store = useWorkflowStore.getState();
        const latestNode = store.nodes.find((n) => n.id === id);
        const currentInputs = (latestNode?.data as any)?.inputs || {};

        if (isArray) {
          const arr = currentInputs[key] || [];
          const cleanArr = arr.filter((url: string) => !url.startsWith("data:"));
          updateInput(key, [...cleanArr, ...validUrls].slice(0, 10));
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
    const value = nodeData.inputs?.[param.key] ?? param.defaultValue ?? "";

    // Hide inputImage and uploadedImages if mode is text
    if ((param.key === "inputImage" || param.key === "uploadedImages") && hasModeTab && modeTab === "text") return null;

    // Resolve upstream wire value dynamically
    let wiredValue: any = null;
    if (isWired) {
      if (param.type === "image-array") {
        const inboundEdges = (edges ?? []).filter((e) => e.target === id && e.targetHandle === handleId);
        if (inboundEdges.length > 0) {
          wiredValue = inboundEdges
            .map((e) => resolvePropagatedEdgeValue(e, nodes ?? [], edgeResolveOpts))
            .filter((v) => v !== undefined && v !== null);
        }
      } else {
        const inboundEdge = (edges ?? []).find((e) => e.target === id && e.targetHandle === handleId);
        if (inboundEdge) {
          wiredValue = resolvePropagatedEdgeValue(inboundEdge, nodes ?? [], edgeResolveOpts);
        }
      }
    }

    const disabled = readOnly || isLocked || isWired || requestMuteByHandle[handleId];
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

        {(param.type !== "image-array" || isWired) && (
          <div
            data-handle-anchor="label"
            className="mb-1.5 flex items-center text-xs text-gray-500"
          >
            <span>{param.label}</span>
            {param.required && <span className="text-red-400 ml-0.5">*</span>}
            {param.handle && (
              <span className="ml-auto">
                {!readOnly && (
                  <AddToRequestToggle
                    muted={!!requestMuteByHandle[handleId]}
                    disabled={isLocked}
                    onMutedChange={(m) =>
                      setRequestMuteByHandle((prev) => ({ ...prev, [handleId]: m }))
                    }
                  />
                )}
              </span>
            )}
          </div>
        )}

        {/* Dynamic Controls based on type */}
        {isWired ? (
          <div className="nodrag rounded-lg border border-gray-100 bg-[#FAFAFB] px-3 py-2 min-h-[3rem] input-connected text-[13px] text-gray-500">
            <p className="text-[9px] font-medium uppercase tracking-wide text-gray-400 mb-1">
              Connected upstream
            </p>
            {param.type === "image-array" ? (() => {
              let imagesArray: string[] = [];
              if (Array.isArray(wiredValue)) {
                imagesArray = wiredValue.map(String);
              } else if (typeof wiredValue === "string" && wiredValue) {
                imagesArray = wiredValue.split(",").filter(Boolean);
              }

              if (imagesArray.length > 0) {
                return (
                  <div className="flex flex-col gap-2 mt-1">
                    <div className="flex flex-wrap gap-2">
                      {imagesArray.map((url, idx) => (
                        <div
                          key={idx}
                          className="relative w-12 h-12 rounded overflow-hidden bg-white"
                          style={{ border: "2px solid rgba(59, 130, 246, 0.3)" }}
                        >
                          <img src={url} alt={`preview-${idx}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-1 max-h-20 overflow-y-auto">
                      {imagesArray.map((url, idx) => (
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
                  </div>
                );
              }
              return <span className="italic text-xs">Waiting for images...</span>;
            })() : param.type === "file-upload" || param.handle?.type === "image" || param.handle?.type === "video" || param.handle?.type === "audio" || param.handle?.type === "file" ? (
              wiredValue ? (
                <div className="mt-2">
                  {param.handle?.type === "video" || (typeof wiredValue === "string" && (wiredValue.endsWith(".mp4") || wiredValue.includes("video"))) ? (
                    <div className="relative max-w-[160px] overflow-hidden rounded-md" style={{ border: "2px solid rgba(34, 197, 94, 0.3)" }}>
                      <video src={String(wiredValue)} controls className="w-full rounded-sm" style={{ maxHeight: 120 }} />
                    </div>
                  ) : param.handle?.type === "audio" || (typeof wiredValue === "string" && (wiredValue.endsWith(".mp3") || wiredValue.includes("audio"))) ? (
                    <div className="relative inline-block">
                      <audio src={String(wiredValue)} controls className="w-[160px]" />
                    </div>
                  ) : param.handle?.type === "image" || (typeof wiredValue === "string" && (wiredValue.startsWith("data:image") || wiredValue.match(/\.(jpeg|jpg|gif|png|webp)/i))) ? (
                    <div className="relative max-w-[160px] overflow-hidden rounded-md" style={{ border: "2px solid rgba(59, 130, 246, 0.3)" }}>
                      <img src={String(wiredValue)} alt="Inbound preview" className="w-full h-full object-cover" style={{ maxHeight: 120 }} />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 overflow-hidden rounded-md px-2 py-1.5 bg-white max-w-[240px]" style={{ border: "2px solid rgba(168, 85, 247, 0.3)" }}>
                      <LucideIcons.FileText className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      <span className="truncate text-xs text-gray-600 font-mono">
                        {String(wiredValue).split("/").pop() || "Document"}
                      </span>
                    </div>
                  )}
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
                    rows={3}
                    placeholder={param.placeholder || `Describe the ${param.label.toLowerCase()} you want to create...`}
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
                <div className="mt-1 text-right text-[10px] tabular-nums text-gray-400">
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
                className="nodrag nowheel w-full rounded-lg border border-gray-200 bg-[#F5F5F5] px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#7C3AED] disabled:opacity-50 h-10"
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
                className="nodrag nowheel w-full rounded-lg border border-gray-200 bg-[#F5F5F5] px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#7C3AED] disabled:opacity-50 h-10"
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
                <span className="w-8 text-right text-[12px] font-semibold tabular-nums text-gray-700">
                  {Number(value).toFixed(param.step && param.step < 1 ? 2 : 0)}
                </span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => updateInput(param.key, param.defaultValue ?? 0)}
                  className="nodrag h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 bg-[#F5F5F5] text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                  title="Reset to default"
                >
                  <LucideIcons.RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {param.type === "select" && (
              <div className="relative custom-select-container">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setActiveDropdown(activeDropdown === param.key ? null : param.key)}
                  className="flex h-10 w-full items-center justify-between rounded-lg border border-gray-200 bg-[#F5F5F5] px-3 py-2 text-sm text-gray-900 disabled:opacity-50 outline-none focus:border-[#7C3AED] cursor-pointer"
                >
                  <span className="truncate">
                    {param.options?.find((opt: any) => opt.value === value)?.label || value || "Select option..."}
                  </span>
                  <LucideIcons.ChevronDown className="h-4 w-4 text-gray-500 opacity-50 shrink-0" aria-hidden="true" />
                </button>

                {/* Dropdown Menu Popup */}
                {activeDropdown === param.key && (
                  <div className="absolute left-0 top-full mt-1.5 z-50 flex min-w-full flex-col rounded-2xl border border-gray-100 bg-white p-1.5 shadow-xl text-left">
                    {param.key === "size" && (
                      <div className="text-[10px] text-gray-400 font-semibold px-4 py-1.5 uppercase tracking-wider select-none">
                        Custom
                      </div>
                    )}
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
                              {isSelected && <LucideIcons.Check className="w-3.5 h-3.5 text-gray-900 stroke-[2.5]" />}
                            </span>
                            <span className="truncate">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {param.type === "file-upload" && (
              <div className="space-y-2">
                {value ? (
                  <div className="relative rounded-lg border border-gray-200 bg-[#F5F5F5] overflow-hidden p-2 flex items-center gap-3">
                    {value.startsWith("data:image") || value.startsWith("http") && (value.includes(".jpg") || value.includes(".png") || value.includes(".jpeg") || value.includes(".webp") || value.match(/cropImage|gemini|openRouter|execute/i)) ? (
                      <img src={value} alt="Upload preview" className="w-12 h-12 object-contain bg-white rounded border border-gray-200" />
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
                      {value.startsWith("data:") ? "base64 file buffer" : value.split("/").pop()}
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
                      onClick={() => setActiveUploadPopup(activeUploadPopup === param.key ? null : param.key)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed transition-colors disabled:opacity-50 nodrag border-gray-300 bg-[#F5F5F5] px-3 py-2.5 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700"
                    >
                      {uploadingField === param.key ? (
                        <LucideIcons.Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <LucideIcons.Upload className="w-3.5 h-3.5" />
                      )}
                      <span>{uploadingField === param.key ? "Uploading..." : `Upload ${param.label.toLowerCase()}`}</span>
                    </button>
                    <input
                      id={`file-input-${param.key}`}
                      type="file"
                      disabled={disabled}
                      accept={param.key.includes("image") ? "image/*" : param.key.includes("video") ? "video/*" : param.key.includes("audio") ? "audio/*" : "*"}
                      className="hidden"
                      onChange={(e) => void handleFileUpload(param.key, e.target.files)}
                    />

                    {/* Popover modal */}
                    {activeUploadPopup === param.key && (
                      <div className="upload-popup-container absolute left-0 top-full mt-3 z-50 flex w-[80vw] max-w-[246px] flex-col gap-3 rounded-3xl border border-gray-100 bg-white p-4 shadow-xl sm:w-[246px] text-left">
                        <p className="text-xs text-gray-500 leading-normal font-normal">
                          Add a file from your device or select one from your library
                        </p>
                        <button
                          type="button"
                          className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-[#3F3F46] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 nodrag"
                          onClick={() => setActiveUploadPopup(null)}
                        >
                          <LucideIcons.ImagePlus className="h-4 w-4" />
                          <span>Select Asset</span>
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#6366F1] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 nodrag"
                          onClick={() => {
                            setActiveUploadPopup(null);
                            const input = document.getElementById(`file-input-${param.key}`);
                            if (input) input.click();
                          }}
                        >
                          <LucideIcons.Plus className="h-4 w-4" />
                          <span>Upload</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {param.type === "image-array" && (
              <div className="space-y-3">
                {/* Custom upload row matching reference layout */}
                <div className="flex items-start gap-3">
                  <span data-handle-anchor="label" className="shrink-0 pt-2 text-xs text-gray-500 min-w-[70px]">
                    {param.label}
                    {param.required && <span className="text-red-400 ml-0.5">*</span>}
                  </span>
                  
                  <div className="flex-1">
                    {!readOnly ? (
                      <div className="relative">
                        <button
                          type="button"
                          disabled={disabled || ((value as string[]) || []).length >= 10}
                          onClick={() => setActiveUploadPopup(activeUploadPopup === param.key ? null : param.key)}
                          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed transition-colors disabled:opacity-50 nodrag border-gray-300 bg-[#F5F5F5] px-3 py-2.5 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700"
                          title="Upload image"
                        >
                          {uploadingField === param.key ? (
                            <LucideIcons.Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <LucideIcons.Upload className="h-3.5 w-3.5" />
                          )}
                          <span className="capitalize">
                            {uploadingField === param.key ? "Uploading..." : "Upload image"}
                          </span>
                        </button>
                        <input
                          id={`file-input-${param.key}`}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          disabled={disabled || ((value as string[]) || []).length >= 10}
                          onChange={(e) => void handleFileUpload(param.key, e.target.files, true)}
                        />

                        {/* Popover modal */}
                        {activeUploadPopup === param.key && (
                          <div className="upload-popup-container absolute left-0 top-full mt-3 z-50 flex w-[80vw] max-w-[246px] flex-col gap-3 rounded-3xl border border-gray-100 bg-white p-4 shadow-xl sm:w-[246px] text-left">
                            <p className="text-xs text-gray-500 leading-normal font-normal">
                              Add a file from your device or select one from your library
                            </p>
                            <button
                              type="button"
                              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-[#3F3F46] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 nodrag"
                              onClick={() => setActiveUploadPopup(null)}
                            >
                              <LucideIcons.ImagePlus className="h-4 w-4" />
                              <span>Select Asset</span>
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#6366F1] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 nodrag"
                              onClick={() => {
                                setActiveUploadPopup(null);
                                const input = document.getElementById(`file-input-${param.key}`);
                                if (input) input.click();
                              }}
                            >
                              <LucideIcons.Plus className="h-4 w-4" />
                              <span>Upload</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      ((value as string[]) || []).length === 0 && (
                        <div className="text-xs text-gray-400 italic">No images uploaded</div>
                      )
                    )}
                    
                    {/* Tooltip trigger */}
                    {!readOnly && (
                      <div className="relative mt-1 flex items-center gap-1 group/tooltip w-fit">
                        <span className="inline-flex cursor-pointer">
                          <LucideIcons.Info className="h-3 w-3 text-gray-400" />
                        </span>
                        <span className="text-[10px] text-gray-400 cursor-pointer select-none">
                          Upload requirements
                        </span>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 pointer-events-none scale-95 group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 group-hover/tooltip:pointer-events-auto transition-all duration-200 bg-white border border-gray-200 rounded-2xl px-3 py-1.5 text-[11px] text-gray-700 shadow-md whitespace-nowrap z-[9999] origin-top">
                          Max images: 10
                        </div>
                      </div>
                    )}
                  </div>

                  {param.handle && (
                    <span className="mt-1">
                      {!readOnly && (
                        <AddToRequestToggle
                          muted={!!requestMuteByHandle[handleId]}
                          disabled={isLocked}
                          onMutedChange={(m) =>
                            setRequestMuteByHandle((prev) => ({ ...prev, [handleId]: m }))
                          }
                        />
                      )}
                    </span>
                  )}
                </div>

                {/* Grid of thumbnails */}
                {((value as string[]) || []).length > 0 && (
                  <div className="grid grid-cols-5 gap-2 pt-1">
                    {((value as string[]) || []).map((url, idx) => (
                      <div key={idx} className="group relative aspect-square rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        {!readOnly && (
                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => removeFileValue(param.key, idx)}
                            className="nodrag absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-red-600 text-white rounded-md p-0.5 disabled:opacity-30"
                          >
                            <LucideIcons.X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
      className={`w-[380px] max-w-[380px] rounded-xl border bg-white shadow-2xl transition-all duration-300 overflow-visible ${
        isExecuting ? "node-executing border-green-500" : ""
      } ${
        isLocked
          ? "border-yellow-400"
          : nodeError
          ? "border-red-300"
          : "border-gray-200"
      } ${isDimmed ? "opacity-40 grayscale pointer-events-none" : ""}`}
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
              className="pt-4 border-t border-gray-100"
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
                    <div className="nodrag nowheel rounded-lg border border-gray-200 bg-[#F5F5F5] min-h-[120px] p-2">
                      <div className="text-center text-xs text-gray-400 py-10">
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
      <div className="px-4 pb-3 flex items-center justify-end gap-1 text-[10px] text-gray-400">
        <LucideIcons.Coins className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
        <span>~{(definition.credits.base / 1000000).toFixed(2)}M</span>
      </div>

      {activeExpandParamKey && (() => {
        const param = definition.inputs.find((p) => p.key === activeExpandParamKey);
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
