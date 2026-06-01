"use client";

/**
 * @fileoverview Dynamic Request-Inputs form node: draggable field list, uploads, downstream handle wiring (`field_*` ids drive edges).
 */

import { useCallback, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Plus,
  Info,
  Pencil,
  Trash2,
  GripVertical,
  Upload,
  X,
  Maximize2,
  Copy,
  Hash,
  Check,
  Image,
  Music,
  Video,
  FileText,
  AlignLeft,
} from "lucide-react";
import { useWorkflowStore, type WorkflowField, useNodePreview } from "@/store/workflow-store";
import TextExpandModal from "../TextExpandModal";
import { sanitizeError } from "@/lib/utils";

interface RequestInputsData {
  label: string;
  fields: WorkflowField[];
}

/** Authoring shell for inbound workflow parameters; merges historical preview values via `useNodePreview`. */
export default function RequestInputsNode({
  id,
  data,
}: NodeProps) {
  const nodeData = data as unknown as RequestInputsData;
  const { updateNodeData, readOnly } = useWorkflowStore();
  const { isPreviewMode, isDimmed, isExecuting, error, runFieldIds, output } = useNodePreview(id);
  const nodeError = error as string | null;

  // In preview mode, show field values from the historical run output
  const previewFieldValues = isPreviewMode && output && typeof output === "object"
    ? output as Record<string, unknown>
    : null;

  // Get the display value for a field: preview run value when in preview, else current node value
  const getFieldDisplayValue = (field: WorkflowField): string | null => {
    if (previewFieldValues && field.id in previewFieldValues) {
      const v = previewFieldValues[field.id];
      if (typeof v === "boolean") return v ? "true" : "false";
      return typeof v === "string" ? v : v !== null && v !== undefined ? String(v) : null;
    }
    return field.value;
  };

  // A field is "new" (dimmed in preview) if we're in preview and it wasn't in the run
  const isFieldNew = (fieldId: string) => isPreviewMode && !isDimmed && runFieldIds !== undefined && !runFieldIds.has(fieldId);

  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [activeExpandFieldId, setActiveExpandFieldId] = useState<string | null>(null);
  const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({});

  const fields: WorkflowField[] = nodeData.fields ?? [];

  const addField = (type: WorkflowField["type"]) => {
    let label = "";
    switch (type) {
      case "text_field":
        label = "text_field";
        break;
      case "number_field":
        label = "number_field";
        break;
      case "boolean_field":
        label = "boolean_field";
        break;
      case "image_field":
        label = "image_field";
        break;
      case "audio_field":
        label = "audio_field";
        break;
      case "video_field":
        label = "video_field";
        break;
      case "media_field":
        label = "media_field";
        break;
      case "file_field":
        label = "file_field";
        break;
    }
    const newField: WorkflowField = {
      id: `field_${type.replace("_field", "")}_${Date.now()}`,
      type,
      label,
      value: type === "boolean_field" ? "false" : null,
    };
    updateNodeData(id, { fields: [...fields, newField] } as Partial<RequestInputsData>);
  };

  const removeField = (fieldId: string) => {
    updateNodeData(id, {
      fields: fields.filter((f) => f.id !== fieldId),
    } as Partial<RequestInputsData>);
  };

  const updateField = (fieldId: string, updates: Partial<WorkflowField>) => {
    updateNodeData(id, {
      fields: fields.map((f) =>
        f.id === fieldId ? { ...f, ...updates } : f
      ),
    } as Partial<RequestInputsData>);
  };

  const startEditLabel = (field: WorkflowField) => {
    setEditingFieldId(field.id);
    setEditingLabel(field.label);
  };

  const saveLabel = (fieldId: string) => {
    if (editingLabel.trim()) {
      updateField(fieldId, { label: editingLabel.trim() });
    }
    setEditingFieldId(null);
  };

  const copyToClipboard = (val: string | null) => {
    if (!val) return;
    navigator.clipboard.writeText(val)
      .then(() => alert("Value copied to clipboard!"))
      .catch((err) => console.error("Copy failed", err));
  };

  const handleFileUpload = useCallback(
    async (fieldId: string, type: WorkflowField["type"], e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const filesArray = Array.from(files);
      const field = fields.find((f) => f.id === fieldId);
      const currentVal = field?.value || "";
      const currentUrls = currentVal ? currentVal.split(",").filter(Boolean) : [];

      if (currentUrls.length + filesArray.length > 10) {
        alert("You can upload a maximum of 10 files.");
        return;
      }

      setUploadingFields((prev) => ({ ...prev, [fieldId]: true }));

      // Immediate local base64 preview for images
      if (type === "image_field") {
        const localPreviews: string[] = [];
        let processedPreviews = 0;
        filesArray.forEach((file) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            localPreviews.push(ev.target?.result as string);
            processedPreviews++;
            if (processedPreviews === filesArray.length) {
              updateField(fieldId, {
                value: [...currentUrls, ...localPreviews].slice(0, 10).join(","),
              });
            }
          };
          reader.readAsDataURL(file);
        });
      }

      try {
        const uploadPromises = filesArray.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/upload", { method: "POST", body: formData });
          const data = await res.json();
          return data.url || null;
        });

        const uploadedUrls = await Promise.all(uploadPromises);
        const validUrls = uploadedUrls.filter((url): url is string => url !== null);

        if (validUrls.length > 0) {
          const latestState = useWorkflowStore.getState();
          const latestNode = latestState.nodes.find((n) => n.id === id);
          const latestNodeFields = (latestNode?.data as any)?.fields as WorkflowField[] || [];
          const latestField = latestNodeFields.find((f) => f.id === fieldId);
          const latestVal = latestField?.value || "";
          const latestUrls = latestVal ? latestVal.split(",").filter(Boolean) : [];
          
          const cleanUrls = latestUrls.filter((url) => !url.startsWith("data:"));
          updateField(fieldId, {
            value: [...cleanUrls, ...validUrls].slice(0, 10).join(","),
          });
        }
      } catch (err) {
        console.error("Upload error:", err);
      } finally {
        setUploadingFields((prev) => ({ ...prev, [fieldId]: false }));
      }
    },
    [id, fields]
  );

  const handleColor = (type: string) => {
    switch (type) {
      case "image_field":
        return "#3b82f6"; // Blue
      case "text_field":
        return "#f59e0b"; // Amber
      case "video_field":
        return "#22c55e"; // Green
      case "audio_field":
        return "#ec4899"; // Pink
      case "number_field":
        return "#10b981"; // Emerald
      case "boolean_field":
        return "#8b5cf6"; // Purple
      case "media_field":
        return "#d946ef"; // Fuchsia
      case "file_field":
      default:
        return "#6b7280"; // Gray
    }
  };

  return (
    <div
      className={`w-[380px] rounded-xl border bg-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] border-gray-200 overflow-visible transition-all ${
        isExecuting ? "node-executing" : ""
      } ${isDimmed ? "opacity-40 grayscale pointer-events-none" : ""}`}
      style={{ minWidth: 380 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[14px] font-medium text-gray-900">
            Request-Inputs
          </span>
          <div className="group/tip relative">
            <Info className="w-3.5 h-3.5 text-gray-400 cursor-default" />
            <div className="pointer-events-none absolute left-1/2 top-full z-[9999] mt-1.5 hidden w-max max-w-[240px] -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-700 shadow-lg group-hover/tip:block font-normal">
              Define the input fields for your workflow.
            </div>
          </div>
        </div>
        
        {!readOnly && (
          <div className="flex items-center gap-1">
            {/* Add field dropdown */}
            <div className="relative group/add">
              <button className="nodrag flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-[#F5F5F5] text-gray-500 hover:bg-gray-100">
                <Plus className="w-4 h-4" />
              </button>
              <div className="pointer-events-none group-hover/add:pointer-events-auto absolute right-0 top-full pt-1 hidden group-hover/add:block z-50 min-w-[140px]">
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden py-1 min-w-[140px]">
                  <button
                    className="nodrag w-full text-left px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    onMouseDown={() => addField("text_field")}
                  >
                    <AlignLeft className="w-3.5 h-3.5 text-gray-400" />
                    <span>Text</span>
                  </button>
                  <button
                    className="nodrag w-full text-left px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    onMouseDown={() => addField("number_field")}
                  >
                    <Hash className="w-3.5 h-3.5 text-gray-400" />
                    <span>Number</span>
                  </button>
                  <button
                    className="nodrag w-full text-left px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    onMouseDown={() => addField("boolean_field")}
                  >
                    <Check className="w-3.5 h-3.5 text-gray-400" />
                    <span>Boolean</span>
                  </button>
                  <button
                    className="nodrag w-full text-left px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    onMouseDown={() => addField("image_field")}
                  >
                    <Image className="w-3.5 h-3.5 text-gray-400" />
                    <span>Image</span>
                  </button>
                  <button
                    className="nodrag w-full text-left px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    onMouseDown={() => addField("audio_field")}
                  >
                    <Music className="w-3.5 h-3.5 text-gray-400" />
                    <span>Audio</span>
                  </button>
                  <button
                    className="nodrag w-full text-left px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    onMouseDown={() => addField("video_field")}
                  >
                    <Video className="w-3.5 h-3.5 text-gray-400" />
                    <span>Video</span>
                  </button>
                  <button
                    className="nodrag w-full text-left px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    onMouseDown={() => addField("media_field")}
                  >
                    <Music className="w-3.5 h-3.5 text-gray-400" />
                    <span>Media</span>
                  </button>
                  <button
                    className="nodrag w-full text-left px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    onMouseDown={() => addField("file_field")}
                  >
                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                    <span>File</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error state */}
      {nodeError && (
        <div className="mx-4 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-600">
          {sanitizeError(nodeError)}
        </div>
      )}

      {/* Fields */}
      <div className="px-4 py-4 space-y-4 overflow-visible">
        {fields.length === 0 && (
          <p className="text-[12px] text-gray-400 text-center py-2">
            Click + to add input fields
          </p>
        )}

        {fields.map((field) => {
          const displayValue = getFieldDisplayValue(field) ?? "";
          const urls = displayValue ? displayValue.split(",").filter(Boolean) : [];
          const handleColorVal = handleColor(field.type);

          return (
            <div key={field.id} className={`relative overflow-visible transition-all ${isFieldNew(field.id) ? "opacity-40 grayscale pointer-events-none" : ""}`}>
              {/* Output handle */}
              <Handle
                type="source"
                position={Position.Right}
                id={field.id}
                style={{
                  background: handleColorVal,
                  border: `2px solid ${handleColorVal}80`,
                  width: 14,
                  height: 14,
                  right: -21,
                  boxShadow: `0 0 8px ${handleColorVal}30`,
                }}
              />

              <div className="w-full">
                {/* Field label row */}
                <div className="mb-2 flex w-full items-center gap-2">
                  {!readOnly && (
                    <div className="nodrag cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing">
                      <GripVertical className="w-3.5 h-3.5" />
                    </div>
                  )}

                  {editingFieldId === field.id && !readOnly ? (
                    <input
                      autoFocus
                      type="text"
                      value={editingLabel}
                      onChange={(e) => setEditingLabel(e.target.value)}
                      onBlur={() => saveLabel(field.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveLabel(field.id);
                        if (e.key === "Escape") setEditingFieldId(null);
                      }}
                      className="nodrag flex-1 min-w-0 text-[12px] font-medium text-gray-900 bg-[#F5F5F5] border border-[#7C3AED] rounded px-1 outline-none"
                    />
                  ) : (
                    <span
                      className={`group/label flex min-w-0 flex-1 items-center gap-1 text-[12px] font-medium text-gray-900 ${readOnly ? "cursor-default" : "cursor-pointer"}`}
                      title={field.label}
                      onClick={() => !readOnly && startEditLabel(field)}
                    >
                      <span className="truncate">{field.label}</span>
                      {!readOnly && (
                        <Pencil
                          className="w-3 h-3 shrink-0 opacity-0 group-hover/label:opacity-100 text-gray-400"
                        />
                      )}
                      {/* Field-level Info Tooltip */}
                      <div className="group/tip relative flex shrink-0">
                        <Info className="w-3 h-3 cursor-help text-gray-400" />
                        <div className="pointer-events-none absolute left-1/2 bottom-full z-[9999] mb-1.5 hidden w-max max-w-[200px] -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-2 py-1 text-[10px] text-gray-700 shadow-lg group-hover/tip:block font-normal">
                          Field ID: {field.id}
                        </div>
                      </div>
                    </span>
                  )}

                  {!readOnly && (
                    <div className="ml-auto flex items-center gap-1">
                      {/* Copy Value Button */}
                      <button
                        className="nodrag rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Copy value"
                        onClick={() => copyToClipboard(field.value)}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {/* Pencil Edit Button */}
                      <button
                        className="nodrag rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Edit label"
                        onClick={() => startEditLabel(field)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {/* Delete Button */}
                      <button
                        className="nodrag rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500"
                        title="Delete"
                        onClick={() => removeField(field.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Field input */}
                {field.type === "text_field" && (
                  <div className="relative">
                    <textarea
                      placeholder={readOnly ? "No text configured" : "Enter text..."}
                      rows={3}
                      value={displayValue}
                      readOnly={isPreviewMode || readOnly}
                      onChange={(e) => !isPreviewMode && !readOnly && updateField(field.id, { value: e.target.value })}
                      className={`nodrag nowheel w-full min-w-0 resize-y rounded-lg border border-gray-200 bg-[#F5F5F5] px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-[#7C3AED] focus:shadow-[0_0_0_1px_#7C3AED] ${isPreviewMode || readOnly ? "cursor-default resize-none" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setActiveExpandFieldId(field.id)}
                      className="nodrag absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-md bg-gray-200/80 text-gray-500 hover:bg-gray-300 shadow-sm"
                      title="Expand"
                    >
                      <Maximize2 className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {field.type === "number_field" && (
                  <input
                    type="text"
                    placeholder={readOnly ? "No number configured" : "Enter number..."}
                    value={displayValue}
                    readOnly={isPreviewMode || readOnly}
                    onChange={(e) => !isPreviewMode && !readOnly && updateField(field.id, { value: e.target.value })}
                    className={`nodrag nowheel w-full min-w-0 rounded-lg border border-gray-200 bg-[#F5F5F5] px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-[#7C3AED] focus:shadow-[0_0_0_1px_#7C3AED] ${isPreviewMode || readOnly ? "cursor-default" : ""}`}
                  />
                )}

                {field.type === "boolean_field" && (
                  <div className="flex items-center">
                    <button
                      type="button"
                      disabled={isPreviewMode || readOnly}
                      onClick={() => !isPreviewMode && !readOnly && updateField(field.id, { value: displayValue === "true" ? "false" : "true" })}
                      className={`nodrag relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        displayValue === "true" ? "bg-[#7C3AED]" : "bg-gray-200"
                      } ${(isPreviewMode || readOnly) ? "opacity-60 cursor-default" : ""}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          displayValue === "true" ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span className="ml-2 text-[12px] text-gray-500 font-medium select-none capitalize">
                      {displayValue === "true" ? "True" : "False"}
                    </span>
                  </div>
                )}

                {field.type === "image_field" && (
                  <div className="space-y-2">
                    {urls.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {urls.map((url, idx) => (
                          <div key={idx} className="group relative">
                            <div
                              className="overflow-hidden rounded-lg bg-gray-50"
                              style={{
                                border: "2px solid rgba(59, 130, 246, 0.3)",
                                aspectRatio: "1 / 1",
                              }}
                            >
                              <img
                                src={url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            </div>
                            {!isPreviewMode && !readOnly && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedUrls = urls.filter((_, i) => i !== idx);
                                  updateField(field.id, {
                                    value: updatedUrls.length > 0 ? updatedUrls.join(",") : null,
                                  });
                                }}
                                className="nodrag absolute right-1 top-1 z-10 rounded bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500 cursor-pointer border-0"
                                title="Remove"
                              >
                                <X className="w-3 h-3 text-white" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {!isPreviewMode && !readOnly ? (
                      urls.length === 0 ? (
                        <label className="nodrag flex flex-col items-center justify-center gap-1.5 w-full h-20 rounded-lg border-2 border-dashed border-gray-200 bg-[#F5F5F5] hover:border-[#7C3AED] hover:bg-[#F3F0FF] transition-colors cursor-pointer">
                          {uploadingFields[field.id] ? (
                            <span className="text-[12px] text-gray-400">Uploading...</span>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 text-gray-400" />
                              <span className="text-[12px] text-gray-400">Upload Image</span>
                              <span className="text-[10px] text-gray-300">jpg, jpeg, png, webp, gif</span>
                            </>
                          )}
                          <input
                            type="file"
                            multiple
                            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                            className="sr-only"
                            disabled={uploadingFields[field.id]}
                            onChange={(e) => handleFileUpload(field.id, field.type, e)}
                          />
                        </label>
                      ) : (
                        urls.length < 10 && (
                          <button
                            type="button"
                            disabled={uploadingFields[field.id]}
                            onClick={() => {
                              document.getElementById(`file-input-${field.id}`)?.click();
                            }}
                            className="nodrag flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed transition-colors disabled:opacity-50 h-10 border-gray-200 bg-[#F5F5F5] hover:border-[#7C3AED] hover:bg-[#F3F0FF] text-xs text-gray-500 cursor-pointer"
                            title="Upload image"
                          >
                            {uploadingFields[field.id] ? (
                              <span>Uploading...</span>
                            ) : (
                              <>
                                <Upload className="w-3.5 h-3.5" />
                                <span>Upload Image ({urls.length}/10)</span>
                              </>
                            )}
                          </button>
                        )
                      )
                    ) : (
                      urls.length === 0 && (
                        <div className="flex items-center justify-center w-full h-20 rounded-lg border border-dashed border-gray-200 bg-[#F5F5F5]">
                          <span className="text-[11px] text-gray-400">No image used</span>
                        </div>
                      )
                    )}

                    {/* Hidden file input for adding more images */}
                    {!isPreviewMode && !readOnly && urls.length > 0 && (
                      <input
                        id={`file-input-${field.id}`}
                        type="file"
                        multiple
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                        className="sr-only"
                        disabled={uploadingFields[field.id]}
                        onChange={(e) => handleFileUpload(field.id, field.type, e)}
                      />
                    )}
                  </div>
                )}

                {/* Audio / Video / Media / File generic card-based list */}
                {(field.type === "audio_field" || field.type === "video_field" || field.type === "media_field" || field.type === "file_field") && (
                  <div className="space-y-2">
                    {urls.length > 0 && (
                      <div className="space-y-1.5">
                        {urls.map((url, idx) => {
                          const filename = url.split("/").pop() || `${field.type.replace("_field", "")} ${idx + 1}`;
                          return (
                            <div key={idx} className="group relative flex items-center justify-between p-2 rounded-lg border border-gray-200 bg-[#F5F5F5] text-[12px]">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                {field.type === "video_field" ? (
                                  <Video className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                ) : field.type === "audio_field" ? (
                                  <Music className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                ) : (
                                  <FileText className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                )}
                                <span className="truncate text-gray-700 font-medium" title={filename}>{filename}</span>
                              </div>
                              {!isPreviewMode && !readOnly && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedUrls = urls.filter((_, i) => i !== idx);
                                    updateField(field.id, {
                                      value: updatedUrls.length > 0 ? updatedUrls.join(",") : null,
                                    });
                                  }}
                                  className="nodrag p-1 text-gray-400 hover:text-red-500 hover:bg-gray-200/50 rounded transition-colors border-0 bg-transparent cursor-pointer"
                                  title="Remove"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {!isPreviewMode && !readOnly ? (
                      urls.length === 0 ? (
                        <label className="nodrag flex flex-col items-center justify-center gap-1.5 w-full h-20 rounded-lg border-2 border-dashed border-gray-200 bg-[#F5F5F5] hover:border-[#7C3AED] hover:bg-[#F3F0FF] transition-colors cursor-pointer">
                          {uploadingFields[field.id] ? (
                            <span className="text-[12px] text-gray-400">Uploading...</span>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 text-gray-400" />
                              <span className="text-[12px] text-gray-400">Upload {field.type.replace("_field", "").replace("file", "File").replace("audio", "Audio").replace("video", "Video").replace("media", "Media")}</span>
                            </>
                          )}
                          <input
                            type="file"
                            multiple
                            accept={
                              field.type === "video_field"
                                ? "video/*"
                                : field.type === "audio_field"
                                ? "audio/*"
                                : "*"
                            }
                            className="sr-only"
                            disabled={uploadingFields[field.id]}
                            onChange={(e) => handleFileUpload(field.id, field.type, e)}
                          />
                        </label>
                      ) : (
                        urls.length < 10 && (
                          <button
                            type="button"
                            disabled={uploadingFields[field.id]}
                            onClick={() => {
                              document.getElementById(`file-input-${field.id}`)?.click();
                            }}
                            className="nodrag flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed transition-colors disabled:opacity-50 h-10 border-gray-200 bg-[#F5F5F5] hover:border-[#7C3AED] hover:bg-[#F3F0FF] text-xs text-gray-500 cursor-pointer"
                            title={`Upload ${field.type.replace("_field", "")}`}
                          >
                            {uploadingFields[field.id] ? (
                              <span>Uploading...</span>
                            ) : (
                              <>
                                <Upload className="w-3.5 h-3.5" />
                                <span>Upload {field.type.replace("_field", "").replace("file", "File").replace("audio", "Audio").replace("video", "Video").replace("media", "Media")} ({urls.length}/10)</span>
                              </>
                            )}
                          </button>
                        )
                      )
                    ) : (
                      urls.length === 0 && (
                        <div className="flex items-center justify-center w-full h-20 rounded-lg border border-dashed border-gray-200 bg-[#F5F5F5]">
                          <span className="text-[11px] text-gray-400 font-medium">No file used</span>
                        </div>
                      )
                    )}

                    {/* Hidden file input for adding more files */}
                    {!isPreviewMode && !readOnly && urls.length > 0 && (
                      <input
                        id={`file-input-${field.id}`}
                        type="file"
                        multiple
                        accept={
                          field.type === "video_field"
                            ? "video/*"
                            : field.type === "audio_field"
                            ? "audio/*"
                            : "*"
                        }
                        className="sr-only"
                        disabled={uploadingFields[field.id]}
                        onChange={(e) => handleFileUpload(field.id, field.type, e)}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {activeExpandFieldId && (() => {
        const field = fields.find((f) => f.id === activeExpandFieldId);
        if (!field) return null;
        const displayValue = getFieldDisplayValue(field) ?? "";

        return (
          <TextExpandModal
            title={field.label}
            value={displayValue}
            readOnly={isPreviewMode || readOnly}
            onChange={(val) => updateField(field.id, { value: val })}
            onClose={() => setActiveExpandFieldId(null)}
          />
        );
      })()}
    </div>
  );
}
