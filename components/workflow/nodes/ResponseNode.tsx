"use client";

/**
 * @fileoverview Terminal aggregation node exposing named result connectors for workflow exports / responses.
 */

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Info } from "lucide-react";
import { useWorkflowStore, useNodePreview } from "@/store/workflow-store";
import BorderGlow from "@/components/ui/BorderGlow";
import { sanitizeError } from "@/lib/utils";
import { ResponseResultRow } from "./response/ResponseResultRow";

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
export default function ResponseNode({ id, data, selected = false }: NodeProps) {
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
    readOnly,
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
    <BorderGlow
      selected={selected}
      nodeColor="response"
      borderRadius={20}
      glowIntensity={0.85}
      fillOpacity={0.15}
    >
      <div
        className={`wf-node-card w-[380px] rounded-[1.25rem] bg-white/[0.03] border border-white/5 p-[5px] backdrop-blur-md transition-all duration-500 hover:bg-white/[0.05] hover:border-white/10 overflow-visible ${isDimmed ? "opacity-40 grayscale pointer-events-none" : ""}`}
        style={{ minWidth: 380, overflow: "visible" }}
      >
      <div
        className={`w-full h-full rounded-[calc(1.25rem-5px)] bg-[#0A0A0A] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-white/[0.08] transition-all duration-300 relative ${
          isExecuting ? "node-executing border-[#8B5CF6]" : ""
        }`}
        style={{ overflow: "visible" }}
      >
        <div className="absolute inset-0 pointer-events-none glass-noise z-0 rounded-[calc(1.25rem-5px)]" />
        
        {/* Header */}
        <div className="relative z-10 flex items-center gap-2 border-b border-white/5 px-4 py-3.5">
          <span className="cursor-grab select-none text-[15px] font-semibold tracking-wide text-zinc-100 uppercase font-mono leading-none">Response</span>
          <div className="group/tip relative ml-auto">
            <Info className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300 cursor-default transition-colors" />
            <div className="pointer-events-none absolute right-0 top-full z-[9999] mt-2 hidden w-max max-w-[260px] rounded-lg border border-white/10 bg-[#0A0A0C]/95 p-3 text-[11px] text-zinc-400 shadow-2xl group-hover/tip:block backdrop-blur-md">
              Connect node outputs here to define what your workflow returns.
            </div>
          </div>
        </div>

        {/* Error */}
        {nodeError && nodeError !== "Skipped due to upstream failure" && (
          <div className="relative z-10 mx-4 mt-3 px-3.5 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-[12px] text-red-400 font-mono">
            {sanitizeError(nodeError)}
          </div>
        )}

        {/* Body */}
        <div className="relative z-10 p-4 space-y-4 overflow-visible">
          {/* Result slots */}
          <div className="space-y-4">
            {results.map((result) => (
              <ResponseResultRow
                key={result.id}
                id={id}
                result={result}
                edges={edges}
                nodes={nodes}
                executingNodeIds={executingNodeIds}
                nodeOutputs={nodeOutputs}
                nodeErrors={nodeErrors}
                previewNodeOutputs={previewNodeOutputs}
                previewNodeErrors={previewNodeErrors}
                isPreviewMode={isPreviewMode}
                readOnly={readOnly}
                updateResultLabel={updateResultLabel}
                removeResult={removeResult}
              />
            ))}
            
            {/* Default drop zone for new connections */}
            {!readOnly && (
              <div className="relative overflow-visible mt-2">
                <div
                  className="absolute flex items-center"
                  style={{ left: "-21px", top: "14px", transform: "translateY(-50%)", zIndex: 50 }}
                >
                  <Handle
                    type="target"
                    position={Position.Left}
                    id="result"
                    className="!relative !transform-none target connectable connectablestart connectableend connectionindicator"
                    style={{
                      background: "#4b5563",
                      border: "2px solid rgba(75, 85, 99, 0.4)",
                      width: 14,
                      height: 14,
                      cursor: "crosshair",
                      ["--handle-color" as any]: "#4b5563",
                    }}
                  />
                </div>
                <div className="text-[11px] text-zinc-500 italic pl-2 py-1 font-mono">Drop edge here to add field...</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </BorderGlow>
  );
}
