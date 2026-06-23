"use client";

/**
 * @fileoverview Dynamic Request-Inputs form node: draggable field list, uploads, downstream handle wiring (`field_*` ids drive edges).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { type NodeProps } from "@xyflow/react";
import BorderGlow from "@/components/ui/BorderGlow";
import {
  Plus,
  Info,
  ChevronDown,
  AlignLeft,
  Hash,
  Check,
  Image,
  Music,
  Video,
  FileText,
} from "lucide-react";
import { useWorkflowStore, type WorkflowField, useNodePreview } from "@/store/workflow-store";
import TextExpandModal from "../TextExpandModal";
import { sanitizeError } from "@/lib/utils";
import { uploadFilesViaApi } from "@/lib/upload";
import { getNodeRunBorderClass } from "@/lib/node-run-chrome";
import { syncLinkedTargetInputFromField } from "@/lib/promoted-input-value";
import { removeRequestFieldAndEdges } from "@/lib/promote-to-request";
import { maxAssetsForField } from "@/lib/request-inputs";
import { RequestInputFieldItem } from "./requestInputs/RequestInputFieldItem";

interface RequestInputsData {
  label: string;
  fields: WorkflowField[];
}

/** Authoring shell for inbound workflow parameters; merges historical preview values via `useNodePreview`. */
export default function RequestInputsNode({
  id,
  data,
  selected = false,
}: NodeProps) {
  const nodeData = data as unknown as RequestInputsData;
  const { updateNodeData, readOnly, nodes, edges, setNodes, setEdges } = useWorkflowStore();
  const { isPreviewMode, isDimmed, isExecuting, isRunPending, error, runFieldIds, output } =
    useNodePreview(id);
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
  const [activeSelectFieldId, setActiveSelectFieldId] = useState<string | null>(null);
  const [activeUploadPopup, setActiveUploadPopup] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (activeUploadPopup && !target.closest(".upload-popup-container")) {
        setActiveUploadPopup(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [activeUploadPopup]);

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
    const { nodes: nextNodes, edges: nextEdges } = removeRequestFieldAndEdges(
      nodes,
      edges,
      id,
      fieldId
    );
    setNodes(nextNodes);
    setEdges(nextEdges);
  };

  const updateField = (fieldId: string, updates: Partial<WorkflowField>) => {
    const store = useWorkflowStore.getState();
    const reqNode = store.nodes.find((n) => n.id === id);
    if (!reqNode) return;
    const currentFields = ((reqNode.data as unknown as RequestInputsData).fields ??
      []) as WorkflowField[];
    const nextFields = currentFields.map((f) =>
      f.id === fieldId ? { ...f, ...updates } : f
    );
    let nextNodes = store.nodes.map((n) =>
      n.id === id
        ? { ...n, data: { ...(n.data as object), fields: nextFields } }
        : n
    );
    const updated = nextFields.find((f) => f.id === fieldId);
    if (updated?.linkedTarget) {
      nextNodes = syncLinkedTargetInputFromField(nextNodes, updated);
    }
    setNodes(nextNodes);
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
      const maxAssets = maxAssetsForField(
        field ?? { type, mediaMaxCount: undefined }
      );
      const currentVal = field?.value || "";
      const currentUrls = currentVal ? currentVal.split(",").filter(Boolean) : [];
      if (currentUrls.length + filesArray.length > maxAssets) {
        alert(`You can upload a maximum of ${maxAssets} file(s).`);
        return;
      }

      setUploadingFields((prev) => ({ ...prev, [fieldId]: true }));

      try {
        const { urls: validUrls, firstError } = await uploadFilesViaApi(filesArray);
        if (firstError) {
          window.alert(firstError);
        }

        if (validUrls.length === 0 && filesArray.length > 0 && !firstError) {
          window.alert("Upload failed. No files were saved.");
        }

        if (validUrls.length > 0) {
          const latestState = useWorkflowStore.getState();
          const latestNode = latestState.nodes.find((n) => n.id === id);
          const latestNodeFields = (latestNode?.data as any)?.fields as WorkflowField[] || [];
          const latestField = latestNodeFields.find((f) => f.id === fieldId);
          const latestVal = latestField?.value || "";
          const latestUrls = latestVal ? latestVal.split(",").filter(Boolean) : [];
          
          const cleanUrls = latestUrls.filter((url) => !url.startsWith("data:"));
          const cap = maxAssetsForField(latestField ?? { type, mediaMaxCount: undefined });
          const nextUrls =
            cap === 1
              ? validUrls.slice(0, 1)
              : [...cleanUrls, ...validUrls].slice(0, cap);
          updateField(fieldId, {
            value: nextUrls.length > 0 ? nextUrls.join(",") : null,
          });
        }
      } catch (err) {
        console.error("Upload error:", err);
        window.alert("Upload failed. Please try again.");
      } finally {
        e.target.value = "";
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

  return (
    <BorderGlow
      selected={selected}
      nodeColor="requestInputs"
      borderRadius={20}
      glowIntensity={0.85}
      fillOpacity={0.15}
    >
      <div
        className={`wf-node-card w-[380px] rounded-[1.25rem] bg-white/[0.03] border border-white/5 p-[5px] backdrop-blur-md transition-all duration-500 hover:bg-white/[0.05] hover:border-white/10 overflow-visible ${isDimmed ? "opacity-40 grayscale pointer-events-none" : ""}`}
        style={{ minWidth: 380, overflow: "visible" }}
      >
      <div
        className={`w-full h-full rounded-[calc(1.25rem-5px)] bg-[#0A0A0A] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border transition-all duration-300 ${getNodeRunBorderClass(
          {
            isDimmed,
            isExecuting,
            hasError: !!error,
            isRunPending,
          }
        )}`}
        style={{ overflow: "visible" }}
      >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span className="cursor-grab select-none text-[15px] font-semibold tracking-wide text-zinc-100 uppercase font-mono leading-none">
            Requests
          </span>
          <div className="group/tip relative shrink-0">
            <Info className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300 cursor-default transition-colors" />
            <div className="pointer-events-none absolute left-1/2 top-full z-[9999] mt-1.5 hidden w-max max-w-[280px] -translate-x-1/2 rounded-lg border border-white/10 bg-[#0A0A0C] px-3 py-2 text-[11px] font-normal leading-relaxed text-zinc-300 shadow-xl group-hover/tip:block backdrop-blur-md">
              Define the input fields for your workflow. These become the request parameters when running via Playground or API.
            </div>
          </div>
        </div>
        
        {!readOnly && (
          <div className="flex items-center gap-1 ml-3">
            {/* Add field dropdown */}
            <div className="relative group/add">
              <button className="nodrag flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-100 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
              <div className="pointer-events-none group-hover/add:pointer-events-auto absolute right-0 top-full pt-1 hidden group-hover/add:block z-50 min-w-[140px]">
                <div className="bezel-container border border-white/10 rounded-xl bg-[#0A0A0C]/95 backdrop-blur-md shadow-2xl overflow-hidden py-1 min-w-[140px]">
                  <button
                    className="nodrag w-full text-left px-3 py-2 text-[13px] text-zinc-300 hover:bg-white/5 hover:text-zinc-100 flex items-center gap-2 transition-colors"
                    onMouseDown={() => addField("text_field")}
                  >
                    <AlignLeft className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Text</span>
                  </button>
                  <button
                    className="nodrag w-full text-left px-3 py-2 text-[13px] text-zinc-300 hover:bg-white/5 hover:text-zinc-100 flex items-center gap-2 transition-colors"
                    onMouseDown={() => addField("number_field")}
                  >
                    <Hash className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Number</span>
                  </button>
                  <button
                    className="nodrag w-full text-left px-3 py-2 text-[13px] text-zinc-300 hover:bg-white/5 hover:text-zinc-100 flex items-center gap-2 transition-colors"
                    onMouseDown={() => addField("boolean_field")}
                  >
                    <Check className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Boolean</span>
                  </button>
                  <button
                    className="nodrag w-full text-left px-3 py-2 text-[13px] text-zinc-300 hover:bg-white/5 hover:text-zinc-100 flex items-center gap-2 transition-colors"
                    onMouseDown={() => addField("image_field")}
                  >
                    <Image className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Image</span>
                  </button>
                  <button
                    className="nodrag w-full text-left px-3 py-2 text-[13px] text-zinc-300 hover:bg-white/5 hover:text-zinc-100 flex items-center gap-2 transition-colors"
                    onMouseDown={() => addField("audio_field")}
                  >
                    <Music className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Audio</span>
                  </button>
                  <button
                    className="nodrag w-full text-left px-3 py-2 text-[13px] text-zinc-300 hover:bg-white/5 hover:text-zinc-100 flex items-center gap-2 transition-colors"
                    onMouseDown={() => addField("video_field")}
                  >
                    <Video className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Video</span>
                  </button>
                  <button
                    className="nodrag w-full text-left px-3 py-2 text-[13px] text-zinc-300 hover:bg-white/5 hover:text-zinc-100 flex items-center gap-2 transition-colors"
                    onMouseDown={() => addField("media_field")}
                  >
                    <Music className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Media</span>
                  </button>
                  <button
                    className="nodrag w-full text-left px-3 py-2 text-[13px] text-zinc-300 hover:bg-white/5 hover:text-zinc-100 flex items-center gap-2 transition-colors"
                    onMouseDown={() => addField("file_field")}
                  >
                    <FileText className="w-3.5 h-3.5 text-zinc-500" />
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
        <div className="mx-4 mt-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-[12px] text-red-400">
          {sanitizeError(nodeError)}
        </div>
      )}

      {/* Fields */}
      <div className="px-4 py-4 space-y-4 overflow-visible">
        {fields.length === 0 && (
          <p className="text-[12px] text-zinc-500 text-center py-2">
            Click + to add input fields
          </p>
        )}

        {fields.map((field) => {
          const displayValue = getFieldDisplayValue(field) ?? "";
          return (
            <RequestInputFieldItem
              key={field.id}
              field={field}
              readOnly={readOnly}
              isPreviewMode={isPreviewMode}
              isNewField={isFieldNew(field.id)}
              displayValue={displayValue}
              activeSelectFieldId={activeSelectFieldId}
              setActiveSelectFieldId={setActiveSelectFieldId}
              updateField={updateField}
              removeField={removeField}
              activeUploadPopup={activeUploadPopup}
              setActiveUploadPopup={setActiveUploadPopup}
              uploadingFields={uploadingFields}
              handleFileUpload={handleFileUpload}
              copyToClipboard={copyToClipboard}
              setActiveExpandFieldId={setActiveExpandFieldId}
              editingFieldId={editingFieldId}
              setEditingFieldId={setEditingFieldId}
              editingLabel={editingLabel}
              setEditingLabel={setEditingLabel}
            />
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
    </div>
    </BorderGlow>
  );
}
