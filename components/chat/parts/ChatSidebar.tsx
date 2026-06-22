"use client";

import React from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatRecord } from "@/lib/chat/types";
import { MODE_META } from "../ChatWorkspace";
import type { ChatMode } from "../ChatWorkspace";

interface ChatSidebarProps {
  mode: ChatMode;
  chats: ChatRecord[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onCreateThinklyChat: () => void;
  onNavigate: (href: string) => void;
}

export function ChatSidebar({
  mode,
  chats,
  activeChatId,
  onSelectChat,
  onCreateThinklyChat,
  onNavigate,
}: ChatSidebarProps) {
  if (mode === "helper") return null;

  const modeChats = chats.filter((c) => c.kind === mode);

  return (
    <aside className="flex w-full flex-col border-r border-white/[0.05] bg-[#08080A]/60 lg:w-[280px]">
      <div className="border-b border-white/[0.05] p-3">
        <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-black/40 p-1">
          {(Object.keys(MODE_META) as ChatMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onNavigate(`/chat/${m}`)}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors",
                mode === m ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              {MODE_META[m].label}
            </button>
          ))}
        </div>
        {mode === "thinkly" && (
          <button
            type="button"
            onClick={onCreateThinklyChat}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 py-2 text-xs text-zinc-300 hover:bg-white/5"
          >
            <Plus className="h-3.5 w-3.5" />
            New plan
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {modeChats.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelectChat(c.id)}
            className={cn(
              "w-full border-b border-white/[0.03] px-3 py-3 text-left text-sm",
              activeChatId === c.id ? "bg-white/[0.06]" : "hover:bg-white/[0.03]",
            )}
          >
            <div className="truncate font-medium text-zinc-200">{c.title ?? "Untitled"}</div>
            <div className="truncate text-[10px] text-zinc-500">{c.kind}</div>
          </button>
        ))}
      </div>
    </aside>
  );
}
