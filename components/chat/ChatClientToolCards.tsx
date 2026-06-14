"use client";

import { ExternalLink, Play, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function EditHandoffCard({
  workflowId,
  label,
  onEdit,
  onDismiss,
  pending,
}: {
  workflowId: string;
  label?: string;
  onEdit: () => void;
  onDismiss: () => void;
  pending?: boolean;
}) {
  return (
    <div
      className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#12121a] to-[#0a0a0c] p-4 shadow-[0_16px_40px_-20px_rgba(0,0,0,0.8)]"
    >
      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-purple-300/80">
        Canvas handoff
      </p>
      <p className="mt-2 text-sm font-medium text-zinc-100">
        {label ?? "Workflow ready for manual edits"}
      </p>
      <p className="mt-1 text-xs text-zinc-500 font-mono truncate">{workflowId}</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onEdit}
          disabled={pending}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white py-2 text-xs font-bold text-black transition-transform hover:bg-zinc-100 active:scale-[0.97] disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ExternalLink className="h-3.5 w-3.5" />
          )}
          Edit in canvas
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full border border-white/10 px-3 py-2 text-xs text-zinc-400 hover:bg-white/5"
        >
          Later
        </button>
      </div>
    </div>
  );
}

export function PinnedRunBadge({
  orchestratorRunId,
  active,
}: {
  orchestratorRunId: string;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-mono uppercase tracking-wider",
        active
          ? "border-purple-500/40 bg-purple-500/10 text-purple-200"
          : "border-white/10 bg-white/5 text-zinc-400",
      )}
    >
      <Play className="h-3 w-3" />
      Run {orchestratorRunId.slice(0, 8)}
    </div>
  );
}
