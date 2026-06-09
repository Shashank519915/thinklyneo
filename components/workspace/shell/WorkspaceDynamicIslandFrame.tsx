"use client";

import type { ReactNode } from "react";

/** Shared sticky slot + glow so the island sits in the same place on Flow and Chat. */
export function WorkspaceDynamicIslandFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <div
        data-workspace-island
        className="sticky top-5.5 left-0 right-0 z-50 flex h-0 justify-center pointer-events-none will-change-transform"
      >
        <div className="pointer-events-auto">{children}</div>
      </div>

      <div className="pointer-events-none fixed top-2 left-1/2 z-0 h-[120px] w-[400px] -translate-x-1/2 rounded-full bg-purple-500/4 blur-[60px]" />
    </>
  );
}
