"use client";

import type { UIMessage } from "ai";
import { Loader2, Wrench, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatMarkdown } from "./ChatMarkdown";

const CLIENT_UI_TOOLS = new Set(["offer_edit_handoff", "pin_live_run"]);

export function isClientUiTool(toolName: string): boolean {
  return CLIENT_UI_TOOLS.has(toolName);
}

function extractText(parts: UIMessage["parts"]): string {
  return parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { text: string }).text)
    .join("");
}

export function ToolPartRow({ part }: { part: UIMessage["parts"][number] }) {
  if (!part.type.startsWith("tool-") && part.type !== "dynamic-tool") return null;

  const toolName =
    part.type === "dynamic-tool"
      ? (part as { toolName: string }).toolName
      : part.type.replace(/^tool-/, "");

  if (isClientUiTool(toolName)) return null;

  const state = (part as { state?: string }).state ?? "output-available";
  const isRunning = state === "input-streaming" || state === "input-available";
  const isError = state === "output-error";

  if (toolName === "propose_blueprint") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs",
          isError && "border-red-500/30 bg-red-500/5",
        )}
      >
        {isRunning ? (
          <>
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-purple-400" />
            <span className="font-medium text-zinc-300">Building blueprint…</span>
          </>
        ) : isError ? (
          <>
            <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
            <span className="font-medium text-red-300">Blueprint creation failed</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            <span className="font-medium text-zinc-200">Blueprint proposed ✓</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs",
        isError && "border-red-500/30 bg-red-500/5",
      )}
    >
      {isRunning ? (
        <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-purple-400" />
      ) : isError ? (
        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
          <Wrench className="h-3 w-3" />
          {toolName}
        </div>
        {"input" in part && part.input != null && (
          <pre className="mt-1 max-h-24 overflow-auto text-[10px] text-zinc-500">
            {JSON.stringify(part.input, null, 2)}
          </pre>
        )}
        {"output" in part && part.output != null && !isRunning && (
          <pre className="mt-1 max-h-32 overflow-auto text-[10px] text-zinc-300">
            {typeof part.output === "string"
              ? part.output
              : JSON.stringify(part.output, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

export function MessageBubble({
  message,
  assistantName,
  hideClientTools = false,
  isStreaming = false,
}: {
  message: UIMessage;
  assistantName: string;
  hideClientTools?: boolean;
  isStreaming?: boolean;
}) {
  const isUser = message.role === "user";
  const text = extractText(message.parts);
  const toolParts = message.parts.filter((p) => {
    if (!p.type.startsWith("tool-") && p.type !== "dynamic-tool") return false;
    if (!hideClientTools) return true;
    const toolName =
      p.type === "dynamic-tool"
        ? (p as { toolName: string }).toolName
        : p.type.replace(/^tool-/, "");
    return !isClientUiTool(toolName);
  });

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[min(100%,380px)] rounded-[20px] rounded-br-md bg-gradient-to-br from-[#5E5CE6] to-[#7C3AED] px-4 py-2.5 text-[13px] leading-relaxed text-white">
          <ChatMarkdown content={text} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-w-[min(100%,520px)]">
      <div className="text-[9px] font-mono uppercase tracking-widest text-zinc-600">{assistantName}</div>
      {text && (
        <div className="rounded-[20px] rounded-bl-md border border-white/5 bg-[#1C1C1E] px-4 py-2.5 text-[13px] leading-relaxed text-zinc-100">
          <ChatMarkdown content={text} isStreaming={isStreaming} />
        </div>
      )}
      {toolParts.map((part, i) => (
        <ToolPartRow key={`${message.id}-tool-${i}`} part={part} />
      ))}
    </div>
  );
}
