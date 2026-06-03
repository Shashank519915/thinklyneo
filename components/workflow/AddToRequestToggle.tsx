"use client";

import { Plus } from "lucide-react";

export function AddToRequestToggle({
  disabled,
  onPromote,
}: {
  disabled?: boolean;
  onPromote: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPromote}
      aria-label="Add to request"
      className="nodrag inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-[#F5F5F5] text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Plus className="h-4 w-4" />
    </button>
  );
}
