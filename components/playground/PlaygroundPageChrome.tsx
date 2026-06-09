"use client";

import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PlaygroundTabId = "playground" | "api" | "workflow";

type PlaygroundPageChromeProps = {
  workflowName: string;
  activeTab: PlaygroundTabId;
  onTabChange: (tab: PlaygroundTabId) => void;
  onBack: () => void;
  children: ReactNode;
};

export function PlaygroundPageChrome({
  workflowName,
  activeTab,
  onTabChange,
  onBack,
  children,
}: PlaygroundPageChromeProps) {
  return (
    <div className="z-10 flex min-h-0 flex-1 flex-col px-3 pb-3 pt-3">
      <div
        data-workspace-card
        className="relative flex h-[calc(100vh-1.5rem)] min-h-0 flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.02] p-2 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.8)] will-change-transform"
      >
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[calc(1.75rem-8px)] border border-white/5 bg-[#0A0A0C]/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
          <div className="pointer-events-none absolute inset-0 z-0 glass-noise" aria-hidden />

          {/* Title bar — center kept clear for Dynamic Island */}
          <div className="group/mac relative z-10 flex h-12 shrink-0 items-center border-b border-white/[0.05] px-5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onBack}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/8 bg-white/[0.03] text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200 active:scale-[0.97]"
                title="Back to Flow"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1" />
            <span className="max-w-[40%] truncate font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600">
              {workflowName || "Playground"}
            </span>
          </div>

          <div className="relative z-10 flex shrink-0 items-center gap-0.5 border-b border-white/[0.05] px-4">
            {(["playground", "api", "workflow"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => onTabChange(tab)}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2.5 text-sm font-medium capitalize transition-colors",
                  activeTab === tab
                    ? "border-purple-500 text-zinc-100"
                    : "border-transparent text-zinc-500 hover:text-zinc-300",
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative z-10 min-h-0 flex-1 overflow-hidden">{children}</div>
        </div>
      </div>
    </div>
  );
}
