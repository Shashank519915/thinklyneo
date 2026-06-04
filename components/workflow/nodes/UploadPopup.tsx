"use client";

/**
 * @fileoverview Reusable upload popup — shown when the user clicks any upload button.
 * Offers "Select Asset" (library stub, closes popup) and "Upload" (opens hidden file input).
 *
 * Usage:
 *   <UploadPopup
 *     open={activeUploadPopup === myKey}
 *     onClose={() => setActiveUploadPopup(null)}
 *     onUpload={() => document.getElementById("my-file-input")?.click()}
 *   />
 *
 * The parent must:
 *  - Place this inside a `<div className="relative">` alongside the trigger button and hidden input.
 *  - Handle outside-click by listening for mousedown and checking `.upload-popup-container`.
 */

import { ImagePlus, Plus } from "lucide-react";

interface UploadPopupProps {
  open: boolean;
  onClose: () => void;
  onUpload: () => void;
}

export function UploadPopup({ open, onClose, onUpload }: UploadPopupProps) {
  if (!open) return null;
  return (
    <div className="upload-popup-container absolute left-0 top-full mt-3 z-50 flex w-[80vw] max-w-[246px] flex-col gap-3 rounded-3xl border border-gray-100 bg-white p-4 shadow-xl sm:w-[246px] text-left">
      <p className="text-xs text-gray-500 leading-normal font-normal">
        Add a file from your device or select one from your library
      </p>
      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-[#3F3F46] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 nodrag"
        onClick={onClose}
      >
        <ImagePlus className="h-4 w-4" />
        <span>Select Asset</span>
      </button>
      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#6366F1] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 nodrag"
        onClick={() => {
          onClose();
          onUpload();
        }}
      >
        <Plus className="h-4 w-4" />
        <span>Upload</span>
      </button>
    </div>
  );
}
