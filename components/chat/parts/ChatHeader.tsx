"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { PinnedRunBadge } from "../ChatClientToolCards";
import { ChatCreditBadge } from "../ChatRunExtras";
import { MODE_META } from "../ChatWorkspace";
import type { ChatMode } from "../ChatWorkspace";

interface PinnedRun {
  orchestratorRunId: string;
  workflowId: string;
}

interface ChatHeaderProps {
  mode: ChatMode;
  isStreaming: boolean;
  pinnedRun: PinnedRun | null;
  completedRun: boolean;
  creditBalanceMicro: number | null;
  workflowId: string | null;
  activeChatTitle?: string;
  onStop: () => void;
  onOpenCanvasEdit: () => void;
  onNavigate: (href: string) => void;
}

export function ChatHeader({
  mode,
  isStreaming,
  pinnedRun,
  completedRun,
  creditBalanceMicro,
  workflowId,
  activeChatTitle,
  onStop,
  onOpenCanvasEdit,
  onNavigate,
}: ChatHeaderProps) {
  const meta = MODE_META[mode];

  return (
    <header className="border-b border-white/[0.05] px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        {mode === "helper" ? (
          <div className="flex items-center gap-4">
            <div className="flex w-[260px] gap-1 rounded-xl border border-white/[0.06] bg-black/40 p-1">
              {(Object.keys(MODE_META) as ChatMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onNavigate(`/chat/${m}`)}
                  className={cn(
                    "flex-1 rounded-lg py-1 text-[9px] font-bold uppercase tracking-wider transition-colors",
                    mode === m ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300",
                  )}
                >
                  {MODE_META[m].label}
                </button>
              ))}
            </div>
            <div className="hidden border-l border-white/10 pl-4 sm:block">
              <h2 className="text-sm font-semibold text-white">{meta.label}</h2>
              <p className="text-[10px] text-zinc-500">{meta.description}</p>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-sm font-semibold text-white">
              {activeChatTitle || meta.label}
            </h2>
            <p className="text-[10px] text-zinc-500">{meta.description}</p>
          </div>
        )}
        <div className="flex items-center gap-2">
          {mode === "brain" && workflowId && (
            <button
              type="button"
              onClick={() => onOpenCanvasEdit()}
              className="xl:hidden rounded-full border border-white/15 px-3 py-1 text-[10px] font-semibold text-zinc-200"
            >
              Edit canvas
            </button>
          )}
          {pinnedRun && (
            <PinnedRunBadge
              orchestratorRunId={pinnedRun.orchestratorRunId}
              active={!completedRun}
            />
          )}
          {creditBalanceMicro != null && (
            <ChatCreditBadge microcredits={creditBalanceMicro} />
          )}
          {isStreaming && (
            <button
              type="button"
              onClick={onStop}
              className="text-[10px] font-mono text-red-400 hover:text-red-300"
            >
              Stop
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
