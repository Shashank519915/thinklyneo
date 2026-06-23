"use client";

import React from "react";
import * as LucideIcons from "lucide-react";
import FieldInfoTooltip from "../FieldInfoTooltip";

interface TextParameterProps {
  param: any;
  value: any;
  disabled: boolean;
  updateInput: (key: string, val: any) => void;
  definition: any;
  modeTab: "text" | "image";
  setActiveExpandParamKey: (key: string | null) => void;
}

export function TextParameter({
  param,
  value,
  disabled,
  updateInput,
  definition,
  modeTab,
  setActiveExpandParamKey,
}: TextParameterProps) {
  if (param.type === "text") {
    return (
      <input
        type="text"
        placeholder={`Enter ${param.label.toLowerCase()}...`}
        value={value}
        onChange={(e) => updateInput(param.key, e.target.value)}
        disabled={disabled}
        className="nodrag nowheel w-full rounded-lg border border-white/5 bg-[#050507] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-white/15 focus:ring-1 focus:ring-white/10 transition-all disabled:opacity-50 h-9"
      />
    );
  }

  // Textarea type
  const placeholder =
    param.placeholder ||
    (definition.type === "gptImage2" && modeTab === "image"
      ? "Describe how you want to edit the image..."
      : `Describe the ${param.label.toLowerCase()} you want to create...`);

  return (
    <div className="relative">
      <textarea
        rows={3}
        placeholder={placeholder}
        value={value}
        onChange={(e) => updateInput(param.key, e.target.value)}
        disabled={disabled}
        className="nodrag nowheel w-full resize-y rounded-lg border border-white/5 bg-[#050507] p-3 pr-14 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-white/15 focus:ring-1 focus:ring-white/10 transition-all disabled:opacity-50"
      />
      {/* Char count — floated inside, left of expand button */}
      {definition.type !== "openRouter" && (
        <span className="pointer-events-none absolute bottom-[11px] right-9 text-[9px] tabular-nums text-zinc-600 font-mono select-none leading-none">
          {value ? String(value).length : 0}/
          {definition.limits?.[param.key]?.maxLength ?? 4000}
        </span>
      )}
      <button
        type="button"
        onClick={() => setActiveExpandParamKey(param.key)}
        className="nodrag absolute bottom-2.5 right-2 flex h-5 w-5 items-center justify-center rounded-md bg-white/5 border border-white/5 text-zinc-400 transition-all hover:bg-white/10 hover:text-zinc-200 active:scale-[0.9] shadow-sm"
        title="Expand"
      >
        <LucideIcons.Maximize2 className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}
