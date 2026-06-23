"use client";

import { Cpu, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type BrainEditIslandProps = {
  workflowName?: string;
  synced?: boolean;
  onDoneEditing: () => void;
};

/** Collapsed island state while user edits workflow on canvas (Brain handoff). */
export function BrainEditIsland({
  workflowName,
  synced = false,
  morphExpanded = false,
  onDoneEditing,
}: BrainEditIslandProps & { morphExpanded?: boolean }) {
  return (
    <div
      data-brain-island-chip
      className={cn(
        "flex items-center gap-3 rounded-[24px] border border-purple-500/35 bg-[#0A0A0A] px-4 py-2.5 shadow-[0_24px_60px_-10px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.06)]",
        morphExpanded ? "h-full w-full rounded-[28px]" : "",
      )}
      style={
        morphExpanded ? undefined : { width: "min(100%, 320px)", height: 48 }
      }
    >
      {morphExpanded ? (
        <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-sm font-semibold text-zinc-100">Brain session</p>
          <p className="text-xs text-zinc-500">{workflowName ?? "Workflow"}</p>
          <p className="text-[10px] font-mono uppercase tracking-widest text-purple-300/70">
            Morphing to canvas…
          </p>
        </div>
      ) : (
        <>
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-500" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold text-zinc-100">Editing in canvas</p>
            <p className="truncate text-[9px] text-zinc-500">
              {workflowName ?? "Workflow"}
              {synced ? " · synced" : ""}
            </p>
          </div>
          {synced && (
            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
          )}
          <button
            type="button"
            onClick={onDoneEditing}
            className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-black transition-transform duration-200 hover:bg-zinc-100 active:scale-[0.96]"
          >
            I&apos;ve edited
          </button>
        </>
      )}
    </div>
  );
}

/** Expanded brain status chip (optional future). */
export function BrainEditIslandExpanded() {
  return (
    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-purple-300/80">
      <Cpu className="h-3 w-3" />
      Brain session
    </div>
  );
}
