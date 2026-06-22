"use client";

import React from "react";
import { BlueprintSummary } from "../BlueprintFlowPreview";
import { WorkflowCanvasPreview } from "../WorkflowCanvasPreview";
import type { Blueprint } from "@/lib/chat/types";
import type { ChatMode } from "../ChatWorkspace";

interface BlueprintGraph {
  nodes: Parameters<typeof WorkflowCanvasPreview>[0]["nodes"];
  edges: Parameters<typeof WorkflowCanvasPreview>[0]["edges"];
}

interface ChatContextSidebarProps {
  mode: ChatMode;
  activeBlueprint: Blueprint | null;
  blueprintGraph: BlueprintGraph | null;
  workflowId: string | null;
  hasLiveRun: boolean;
  onActivateBlueprint: () => void;
  onOpenCanvasEdit: () => void;
}

export function ChatContextSidebar({
  mode,
  activeBlueprint,
  blueprintGraph,
  workflowId,
  hasLiveRun,
  onActivateBlueprint,
  onOpenCanvasEdit,
}: ChatContextSidebarProps) {
  if (mode === "helper") return null;

  return (
    <aside className="hidden min-h-0 w-full flex-col border-l border-white/[0.05] bg-[#060608]/80 xl:flex xl:w-[min(100%,360px)]">
      <div className="border-b border-white/[0.05] px-4 py-3">
        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
          Context
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
        {activeBlueprint && blueprintGraph && !hasLiveRun && (
          <>
            <BlueprintSummary blueprint={activeBlueprint} />
            <WorkflowCanvasPreview
              nodes={blueprintGraph.nodes}
              edges={blueprintGraph.edges}
              workflowName={activeBlueprint.title ?? "Blueprint"}
            />
            {mode === "thinkly" && activeBlueprint.confidence !== "draft" && (
              <button
                type="button"
                onClick={onActivateBlueprint}
                className="w-full rounded-full bg-white py-2 text-xs font-bold text-black hover:bg-zinc-100"
              >
                Activate Blueprint → Brain
              </button>
            )}
          </>
        )}
        {mode === "brain" && workflowId && (
          <button
            type="button"
            onClick={onOpenCanvasEdit}
            className="w-full rounded-full border border-white/15 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/5"
          >
            Edit workflow in canvas
          </button>
        )}
      </div>
    </aside>
  );
}
