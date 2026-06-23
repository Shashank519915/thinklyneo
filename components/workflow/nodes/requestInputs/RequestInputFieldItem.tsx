"use client";

import React from "react";
import { Handle, Position } from "@xyflow/react";
import {
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
  ChevronDown,
} from "lucide-react";
import { type WorkflowField } from "@/store/workflow-store";
import ElasticSlider from "@/components/ui/ElasticSlider";
import { UploadPopup } from "../generic/UploadPopup";
import { maxAssetsForField } from "@/lib/request-inputs";

interface RequestInputFieldItemProps {
  field: WorkflowField;
  readOnly: boolean;
  isPreviewMode: boolean;
  isNewField: boolean;
  displayValue: string;
  activeSelectFieldId: string | null;
  setActiveSelectFieldId: (id: string | null) => void;
  updateField: (fieldId: string, updates: Partial<WorkflowField>) => void;
  removeField: (fieldId: string) => void;
  activeUploadPopup: string | null;
  setActiveUploadPopup: (id: string | null) => void;
  uploadingFields: Record<string, boolean>;
  handleFileUpload: (fieldId: string, fieldType: WorkflowField["type"], e: React.ChangeEvent<HTMLInputElement>) => void;
  copyToClipboard: (val: string | null) => void;
  setActiveExpandFieldId: (id: string | null) => void;
  editingFieldId: string | null;
  setEditingFieldId: (id: string | null) => void;
  editingLabel: string;
  setEditingLabel: (val: string) => void;
}

