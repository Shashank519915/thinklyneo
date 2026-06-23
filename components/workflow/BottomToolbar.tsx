"use client";

/**
 * @fileoverview Bottom-centered chrome: sticky-note placeholder plus add-node FAB toggling the `NodePicker`.
 */

import { useRef } from "react";
import { StickyNote, Plus } from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import NodePicker from "./NodePicker";

/** Docked toolbar above canvas bottom lip; exposes node palette anchored to “+”. */
export default function BottomToolbar({
  sidebarCollapsed = true,
  isHistoryPanelOpen = false,
}: {
  sidebarCollapsed?: boolean;
  isHistoryPanelOpen?: boolean;
}) {
  const { setIsNodePickerOpen, isNodePickerOpen } = useWorkflowStore();
  const pickerAnchorRef = useRef<HTMLDivElement>(null);

  // Calculate offset to center toolbar within the visible space between the left sidebar and right panel
  const sidebarWidth = sidebarCollapsed ? 76 : 260;
  const historyPanelWidth = isHistoryPanelOpen ? 360 : 0;
  const offset = (sidebarWidth - historyPanelWidth) / 2;

  return (
    <div
      className="absolute bottom-4 z-10 -translate-x-1/2 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
      style={{ left: `calc(50% + ${offset}px)` }}
    >
      <div className="p-[4px] rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md shadow-[0_20px_40px_-15px_rgba(0,0,0,0.85)]">
        <div className="relative rounded-[calc(1rem-4px)] bg-[#0A0A0C]/90 border border-white/5 px-2 py-1 md:py-1.5 flex items-center gap-0.5 md:gap-1 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-visible">
          <div className="absolute inset-0 pointer-events-none glass-noise z-0" />
          
          <button
            className="wf-canvas-chrome-btn relative z-10 rounded-lg p-2 text-zinc-400 transition-colors hover:text-zinc-100"
            title="Add sticky note (coming soon)"
          >
            <StickyNote className="h-4 w-4" />
          </button>

          <div ref={pickerAnchorRef} className="relative z-10">
            <button
              type="button"
              onClick={() => setIsNodePickerOpen(!isNodePickerOpen)}
              className={`wf-canvas-chrome-btn relative z-[70] rounded-lg p-2 transition-colors border ${
                isNodePickerOpen
                  ? "bg-white/10 border-white/10 text-zinc-100"
                  : "border-transparent text-zinc-400 hover:text-zinc-100"
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
    </div>
  );
}
