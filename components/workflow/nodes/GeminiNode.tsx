"use client";

/**
 * @fileoverview Gemini LLM node: multimodal handles, edge-resolved inputs (`resolvePropagatedEdgeValue`), `/api/execute/gemini` orchestration hooks.
 */

import { useState, useEffect, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Sparkles,
  ChevronDown,
  ChevronRight,
  Upload,
  Coins,
  Plus,
  Minus,
} from "lucide-react";
import { useWorkflowStore, useNodePreview } from "@/store/workflow-store";
import NodeHeaderActions from "./NodeHeaderActions";
import { generateEdgeId, resolvePropagatedEdgeValue, sanitizeError } from "@/lib/utils";
import { NODE_ESTIMATE_LABEL } from "@/lib/node-estimates";

interface GeminiData {
  label: string;
  model: string;
  locked?: boolean;
  inputs: {
    prompt: string | null;
    systemPrompt: string | null;
    images: string[];
    video: string | null;
    audio: string | null;
    file: string | null;
    temperature: number;
    maxTokens: number;
    topP: number;
  };
  output: string | null;
}

const GEMINI_MODELS = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "gemini-3-flash", label: "Gemini 3 Flash" },
  { value: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite" },
];

/**
 * Accessible dropdown over `GEMINI_MODELS`; UI title stays “Gemini 3.1 Pro” for reference fidelity while storing real IDs in node data.
 */
