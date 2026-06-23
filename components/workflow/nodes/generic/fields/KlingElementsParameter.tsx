"use client";

import React from "react";
import { Handle, Position } from "@xyflow/react";
import * as LucideIcons from "lucide-react";
import FieldInfoTooltip from "../FieldInfoTooltip";
import { UploadPopup } from "../UploadPopup";
import { uploadFilesViaApi } from "@/lib/upload";

interface KlingElementsParameterProps {
  param: any;
  disabled: boolean;
  updateInput: (key: string, val: any) => void;
  elementItems: Record<string, Record<string, any>>;
  setElementItems: React.Dispatch<React.SetStateAction<Record<string, Record<string, any>>>>;
  uploadingElementField: string | null;
  setUploadingElementField: (val: string | null) => void;
  activeUploadPopup: string | null;
  setActiveUploadPopup: (val: string | null) => void;
  id: string;
  edges: any[];
  nodes: any[];
  setEdges: (val: any[]) => void;
  connectedTargets: Set<string>;
}

export function KlingElementsParameter({
  param,
  disabled,
  updateInput,
  elementItems,
  setElementItems,
  uploadingElementField,
  setUploadingElementField,
  activeUploadPopup,
  setActiveUploadPopup,
  id,
  edges,
  nodes,
  setEdges,
  connectedTargets,
}: KlingElementsParameterProps) {
  const items = elementItems;
  const itemKeys = Object.keys(items).sort((a, b) => Number(a) - Number(b));

  const handleElementFileUpload = async (
    itemIdx: string,
    fieldKey: string,
    files: FileList | null,
    isMulti = false,
    maxCount = 10
  ) => {
    if (!files?.length || disabled) return;
    const uploadKey = `${itemIdx}-${fieldKey}`;
    setUploadingElementField(uploadKey);
    try {
      const { urls: validUrls, firstError } = await uploadFilesViaApi(
        Array.from(files)
      );
      if (firstError) window.alert(firstError);
      if (validUrls.length > 0) {
        const item = { ...(elementItems[itemIdx] || {}) };
        if (isMulti) {
          const existing = (item[fieldKey] as string[]) || [];
          item[fieldKey] = [...existing, ...validUrls].slice(0, maxCount);
        } else {
          item[fieldKey] = validUrls[0];
        }
        const next = { ...elementItems, [itemIdx]: item };
        setElementItems(next);
        const arr = Object.keys(next)
          .sort((a, b) => Number(a) - Number(b))
          .map((k) => next[k]);
        updateInput(param.key, arr);
      }
    } catch (err) {
      console.error("[GenericNode] Element upload failed:", err);
    } finally {
      setUploadingElementField(null);
    }
  };

  const addItem = () => {
    const newIdx = String(
      itemKeys.length > 0 ? Math.max(...itemKeys.map(Number)) + 1 : 0
    );
    const next = { ...elementItems, [newIdx]: {} };
    setElementItems(next);
    const arr = Object.keys(next)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => next[k]);
    updateInput(param.key, arr);
  };

  const removeItem = (itemIdx: string) => {
    const next = { ...elementItems };
    delete next[itemIdx];
    // Re-index to keep array compact
    const reindexed: typeof next = {};
    const indexMapping: Record<string, string> = {};
    Object.keys(next)
      .sort((a, b) => Number(a) - Number(b))
      .forEach((k, i) => {
        reindexed[String(i)] = next[k];
        indexMapping[k] = String(i);
      });
    setElementItems(reindexed);
    const arr = Object.values(reindexed);
    updateInput(param.key, arr);

    // Sync and re-route edges in workflow store
    const nextEdges = (edges ?? [])
      .map((e) => {
        if (e.target !== id || !e.targetHandle?.startsWith("in:elements."))
          return e;
        const parts = e.targetHandle.split(".");
        if (parts.length < 3) return e;
        const idx = parts[1];
        const field = parts.slice(2).join(".");

        if (idx === itemIdx) {
          return null; // Delete edge connected to deleted element
        }
        const newIdx = indexMapping[idx];
        if (newIdx !== undefined && newIdx !== idx) {
          return { ...e, targetHandle: `in:elements.${newIdx}.${field}` }; // Shift edge index
        }
        return e;
      })
      .filter(Boolean) as any[];
    setEdges(nextEdges);
  };

  const removeElementImage = (
    itemIdx: string,
    fieldKey: string,
    imgIdx?: number
  ) => {
    const item = { ...(elementItems[itemIdx] || {}) };
    if (imgIdx !== undefined) {
      const arr = [...((item[fieldKey] as string[]) || [])];
      arr.splice(imgIdx, 1);
      item[fieldKey] = arr;
    } else {
      item[fieldKey] = "";
    }
    const next = { ...elementItems, [itemIdx]: item };
    setElementItems(next);
    const arr2 = Object.keys(next)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => next[k]);
    updateInput(param.key, arr2);
  };

  return (
    <div className="space-y-2">
      {/* Section header: bold black label + info tooltip */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-zinc-200">{param.label}</span>
        {param.tooltip && <FieldInfoTooltip text={param.tooltip} />}
      </div>

      {itemKeys.map((itemIdx) => {
        const item = items[itemIdx];
        // frontal image drives conditional behaviour for other fields
        const frontalVal =
          typeof item["frontal_image_url"] === "string"
            ? item["frontal_image_url"]
            : "";
        const hasFrontal = frontalVal.length > 0;

        return (
          <div
            key={itemIdx}
            className="relative space-y-2.5 rounded-lg border border-white/5 bg-white/[0.02] p-3"
          >
            {/* Delete button */}
            <button
              type="button"
              className="nodrag absolute -right-2 -top-2 rounded-full bg-white/10 p-1 text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
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
              const imgList = Array.isArray(fieldValue)
                ? (fieldValue as string[])
                : [];
              const singleVal = typeof fieldValue === "string" ? fieldValue : "";
              const atMax =
                field.type === "file-upload-multi" &&
                imgList.length >= (field.maxCount || 10);
              const isVideo = field.accept?.includes("video");

              // Video element is hidden once a frontal image is uploaded
              if (field.key === "video_url" && hasFrontal) return null;

              // Reference Images upload button is muted until frontal image is provided
              const refImagesMuted =
                field.key === "reference_image_urls" &&
                !hasFrontal &&
                !isFieldWired;

              return (
                <div
                  key={field.key}
                  className="relative"
                  style={{ overflow: "visible" }}
                >
                  {/* Sub-handle, positioned further left inside the card */}
                  {field.handle &&
                    !refImagesMuted &&
                    !(field.key === "video_url" && hasFrontal) && (
                      <div
                        className="absolute flex items-center"
                        style={{
                          left: "-35px",
                          top: "14px",
                          transform: "translateY(-50%)",
                          zIndex: 50,
                        }}
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
                        <span className="shrink-0 text-xs text-zinc-400">
                          {field.label}
                          {field.required && (
                            <span className="text-red-400">*</span>
                          )}
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
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={() =>
                                    !isFieldWired &&
                                    !disabled &&
                                    setActiveUploadPopup(
                                      activeUploadPopup === elPopupKey
                                        ? null
                                        : elPopupKey
                                    )
                                  }
                                  className="nodrag flex w-full items-center justify-center gap-2 rounded-lg border border-dashed transition-colors disabled:opacity-50 border-white/10 bg-[#0C0C0E]/60 px-3 py-2.5 text-xs text-zinc-400 hover:border-[#7C3AED]/40 hover:text-zinc-200 hover:bg-white/[0.02]"
                                  title={
                                    singleVal
                                      ? `Change ${isVideo ? "video" : "image"}`
                                      : `Upload ${isVideo ? "video" : "image"}`
                                  }
                                >
                                  {uploadingElementField === fieldUploadKey ? (
                                    <LucideIcons.Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <LucideIcons.Upload className="h-3.5 w-3.5" />
                                  )}
                                  <span className="capitalize font-semibold">
                                    {uploadingElementField === fieldUploadKey
                                      ? "Uploading..."
                                      : singleVal
                                        ? `Change ${
                                            isVideo ? "video" : "image"
                                          }`
                                        : `Upload ${
                                            isVideo ? "video" : "image"
                                          }`}
                                  </span>
                                </button>
                                <input
                                  id={`el-file-${id}-${itemIdx}-${field.key}`}
                                  type="file"
                                  hidden
                                  accept={field.accept}
                                  disabled={isFieldWired || disabled}
                                  onChange={(e) =>
                                    void handleElementFileUpload(
                                      itemIdx,
                                      field.key,
                                      e.target.files
                                    )
                                  }
                                />
                                <UploadPopup
                                  open={activeUploadPopup === elPopupKey}
                                  onClose={() => setActiveUploadPopup(null)}
                                  onUpload={() =>
                                    document
                                      .getElementById(
                                        `el-file-${id}-${itemIdx}-${field.key}`
                                      )
                                      ?.click()
                                  }
                                />
                              </div>
                            );
                          })()}

                          {/* Upload requirements */}
                          {field.uploadRequirementsTooltip && (
                            <div className="mt-1 flex items-center gap-1">
                              <FieldInfoTooltip
                                text={field.uploadRequirementsTooltip}
                              />
                              <span className="text-[10px] text-zinc-500">
                                Upload requirements
                              </span>
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
                              style={{
                                border: "2px solid rgba(59,130,246,0.3)",
                              }}
                            >
                              <img
                                alt=""
                                className="block rounded-sm"
                                src={singleVal}
                                style={{ maxWidth: 200, maxHeight: 120 }}
                              />
                              <button
                                className="absolute right-1 top-1 z-10 rounded bg-black/60 p-0.5 text-white hover:bg-red-500 border-0"
                                onClick={() =>
                                  removeElementImage(itemIdx, field.key)
                                }
                              >
                                <LucideIcons.X
                                  className="h-2.5 w-2.5"
                                  aria-hidden="true"
                                />
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
                        <span className="text-xs text-zinc-400 font-semibold">
                          {field.label}
                          {field.required && (
                            <span className="text-red-400">*</span>
                          )}
                        </span>
                      </div>
                      {(() => {
                        const elPopupKeyMulti = `el-popup-${itemIdx}-${field.key}`;
                        return (
                          <div className="relative">
                            <button
                              type="button"
                              tabIndex={-1}
                              disabled={
                                isFieldWired ||
                                disabled ||
                                atMax ||
                                refImagesMuted
                              }
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={() =>
                                !isFieldWired &&
                                !disabled &&
                                !atMax &&
                                !refImagesMuted &&
                                setActiveUploadPopup(
                                  activeUploadPopup === elPopupKeyMulti
                                    ? null
                                    : elPopupKeyMulti
                                )
                              }
                              className="nodrag flex w-full items-center justify-center gap-2 rounded-lg border border-dashed transition-colors disabled:opacity-50 border-white/10 bg-[#0C0C0E]/60 px-3 py-2.5 text-xs text-zinc-400 hover:border-[#7C3AED]/40 hover:text-zinc-200 hover:bg-white/[0.02]"
                              title={
                                refImagesMuted
                                  ? "Provide a frontal image first"
                                  : isFieldWired
                                    ? "Supplied by a connection"
                                    : `Upload reference images (${imgList.length}/${
                                        field.maxCount || 10
                                      })`
                              }
                            >
                              {uploadingElementField === fieldUploadKey ? (
                                <LucideIcons.Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <LucideIcons.Upload className="h-3.5 w-3.5" />
                              )}
                              <span className="capitalize font-semibold">
                                {uploadingElementField === fieldUploadKey
                                  ? "Uploading..."
                                  : `Upload reference images (${imgList.length}/${
                                      field.maxCount || 10
                                    })`}
                              </span>
                            </button>
                            <input
                              id={`el-file-${id}-${itemIdx}-${field.key}`}
                              type="file"
                              multiple
                              hidden
                              accept={field.accept}
                              disabled={
                                isFieldWired ||
                                disabled ||
                                atMax ||
                                refImagesMuted
                              }
                              onChange={(e) =>
                                void handleElementFileUpload(
                                  itemIdx,
                                  field.key,
                                  e.target.files,
                                  true,
                                  field.maxCount
                                )
                              }
                            />
                            <UploadPopup
                              open={activeUploadPopup === elPopupKeyMulti}
                              onClose={() => setActiveUploadPopup(null)}
                              onUpload={() =>
                                document
                                  .getElementById(
                                    `el-file-${id}-${itemIdx}-${field.key}`
                                  )
                                  ?.click()
                              }
                            />
                          </div>
                        );
                      })()}

                      {/* Preview for multi image upload */}
                      {imgList.length > 0 && !isFieldWired && (
                        <div className="mt-2 grid grid-cols-4 gap-2">
                          {imgList.map((url, i) => (
                            <div key={url} className="group relative">
                              <div
                                className="overflow-hidden rounded-md bg-[#050507]"
                                style={{
                                  border: "1px solid rgba(255,255,255,0.05)",
                                  aspectRatio: "1/1",
                                }}
                              >
                                <img
                                  alt=""
                                  src={url}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <button
                                type="button"
                                className="absolute right-1 top-1 z-10 rounded bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500 border-0"
                                onClick={() =>
                                  removeElementImage(itemIdx, field.key, i)
                                }
                              >
                                <LucideIcons.X
                                  className="h-2 w-2"
                                  aria-hidden="true"
                                />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Range parameters inside items */}
                  {field.type === "range" && (
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="shrink-0 text-xs text-zinc-400">
                        {field.label}
                      </span>
                      <input
                        type="range"
                        min={field.min ?? 0}
                        max={field.max ?? 100}
                        step={field.step ?? 1}
                        value={
                          fieldValue !== undefined && fieldValue !== ""
                            ? Number(fieldValue)
                            : (field.defaultValue ?? 0)
                        }
                        disabled={isFieldWired || disabled}
                        onChange={(e) => {
                          const itemIdxNum = itemIdx;
                          const nextVal = Number(e.target.value);
                          const itemCopy = { ...(elementItems[itemIdxNum] || {}) };
                          itemCopy[field.key] = nextVal;
                          const next = {
                            ...elementItems,
                            [itemIdxNum]: itemCopy,
                          };
                          setElementItems(next);
                          const arr = Object.keys(next)
                            .sort((a, b) => Number(a) - Number(b))
                            .map((k) => next[k]);
                          updateInput(param.key, arr);
                        }}
                        className="nodrag h-1 min-w-[50px] flex-1 appearance-none rounded-full bg-zinc-800 accent-[#7C3AED] disabled:opacity-50"
                      />
                      <input
                        type="number"
                        min={field.min ?? 0}
                        max={field.max ?? 100}
                        step={field.step ?? 1}
                        value={
                          fieldValue !== undefined && fieldValue !== ""
                            ? Number(fieldValue)
                            : (field.defaultValue ?? 0)
                        }
                        disabled={isFieldWired || disabled}
                        onChange={(e) => {
                          const itemIdxNum = itemIdx;
                          const nextVal = Number(e.target.value);
                          const itemCopy = { ...(elementItems[itemIdxNum] || {}) };
                          itemCopy[field.key] = nextVal;
                          const next = {
                            ...elementItems,
                            [itemIdxNum]: itemCopy,
                          };
                          setElementItems(next);
                          const arr = Object.keys(next)
                            .sort((a, b) => Number(a) - Number(b))
                            .map((k) => next[k]);
                          updateInput(param.key, arr);
                        }}
                        className="nodrag w-10 shrink-0 rounded-lg border border-white/5 bg-[#050507] px-1 py-0.5 text-center font-mono text-[10px] text-zinc-100 outline-none disabled:opacity-50 focus:border-white/15 transition-colors"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {!disabled && (
        <button
          type="button"
          onClick={addItem}
          className="nodrag flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/10 bg-white/[0.01] px-3 py-2 text-xs text-zinc-400 hover:border-white/20 hover:text-zinc-200 hover:bg-white/[0.02] transition-colors"
        >
          <LucideIcons.Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Add Element</span>
        </button>
      )}
    </div>
  );
}
