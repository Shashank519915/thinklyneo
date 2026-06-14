"use client";

import type { PlaygroundOutputSection } from "@/lib/playground-output";
import { PlaygroundOutputMedia } from "@/components/playground/PlaygroundOutputMedia";
import { CheckCircle2 } from "lucide-react";

export function RunCompletionPanel({
  sections,
  orchestratorRunId,
}: {
  sections: PlaygroundOutputSection[];
  orchestratorRunId?: string;
}) {
  if (sections.length === 0) return null;

  return (
    <div className="space-y-3 rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.08] to-transparent p-4">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-200/90">
          Run complete
        </span>
        {orchestratorRunId && (
          <span className="text-[10px] font-mono text-zinc-500">{orchestratorRunId.slice(0, 8)}…</span>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {sections.map((section) => (
          <div
            key={section.nodeId}
            className="rounded-lg border border-white/[0.06] bg-black/40 p-2"
          >
            <p className="mb-1 text-[10px] font-mono text-zinc-500">{section.label}</p>
            <PlaygroundOutputMedia section={section} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatCreditBadge({ microcredits }: { microcredits: number }) {
  const millions = (microcredits / 1_000_000).toFixed(2);
  return (
    <span
      className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-mono text-zinc-400"
      title="Thinkly credit balance"
    >
      {millions}M credits
    </span>
  );
}

export function WorkflowContextNote({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#12121a]/80 px-4 py-3 text-xs leading-relaxed text-zinc-300">
      <p className="mb-1 text-[10px] font-mono uppercase tracking-widest text-purple-300/80">
        Canvas sync
      </p>
      <pre className="whitespace-pre-wrap font-sans text-[12px] text-zinc-300">{text}</pre>
    </div>
  );
}
