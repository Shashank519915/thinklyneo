"use client";

import { useCallback, useState } from "react";
import type { ChatAddToolOutputFunction, ChatOnToolCallCallback, UIMessage } from "ai";

export type PinnedRun = {
  orchestratorRunId: string;
  workflowId: string;
};

export type PendingHandoff = {
  toolCallId: string;
  workflowId: string;
  label?: string;
};

export function useBrainClientTools({
  mode,
  addToolOutput,
  onPinRun,
}: {
  mode: string;
  addToolOutput: ChatAddToolOutputFunction<UIMessage>;
  onPinRun: (run: PinnedRun) => void;
}) {
  const [pinnedRun, setPinnedRun] = useState<PinnedRun | null>(null);
  const [pendingHandoff, setPendingHandoff] = useState<PendingHandoff | null>(null);
  const [handoffPending, setHandoffPending] = useState(false);

  const clearPinnedRun = useCallback(() => setPinnedRun(null), []);

  const clearHandoff = useCallback(() => {
    setPendingHandoff(null);
    setHandoffPending(false);
  }, []);

  const resetBrainClientState = useCallback(() => {
    clearPinnedRun();
    clearHandoff();
  }, [clearPinnedRun, clearHandoff]);

  const onToolCall: ChatOnToolCallCallback = useCallback(
    async ({ toolCall }) => {
      if (mode !== "brain") return;

      if (toolCall.toolName === "pin_live_run") {
        const input = toolCall.input as { orchestratorRunId: string; workflowId: string };
        if (input?.orchestratorRunId && input?.workflowId) {
          const run = {
            orchestratorRunId: input.orchestratorRunId,
            workflowId: input.workflowId,
          };
          setPinnedRun(run);
          onPinRun(run);
          addToolOutput({
            tool: "pin_live_run",
            toolCallId: toolCall.toolCallId,
            output: { pinned: true },
          });
        }
        return;
      }

      if (toolCall.toolName === "offer_edit_handoff") {
        const input = toolCall.input as { workflowId: string; label?: string };
        if (input?.workflowId) {
          setPendingHandoff({
            toolCallId: toolCall.toolCallId,
            workflowId: input.workflowId,
            label: input.label,
          });
          addToolOutput({
            tool: "offer_edit_handoff",
            toolCallId: toolCall.toolCallId,
            output: { offered: true, awaitingUser: true },
          });
        }
      }
    },
    [mode, addToolOutput, onPinRun],
  );

  const acceptHandoff = useCallback(() => {
    if (!pendingHandoff) return null;
    setHandoffPending(true);
    const handoff = pendingHandoff;
    setPendingHandoff(null);
    setHandoffPending(false);
    return handoff;
  }, [pendingHandoff]);

  const dismissHandoff = useCallback(() => {
    if (!pendingHandoff) return;
    addToolOutput({
      tool: "offer_edit_handoff",
      toolCallId: pendingHandoff.toolCallId,
      output: { dismissed: true },
    });
    setPendingHandoff(null);
    setHandoffPending(false);
  }, [pendingHandoff, addToolOutput]);

  const pinRun = useCallback(
    (run: PinnedRun) => {
      setPinnedRun(run);
      onPinRun(run);
    },
    [onPinRun],
  );

  return {
    pinnedRun,
    pendingHandoff,
    handoffPending,
    onToolCall,
    acceptHandoff,
    dismissHandoff,
    pinRun,
    clearPinnedRun,
    resetBrainClientState,
  };
}
