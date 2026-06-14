"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// ─── Shortcut data ────────────────────────────────────────────────────────────

const SHORTCUTS = [
  {
    section: "General",
    items: [
      { label: "Undo",               keys: ["⌘", "Z"] },
      { label: "Redo",               keys: ["⌘", "Shift", "Z"] },
      { label: "Select all",         keys: ["⌘", "A"] },
      { label: "Deselect all",       keys: ["Esc"] },
      { label: "Pan canvas",         keys: ["Space", "Drag"] },
      { label: "Zoom in",            keys: ["+"] },
      { label: "Zoom out",           keys: ["−"] },
      { label: "Fit view",           keys: ["F"] },
      { label: "Toggle select mode", keys: ["S"] },
      { label: "Auto-arrange",       keys: ["Shift", "A"] },
    ],
  },
  {
    section: "Node Operations",
    items: [
      { label: "Copy",                 keys: ["⌘", "C"] },
      { label: "Paste",                keys: ["⌘", "V"] },
      { label: "Duplicate",            keys: ["⌘", "D"] },
      { label: "Duplicate with Edges", keys: ["⌘", "Shift", "D"] },
      { label: "Delete",               keys: ["Delete"] },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

/** Modal cheat-sheet listing editor shortcuts, surfaced from the ⌘ icon. */
export function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="wf-canvas-panel relative z-[100000] flex max-h-[80vh] w-[500px] flex-col overflow-hidden rounded-2xl">
        <div className="flex items-start justify-between border-b border-white/[0.08] px-6 pb-4 pt-6">
          <div>
            <h2 className="text-[16px] font-semibold text-zinc-100">Keyboard Shortcuts</h2>
            <p className="mt-0.5 text-[13px] text-zinc-500">Quickly navigate and create with these shortcuts.</p>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg border-0 bg-transparent p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-5 overflow-y-auto px-6 py-4">
          {SHORTCUTS.map((group) => (
            <div key={group.section}>
              <p className="mb-3 text-[13px] font-semibold text-zinc-200">{group.section}</p>
              <div className="space-y-0">
                {group.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between border-b border-white/[0.06] py-2.5 last:border-0"
                  >
                    <span className="text-[13px] text-zinc-400">{item.label}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, i) => (
                        <kbd
                          key={i}
                          className="inline-flex h-6 min-w-[32px] items-center justify-center rounded-md border border-white/[0.1] bg-[#121215] px-2 text-[11px] font-medium text-zinc-400"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
