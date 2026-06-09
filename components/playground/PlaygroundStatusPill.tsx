"use client";

import { cn } from "@/lib/utils";

type PlaygroundStatus = "idle" | "running" | "success" | "failed";

const STATUS_STYLES: Record<
  PlaygroundStatus,
  { dot: string; shell: string; label: string }
> = {
  idle: {
    dot: "bg-zinc-500",
    shell: "border-white/10 bg-white/[0.03] text-zinc-400",
    label: "Idle",
  },
  running: {
    dot: "bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)] animate-pulse",
    shell: "border-blue-400/25 bg-blue-500/10 text-blue-300",
    label: "Running",
  },
  success: {
    dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]",
    shell: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
    label: "Completed",
  },
  failed: {
    dot: "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]",
    shell: "border-red-400/25 bg-red-500/10 text-red-300",
    label: "Failed",
  },
};

export function PlaygroundStatusPill({ status }: { status: PlaygroundStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide",
        s.shell,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} aria-hidden />
      {s.label}
    </span>
  );
}
