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
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
      <div className="flex items-center gap-0.5 md:gap-1 overflow-visible bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl px-1 py-1 md:px-2 md:py-1.5 shadow-sm">

        {/* Sticky note button — UI only for now */}
        <button
          className="p-2 rounded-lg text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
          title="Add sticky note (coming soon)"
        >
          <StickyNote className="h-4 w-4" />
        </button>

        {/* Add node button */}
        <div ref={pickerAnchorRef} className="relative">
          <button
            type="button"
            onClick={() => setIsNodePickerOpen(!isNodePickerOpen)}
            className={`relative z-[70] rounded p-2 transition-colors ${
              isNodePickerOpen
                ? "bg-gray-200 text-gray-900"
                : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
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