export function RequestInputFieldItem({
  field,
  readOnly,
  isPreviewMode,
  isNewField,
  displayValue,
  activeSelectFieldId,
  setActiveSelectFieldId,
  updateField,
  removeField,
  activeUploadPopup,
  setActiveUploadPopup,
  uploadingFields,
  handleFileUpload,
  copyToClipboard,
  setActiveExpandFieldId,
  editingFieldId,
  setEditingFieldId,
  editingLabel,
  setEditingLabel,
}: RequestInputFieldItemProps) {
  const isEditing = editingFieldId === field.id;
  const maxAssets = maxAssetsForField(field);
  const urls = field.value ? field.value.split(",").filter((u) => u.trim() !== "") : [];

  const handleSaveLabel = () => {
    if (editingLabel.trim()) {
      updateField(field.id, { label: editingLabel.trim() });
    }
    setEditingFieldId(null);
  };

  const renderFieldIcon = () => {
    switch (field.type) {
      case "text_field":
        return <AlignLeft className="w-3.5 h-3.5 text-zinc-500" />;
      case "number_field":
        return <Hash className="w-3.5 h-3.5 text-zinc-500" />;
      case "image_field":
        return <Image className="w-3.5 h-3.5 text-zinc-500" />;
      case "audio_field":
        return <Music className="w-3.5 h-3.5 text-zinc-500" />;
      case "video_field":
        return <Video className="w-3.5 h-3.5 text-zinc-500" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-zinc-500" />;
    }
  };

  const getHandleColor = (type: string) => {
    switch (type) {
      case "image_field":
        return "#3b82f6"; // Blue
      case "text_field":
      case "select_field":
        return "#f59e0b"; // Amber
      case "video_field":
        return "#22c55e"; // Green
      case "audio_field":
        return "#06b6d4"; // Cyan
      case "number_field":
        return "#ec4899"; // Pink
      case "boolean_field":
        return "#6366f1"; // Indigo
      case "media_field":
        return "#086136"; // Forest Green
      case "file_field":
      default:
        return "#a855f7"; // Purple
    }
  };
  const handleColorVal = getHandleColor(field.type);

  return (
    <div
      className={`relative p-3 bg-white/[0.015] border border-white/5 rounded-xl hover:border-white/10 transition-all duration-300 ${
        isNewField ? "opacity-35 select-none pointer-events-none" : ""
      }`}
    >
      {/* Downstream wiring target handle (flows OUT of RequestInputs into workfow nodes) */}
      <div
        className="absolute flex items-center"
        style={{
          right: "-21px",
          top: "22px",
          transform: "translateY(-50%)",
          zIndex: 50,
        }}
      >
        <Handle
          type="source"
          position={Position.Right}
          id={field.id}
          className="!relative !transform-none target connectable connectablestart connectableend connectionindicator"
          style={{
            background: handleColorVal,
            border: `2px solid ${handleColorVal}66`,
            width: 14,
            height: 14,
            cursor: "crosshair",
            ["--handle-color" as any]: handleColorVal,
          }}
        />
      </div>

      <div className="space-y-3">
        {/* Field Header */}
        <div className="flex items-center gap-2">
          {!readOnly && (
            <div className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-zinc-600 hover:text-zinc-400 transition-colors">
              <GripVertical className="w-3.5 h-3.5" />
            </div>
          )}

          {renderFieldIcon()}

          {isEditing && !readOnly ? (
            <input
              type="text"
              value={editingLabel}
              autoFocus
              onChange={(e) => setEditingLabel(e.target.value)}
              onBlur={handleSaveLabel}
              onKeyDown={(e) => e.key === "Enter" && handleSaveLabel()}
              className="nodrag bg-[#050507] border border-white/10 rounded px-1.5 py-0.5 text-xs text-zinc-100 outline-none focus:border-white/20 transition-all font-semibold"
            />
          ) : (
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="text-[12px] font-semibold text-zinc-300 truncate">
                {field.label}
              </span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingFieldId(field.id);
                    setEditingLabel(field.label);
                  }}
                  className="nodrag rounded p-0.5 text-zinc-600 hover:text-zinc-300 transition-colors border-0"
                  title="Rename"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
              {/* Field-level Info Tooltip */}
              <span className="group/tip relative flex shrink-0 text-zinc-500">
                <Info className="w-3 h-3 cursor-help text-zinc-500 hover:text-zinc-300 transition-colors" />
                <div className="pointer-events-none absolute left-1/2 bottom-full z-[9999] mb-1.5 hidden w-max max-w-[280px] -translate-x-1/2 rounded-lg border border-white/10 bg-[#0A0A0C]/95 px-3 py-2 text-[11px] font-normal leading-relaxed text-zinc-400 shadow-xl group-hover/tip:block backdrop-blur-md font-mono">
                  ID: {field.id}
                </div>
              </span>
            </span>
          )}

          {!readOnly && (
            <div className="ml-auto flex items-center gap-0.5">
              {/* Copy Value Button */}
              <button
                type="button"
                className="nodrag rounded p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition-all active:scale-[0.9] duration-150 ease-out border-0"
                title="Copy value"
                onClick={() => copyToClipboard(field.value)}
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              {/* Delete Button */}
              <button
                type="button"
                className="nodrag rounded p-1 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-all active:scale-[0.9] duration-150 ease-out border-0"
                title="Delete"
                onClick={() => removeField(field.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Field input */}
        {field.type === "select_field" && (field.selectOptions?.length ?? 0) > 0 && (
          <div className="relative custom-select-container">
            <button
              type="button"
              disabled={isPreviewMode || readOnly}
              onClick={() =>
                setActiveSelectFieldId(
                  activeSelectFieldId === field.id ? null : field.id
                )
              }
              className="nodrag flex h-9 w-full items-center justify-between rounded-lg border border-white/5 bg-[#050507] px-3 py-2 text-xs text-zinc-100 disabled:opacity-50 outline-none focus:border-white/15 focus:ring-1 focus:ring-white/10 cursor-pointer transition-all active:scale-[0.98] duration-150 ease-out"
            >
              <span className="truncate">
                {field.selectOptions?.find((o) => o.value === displayValue)?.label ||
                  displayValue ||
                  "Select option..."}
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-400 opacity-50" />
            </button>
            {activeSelectFieldId === field.id && !isPreviewMode && !readOnly && (
              <div className="absolute left-0 top-full z-[100] mt-1.5 flex min-w-full flex-col rounded-xl border border-white/10 bg-[#0A0A0C]/95 p-1.5 text-left shadow-2xl backdrop-blur-md">
                <div className="nowheel flex max-h-[260px] flex-col gap-0.5 overflow-y-auto">
                  {field.selectOptions?.map((opt) => {
                    const isSelected = opt.value === displayValue;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          updateField(field.id, { value: opt.value });
                          setActiveSelectFieldId(null);
                        }}
                        className={`flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors active:scale-[0.98] duration-150 ease-out ${
                          isSelected
                            ? "bg-white/10 text-zinc-100"
                            : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                        }`}
                      >
                        <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                          {isSelected && (
                            <Check className="h-3.5 w-3.5 stroke-[2.5]" />
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
        )}

        {field.type === "text_field" && (
          <div className="relative">
            <textarea
              placeholder={readOnly ? "No text configured" : "Enter text..."}
              rows={3}
              value={displayValue}
              readOnly={isPreviewMode || readOnly}
              onChange={(e) =>
                !isPreviewMode &&
                !readOnly &&
                updateField(field.id, { value: e.target.value })
              }
              className={`nodrag nowheel w-full min-w-0 resize-y rounded-lg border border-white/5 bg-[#050507] px-3 py-2 text-[13px] text-zinc-100 outline-none focus:border-white/15 focus:ring-1 focus:ring-white/10 transition-all ${
                isPreviewMode || readOnly ? "cursor-default resize-none" : ""
              }`}
            />
            <button
              type="button"
              onClick={() => setActiveExpandFieldId(field.id)}
              className="nodrag absolute bottom-2.5 right-2 flex h-5 w-5 items-center justify-center rounded-md bg-white/5 border border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/10 shadow-sm transition-all active:scale-[0.9] duration-150 ease-out"
              title="Expand"
            >
              <Maximize2 className="h-2.5 w-2.5" />
            </button>
          </div>
        )}

        {field.type === "number_field" &&
          field.numberMin !== undefined &&
          field.numberMax !== undefined && (
            <div className="flex min-w-0 items-center gap-3">
              <ElasticSlider
                value={displayValue !== "" ? Number(displayValue) : field.numberMin}
                onChange={(val) =>
                  !isPreviewMode &&
                  !readOnly &&
                  updateField(field.id, { value: String(val) })
                }
                disabled={isPreviewMode || readOnly}
                startingValue={field.numberMin}
                maxValue={field.numberMax}
                stepSize={field.numberStep ?? 1}
                isStepped={true}
                className="flex-1 min-w-[60px]"
                activeColor="#EC4899"
              />
              <input
                type="number"
                min={field.numberMin}
                max={field.numberMax}
                step={field.numberStep ?? 1}
                value={displayValue}
                disabled={isPreviewMode || readOnly}
                onChange={(e) =>
                  !isPreviewMode &&
                  !readOnly &&
                  updateField(field.id, { value: e.target.value })
                }
                className="nodrag w-14 shrink-0 rounded-lg border border-white/5 bg-[#050507] px-2 py-1 text-center font-mono text-xs text-zinc-100 outline-none disabled:opacity-50 focus:border-white/15 focus:ring-1 focus:ring-white/10 transition-colors"
              />
            </div>
          )}

        {field.type === "number_field" &&
          (field.numberMin === undefined || field.numberMax === undefined) && (
            <input
              type="number"
              step="any"
              placeholder={readOnly ? "No number" : "Enter number..."}
              value={displayValue}
              readOnly={isPreviewMode || readOnly}
              onChange={(e) =>
                !isPreviewMode &&
                !readOnly &&
                updateField(field.id, { value: e.target.value })
              }
              className={`nodrag nowheel w-full min-w-0 rounded-lg border border-white/5 bg-[#050507] px-3 py-2 text-xs font-mono text-zinc-100 outline-none focus:border-white/15 focus:ring-1 focus:ring-white/10 disabled:opacity-50 transition-all ${
                isPreviewMode || readOnly ? "cursor-default" : ""
              }`}
            />
          )}

        {field.type === "boolean_field" && (
          <div className="w-full min-w-0">
            <label className="nodrag flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={displayValue === "true"}
                disabled={isPreviewMode || readOnly}
                onChange={(e) =>
                  !isPreviewMode &&
                  !readOnly &&
                  updateField(field.id, {
                    value: e.target.checked ? "true" : "false",
                  })
                }
                className="h-4 w-4 rounded border-white/10 bg-[#050507] text-[#7C3AED] focus:ring-[#7C3AED] disabled:opacity-50 transition-all active:scale-[0.9] duration-150"
              />
              <span className="text-xs font-semibold text-zinc-300 select-none">
                {displayValue === "true" ? "True" : "False"}
              </span>
            </label>
          </div>
        )}

        {field.type === "image_field" && (
          <div className="space-y-2">
            {!isPreviewMode && !readOnly ? (
              urls.length < maxAssets && (
                <div className="relative">
                  <button
                    type="button"
                    disabled={uploadingFields[field.id]}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() =>
                      setActiveUploadPopup(
                        activeUploadPopup === field.id ? null : field.id
                      )
                    }
                    className="nodrag flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 bg-[#050507] px-3 py-2 text-xs text-zinc-400 hover:border-white/20 hover:text-zinc-200 hover:bg-white/[0.02] transition-all active:scale-[0.98] duration-150 ease-out disabled:opacity-50"
                    title="Upload image"
                  >
                    {uploadingFields[field.id] ? (
                      <span>Uploading...</span>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="capitalize font-semibold">
                          Upload image
                          {urls.length > 0 && ` (${urls.length}/${maxAssets})`}
                        </span>
                      </>
                    )}
                  </button>
                  <UploadPopup
                    open={activeUploadPopup === field.id}
                    onClose={() => setActiveUploadPopup(null)}
                    onUpload={() =>
                      document.getElementById(`file-input-${field.id}`)?.click()
                    }
                  />
                </div>
              )
            ) : (
              urls.length === 0 && (
                <div className="flex items-center justify-center w-full h-10 rounded-lg border border-dashed border-white/5 bg-[#050507]/40">
                  <span className="text-[11px] text-zinc-500 font-medium font-mono uppercase tracking-wider">
                    No image
                  </span>
                </div>
              )
            )}

            {urls.length > 0 && (
              <div className="nodrag nopan mt-2 grid grid-cols-3 gap-2">
                {urls.map((url, idx) => (
                  <div key={url} className="group relative">
                    <div
                      className="overflow-hidden rounded-md bg-[#050507]"
                      style={{
                        border: "1px solid rgba(255, 255, 255, 0.05)",
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
                            value:
                              updatedUrls.length > 0 ? updatedUrls.join(",") : null,
                          });
                        }}
                        className="absolute right-1 top-1 z-10 rounded bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500 cursor-pointer border-0"
                        title="Remove"
                      >
                        <X className="w-2.5 h-2.5 text-white" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!isPreviewMode && !readOnly && (
              <input
                id={`file-input-${field.id}`}
                type="file"
                multiple
                accept="image/*"
                className="sr-only"
                disabled={uploadingFields[field.id]}
                onChange={(e) => handleFileUpload(field.id, field.type, e)}
              />
            )}
          </div>
        )}

        {field.type === "video_field" && (
          <div className="space-y-2">
            {!isPreviewMode && !readOnly ? (
              urls.length < maxAssets && (
                <div className="relative">
                  <button
                    type="button"
                    disabled={uploadingFields[field.id]}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() =>
                      setActiveUploadPopup(
                        activeUploadPopup === field.id ? null : field.id
                      )
                    }
                    className="nodrag flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 bg-[#050507] px-3 py-2.5 text-xs text-zinc-400 hover:border-white/20 hover:text-zinc-200 hover:bg-white/[0.02] transition-all active:scale-[0.98] duration-150 ease-out disabled:opacity-50"
                    title="Upload video"
                  >
                    {uploadingFields[field.id] ? (
                      <span>Uploading...</span>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="capitalize font-semibold">
                          Upload video
                          {urls.length > 0 && ` (${urls.length}/${maxAssets})`}
                        </span>
                      </>
                    )}
                  </button>
                  <UploadPopup
                    open={activeUploadPopup === field.id}
                    onClose={() => setActiveUploadPopup(null)}
                    onUpload={() =>
                      document.getElementById(`file-input-${field.id}`)?.click()
                    }
                  />
                </div>
              )
            ) : (
              urls.length === 0 && (
                <div className="flex items-center justify-center w-full h-10 rounded-lg border border-dashed border-white/5 bg-[#050507]/40">
                  <span className="text-[11px] text-zinc-500 font-medium font-mono uppercase tracking-wider">
                    No video
                  </span>
                </div>
              )
            )}

            {urls.length > 0 && (
              <div className="nodrag nopan mt-2 grid grid-cols-2 gap-2">
                {urls.map((url, idx) => (
                  <div key={url} className="group relative">
                    <div
                      className="overflow-hidden rounded-md bg-[#050507]"
                      style={{
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        aspectRatio: "16 / 10",
                      }}
                    >
                      <video
                        src={url}
                        className="nodrag h-full w-full object-cover"
                        preload="metadata"
                        playsInline
                        controls
                        controlsList="nodownload nofullscreen"
                      />
                    </div>
                    {!isPreviewMode && !readOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          const updatedUrls = urls.filter((_, i) => i !== idx);
                          updateField(field.id, {
                            value:
                              updatedUrls.length > 0 ? updatedUrls.join(",") : null,
                          });
                        }}
                        className="absolute right-1 top-1 z-10 rounded bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500 cursor-pointer border-0"
                        title="Remove"
                      >
                        <X className="w-2.5 h-2.5 text-white" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!isPreviewMode && !readOnly && (
              <input
                id={`file-input-${field.id}`}
                type="file"
                multiple
                accept="video/*"
                className="sr-only"
                disabled={uploadingFields[field.id]}
                onChange={(e) => handleFileUpload(field.id, field.type, e)}
              />
            )}
          </div>
        )}

        {(field.type === "audio_field" || field.type === "media_field") && (
          <div className="space-y-2">
            {!isPreviewMode && !readOnly ? (
              urls.length < 10 && (
                <div className="relative">
                  <button
                    type="button"
                    disabled={uploadingFields[field.id]}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() =>
                      setActiveUploadPopup(
                        activeUploadPopup === field.id ? null : field.id
                      )
                    }
                    className="nodrag flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 bg-[#050507] px-3 py-2.5 text-xs text-zinc-400 hover:border-white/20 hover:text-zinc-200 hover:bg-white/[0.02] transition-all active:scale-[0.98] duration-150 ease-out disabled:opacity-50"
                    title={`Upload ${
                      field.type === "audio_field" ? "audio" : "media"
                    }`}
                  >
                    {uploadingFields[field.id] ? (
                      <span>Uploading...</span>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="capitalize font-semibold">
                          Upload {field.type === "audio_field" ? "audio" : "media"}
                          {urls.length > 0 && ` (${urls.length}/10)`}
                        </span>
                      </>
                    )}
                  </button>
                  <UploadPopup
                    open={activeUploadPopup === field.id}
                    onClose={() => setActiveUploadPopup(null)}
                    onUpload={() =>
                      document.getElementById(`file-input-${field.id}`)?.click()
                    }
                  />
                </div>
              )
            ) : (
              urls.length === 0 && (
                <div className="flex items-center justify-center w-full h-10 rounded-lg border border-dashed border-white/5 bg-[#050507]/40">
                  <span className="text-[11px] text-zinc-500 font-medium font-mono uppercase tracking-wider">
                    No {field.type === "audio_field" ? "audio" : "media"}
                  </span>
                </div>
              )
            )}

            {urls.length > 0 && (
              <div className="nodrag nopan mt-2 space-y-2">
                {urls.map((url, idx) => (
                  <div key={url} className="group relative">
                    <audio src={url} controls className="w-full" />
                    {!isPreviewMode && !readOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          const updatedUrls = urls.filter((_, i) => i !== idx);
                          updateField(field.id, {
                            value:
                              updatedUrls.length > 0 ? updatedUrls.join(",") : null,
                          });
                        }}
                        className="absolute right-1 top-1 z-10 rounded bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500 cursor-pointer border-0"
                        title="Remove"
                      >
                        <X className="w-2.5 h-2.5 text-white" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!isPreviewMode && !readOnly && (
              <input
                id={`file-input-${field.id}`}
                type="file"
                multiple
                accept="audio/*,video/*"
                className="sr-only"
                disabled={uploadingFields[field.id]}
                onChange={(e) => handleFileUpload(field.id, field.type, e)}
              />
            )}
          </div>
        )}

        {field.type === "file_field" && (
          <div className="space-y-2">
            {!isPreviewMode && !readOnly ? (
              urls.length < 10 && (
                <div className="relative">
                  <button
                    type="button"
                    disabled={uploadingFields[field.id]}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() =>
                      setActiveUploadPopup(
                        activeUploadPopup === field.id ? null : field.id
                      )
                    }
                    className="nodrag flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 bg-[#050507] px-3 py-2.5 text-xs text-zinc-400 hover:border-white/20 hover:text-zinc-200 hover:bg-white/[0.02] transition-all active:scale-[0.98] duration-150 ease-out disabled:opacity-50"
                    title="Upload file"
                  >
                    {uploadingFields[field.id] ? (
                      <span>Uploading...</span>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="capitalize font-semibold">
                          Upload file{urls.length > 0 && ` (${urls.length}/10)`}
                        </span>
                      </>
                    )}
                  </button>
                  <UploadPopup
                    open={activeUploadPopup === field.id}
                    onClose={() => setActiveUploadPopup(null)}
                    onUpload={() =>
                      document.getElementById(`file-input-${field.id}`)?.click()
                    }
                  />
                </div>
              )
            ) : (
              urls.length === 0 && (
                <div className="flex items-center justify-center w-full h-10 rounded-lg border border-dashed border-white/5 bg-[#050507]/40">
                  <span className="text-[11px] text-zinc-500 font-medium font-mono uppercase tracking-wider">
                    No file
                  </span>
                </div>
              )
            )}

            {urls.length > 0 && (
              <div className="nodrag nopan mt-2 space-y-2">
                {urls.map((url, idx) => {
                  const filename = url.split("/").pop() || `File ${idx + 1}`;
                  return (
                    <div key={url} className="group relative">
                      <div className="flex items-center gap-2 overflow-hidden rounded-md px-3 py-2 bg-[#050507] border border-white/5">
                        <span className="truncate text-xs text-zinc-300 font-mono">
                          {filename}
                        </span>
                      </div>
                      {!isPreviewMode && !readOnly && (
                        <button
                          type="button"
                          onClick={() => {
                            const updatedUrls = urls.filter((_, i) => i !== idx);
                            updateField(field.id, {
                              value:
                                updatedUrls.length > 0 ? updatedUrls.join(",") : null,
                            });
                          }}
                          className="absolute right-1 top-1 z-10 rounded bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500 cursor-pointer border-0"
                          title="Remove"
                        >
                          <X className="w-2.5 h-2.5 text-white" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!isPreviewMode && !readOnly && (
              <input
                id={`file-input-${field.id}`}
                type="file"
                multiple
                accept="*/*"
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
}