function GeminiModelDropdown({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  onChange: (model: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected =
    GEMINI_MODELS.find((m) => m.value === value) ?? {
      value,
      label: value || "Model",
    };

  return (
    <div ref={ref} className="relative nodrag">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`${selected.label}. Open model menu.`}
        onClick={() => !disabled && setOpen((v) => !v)}
        className="nodrag flex max-w-[240px] min-w-0 cursor-pointer border-0 bg-transparent p-0 text-left text-[13px] font-semibold text-gray-900 shadow-none outline-none transition-colors hover:text-[#7C3AED] focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[#7C3AED]/25 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-gray-900"
      >
        {/* Title matches reference workflow; execution still uses selected model value. */}
        <span className="min-w-0 truncate">Gemini 3.1 Pro</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-[100] mt-1 w-max min-w-full max-w-[260px] overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-xl">
          {GEMINI_MODELS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-[13px] transition-colors hover:bg-gray-50 ${
                value === opt.value
                  ? "bg-gray-50 font-semibold text-gray-900"
                  : "font-normal text-gray-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface HandleRowProps {
  label: string;
  handleId: string;
  handleColor: string;
  handleShadow: string;
  isConnected: boolean;
  required?: boolean;
  children?: React.ReactNode;
}

/** Target handle + descriptive label pairing used for Gemini’s many inbound ports. */
function HandleRow({ label, handleId, handleColor, handleShadow, isConnected, required, children }: HandleRowProps) {
  return (
    <div className="relative py-1 overflow-visible">
      <Handle
        type="target"
        position={Position.Left}
        id={handleId}
        style={{
          background: handleColor,
          border: `2px solid ${handleColor}`,
          width: 14,
          height: 14,
          left: -21,
          boxShadow: handleShadow,
        }}
      />
      <label className="text-[12px] font-medium text-gray-500 mb-1 block">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

/** Single control: + when inactive, − when muted (visual only). */
function AddToRequestToggle({
  muted,
  disabled,
  onMutedChange,
}: {
  muted: boolean;
  disabled?: boolean;
  onMutedChange: (muted: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onMutedChange(!muted)}
      aria-label={muted ? "Remove from request (visual)" : "Add to request (visual)"}
      className="nodrag flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-40"
    >
      {muted ? (
        <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
      ) : (
        <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
      )}
    </button>
  );
}

/** Primary canvas node authoring Gemini prompts/uploads; wires store mutations plus preview-mode output hydration. */
export default function GeminiNode({ id, data }: NodeProps) {
  const nodeData = data as unknown as GeminiData;
  const { updateNodeData, deleteNode, addNode, setEdges, setNodes, edges, nodes, previewRunId, previewNodeOutputs } =
    useWorkflowStore();
  const { isPreviewMode, isDimmed, isExecuting, output, error } = useNodePreview(id);
  const nodeError = error as string | null;
  const isLocked = !!nodeData.locked;

  const edgeResolveOpts =
    previewRunId !== null ? { previewOutputsByNodeId: previewNodeOutputs } : undefined;

  const [geminiRequestMute, setGeminiRequestMute] = useState<Record<string, boolean>>({});
  const [showSettings, setShowSettings] = useState(false);

  const connectedTargets = new Set(
    (edges ?? []).filter((e) => e.target === id).map((e) => e.targetHandle)
  );

  const imageInboundEdges = (edges ?? []).filter(
    (e) => e.target === id && e.targetHandle === "in:images"
  );

  const promptInboundEdge = (edges ?? []).find(
    (e) => e.target === id && e.targetHandle === "in:prompt"
  );
  const propagatedPrompt = promptInboundEdge
    ? resolvePropagatedEdgeValue(promptInboundEdge, nodes ?? [], edgeResolveOpts)
    : undefined;
  const wiredPromptText = (() => {
    if (propagatedPrompt === null || propagatedPrompt === undefined) return "";
    if (typeof propagatedPrompt === "string") return propagatedPrompt;
    try {
      return JSON.stringify(propagatedPrompt, null, 2);
    } catch {
      return String(propagatedPrompt);
    }
  })();
  const promptWired = connectedTargets.has("in:prompt");

  const connectedUpstreamUrls: string[] = (() => {
    const raw: string[] = [];
    for (const edge of imageInboundEdges) {
      const v = resolvePropagatedEdgeValue(edge, nodes ?? [], edgeResolveOpts);
      if (typeof v === "string" && v.trim().length > 0) raw.push(v.trim());
    }
    const seen = new Set<string>();
    return raw.filter((u) => (seen.has(u) ? false : !!seen.add(u)));
  })();

  const uploadedImageUrls = (nodeData.inputs.images ?? []).filter(
    (u): u is string => typeof u === "string" && u.trim().length > 0
  );

  const handleVisionImagesFiles = async (files: FileList | null) => {
    if (!files?.length || isLocked) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      
      // 1. Get local base64 preview
      const dataUrl = await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
      
      if (!dataUrl) continue;
      
      // 2. Add local base64 preview immediately
      const currentImages = nodeData.inputs.images ?? [];
      updateNodeData(id, {
        inputs: { ...nodeData.inputs, images: [...currentImages, dataUrl] },
      } as Partial<GeminiData>);

      // 3. Upload to cloud in the background
      const formData = new FormData();
      formData.append("file", file);
      
      fetch("/api/upload", { method: "POST", body: formData })
        .then((r) => r.json())
        .then((data) => {
          if (data.url) {
            // Swap the local preview with the cloud URL in the store
            const store = useWorkflowStore.getState();
            store.setNodes(
              store.nodes.map((n) => {
                if (n.id === id) {
                  const nodeInputs = (n.data as unknown as GeminiData).inputs;
                  const updatedImages = (nodeInputs.images ?? []).map((img) => 
                    img === dataUrl ? data.url : img
                  );
                  return {
                    ...n,
                    data: {
                      ...n.data,
                      inputs: { ...nodeInputs, images: updatedImages }
                    }
                  };
                }
                return n;
              })
            );
          }
        })
        .catch((err) => {
          console.error("[NextFlow] Vision image upload failed, keeping local base64:", err);
        });
    }
  };

  /** Persists to node data for workflow save; uploads to cloud in background. */
  const handleOptionalMediaUpload = async (
    key: "video" | "audio" | "file",
    files: FileList | null
  ) => {
    const file = files?.[0];
    if (!file || isLocked) return;

    // 1. Get local preview data URL
    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });

    if (!dataUrl) return;

    // 2. Set local preview immediately
    updateInput(key, dataUrl);

    // 3. Upload to cloud in the background
    const formData = new FormData();
    formData.append("file", file);

    fetch("/api/upload", { method: "POST", body: formData })
      .then((r) => r.json())
      .then((data) => {
        if (data.url) {
          // If the node value is still the local preview, swap it
          const store = useWorkflowStore.getState();
          store.setNodes(
            store.nodes.map((n) => {
              if (n.id === id) {
                const nodeInputs = (n.data as unknown as GeminiData).inputs;
                if (nodeInputs[key] === dataUrl) {
                  return {
                    ...n,
                    data: {
                      ...n.data,
                      inputs: { ...nodeInputs, [key]: data.url }
                    }
                  };
                }
              }
              return n;
            })
          );
        }
      })
      .catch((err) => {
        console.error(`[NextFlow] ${key} upload failed, keeping local preview:`, err);
      });
  };

  const updateInput = (
    key: keyof GeminiData["inputs"],
    val: string | number | null | string[]
  ) => {
    if (isLocked) return;
    updateNodeData(id, {
      inputs: { ...nodeData.inputs, [key]: val },
    } as Partial<GeminiData>);
  };

  const handleSingleRun = () => {
    window.dispatchEvent(
      new CustomEvent("nextflow:run-node", { detail: { nodeId: id } })
    );
  };

  const handleReset = () => {
    updateNodeData(id, {
      inputs: {
        prompt: null,
        systemPrompt: null,
        images: [],
        video: null,
        audio: null,
        file: null,
        temperature: nodeData.inputs.temperature,
        maxTokens: nodeData.inputs.maxTokens,
        topP: nodeData.inputs.topP,
      },
      output: null,
    } as Partial<GeminiData>);
  };

  const handleLockToggle = () => {
    const nextLocked = !isLocked;
    setNodes(
      nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              draggable: !nextLocked,
              // Keep selectable:true so clicks/menus still work on a locked node.
              // The purple ring is suppressed via CSS (data-locked attribute + globals.css).
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
    const newId = `gemini-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newNode = {
      ...thisNode,
      id: newId,
      position: { x: thisNode.position.x + 60, y: thisNode.position.y - 60 },
      selected: true,
      data: { ...thisNode.data },
    };
    // Push history then set nodes: deselect original, add new on top
    setNodes([...nodes.map((n) => n.id === id ? { ...n, selected: false } : n), newNode]);
  };

  const handleDuplicateWithEdges = () => {
    const thisNode = nodes.find((n) => n.id === id);
    if (!thisNode) return;
    const newId = `gemini-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newNode = {
      ...thisNode,
      id: newId,
      position: { x: thisNode.position.x + 60, y: thisNode.position.y - 60 },
      selected: true,
      data: { ...thisNode.data },
    };
    setNodes([...nodes.map((n) => n.id === id ? { ...n, selected: false } : n), newNode]);
    // Copy incoming edges (connections into this node → connections into new node)
    const incomingEdges = edges.filter((e) => e.target === id);
    const newEdges = incomingEdges.map((e) => ({
      ...e,
      id: generateEdgeId(),
      target: newId,
    }));
    setEdges([...edges, ...newEdges]);
  };

  return (
    <div
      data-locked={isLocked ? "true" : undefined}
      className={`w-[380px] rounded-xl border bg-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] overflow-visible transition-all ${
        isExecuting ? "node-executing" : ""
      } ${isLocked ? "border-yellow-400" : nodeError ? "border-red-300" : "border-gray-200"} ${isDimmed ? "opacity-40 grayscale pointer-events-none" : ""}`}
      style={{ minWidth: 380 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-blue-500" />
          </div>
          {/* Model selector */}
          <GeminiModelDropdown
            value={nodeData.model}
            disabled={isLocked}
            onChange={(model) =>
              updateNodeData(id, { model } as Partial<GeminiData>)
            }
          />
        </div>

        <NodeHeaderActions
          nodeId={id}
          description="Generate text using a Gemini model. Connect a prompt and optional images, system prompt, or other inputs."
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

      {/* Error */}
      {nodeError && (
        <div className="mx-4 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-600">
          {sanitizeError(nodeError)}
        </div>
      )}

      {/* Inputs */}
      <div className="px-4 py-4 space-y-2 overflow-visible">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Inputs
        </p>

        {/* Prompt */}
        <HandleRow
          label="Prompt"
          handleId="in:prompt"
          handleColor="#F59E0B"
          handleShadow="0 0 8px rgba(245,158,11,0.314)"
          isConnected={promptWired}
          required
        >
          {promptWired ? (
            <div className="nodrag rounded-lg border border-gray-100 bg-[#FAFAFB] px-3 py-2 min-h-[4.75rem] input-connected">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 mb-1.5">
                Input prompt (from connection)
              </p>
              <div className="text-[13px] text-gray-500 leading-snug whitespace-pre-wrap break-words max-h-[8.5rem] overflow-y-auto nowheel cursor-default select-text">
                {wiredPromptText.trim()
                  ? wiredPromptText
                  : "Waiting for text from upstream…"}
              </div>
            </div>
          ) : (
          <div className="relative">
            <textarea
              rows={3}
              placeholder="Enter your prompt..."
              value={nodeData.inputs.prompt ?? ""}
              onChange={(e) => updateInput("prompt", e.target.value)}
              disabled={isLocked}
              className="nodrag nowheel w-full rounded-lg border border-gray-200 bg-[#F5F5F5] px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-[#7C3AED] resize-y"
            />
          </div>
          )}
        </HandleRow>

        {/* System Prompt — expanded by default; +/− toggle is visual-only */}
        <div className="relative py-1 overflow-visible">
          <Handle
            type="target"
            position={Position.Left}
            id="in:systemPrompt"
            style={{
              background: "#F59E0B",
              border: "2px solid #F59E0B",
              width: 14,
              height: 14,
              left: -21,
              top: 14,
              transform: "translateY(-50%)",
              boxShadow: "0 0 8px rgba(245,158,11,0.314)",
            }}
          />
          <div className="flex items-center gap-2 min-h-9">
            <span className="text-[12px] font-medium text-gray-500 flex-1 min-w-0">
              System Prompt
            </span>
            <AddToRequestToggle
              muted={!!geminiRequestMute.systemPrompt}
              disabled={isLocked}
              onMutedChange={(m) =>
                setGeminiRequestMute((s) => ({ ...s, systemPrompt: m }))
              }
            />
          </div>
          <div
            className={`mt-1.5 ${
              geminiRequestMute.systemPrompt && !isLocked
                ? "pointer-events-none opacity-60"
                : ""
            }`}
          >
            <div className={connectedTargets.has("in:systemPrompt") ? "input-connected rounded-lg" : ""}>
              {connectedTargets.has("in:systemPrompt") && (
                <p className="text-[10px] text-gray-400 mb-1.5 leading-snug">
                  Upstream wire may override this at run — this field is kept as editable fallback /
                  reference.
                </p>
              )}
              <textarea
                rows={3}
                placeholder="Optional system prompt…"
                value={nodeData.inputs.systemPrompt ?? ""}
                onChange={(e) => updateInput("systemPrompt", e.target.value)}
                disabled={isLocked}
                className="nodrag nowheel w-full rounded-lg border border-gray-200/90 bg-[#F4F5F7] px-3 py-2 text-[13px] text-gray-600 placeholder:text-gray-400 outline-none focus:border-[#7C3AED]/55 focus:bg-[#FAFAFB] resize-y"
              />
            </div>
          </div>
        </div>

        {/* Image (Vision) */}
        <div className="relative py-1 overflow-visible">
          <Handle
            type="target"
            position={Position.Left}
            id="in:images"
            style={{
              background: "#F97316",
              border: "2px solid #F97316",
              width: 14,
              height: 14,
              left: -21,
              top: 18,
              transform: "translateY(-50%)",
              boxShadow: "0 0 8px rgba(249,115,22,0.314)",
            }}
          />
          <div
            className={`flex items-center gap-2 min-h-9 ${
              geminiRequestMute.images && !isLocked ? "opacity-60" : ""
            }`}
          >
            <span className="text-[12px] font-medium text-gray-500 w-[108px] shrink-0 leading-tight">
              Image (Vision)
            </span>
            <label
              className={`nodrag flex min-h-9 flex-1 min-w-0 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-[#F5F5F5] px-2 text-[12px] text-gray-400 ${
                isLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-[#7C3AED]"
              } ${geminiRequestMute.images && !isLocked ? "pointer-events-none" : ""}`}
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Upload image</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                disabled={isLocked}
                onChange={(e) => {
                  void handleVisionImagesFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            <AddToRequestToggle
              muted={!!geminiRequestMute.images}
              disabled={isLocked}
              onMutedChange={(m) =>
                setGeminiRequestMute((s) => ({ ...s, images: m }))
              }
            />
          </div>

          <div className="mt-2 space-y-2">
            {imageInboundEdges.length > 0 && connectedUpstreamUrls.length === 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-700">
                <span className="font-semibold">⚠</span>
                Connected — no upstream image URL resolved yet.
              </div>
            )}

            {connectedUpstreamUrls.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  From connections
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {connectedUpstreamUrls.map((url, i) => (
                    <img
                      key={`in:images-conn-${i}`}
                      src={url}
                      alt=""
                      className="w-full h-20 object-cover rounded-lg border border-gray-200 bg-[#F5F5F5]"
                    />
                  ))}
                </div>
              </div>
            )}

            {uploadedImageUrls.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  Uploaded
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {uploadedImageUrls.map((url, i) => (
                    <img
                      key={`in:images-uploaded-${i}`}
                      alt=""
                      src={url}
                      className="w-full h-20 object-cover rounded-lg border border-gray-200 bg-[#F5F5F5]"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Video */}
        <div className="relative py-1 overflow-visible">
          <Handle
            type="target"
            position={Position.Left}
            id="in:video"
            style={{
              background: "#10B981",
              border: "2px solid #10B981",
              width: 14,
              height: 14,
              left: -21,
              top: 18,
              transform: "translateY(-50%)",
              boxShadow: "0 0 8px rgba(16,185,129,0.314)",
            }}
          />
          <div
            className={`flex items-center gap-2 min-h-9 ${
              geminiRequestMute.video && !isLocked ? "opacity-60" : ""
            }`}
          >
            <span className="text-[12px] font-medium text-gray-500 w-[108px] shrink-0 leading-tight">
              Video
            </span>
            <label
              className={`nodrag flex min-h-9 flex-1 min-w-0 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-[#F5F5F5] px-2 text-[12px] text-gray-400 ${
                isLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-[#7C3AED]"
              } ${geminiRequestMute.video && !isLocked ? "pointer-events-none" : ""}`}
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Upload video</span>
              <input
                type="file"
                accept="video/*"
                className="sr-only"
                disabled={isLocked}
                onChange={(e) => {
                  void handleOptionalMediaUpload("video", e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            <AddToRequestToggle
              muted={!!geminiRequestMute.video}
              disabled={isLocked}
              onMutedChange={(m) =>
                setGeminiRequestMute((s) => ({ ...s, video: m }))
              }
            />
          </div>
        </div>

        {/* Audio */}
        <div className="relative py-1 overflow-visible">
          <Handle
            type="target"
            position={Position.Left}
            id="in:audio"
            style={{
              background: "#EC4899",
              border: "2px solid #EC4899",
              width: 14,
              height: 14,
              left: -21,
              top: 18,
              transform: "translateY(-50%)",
              boxShadow: "0 0 8px rgba(236,72,153,0.314)",
            }}
          />
          <div
            className={`flex items-center gap-2 min-h-9 ${
              geminiRequestMute.audio && !isLocked ? "opacity-60" : ""
            }`}
          >
            <span className="text-[12px] font-medium text-gray-500 w-[108px] shrink-0 leading-tight">
              Audio
            </span>
            <label
              className={`nodrag flex min-h-9 flex-1 min-w-0 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-[#F5F5F5] px-2 text-[12px] text-gray-400 ${
                isLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-[#7C3AED]"
              } ${geminiRequestMute.audio && !isLocked ? "pointer-events-none" : ""}`}
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Upload audio</span>
              <input
                type="file"
                accept="audio/*"
                className="sr-only"
                disabled={isLocked}
                onChange={(e) => {
                  void handleOptionalMediaUpload("audio", e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            <AddToRequestToggle
              muted={!!geminiRequestMute.audio}
              disabled={isLocked}
              onMutedChange={(m) =>
                setGeminiRequestMute((s) => ({ ...s, audio: m }))
              }
            />
          </div>
        </div>

        {/* File */}
        <div className="relative py-1 overflow-visible">
          <Handle
            type="target"
            position={Position.Left}
            id="in:file"
            style={{
              background: "#6366F1",
              border: "2px solid #6366F1",
              width: 14,
              height: 14,
              left: -21,
              top: 18,
              transform: "translateY(-50%)",
              boxShadow: "0 0 8px rgba(99,102,241,0.314)",
            }}
          />
          <div
            className={`flex items-center gap-2 min-h-9 ${
              geminiRequestMute.file && !isLocked ? "opacity-60" : ""
            }`}
          >
            <span className="text-[12px] font-medium text-gray-500 w-[108px] shrink-0 leading-tight">
              File
            </span>
            <label
              className={`nodrag flex min-h-9 flex-1 min-w-0 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-[#F5F5F5] px-2 text-[12px] text-gray-400 ${
                isLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-[#7C3AED]"
              } ${geminiRequestMute.file && !isLocked ? "pointer-events-none" : ""}`}
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Upload file</span>
              <input
                type="file"
                className="sr-only"
                disabled={isLocked}
                onChange={(e) => {
                  void handleOptionalMediaUpload("file", e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            <AddToRequestToggle
              muted={!!geminiRequestMute.file}
              disabled={isLocked}
              onMutedChange={(m) =>
                setGeminiRequestMute((s) => ({ ...s, file: m }))
              }
            />
          </div>
        </div>

        <div className="mt-1 border-t border-gray-100 pt-1">
          <button
            type="button"
            className="nodrag flex w-full items-center gap-1.5 py-2 text-left text-[12px] font-medium text-gray-600 hover:text-gray-800"
            onClick={() => setShowSettings(!showSettings)}
          >
            {showSettings ? (
              <ChevronDown className="w-4 h-4 shrink-0 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 shrink-0 text-gray-500" />
            )}
            Settings
          </button>

          {showSettings && (
            <div className="space-y-3 border-t border-gray-100 pt-3 mt-1">
              {/* Temperature */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-[12px] text-gray-500">Temperature</label>
                  <span className="text-[12px] font-medium text-gray-700">
                    {nodeData.inputs.temperature.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={nodeData.inputs.temperature}
                  onChange={(e) => updateInput("temperature", Number(e.target.value))}
                  disabled={isLocked}
                  className="nodrag nowheel w-full accent-[#7C3AED] disabled:opacity-50"
                />
              </div>

              {/* Max tokens */}
              <div>
                <label className="text-[12px] text-gray-500 block mb-1">Max Tokens</label>
                <input
                  type="number"
                  min="1"
                  max="8192"
                  value={nodeData.inputs.maxTokens}
                  onChange={(e) => updateInput("maxTokens", Number(e.target.value))}
                  disabled={isLocked}
                  className="nodrag nowheel w-full rounded-lg border border-gray-200 bg-[#F5F5F5] px-3 py-1.5 text-[13px] text-gray-900 outline-none focus:border-[#7C3AED] disabled:opacity-50"
                />
              </div>

              {/* Top-P */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-[12px] text-gray-500">Top-P</label>
                  <span className="text-[12px] font-medium text-gray-700">
                    {nodeData.inputs.topP.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={nodeData.inputs.topP}
                  onChange={(e) => updateInput("topP", Number(e.target.value))}
                  disabled={isLocked}
                  className="nodrag nowheel w-full accent-[#7C3AED] disabled:opacity-50"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-gray-100" />

      {/* Output */}
      <div className="px-4 py-4 overflow-visible">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Output
        </p>

        <div className="relative overflow-visible">
          <Handle
            type="source"
            position={Position.Right}
            id="out:response"
            style={{
              background: "#3B82F6",
              border: "2px solid #3B82F6",
              width: 14,
              height: 14,
              right: -21,
              boxShadow: "0 0 8px rgba(59,130,246,0.314)",
            }}
          />
          <label className="text-[12px] font-medium text-gray-500 mb-2 block">
            Response
          </label>

          {/* Inline response display */}
          <div className="nodrag nowheel rounded-lg border border-gray-200 bg-[#F5F5F5] p-3 max-h-[200px] overflow-y-auto cursor-text">
            {(isPreviewMode ? output : nodeData.output) ? (
              <p className="select-text text-[13px] text-gray-900 leading-relaxed whitespace-pre-wrap">
                {String(isPreviewMode ? output : nodeData.output)}
              </p>
            ) : (
              <p className="text-[12px] text-gray-400 text-center py-3">
                No output yet
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pb-3 flex items-center justify-end gap-1 text-[10px] text-gray-400">
        <Coins className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
        <span>{NODE_ESTIMATE_LABEL.gemini}</span>
      </div>
    </div>
  );
}
