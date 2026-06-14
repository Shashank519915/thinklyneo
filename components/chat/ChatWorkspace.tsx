"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import { useChat } from "@ai-sdk/react";
import { ArrowUp, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Blueprint, ChatKind, ChatRecord } from "@/lib/chat/types";
import { blueprintToFlowGraph } from "@/lib/chat/blueprint-to-graph";
import { useBrainClientTools } from "@/lib/chat/use-brain-client-tools";
import { useAttachLiveRunOnFocus } from "@/lib/use-attach-live-run-on-focus";
import type { PlaygroundOutputSection } from "@/lib/playground-output";
import { MessageBubble } from "./ChatMessageParts";
import { BlueprintSummary } from "./BlueprintFlowPreview";
import { WorkflowCanvasPreview } from "./WorkflowCanvasPreview";
import { LiveRunPanel } from "./LiveRunPanel";
import { EditHandoffCard, PinnedRunBadge } from "./ChatClientToolCards";
import { ChatCreditBadge, RunCompletionPanel, WorkflowContextNote } from "./ChatRunExtras";
import { useWorkspaceNavigate } from "@/components/workspace/navigation";
import { useWorkspaceIsland } from "@/components/workspace/shell/WorkspaceIslandContext";
import {
  readBrainEditHandoff,
  clearBrainEditHandoff,
  stashBrainEditHandoff,
} from "@/lib/workspace/brain-edit-handoff";

type ChatMode = ChatKind;

type ActiveRun = {
  orchestratorRunId: string;
  workflowId: string;
  workflowRunId?: string;
};

const MODE_META: Record<ChatMode, { label: string; api: string; description: string }> = {
  helper: {
    label: "Node Helper",
    api: "/api/chat/helper",
    description: "Read-only node catalog expert",
  },
  thinkly: {
    label: "Thinkly",
    api: "/api/chat/thinkly",
    description: "Plan workflows → Blueprint",
  },
  brain: {
    label: "Brain",
    api: "/api/chat/brain",
    description: "MCP agent — build & run",
  },
};

function extractRunFromToolParts(messages: UIMessage[]): ActiveRun | null {
  for (const msg of [...messages].reverse()) {
    if (msg.role !== "assistant") continue;
    for (const part of msg.parts) {
      if (!part.type.startsWith("tool-") && part.type !== "dynamic-tool") continue;
      const out = "output" in part ? part.output : null;
      let parsed: Record<string, unknown> | null = null;
      if (typeof out === "string") {
        try {
          parsed = JSON.parse(out) as Record<string, unknown>;
        } catch {
          parsed = null;
        }
      } else if (out && typeof out === "object") {
        parsed = out as Record<string, unknown>;
      }
      if (!parsed) continue;
      const orchestratorRunId =
        typeof parsed.orchestratorRunId === "string" ? parsed.orchestratorRunId : null;
      const workflowId = typeof parsed.workflowId === "string" ? parsed.workflowId : null;
      if (orchestratorRunId && workflowId) {
        return {
          orchestratorRunId,
          workflowId,
          workflowRunId: typeof parsed.runId === "string" ? parsed.runId : undefined,
        };
      }
    }
  }
  return null;
}

