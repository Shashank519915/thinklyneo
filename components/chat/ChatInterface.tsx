"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ChevronLeft,
  ImagePlus,
  Mic,
  MoreHorizontal,
  Phone,
  Search,
  Sparkles,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  time: string;
};

type Conversation = {
  id: string;
  name: string;
  preview: string;
  time: string;
  unread?: number;
  online?: boolean;
  accent: "purple" | "emerald" | "blue";
};

const CONVERSATIONS: Conversation[] = [
  {
    id: "thinkly",
    name: "Thinkly",
    preview: "I can help wire your next flow.",
    time: "Now",
    online: true,
    accent: "purple",
  },
  {
    id: "flow-builder",
    name: "Flow Builder",
    preview: "3 nodes ready to connect.",
    time: "2m",
    accent: "emerald",
  },
  {
    id: "node-helper",
    name: "Node Helper",
    preview: "GPT Image 2 accepts up to 4 refs.",
    time: "1h",
    unread: 2,
    accent: "blue",
  },
];

const SEED_MESSAGES: Record<string, ChatMessage[]> = {
  thinkly: [
    {
      id: "m1",
      role: "assistant",
      text: "Hey — I'm Thinkly. Ask me to draft a flow, explain a node, or tune your pipeline.",
      time: "9:41 AM",
    },
    {
      id: "m2",
      role: "user",
      text: "Can you sketch a product marketing post workflow?",
      time: "9:42 AM",
    },
    {
      id: "m3",
      role: "assistant",
      text: "Absolutely. I'd start with an image input, run GPT Image 2 for variants, then a copy node for captions. Want me to scaffold that on your canvas?",
      time: "9:42 AM",
    },
  ],
  "flow-builder": [
    {
      id: "f1",
      role: "assistant",
      text: "Your last run left 3 nodes unconnected near the output.",
      time: "Yesterday",
    },
  ],
  "node-helper": [
    {
      id: "n1",
      role: "assistant",
      text: "Kling v3 supports 5s and 10s clips. Aspect ratio locks after the first frame.",
      time: "Yesterday",
    },
  ],
};

const ACCENT_RING: Record<Conversation["accent"], string> = {
  purple: "from-purple-500/30 to-indigo-600/20 ring-purple-500/25",
  emerald: "from-emerald-500/30 to-teal-600/20 ring-emerald-500/25",
  blue: "from-blue-500/30 to-cyan-600/20 ring-blue-500/25",
};

const ACCENT_DOT: Record<Conversation["accent"], string> = {
  purple: "bg-purple-400",
  emerald: "bg-emerald-400",
  blue: "bg-blue-400",
};

function Avatar({
  name,
  accent,
  size = "md",
}: {
  name: string;
  accent: Conversation["accent"];
  size?: "sm" | "md";
}) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white ring-1",
        ACCENT_RING[accent],
        size === "sm" ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm",
      )}
    >
      {initial}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="chat-bubble-enter flex items-end gap-2">
      <Avatar name="Thinkly" accent="purple" size="sm" />
      <div className="chat-bubble-received flex items-center gap-1 rounded-[20px] rounded-bl-md border border-white/5 bg-[#1C1C1E]/90 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <span className="chat-typing-dot" />
        <span className="chat-typing-dot chat-typing-dot-2" />
        <span className="chat-typing-dot chat-typing-dot-3" />
      </div>
    </div>
  );
}

