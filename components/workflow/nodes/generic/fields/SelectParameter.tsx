"use client";

import React from "react";
import * as LucideIcons from "lucide-react";
import FieldInfoTooltip from "../FieldInfoTooltip";
import { AddToRequestToggle } from "@/components/workflow/AddToRequestToggle";

function isCompactSelectParam(
  nodeType: string,
  param: { key: string; type?: string }
): boolean {
  return (
    param.type === "select" &&
    (param.key === "transition" ||
      (nodeType === "extractAudio" && param.key === "format") ||
      (nodeType === "klingV3" &&
        (param.key === "aspect_ratio" ||
          param.key === "duration" ||
          param.key === "duration_text")) ||
      (nodeType === "gptImage2" &&
        (param.key === "quality" ||
          param.key === "n" ||
          param.key === "background" ||
          param.key === "output_format")))
  );
}

interface SelectParameterProps {
  param: any;
  value: any;
  disabled: boolean;
  updateInput: (key: string, val: any) => void;
  showAddToRequestBtn: boolean;
  isLocked: boolean;
  handlePromoteInput: (param: any) => void;
  activeDropdown: string | null;
  setActiveDropdown: (key: string | null) => void;
  nodeType: string;
}

export function SelectParameter({
  param,
  value,
  disabled,
  updateInput,
  showAddToRequestBtn,
  isLocked,
  handlePromoteInput,
  activeDropdown,
  setActiveDropdown,
  nodeType,
}: SelectParameterProps) {
  const isCompact = isCompactSelectParam(nodeType, param);

  return (
    <div
      className={`${
        isCompact
          ? "flex min-w-0 items-center gap-2"
          : "relative custom-select-container"
      }`}
    >
      {isCompact && (
        <span
          data-handle-anchor="label"
          className="flex min-w-0 shrink items-center gap-1 text-xs text-zinc-400 font-semibold pr-1"
        >
          <span className="truncate">{param.label}</span>
          {param.tooltip ? <FieldInfoTooltip text={param.tooltip} /> : null}
        </span>
      )}
      <div
        className={`relative ${
          isCompact ? "min-w-0 flex-1 custom-select-container" : ""
        }`}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            setActiveDropdown(activeDropdown === param.key ? null : param.key)
          }
          className="flex h-9 w-full items-center justify-between rounded-lg border border-white/5 bg-[#050507] px-3 py-2 text-xs text-zinc-100 disabled:opacity-50 outline-none focus:border-white/15 focus:ring-1 focus:ring-white/10 cursor-pointer nodrag transition-all active:scale-[0.98] duration-150 ease-out"
        >
          <span className="truncate">
            {param.options?.find((opt: any) => opt.value === value)?.label ||
              value ||
              "Select option..."}
          </span>
          <LucideIcons.ChevronDown
            className="h-3.5 w-3.5 text-zinc-400 opacity-50 shrink-0"
            aria-hidden="true"
          />
        </button>

        {/* Dropdown Menu Popup */}
        {activeDropdown === param.key && (
          <div className="absolute left-0 top-full mt-1.5 z-[100] flex min-w-full flex-col rounded-xl border border-white/10 bg-[#0A0A0C]/95 p-1.5 shadow-2xl text-left backdrop-blur-md">
            <div className="max-h-[260px] overflow-y-auto nowheel flex flex-col gap-0.5">
              {param.options?.map((opt: any) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      updateInput(param.key, opt.value);
                      setActiveDropdown(null);
                    }}
                    className={`flex items-center gap-1.5 w-full px-3 py-2 text-[13px] font-medium transition-all active:scale-[0.98] duration-150 ease-out rounded-lg text-left ${
                      isSelected
                        ? "bg-white/10 text-zinc-100"
                        : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                    }`}
                  >
                    <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                      {isSelected && (
                        <LucideIcons.Check className="w-3.5 h-3.5 text-zinc-100 stroke-[2.5]" />
                      )}
                    </span>
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {isCompact && param.handle && showAddToRequestBtn && (
        <div className="ml-auto shrink-0">
          <AddToRequestToggle
            disabled={isLocked}
            onPromote={() => handlePromoteInput(param)}
          />
        </div>
      )}
    </div>
  );
}
