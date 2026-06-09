"use client";

import type { ReactNode } from "react";

type MacWindowShellProps = {
  workspaceLabel: string;
  children: ReactNode;
  /** When false, children fill the shell without extra padding (e.g. split chat panes). */
  padded?: boolean;
  onClose?: () => void;
  onMinimize?: () => void;
  onFullscreen?: () => void;
};

export function MacWindowShell({
  workspaceLabel,
  children,
  padded = true,
  onClose,
  onMinimize,
  onFullscreen,
}: MacWindowShellProps) {
  return (
    <div
      data-workspace-card
      className="relative flex h-[calc(100vh-1.5rem)] flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.02] p-2 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.8)] will-change-transform"
    >
      <div className="relative flex flex-1 flex-col overflow-hidden rounded-[calc(1.75rem-8px)] border border-white/5 bg-[#0A0A0C]/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
        <div className="pointer-events-none absolute inset-0 z-0 glass-noise" />

        {/* macOS title bar */}
        <div className="group/mac relative z-10 flex h-12 flex-shrink-0 items-center border-b border-white/[0.05] px-5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="flex h-3 w-3 flex-shrink-0 cursor-pointer items-center justify-center rounded-full border border-black/15 bg-[#FF5F57] transition-[filter] duration-100 hover:brightness-90 active:brightness-75"
              title="Close"
            >
              <svg
                className="h-[7px] w-[7px] opacity-0 transition-opacity duration-100 group-hover/mac:opacity-60"
                viewBox="0 0 8 8"
                fill="none"
              >
                <path
                  d="M1.5 1.5L6.5 6.5M6.5 1.5L1.5 6.5"
                  stroke="#000"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={onMinimize}
              className="flex h-3 w-3 flex-shrink-0 cursor-pointer items-center justify-center rounded-full border border-black/15 bg-[#FFBD2E] transition-[filter] duration-100 hover:brightness-90 active:brightness-75"
              title="Minimize"
            >
              <svg
                className="h-[7px] w-[7px] opacity-0 transition-opacity duration-100 group-hover/mac:opacity-60"
                viewBox="0 0 8 8"
                fill="none"
              >
                <path d="M1.5 4H6.5" stroke="#000" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onFullscreen}
              className="flex h-3 w-3 flex-shrink-0 cursor-pointer items-center justify-center rounded-full border border-black/15 bg-[#28C840] transition-[filter] duration-100 hover:brightness-90 active:brightness-75"
              title="Full screen"
            >
              <svg
                className="h-[7px] w-[7px] opacity-0 transition-opacity duration-100 group-hover/mac:opacity-60"
                viewBox="0 0 8 8"
                fill="none"
              >
                <path
                  d="M1 7L7 1M1 4.5V7H3.5"
                  stroke="#000"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <div className="flex-1" />
          <span className="select-none font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-700">
            {workspaceLabel}
          </span>
        </div>

        <div
          className={`relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden ${
            padded ? "overflow-y-auto p-6 sm:p-8 md:p-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : ""
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
