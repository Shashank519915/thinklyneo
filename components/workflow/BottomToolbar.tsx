"use client";

/**
 * @fileoverview Bottom-centered chrome: sticky-note placeholder plus add-node FAB toggling the `NodePicker`.
 */

import { useRef } from "react";
import { StickyNote, Plus } from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import NodePicker from "./NodePicker";

/** Docked toolbar above canvas bottom lip; exposes node palette anchored to “+”. */
export default function BottomToolbar() {
  const { setIsNodePickerOpen, isNodePickerOpen } = useWorkflowStore();
  const pickerAnchorRef = useRef<HTMLDivElement>(null);

  return (
    <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
      <div className="wf-canvas-chrome flex items-center gap-0.5 overflow-visible rounded-xl px-1 py-1 md:gap-1 md:px-2 md:py-1.5">
        <button
          className="wf-canvas-chrome-btn rounded-lg p-2 text-zinc-400 transition-colors hover:text-zinc-100"
          title="Add sticky note (coming soon)"
        >
          <StickyNote className="h-4 w-4" />
        </button>

        <div ref={pickerAnchorRef} className="relative">
          <button
            type="button"
            onClick={() => setIsNodePickerOpen(!isNodePickerOpen)}
            className={`wf-canvas-chrome-btn relative z-[70] rounded p-2 transition-colors ${
              isNodePickerOpen
                ? "bg-white/10 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-100"
            }`}
            title="Add node"
          >
            <Plus className="h-4 w-4" />
          </button>

          {/* Picker portal — opens above the button */}
          {isNodePickerOpen && <NodePicker anchorRef={pickerAnchorRef} />}
        </div>
      </div>
    </div>
  );
}
