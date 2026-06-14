"use client";

import { Workflow } from "lucide-react";
import { cn } from "@/lib/utils";

type CanvasWorkflowIslandProps = {
  workflowName?: string;
};

/** Collapsed island on the workflow canvas — workflow title chip (not dashboard Thinkly). */
export function CanvasWorkflowIsland({ workflowName }: CanvasWorkflowIslandProps) {
  const label = workflowName?.trim() || "Untitled workflow";

  return (
    <div
      data-canvas-island-chip
      className={cn(
        "flex items-center gap-3 rounded-[24px] border border-white/[0.08] bg-[#0A0A0A] px-4 py-2.5",
        "shadow-[0_24px_60px_-10px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.06)]",
      )}
      style={{ width: "min(100%, 360px)", height: 48 }}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-500/15 text-purple-400">
        <Workflow className="h-3.5 w-3.5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold text-zinc-100">{label}</p>
        <p className="truncate text-[9px] font-mono uppercase tracking-widest text-zinc-500">
          Canvas editor
        </p>
      </div>
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
    </div>
  );
}
