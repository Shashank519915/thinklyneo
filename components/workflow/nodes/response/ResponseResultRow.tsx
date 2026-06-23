"use client";

import React, { useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { Pencil, Trash2, ExternalLink } from "lucide-react";
import { classifyMediaUrl } from "@/lib/utils";

interface ResponseResult {
  id: string;
  label: string;
  value: string | null;
}

interface ResponseResultRowProps {
  id: string; // Node ID
  result: ResponseResult;
  edges: any[];
  nodes: any[];
  executingNodeIds: string[];
  nodeOutputs: Record<string, any>;
  nodeErrors: Record<string, any>;
  previewNodeOutputs: Record<string, any>;
  previewNodeErrors: Record<string, any>;
  isPreviewMode: boolean;
  readOnly: boolean;
  updateResultLabel: (resultId: string, label: string) => void;
  removeResult: (resultId: string) => void;
}

export function ResponseResultRow({
  id,
  result,
  edges,
  nodes,
  executingNodeIds,
  nodeOutputs,
  nodeErrors,
  previewNodeOutputs,
  previewNodeErrors,
  isPreviewMode,
  readOnly,
  updateResultLabel,
  removeResult,
}: ResponseResultRowProps) {
  const [imageError, setImageError] = useState(false);

  const incomingEdge = (edges ?? []).find(
    (e) => e.target === id && e.targetHandle === result.id
  );
  const sourceNodeId = incomingEdge?.source;
  const sourceNode = sourceNodeId
    ? (nodes ?? []).find((n) => n.id === sourceNodeId)
    : null;

  let parentExecuting = false;
  let parentError: string | null = null;
  let parentOutput: unknown = null;

  if (sourceNodeId && sourceNode) {
    parentExecuting = isPreviewMode
      ? false
      : executingNodeIds.includes(sourceNodeId);
    if (isPreviewMode) {
      parentOutput = previewNodeOutputs[sourceNodeId] ?? null;
      parentError = previewNodeErrors[sourceNodeId] ?? null;
    } else {
      parentOutput =
        nodeOutputs[sourceNodeId] ??
        (sourceNode.data as any)?.output ??
        null;
      parentError =
        nodeErrors[sourceNodeId] ??
        (sourceNode.data as any)?.error ??
        null;
    }
  }

  const sourceHandleKey =
    incomingEdge?.sourceHandle?.replace(/^out:/, "") ?? null;
  let parentOutputValue: unknown = null;
  if (parentOutput != null) {
    if (typeof parentOutput === "object" && !Array.isArray(parentOutput)) {
      const obj = parentOutput as Record<string, unknown>;
      if (sourceHandleKey && sourceHandleKey in obj) {
        parentOutputValue = obj[sourceHandleKey];
      } else if (result.id in obj) {
        parentOutputValue = obj[result.id];
      } else {
        const objKeys = Object.keys(obj);
        parentOutputValue = objKeys.length === 1 ? obj[objKeys[0]] : obj;
      }
    } else {
      parentOutputValue = parentOutput;
    }
  }

  const outputValue = parentOutputValue ?? result.value;
  const media =
    typeof outputValue === "string" ? classifyMediaUrl(outputValue) : null;

  return (
    <div className="relative p-1 bg-white/[0.015] border border-white/5 rounded-xl hover:border-white/10 transition-all duration-300">
      <div
        className="absolute flex items-center"
        style={{
          left: "-21px",
          top: "20px",
          transform: "translateY(-50%)",
          zIndex: 50,
        }}
      >
        <Handle
          type="target"
          position={Position.Left}
          id={result.id}
          className="!relative !transform-none target connectable connectablestart connectableend connectionindicator"
          style={{
            background: "#6366F1",
            border: "2px solid rgba(99, 102, 241, 0.4)",
            width: 14,
            height: 14,
            cursor: "crosshair",
            ["--handle-color" as any]: "#6366F1",
          }}
        />
      </div>

      <div className="bg-[#0A0A0C]/60 p-3 rounded-[9px] space-y-3">
        {/* Result header */}
        <div className="flex items-center justify-between h-5">
          <span
            className="truncate text-[12px] font-semibold tracking-wide text-zinc-200"
            title={result.label}
          >
            {result.label}
          </span>
          {!readOnly && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="nodrag flex-shrink-0 rounded p-1 text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-all active:scale-95 border-0"
                title="Rename"
                onClick={() => {
                  const newLabel = prompt("Rename result slot:", result.label);
                  if (newLabel?.trim())
                    updateResultLabel(result.id, newLabel.trim());
                }}
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                type="button"
                className="nodrag flex-shrink-0 rounded p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-95 border-0"
                title="Disconnect"
                onClick={() => removeResult(result.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Output display */}
        <div
          className={`nodrag nowheel rounded-lg border p-3 max-h-48 overflow-y-auto cursor-text relative transition-colors ${
            parentError
              ? "border-red-500/20 bg-red-500/5 text-red-400 font-mono text-[11px]"
              : "border-white/5 bg-[#050507] text-zinc-300"
          }`}
        >
          {parentExecuting ? (
            <div className="flex min-h-[3rem] items-center justify-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8B5CF6] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8B5CF6]"></span>
              </span>
              <span className="text-[11px] text-[#8B5CF6] font-semibold tracking-wide font-mono uppercase">
                Running upstream...
              </span>
            </div>
          ) : parentError ? (
            <div className="py-1">
              <p className="leading-relaxed">⚠️ Upstream error: {parentError}</p>
            </div>
          ) : outputValue ? (
            media?.kind === "image" && !imageError ? (
              <div className="flex flex-col gap-2">
                <img
                  src={media.url}
                  alt={result.label}
                  className="w-full max-h-36 object-contain rounded bg-white/[0.02]"
                  onError={() => setImageError(true)}
                />
              </div>
            ) : media?.kind === "image" || imageError ? (
              <div>
                <a
                  href={media?.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline break-all transition-colors font-mono"
                >
                  {media?.url}
                </a>
              </div>
            ) : media?.kind === "video" ? (
              <video
                src={media.url}
                controls
                preload="metadata"
                className="nodrag w-full max-h-40 rounded bg-black/45"
              />
            ) : media?.kind === "audio" ? (
              <audio
                src={media.url}
                controls
                preload="metadata"
                className="nodrag w-full"
              />
            ) : media?.kind === "file" ? (
              <a
                href={media.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline break-all transition-colors font-mono"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                {media.url.split("/").pop() || "Download file"}
              </a>
            ) : typeof outputValue === "string" ? (
              <p className="select-text text-[12px] text-zinc-300 leading-relaxed w-full whitespace-pre-wrap">
                {outputValue}
              </p>
            ) : (
              <p className="select-text text-[12px] text-zinc-300 leading-relaxed w-full font-mono">
                {JSON.stringify(outputValue)}
              </p>
            )
          ) : (
            <div className="flex min-h-[3rem] items-center justify-center">
              <span className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider">
                No output yet
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