export default function ChatWorkspace() {
  const { navigate } = useWorkspaceNavigate();
  const { setBrainEditMode } = useWorkspaceIsland({
    createWorkflow: () => navigate("/dashboard"),
    onImportClick: () => navigate("/dashboard"),
  });

  const [mode, setMode] = useState<ChatMode>("thinkly");
  const [chats, setChats] = useState<ChatRecord[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loadingChats, setLoadingChats] = useState(true);
  const [activeBlueprint, setActiveBlueprint] = useState<Blueprint | null>(null);
  const [boundWorkflowId, setBoundWorkflowId] = useState<string | null>(null);
  const [creditBalanceMicro, setCreditBalanceMicro] = useState<number | null>(null);
  const [workflowContextNote, setWorkflowContextNote] = useState<string | null>(null);
  const [completedRun, setCompletedRun] = useState<{
    sections: PlaygroundOutputSection[];
    orchestratorRunId: string;
  } | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const helperBootstrapRef = useRef(false);
  const deepLinkHandledRef = useRef(false);
  const messagesLengthRef = useRef(0);

  const meta = MODE_META[mode];

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: meta.api,
        body: { chatId: activeChatId },
      }),
    [meta.api, activeChatId],
  );

  const refreshChats = useCallback(async () => {
    try {
      const res = await fetch("/api/chat");
      const json = await res.json();
      if (!res.ok) {
        setChatError(json.error ?? "Failed to load chats");
        return;
      }
      if (Array.isArray(json.data)) {
        setChats(json.data as ChatRecord[]);
        setChatError(null);
      }
    } catch {
      setChatError("Failed to load chats");
    }
  }, []);

  const loadChatRef = useRef<(chatId: string) => Promise<void>>(async () => undefined);
  const syncChatFromServerRef = useRef<(chatId: string) => Promise<void>>(async () => undefined);
  const onToolCallRef = useRef<
    ((arg: Parameters<NonNullable<import("ai").ChatOnToolCallCallback>>[0]) => void) | undefined
  >(undefined);

  const {
    messages,
    sendMessage,
    status,
    stop,
    setMessages,
    addToolOutput,
  } = useChat({
    transport,
    id: `${mode}-${activeChatId ?? "none"}`,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: (arg) => {
      void onToolCallRef.current?.(arg);
    },
    onFinish: () => {
      void refreshChats();
      if (activeChatId) void syncChatFromServerRef.current(activeChatId);
    },
    onError: (error) => {
      setChatError(error.message || "Chat stream failed");
    },
  });

  useEffect(() => {
    messagesLengthRef.current = messages.length;
  }, [messages]);

  const refreshWorkflowContext = useCallback(async (workflowId: string, chatId?: string) => {
    if (chatId) {
      try {
        const res = await fetch("/api/chat/workflow-context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId, workflowId }),
        });
        const json = await res.json();
        if (res.ok && json.data?.summary) {
          setWorkflowContextNote(json.data.summary);
          return;
        }
      } catch {
        /* fall through to client summary */
      }
    }
    try {
      const res = await fetch(`/api/workflows/${workflowId}`);
      const json = await res.json();
      if (!json.data) return;
      const nodes = (json.data.nodes ?? []) as Array<{
        id: string;
        type: string;
        data?: { label?: string };
      }>;
      const edges = json.data.edges ?? [];
      const exec = nodes.filter((n) => n.type !== "requestInputs" && n.type !== "response");
      const typeList = [...new Set(exec.map((n) => n.type))].join(", ");
      setWorkflowContextNote(
        `Workflow "${json.data.name}" synced from canvas.\n${nodes.length} nodes, ${edges.length} edges.\nTypes: ${typeList || "none"}.`,
      );
    } catch {
      setChatError("Failed to load workflow context");
    }
  }, []);

  const pinRunRef = useRef<(run: { orchestratorRunId: string; workflowId: string }) => void>(
    () => undefined,
  );

  const applyChatDetail = useCallback(
    (data: {
      blueprint?: Blueprint | null;
      workflowId?: string | null;
      creditBalanceMicro?: number;
      activeRun?: { workflowId?: string; orchestratorRunId?: string };
      messages?: UIMessage[];
    }, replaceMessages = false) => {
      if (replaceMessages && data.messages) {
        setMessages(data.messages);
      }
      if (data.blueprint) {
        setActiveBlueprint(data.blueprint);
      } else if (replaceMessages) {
        setActiveBlueprint(null);
      }
      if (data.workflowId) {
        setBoundWorkflowId(data.workflowId);
      } else if (replaceMessages) {
        setBoundWorkflowId(null);
      }
      if (typeof data.creditBalanceMicro === "number") {
        setCreditBalanceMicro(data.creditBalanceMicro);
      }
      if (data.activeRun?.workflowId && data.activeRun?.orchestratorRunId) {
        pinRunRef.current({
          orchestratorRunId: data.activeRun.orchestratorRunId,
          workflowId: data.activeRun.workflowId,
        });
      }
      if (replaceMessages) {
        setCompletedRun(null);
      }
    },
    [setMessages],
  );

  const loadChat = useCallback(
    async (chatId: string) => {
      try {
        const res = await fetch(`/api/chat/${chatId}`);
        const json = await res.json();
        if (!res.ok) {
          setChatError(json.error ?? "Failed to load chat");
          return;
        }
        setChatError(null);
        applyChatDetail(json.data ?? {}, true);
      } catch {
        setChatError("Failed to load chat");
      }
    },
    [applyChatDetail],
  );

  const syncChatFromServer = useCallback(
    async (chatId: string) => {
      const minCount = messagesLengthRef.current;
      let lastData: Record<string, unknown> | null = null;
      try {
        for (let attempt = 0; attempt < 6; attempt++) {
          const res = await fetch(`/api/chat/${chatId}`);
          const json = await res.json();
          if (!res.ok) {
            setChatError(json.error ?? "Failed to load chat");
            return;
          }
          lastData = json.data ?? null;
          const server = json.data?.messages as UIMessage[] | undefined;
          if (server && server.length >= minCount) {
            setChatError(null);
            applyChatDetail({ ...json.data, messages: server }, true);
            return;
          }
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        }
        if (lastData) {
          applyChatDetail(lastData as Parameters<typeof applyChatDetail>[0], false);
        }
      } catch {
        setChatError("Failed to sync chat");
      }
    },
    [applyChatDetail],
  );

  loadChatRef.current = loadChat;
  syncChatFromServerRef.current = syncChatFromServer;

  const {
    pinnedRun,
    pendingHandoff,
    handoffPending,
    onToolCall,
    acceptHandoff,
    dismissHandoff,
    pinRun,
    clearPinnedRun,
    resetBrainClientState,
  } = useBrainClientTools({
    mode,
    addToolOutput,
    onPinRun: () => {
      setCompletedRun(null);
    },
  });

  pinRunRef.current = pinRun;

  onToolCallRef.current = onToolCall;

  const isStreaming = status === "streaming" || status === "submitted";

  const activeChat = chats.find((c) => c.id === activeChatId);
  const workflowId = boundWorkflowId ?? activeChat?.workflowId ?? null;
  const toolRun = extractRunFromToolParts(messages);
  const liveRun: ActiveRun | null =
    pinnedRun ??
    (toolRun?.workflowId
      ? toolRun
      : toolRun?.orchestratorRunId && workflowId
        ? { ...toolRun, workflowId }
        : null);

  useAttachLiveRunOnFocus(
    () => {
      if (activeChatId) void loadChat(activeChatId);
    },
    Boolean(liveRun),
  );

  useEffect(() => {
    const onTransitionEnd = (event: Event) => {
      const mode = (event as CustomEvent<{ mode?: string }>).detail?.mode;
      if (mode !== "brain-restore") return;
      const handoff = readBrainEditHandoff();
      if (!handoff) return;
      clearBrainEditHandoff();
      setActiveChatId(handoff.chatId);
      setMode("brain");
      void loadChat(handoff.chatId);
      void refreshWorkflowContext(handoff.workflowId, handoff.chatId);
    };
    window.addEventListener("thinkly:workspace-transition-end", onTransitionEnd);
    return () => window.removeEventListener("thinkly:workspace-transition-end", onTransitionEnd);
  }, [loadChat, refreshWorkflowContext]);

  useEffect(() => {
    void (async () => {
      setLoadingChats(true);
      await refreshChats();
      setLoadingChats(false);
    })();
  }, [refreshChats]);

  useEffect(() => {
    if (deepLinkHandledRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const wfId = params.get("brain");
    if (!wfId) return;
    deepLinkHandledRef.current = true;
    void (async () => {
      const res = await fetch("/api/chat/brain/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: wfId }),
      });
      const json = await res.json();
      if (json.data?.id) {
        setMode("brain");
        setActiveChatId(json.data.id);
        setBoundWorkflowId(json.data.workflowId ?? wfId);
        await refreshChats();
        await loadChat(json.data.id);
      } else {
        setChatError(json.error ?? "Failed to open Brain chat");
      }
    })();
  }, [loadChat, refreshChats]);

  useEffect(() => {
    const modeChats = chats.filter((c) => c.kind === mode);
    if (mode === "helper") {
      const helper = modeChats[0];
      if (helper) {
        setActiveChatId(helper.id);
        void loadChat(helper.id);
      } else if (!helperBootstrapRef.current) {
        helperBootstrapRef.current = true;
        void fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "helper" }),
        })
          .then((r) => r.json())
          .then((json) => {
            if (json.data?.id) {
              setActiveChatId(json.data.id);
              void loadChat(json.data.id);
            }
            return refreshChats();
          });
      }
      return;
    }
    if (!activeChatId && modeChats.length > 0) {
      setActiveChatId(modeChats[0].id);
      void loadChat(modeChats[0].id);
    }
  }, [mode, chats, activeChatId, refreshChats, loadChat]);

  async function createThinklyChat() {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "thinkly", title: "New plan" }),
    });
    const json = await res.json();
    if (json.data?.id) {
      await refreshChats();
      setActiveChatId(json.data.id);
      setMessages([]);
      setActiveBlueprint(null);
      setBoundWorkflowId(null);
      setWorkflowContextNote(null);
      setCompletedRun(null);
    }
  }

  async function activateBlueprint(force = false) {
    if (!activeChatId || !activeBlueprint) return;
    const res = await fetch("/api/chat/brain/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thinklyChatId: activeChatId, force }),
    });
    const json = await res.json();
    if (!res.ok) {
      setChatError(json.error ?? "Blueprint activation failed");
      return;
    }
    if (json.data?.id) {
      setMode("brain");
      setActiveChatId(json.data.id);
      if (json.data.workflowId) setBoundWorkflowId(json.data.workflowId);
      resetBrainClientState();
      await refreshChats();
      await loadChat(json.data.id);
      setChatError(null);
    }
  }

  function handleSend() {
    const text = draft.trim();
    if (!text || isStreaming || !activeChatId) return;
    setDraft("");
    setCompletedRun(null);
    void sendMessage({ text });
  }

  const blueprintGraph = useMemo(
    () => (activeBlueprint ? blueprintToFlowGraph(activeBlueprint) : null),
    [activeBlueprint],
  );

  function openCanvasEdit(targetWorkflowId?: string, workflowName?: string) {
    const wfId = targetWorkflowId ?? workflowId;
    if (!wfId || !activeChatId) return;
    stashBrainEditHandoff({
      chatId: activeChatId,
      workflowId: wfId,
      workflowName: workflowName ?? activeChat?.title ?? "Workflow",
    });
    setBrainEditMode({
      workflowName: workflowName ?? activeChat?.title ?? "Workflow",
      onDoneEditing: () => undefined,
    });
    navigate(`/workflow/${wfId}/canvas`, "brain-morph");
  }

  function handleAcceptHandoff() {
    const handoff = acceptHandoff();
    if (handoff) {
      setBoundWorkflowId(handoff.workflowId);
      openCanvasEdit(handoff.workflowId, handoff.label);
    }
  }

  useEffect(() => {
    if (mode !== "brain" || !toolRun?.orchestratorRunId || !workflowId || pinnedRun) return;
    pinRun({ orchestratorRunId: toolRun.orchestratorRunId, workflowId });
  }, [mode, toolRun, workflowId, pinnedRun, pinRun]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status, liveRun, pendingHandoff, completedRun, workflowContextNote]);

  const modeChats = chats.filter((c) => c.kind === mode);

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <aside className="flex w-full flex-col border-r border-white/[0.05] bg-[#08080A]/60 lg:w-[280px]">
        <div className="border-b border-white/[0.05] p-3">
          <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-black/40 p-1">
            {(Object.keys(MODE_META) as ChatMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  stop();
                  resetBrainClientState();
                  setMode(m);
                  setActiveChatId(null);
                  setMessages([]);
                  setActiveBlueprint(null);
                  setBoundWorkflowId(null);
                  setWorkflowContextNote(null);
                  setCompletedRun(null);
                  setChatError(null);
                }}
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
              onClick={() => void createThinklyChat()}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 py-2 text-xs text-zinc-300 hover:bg-white/5"
            >
              <Plus className="h-3.5 w-3.5" />
              New plan
            </button>
          )}
        </div>
        {mode !== "helper" && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            {modeChats.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setActiveChatId(c.id);
                  void loadChat(c.id);
                }}
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
        )}
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="border-b border-white/[0.05] px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-white">{meta.label}</h2>
              <p className="text-[10px] text-zinc-500">{meta.description}</p>
            </div>
            <div className="flex items-center gap-2">
              {mode === "brain" && workflowId && (
                <button
                  type="button"
                  onClick={() => openCanvasEdit()}
                  className="xl:hidden rounded-full border border-white/15 px-3 py-1 text-[10px] font-semibold text-zinc-200"
                >
                  Edit canvas
                </button>
              )}
              {pinnedRun && (
                <PinnedRunBadge orchestratorRunId={pinnedRun.orchestratorRunId} active={!completedRun} />
              )}
              {creditBalanceMicro != null && <ChatCreditBadge microcredits={creditBalanceMicro} />}
              {isStreaming && (
                <button
                  type="button"
                  onClick={() => stop()}
                  className="text-[10px] font-mono text-red-400 hover:text-red-300"
                >
                  Stop
                </button>
              )}
            </div>
          </div>
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            {chatError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {chatError}
              </div>
            )}
            {liveRun && !completedRun && (
              <div className="sticky top-0 z-10 -mx-1 px-1 pb-2 backdrop-blur-md">
                <LiveRunPanel
                  workflowId={liveRun.workflowId}
                  orchestratorRunId={liveRun.orchestratorRunId}
                  chatId={activeChatId ?? undefined}
                  onComplete={(sections) => {
                    clearPinnedRun();
                    setCompletedRun({
                      sections,
                      orchestratorRunId: liveRun.orchestratorRunId,
                    });
                  }}
                />
              </div>
            )}
            {completedRun && (
              <RunCompletionPanel
                sections={completedRun.sections}
                orchestratorRunId={completedRun.orchestratorRunId}
              />
            )}
            {workflowContextNote && <WorkflowContextNote text={workflowContextNote} />}
            {pendingHandoff && (
              <EditHandoffCard
                workflowId={pendingHandoff.workflowId}
                label={pendingHandoff.label}
                onEdit={handleAcceptHandoff}
                onDismiss={dismissHandoff}
                pending={handoffPending}
              />
            )}
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                assistantName={meta.label}
                hideClientTools
              />
            ))}
            {isStreaming && (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Streaming…
              </div>
            )}
          </div>
        </div>

        <footer className="border-t border-white/[0.05] px-4 py-3">
          <div className="mx-auto flex max-w-2xl items-end gap-2">
            <textarea
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Message ${meta.label}…`}
              disabled={!activeChatId || loadingChats}
              className="min-h-[40px] flex-1 resize-none rounded-[20px] border border-white/8 bg-[#1C1C1E]/90 px-4 py-2.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple-500/35"
            />
            <button
              type="button"
              onClick={handleSend}
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
      </section>

      <aside className="hidden min-h-0 w-full flex-col border-l border-white/[0.05] bg-[#060608]/80 xl:flex xl:w-[min(100%,360px)]">
        <div className="border-b border-white/[0.05] px-4 py-3">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
            Context
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
          {activeBlueprint && blueprintGraph && !liveRun && (
            <>
              <BlueprintSummary blueprint={activeBlueprint} />
              <WorkflowCanvasPreview
                nodes={blueprintGraph.nodes}
                edges={blueprintGraph.edges}
                workflowName={activeBlueprint.title ?? "Blueprint"}
              />
              {mode === "thinkly" && activeBlueprint.confidence !== "draft" && (
                <button
                  type="button"
                  onClick={() => void activateBlueprint()}
                  className="w-full rounded-full bg-white py-2 text-xs font-bold text-black hover:bg-zinc-100"
                >
                  Activate Blueprint → Brain
                </button>
              )}
            </>
          )}
          {mode === "brain" && workflowId && (
            <button
              type="button"
              onClick={() => openCanvasEdit()}
              className="w-full rounded-full border border-white/15 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/5"
            >
              Edit workflow in canvas
            </button>
          )}
          {!activeBlueprint && mode === "helper" && (
            <p className="text-xs text-zinc-500">
              Ask about node inputs, outputs, credits, and wiring conventions.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
