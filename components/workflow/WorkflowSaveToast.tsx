"use client";

/**
 * @fileoverview Non-blocking autosave status chip: phased CSS animations (`wf-save-toast`) with leave callback after fade-out ends.
 */

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkflowSaveToastPhase = "idle" | "saving" | "saved" | "leaving";

type Props = {
  phase: WorkflowSaveToastPhase;
  /** Increments when a new save cycle starts so the enter animation replays. */
  enterCycle: number;
  onLeaveComplete: () => void;
};

/** Accessible toast showing “Saving…” then “Saved” before animating away via `phase === "leaving"`. */
export default function WorkflowSaveToast({
  phase,
  enterCycle,
  onLeaveComplete,
}: Props) {
  const leaveDoneRef = useRef(false);

  useEffect(() => {
    if (phase !== "leaving") leaveDoneRef.current = false;
  }, [phase]);

  if (phase === "idle") return null;

  const showSaved = phase === "saved" || phase === "leaving";

  return (
    <div
      className="fixed left-1/2 top-5 z-[100] -translate-x-1/2 pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        key={enterCycle}
        className={cn(
          "flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm",
          phase === "leaving"
            ? "wf-save-toast--leave"
            : "wf-save-toast--enter"
        )}
        onAnimationEnd={(e) => {
          if (e.target !== e.currentTarget) return;
          if (phase !== "leaving") return;
          if (leaveDoneRef.current) return;
          const name = e.animationName;
          if (!name.includes("wf-save-fade-out")) return;
          leaveDoneRef.current = true;
          onLeaveComplete();
        }}
      >
        {showSaved ? (
          <>
            <svg
              className="h-3 w-3 shrink-0 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-xs font-medium text-green-600">
              Saved
            </span>
          </>
        ) : (
          <>
            <Loader2
              className="h-3 w-3 shrink-0 animate-spin text-gray-500"
              aria-hidden
            />
            <span className="text-xs font-medium text-gray-700">
              Saving…
            </span>
          </>
        )}
      </div>
    </div>
  );
}
