"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PlaygroundBezelProps = {
  children: ReactNode;
  className?: string;
  /** Mark as Barba transition target */
  transitionCard?: boolean;
};

export function PlaygroundBezel({
  children,
  className,
  transitionCard = false,
}: PlaygroundBezelProps) {
  return (
    <div
      {...(transitionCard ? { "data-workspace-card": true } : {})}
      className={cn(
        "relative flex min-h-0 flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-1.5 shadow-[0_20px_40px_-16px_rgba(0,0,0,0.85)] will-change-transform",
        className,
      )}
    >
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[calc(1.5rem-6px)] border border-white/5 bg-[#0A0A0C]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="pointer-events-none absolute inset-0 z-0 glass-noise" aria-hidden />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