export default function ChatInterface() {
  const [activeId, setActiveId] = useState("thinkly");
  const [messages, setMessages] = useState<ChatMessage[]>(SEED_MESSAGES.thinkly);
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const active = CONVERSATIONS.find((c) => c.id === activeId) ?? CONVERSATIONS[0];

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isTyping]);

  const selectConversation = (id: string) => {
    setActiveId(id);
    setMessages(SEED_MESSAGES[id] ?? []);
    setIsTyping(false);
    setMobileShowThread(true);
  };

  const sendMessage = () => {
    const text = draft.trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
      time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setDraft("");
    setIsTyping(true);

    window.setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: "Got it. I'll keep this thread ready — we can wire the real assistant here next.",
          time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        },
      ]);
    }, 1400);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-full min-h-0 animate-fade-slide-up">
      {/* Conversation list — iMessage sidebar */}
      <aside
        className={cn(
          "flex w-full flex-col border-r border-white/[0.05] bg-[#08080A]/60 md:w-[min(100%,300px)] md:min-w-[260px]",
          mobileShowThread ? "hidden md:flex" : "flex",
        )}
      >
        <div className="border-b border-white/[0.05] px-4 pb-3 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-white">Messages</h2>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/5 bg-white/5 text-zinc-400 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/10 hover:text-white active:scale-[0.94]"
              title="Compose"
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            </button>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search"
              className="h-9 w-full rounded-xl border border-white/5 bg-[#0C0C0E]/80 pl-9 pr-3 text-xs text-white outline-none transition-all duration-300 placeholder:text-zinc-500 focus:border-purple-500/30 focus:shadow-[0_0_12px_rgba(139,92,246,0.12)]"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
          {CONVERSATIONS.map((conv, idx) => {
            const isActive = conv.id === activeId;
            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => selectConversation(conv.id)}
                className={cn(
                  "chat-list-item-enter flex w-full items-center gap-3 border-b border-white/[0.03] px-4 py-3.5 text-left transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.99]",
                  isActive ? "bg-white/[0.06]" : "hover:bg-white/[0.03]",
                )}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="relative">
                  <Avatar name={conv.name} accent={conv.accent} size="sm" />
                  {conv.online && (
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#08080A]",
                        ACCENT_DOT[conv.accent],
                      )}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={cn(
                        "truncate text-sm",
                        isActive ? "font-semibold text-white" : "font-medium text-zinc-200",
                      )}
                    >
                      {conv.name}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-zinc-600">{conv.time}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">{conv.preview}</p>
                </div>
                {conv.unread ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-500 px-1.5 text-[10px] font-bold text-white">
                    {conv.unread}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Active thread */}
      <section
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col bg-[#050505]/40",
          !mobileShowThread ? "hidden md:flex" : "flex",
        )}
      >
        {/* Thread header */}
        <header className="flex items-center gap-3 border-b border-white/[0.05] bg-[#0A0A0C]/50 px-4 py-3 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setMobileShowThread(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/5 hover:text-white md:hidden"
            aria-label="Back to conversations"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <Avatar name={active.name} accent={active.accent} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-white">{active.name}</div>
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
              {active.online ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Active now
                </>
              ) : (
                "Thinkly workspace"
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {[Phone, Video, MoreHorizontal].map((Icon, i) => (
              <button
                key={i}
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-all duration-200 hover:bg-white/5 hover:text-zinc-200 active:scale-[0.94]"
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </header>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 [scrollbar-width:thin]"
        >
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            <div className="mb-2 text-center">
              <span className="rounded-full bg-white/5 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600">
                Today
              </span>
            </div>

            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "chat-bubble-enter flex",
                    isUser ? "justify-end" : "items-end gap-2",
                  )}
                  style={{ animationDelay: `${Math.min(idx * 40, 200)}ms` }}
                >
                  {!isUser && <Avatar name={active.name} accent={active.accent} size="sm" />}
                  <div className={cn("max-w-[min(100%,320px)] sm:max-w-[380px]", isUser && "text-right")}>
                    <div
                      className={cn(
                        "inline-block px-4 py-2.5 text-[13px] leading-relaxed shadow-sm",
                        isUser
                          ? "chat-bubble-sent bg-gradient-to-br from-[#5E5CE6] to-[#7C3AED] text-white"
                          : "chat-bubble-received border border-white/5 bg-[#1C1C1E] text-zinc-100",
                      )}
                    >
                      {msg.text}
                    </div>
                    <div
                      className={cn(
                        "mt-1 font-mono text-[9px] text-zinc-600",
                        isUser ? "pr-1" : "pl-1",
                      )}
                    >
                      {msg.time}
                      {isUser && <span className="ml-1.5 text-zinc-500">Delivered</span>}
                    </div>
                  </div>
                </div>
              );
            })}

            {isTyping && <TypingIndicator />}
          </div>
        </div>

        {/* Composer */}
        <footer className="border-t border-white/[0.05] bg-[#0A0A0C]/80 px-4 py-3 backdrop-blur-md">
          <div className="mx-auto flex max-w-2xl items-end gap-2">
            <button
              type="button"
              className="mb-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/5 bg-white/5 text-zinc-400 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/10 hover:text-white active:scale-[0.94]"
              title="Attach"
            >
              <ImagePlus className="h-4 w-4" />
            </button>

            <div className="relative min-w-0 flex-1">
              <textarea
                ref={inputRef}
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="iMessage"
                className="max-h-28 min-h-[40px] w-full resize-none rounded-[20px] border border-white/8 bg-[#1C1C1E]/90 px-4 py-2.5 text-sm text-white outline-none transition-all duration-300 placeholder:text-zinc-500 focus:border-purple-500/35 focus:shadow-[0_0_16px_rgba(139,92,246,0.1)]"
              />
            </div>

            <button
              type="button"
              className="mb-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/5 bg-white/5 text-zinc-400 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/10 hover:text-white active:scale-[0.94]"
              title="Dictate"
            >
              <Mic className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={sendMessage}
              disabled={!draft.trim() || isTyping}
              className={cn(
                "group mb-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.92]",
                draft.trim() && !isTyping
                  ? "bg-gradient-to-br from-[#5E5CE6] to-[#7C3AED] text-white shadow-[0_0_20px_rgba(124,58,237,0.35)]"
                  : "border border-white/5 bg-white/5 text-zinc-600",
              )}
              title="Send"
            >
              <ArrowUp className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
