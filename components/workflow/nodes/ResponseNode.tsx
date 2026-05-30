"use client";

/**
 * @fileoverview Terminal aggregation node exposing named result connectors for workflow exports / responses.
 */

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { FileOutput, Info, Pencil, Trash2 } from "lucide-react";
import { useWorkflowStore, useNodePreview } from "@/store/workflow-store";
import { sanitizeError } from "@/lib/utils";

interface ResponseResult {
  id: string;
  label: string;
  value: string | null;
}

interface ResponseData {
  label: string;
  results: ResponseResult[];
}

/** Collects inbound edges into labeled result slots surfaced to execution + preview overlays. */
export default function ResponseNode({ id, data }: NodeProps) {
  const nodeData = data as unknown as ResponseData;
  const {
    updateNodeData,
    edges,
    nodes,
    executingNodeIds,
    nodeOutputs,
    nodeErrors,
    previewNodeOutputs,
    previewNodeErrors,
  } = useWorkflowStore();
  const { isPreviewMode, isDimmed, isExecuting, output, error } = useNodePreview(id);
  const nodeError = error as string | null;
  const nodeOutput = output;

  const results: ResponseResult[] = nodeData.results ?? [];

  const updateResultLabel = (resultId: string, label: string) => {
    updateNodeData(id, {
      results: results.map((r) => (r.id === resultId ? { ...r, label } : r)),
    } as Partial<ResponseData>);
  };

  const removeResult = (resultId: string) => {
    updateNodeData(id, {
      results: results.filter((r) => r.id !== resultId),
    } as Partial<ResponseData>);
  };

  return (
    <div
      className={`w-[380px] rounded-xl border bg-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] border-gray-200 overflow-visible transition-all ${
        isExecuting ? "node-executing" : ""
      } ${isDimmed ? "opacity-40 grayscale pointer-events-none" : ""}`}
      style={{ minWidth: 380 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7C3AED]/10 text-[#7C3AED] flex-shrink-0">
          <FileOutput className="w-4 h-4" />
        </div>
        <span className="text-[14px] font-semibold text-gray-900">Response</span>
        <div className="group/tip relative">
          <Info className="w-3.5 h-3.5 text-gray-400 cursor-default" />
          <div className="pointer-events-none absolute left-1/2 top-full z-[9999] mt-1.5 hidden w-max max-w-[240px] -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-700 shadow-lg group-hover/tip:block">
            Connect node outputs here to define what your workflow returns.
          </div>
        </div>
      </div>

      {/* Error */}
      {nodeError && nodeError !== "Skipped due to upstream failure" && (
        <div className="mx-4 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-600">
          {sanitizeError(nodeError)}
        </div>
      )}

      {/* Body */}
      <div className="p-4 space-y-3 overflow-visible">
        {/* Result slots */}
        <div className="space-y-3">
          {results.map((result) => {
            // Find parent node from connected edge to dynamically resolve outputs/errors
            const incomingEdge = (edges ?? []).find((e) => e.target === id && e.targetHandle === result.id);
            const sourceNodeId = incomingEdge?.source;
            const sourceNode = sourceNodeId ? (nodes ?? []).find((n) => n.id === sourceNodeId) : null;

            let parentExecuting = false;
            let parentError: string | null = null;
            let parentOutput: unknown = null;

            if (sourceNodeId && sourceNode) {
              parentExecuting = isPreviewMode ? false : executingNodeIds.includes(sourceNodeId);
              if (isPreviewMode) {
                parentOutput = previewNodeOutputs[sourceNodeId] ?? null;
                parentError = previewNodeErrors[sourceNodeId] ?? null;
              } else {
                parentOutput = nodeOutputs[sourceNodeId] ?? (sourceNode.data as any)?.output ?? null;
                parentError = nodeErrors[sourceNodeId] ?? (sourceNode.data as any)?.error ?? null;
              }
            }

            // Extract string response / outputUrl from parent output if it's an object
            const parentOutputValue = parentOutput
              ? (typeof parentOutput === "object" && !Array.isArray(parentOutput)
                  ? (parentOutput as Record<string, unknown>)[result.id] ?? parentOutput
                  : parentOutput)
              : null;

            const outputValue = parentOutputValue ?? result.value;
            const isImage = typeof outputValue === "string" && outputValue.startsWith("http");

            return (
              <div
                key={result.id}
                className="relative space-y-2 rounded-lg bg-[#F5F5F5] p-3"
              >
                <Handle
                  type="target"
                  position={Position.Left}
                  id={result.id}
                  style={{
                    background: "#6366F1",
                    border: "2px solid #6366F1",
                    width: 14,
                    height: 14,
                    left: -29,
                    boxShadow: "0 0 8px rgba(99,102,241,0.314)",
                  }}
                />
                {/* Result header */}
                <div className="flex items-center gap-1.5">
                  <span
                    className="min-w-0 flex-1 truncate text-[13px] text-gray-900"
                    title={result.label}
                  >
                    {result.label}
                  </span>
                  <button
                    className="nodrag flex-shrink-0 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                    title="Rename"
                    onClick={() => {
                      const newLabel = prompt("Rename result slot:", result.label);
                      if (newLabel?.trim()) updateResultLabel(result.id, newLabel.trim());
                    }}
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    className="nodrag flex-shrink-0 rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-500"
                    title="Disconnect"
                    onClick={() => removeResult(result.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Output display */}
                <div className={`nodrag nowheel rounded border p-2 max-h-48 overflow-y-auto cursor-text relative ${
                  parentError ? "border-red-200 bg-red-50/30" : "border-gray-200 bg-white"
                }`}>
                  {parentExecuting ? (
                    <div className="flex min-h-10 items-center justify-center gap-2">
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7C3AED] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7C3AED]"></span>
                      </span>
                      <span className="text-[12px] text-[#7C3AED] font-medium">Running upstream...</span>
                    </div>
                  ) : parentError ? (
                    <div className="py-1">
                      <p className="text-[12px] text-red-600 font-medium leading-relaxed">
                        ⚠️ Upstream error: {parentError}
                      </p>
                    </div>
                  ) : outputValue ? (
                    isImage ? (
                      <div className="flex flex-col gap-2">
                        <img 
                          src={outputValue as string} 
                          alt={result.label}
                          className="w-full max-h-36 object-contain rounded bg-gray-50"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const linkDiv = e.currentTarget.nextElementSibling as HTMLElement;
                            if (linkDiv) linkDiv.style.display = 'block';
                          }}
                        />
                        <div style={{ display: 'none' }}>
                          <a href={outputValue as string} target="_blank" rel="noreferrer" className="text-[12px] text-blue-500 hover:underline break-all">
                            {outputValue as string}
                          </a>
                        </div>
                      </div>
                    ) : typeof outputValue === "string" ? (
                      <p className="select-text text-[12px] text-gray-800 leading-relaxed w-full whitespace-pre-wrap">
                        {outputValue}
                      </p>
                    ) : (
                      <p className="select-text text-[12px] text-gray-800 leading-relaxed w-full">
                        {JSON.stringify(outputValue)}
                      </p>
                    )
                  ) : (
                    <div className="flex min-h-10 items-center justify-center">
                      <span className="text-[12px] text-gray-400">No output yet</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {/* Default drop zone for new connections */}
          <div className="relative overflow-visible mt-3">
            <Handle
              type="target"
              position={Position.Left}
              id="result"
              style={{
                background: "#E5E7EB",
                border: "2px solid #9CA3AF",
                width: 14,
                height: 14,
                left: -21,
                top: 10,
              }}
            />
            <div className="text-[12px] text-gray-500 italic pl-2 py-1">Drop edge here to add field...</div>
          </div>
        </div>
      </div>
    </div>
  );
}
