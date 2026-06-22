"use client";

import React from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMode } from "../ChatWorkspace";
import { MODE_META } from "../ChatWorkspace";

interface ChatInputProps {
  mode: ChatMode;
  draft: string;
  isStreaming: boolean;
  activeChatId: string | null;
  loadingChats: boolean;
  onDraftChange: (value: string) => void;
  onSend: () => void;
}

export function ChatInput({
  mode,
  draft,
  isStreaming,
  activeChatId,
  loadingChats,
  onDraftChange,
  onSend,
}: ChatInputProps) {
  const meta = MODE_META[mode];

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <footer className="border-t border-white/[0.05] px-4 py-3">
      <div className="mx-auto flex max-w-2xl items-end gap-2">
        <textarea
          rows={1}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${meta.label}…`}
          disabled={!activeChatId || loadingChats}
          className="min-h-[40px] flex-1 resize-none rounded-[20px] border border-white/8 bg-[#1C1C1E]/90 px-4 py-2.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple-500/35"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!draft.trim() || isStreaming || !activeChatId}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full transition-all",
            draft.trim() && !isStreaming
              ? "bg-gradient-to-br from-[#5E5CE6] to-[#7C3AED] text-white"
              : "border border-white/5 bg-white/5 text-zinc-600",
          )}
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
    </footer>
  );
}
