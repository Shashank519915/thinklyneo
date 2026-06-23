"use client";

import React from "react";
import * as LucideIcons from "lucide-react";
import FieldInfoTooltip from "../FieldInfoTooltip";

interface BooleanParameterProps {
  param: any;
  value: any;
  disabled: boolean;
  updateInput: (key: string, val: any) => void;
  showAddToRequestBtn: boolean;
  isLocked: boolean;
  handlePromoteInput: (param: any) => void;
}

export function BooleanParameter({
  param,
  value,
  disabled,
  updateInput,
  showAddToRequestBtn,
  isLocked,
  handlePromoteInput,
}: BooleanParameterProps) {
  const isChecked = !!value;

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        data-handle-anchor="label"
        className="flex min-w-0 shrink items-center truncate text-xs text-zinc-400 font-semibold pr-1"
      >
        {param.label}
        {param.tooltip && <FieldInfoTooltip text={param.tooltip} />}
      </span>
      <div className="flex shrink-0 items-center gap-1.5">
        <span
          className={`text-[10px] font-semibold ${
            !isChecked ? "text-zinc-300" : "text-zinc-500"
          }`}
        >
          False
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={isChecked}
          data-state={isChecked ? "checked" : "unchecked"}
          disabled={disabled}
          onClick={() => updateInput(param.key, !isChecked)}
          className={`nodrag peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-white/5 transition-colors disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.95] duration-150 ${
            isChecked ? "bg-[#7C3AED]" : "bg-zinc-950"
          }`}
        >
          <span
            data-state={isChecked ? "checked" : "unchecked"}
            className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
          />
        </button>
        <span
          className={`text-[10px] font-semibold ${
            isChecked ? "text-zinc-300" : "text-zinc-500"
          }`}
        >
          True
        </span>
      </div>
      {showAddToRequestBtn && (
        <button
          type="button"
          disabled={isLocked}
          onClick={() => handlePromoteInput(param)}
          className="nodrag inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200 transition-all active:scale-[0.9] disabled:cursor-not-allowed disabled:opacity-40"
          title="Add to request inputs"
        >
          <LucideIcons.Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
