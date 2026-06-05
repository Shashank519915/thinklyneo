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
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-[500px] max-h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col z-[100000]">
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-[16px] font-semibold text-gray-900">Keyboard Shortcuts</h2>
            <p className="text-[13px] text-gray-500 mt-0.5">Quickly navigate and create with these shortcuts.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors bg-transparent border-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-4 space-y-5">
          {SHORTCUTS.map((group) => (
            <div key={group.section}>
              <p className="text-[13px] font-semibold text-gray-900 mb-3">{group.section}</p>
              <div className="space-y-0">
                {group.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0"
                  >
                    <span className="text-[13px] text-gray-700">{item.label}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, i) => (
                        <kbd
                          key={i}
                          className="inline-flex items-center justify-center min-w-[32px] h-6 px-2 rounded-md border border-gray-200 bg-gray-50 text-[11px] font-medium text-gray-600"
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
