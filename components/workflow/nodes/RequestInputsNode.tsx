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
} from "lucide-react";
import { useWorkflowStore, type WorkflowField, useNodePreview } from "@/store/workflow-store";
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
  const { updateNodeData } = useWorkflowStore();
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
      return typeof v === "string" ? v : null;
    }
    return field.value;
  };

  // A field is "new" (dimmed in preview) if we're in preview and it wasn't in the run
  const isFieldNew = (fieldId: string) => isPreviewMode && !isDimmed && runFieldIds !== undefined && !runFieldIds.has(fieldId);

  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");

  const fields: WorkflowField[] = nodeData.fields ?? [];

  const addField = (type: "text_field" | "image_field") => {
    const newField: WorkflowField = {
      id: `field_${type === "image_field" ? "image" : "text"}_${Date.now()}`,
      type,
      label: type === "text_field" ? `text_field` : `image_field`,
      value: null,
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

  const handleImageUpload = useCallback(
    (fieldId: string, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Show local preview immediately
      const reader = new FileReader();
      reader.onload = (ev) => {
        updateField(fieldId, { value: ev.target?.result as string });
      };
      reader.readAsDataURL(file);

      // Upload to Transloadit via API
      const formData = new FormData();
      formData.append("file", file);
      fetch("/api/upload", { method: "POST", body: formData })
        .then((r) => r.json())
        .then((data) => {
          if (data.url) updateField(fieldId, { value: data.url });
        })
        .catch(() => {
          // keep local data URL on failure
        });
    },
    [fields]
  );

  const handleColor = (type: string) => {
    if (type === "image_field") return "#F97316";
    return "#F59E0B";
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
            <div className="pointer-events-none absolute left-1/2 top-full z-[9999] mt-1.5 hidden w-max max-w-[240px] -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-700 shadow-lg group-hover/tip:block">
              Define the input fields for your workflow.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Add field dropdown */}
          <div className="relative group/add">
            <button className="nodrag flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-[#F5F5F5] text-gray-500 hover:bg-gray-100">
              <Plus className="w-4 h-4" />
            </button>
            <div className="pointer-events-none group-hover/add:pointer-events-auto absolute right-0 top-full pt-1 hidden group-hover/add:block z-50 min-w-[140px]">
              <div className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                <button
                  className="nodrag w-full text-left px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                  onMouseDown={() => addField("text_field")}
                >
                  + Text field
                </button>
                <button
                  className="nodrag w-full text-left px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                  onMouseDown={() => addField("image_field")}
                >
                  + Image field
                </button>
              </div>
            </div>
          </div>
        </div>
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

        {fields.map((field) => (
          <div key={field.id} className={`relative overflow-visible transition-all ${isFieldNew(field.id) ? "opacity-40 grayscale pointer-events-none" : ""}`}>
            {/* Output handle */}
            <Handle
              type="source"
              position={Position.Right}
              id={field.id}
              style={{
                background: handleColor(field.type),
                border: `2px solid ${handleColor(field.type)}`,
                width: 14,
                height: 14,
                right: -21,
                boxShadow: `0 0 8px ${handleColor(field.type)}50`,
              }}
            />

            <div className="w-full">
              {/* Field label row */}
              <div className="mb-2 flex w-full items-center gap-2">
                <div className="nodrag cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing">
                  <GripVertical className="w-3.5 h-3.5" />
                </div>

                {editingFieldId === field.id ? (
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
                    className="group/label flex min-w-0 flex-1 items-center gap-1 text-[12px] font-medium text-gray-900 cursor-pointer"
                    title={field.label}
                  >
                    <span className="truncate">{field.label}</span>
                    <Pencil
                      className="w-3 h-3 shrink-0 opacity-0 group-hover/label:opacity-100 text-gray-400"
                    />
                  </span>
                )}

                <div className="ml-auto flex items-center gap-1">
                  <button
                    className="nodrag rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="Edit label"
                    onClick={() => startEditLabel(field)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className="nodrag rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500"
                    title="Delete"
                    onClick={() => removeField(field.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Field input */}
              {field.type === "text_field" ? (
                <div className="relative">
                  <textarea
                    placeholder="Enter text..."
                    rows={3}
                    value={isPreviewMode ? (getFieldDisplayValue(field) ?? "") : (field.value ?? "")}
                    readOnly={isPreviewMode}
                    onChange={(e) => !isPreviewMode && updateField(field.id, { value: e.target.value })}
                    className={`nodrag nowheel w-full min-w-0 resize-y rounded-lg border border-gray-200 bg-[#F5F5F5] px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-[#7C3AED] focus:shadow-[0_0_0_1px_#7C3AED] ${isPreviewMode ? "cursor-default" : ""}`}
                  />
                  {!isPreviewMode && (
                    <button
                      type="button"
                      className="nodrag absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-md bg-gray-200/80 text-gray-500 hover:bg-gray-300"
                      title="Expand"
                    >
                      <Maximize2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ) : (
                /* Image field */
                <div>
                  {(() => {
                    const displayValue = getFieldDisplayValue(field);
                    return displayValue ? (
                      <div className="relative inline-block group/img">
                        <img
                          src={displayValue}
                          alt="Uploaded"
                          className="w-20 object-cover rounded-lg border border-gray-200"
                          style={{ width: 80, height: 60 }}
                        />
                        {/* Only show replace/remove in edit mode */}
                        {!isPreviewMode && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1.5">
                            {/* Replace button */}
                            <label
                              className="nodrag cursor-pointer p-1 bg-white/80 rounded hover:bg-white"
                              title="Replace image"
                            >
                              <Upload className="w-3 h-3 text-gray-700" />
                              <input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                                className="sr-only"
                                onChange={(e) => handleImageUpload(field.id, e)}
                              />
                            </label>
                            {/* Remove button */}
                            <button
                              className="nodrag p-1 bg-white/80 rounded hover:bg-white"
                              title="Remove image"
                              onClick={() => updateField(field.id, { value: null })}
                            >
                              <X className="w-3 h-3 text-gray-700" />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : !isPreviewMode ? (
                      <label className="nodrag flex flex-col items-center justify-center gap-1.5 w-full h-20 rounded-lg border-2 border-dashed border-gray-200 bg-[#F5F5F5] hover:border-[#7C3AED] hover:bg-[#F3F0FF] transition-colors cursor-pointer">
                        <Upload className="w-4 h-4 text-gray-400" />
                        <span className="text-[12px] text-gray-400">
                          Upload Image
                        </span>
                        <span className="text-[10px] text-gray-300">
                          jpg, jpeg, png, webp, gif
                        </span>
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                          className="sr-only"
                          onChange={(e) => handleImageUpload(field.id, e)}
                        />
                      </label>
                    ) : (
                      <div className="flex items-center justify-center w-full h-20 rounded-lg border border-dashed border-gray-200 bg-[#F5F5F5]">
                        <span className="text-[11px] text-gray-400">No image used</span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
