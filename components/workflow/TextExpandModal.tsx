"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface TextExpandModalProps {
  title: string;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  placeholder?: string;
  readOnly?: boolean;
}

export default function TextExpandModal({
  title,
  value,
  onChange,
  onClose,
  placeholder,
  readOnly = false,
}: TextExpandModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Prevent scrolling of underlying content when modal is open
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Dark backdrop overlay */}
      <div
        className="fixed inset-0 z-[99999] bg-black/80 animate-in fade-in-0 duration-200"
        style={{ pointerEvents: "auto" }}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Dialog box */}
      <div
        role="dialog"
        className="fixed left-[50%] top-[50%] z-[99999] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 animate-in fade-in-0 zoom-in-95 sm:rounded-[18px] max-h-[90vh] overflow-y-auto sm:max-w-2xl border-border text-foreground"
        tabIndex={-1}
        style={{ pointerEvents: "auto" }}
      >
        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
          <h2 className="text-lg font-semibold leading-none tracking-tight">
            <span className="inline-flex items-center gap-1">{title}</span>
          </h2>
        </div>
        <textarea
          placeholder={placeholder || `Enter ${title}...`}
          rows={12}
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[200px] w-full resize-y rounded-lg border border-border bg-background p-4 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring bg-transparent border-0 cursor-pointer text-muted-foreground"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </>,
    document.body
  );
}
