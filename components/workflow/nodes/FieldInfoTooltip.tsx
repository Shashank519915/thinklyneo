"use client";

import { Info } from "lucide-react";

/** Hover tooltip for node field labels — opens upward to avoid clipping inside React Flow nodes. */
export default function FieldInfoTooltip({ text }: { text: string }) {
  return (
    <span
      className="group/fieldtip nodrag nopan relative ml-1 inline-flex shrink-0 cursor-help"
      style={{ overflow: "visible" }}
    >
      <Info className="h-3 w-3 text-gray-400" aria-hidden="true" />
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-[9999] mb-1.5 hidden w-max max-w-[280px] -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] font-normal leading-relaxed text-gray-700 shadow-lg group-hover/fieldtip:block"
      >
        {text}
      </span>
    </span>
  );
}
