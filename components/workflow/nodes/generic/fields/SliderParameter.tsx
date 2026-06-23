"use client";

import React from "react";
import * as LucideIcons from "lucide-react";
import FieldInfoTooltip from "../FieldInfoTooltip";
import ElasticSlider from "@/components/ui/ElasticSlider";

interface SliderParameterProps {
  param: any;
  value: any;
  disabled: boolean;
  isWired: boolean;
  updateInput: (key: string, val: any) => void;
  showAddToRequestBtn: boolean;
  isLocked: boolean;
  handlePromoteInput: (param: any) => void;
}

export function SliderParameter({
  param,
  value,
  disabled,
  isWired,
  updateInput,
  showAddToRequestBtn,
  isLocked,
  handlePromoteInput,
}: SliderParameterProps) {
  const numericValue = value !== "" ? Number(value) : (param.defaultValue ?? 0);

  return (
    <div className="space-y-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <span
          data-handle-anchor="label"
          className="flex w-[110px] flex-shrink-0 items-center gap-0 text-xs text-zinc-400 font-semibold pr-1"
        >
          <span className="truncate">{param.label}</span>
          {param.tooltip && <FieldInfoTooltip text={param.tooltip} />}
        </span>
        <ElasticSlider
          value={numericValue}
          onChange={(val) => updateInput(param.key, val)}
          disabled={disabled || isWired}
          startingValue={param.min ?? 0}
          maxValue={param.max ?? 100}
          stepSize={param.step ?? 1}
          isStepped={param.step != null}
          className="flex-1 min-w-[60px]"
          activeColor="#7C3AED"
        />
        <input
          type="number"
          min={param.min ?? 0}
          max={param.max ?? 100}
          step={param.step ?? 1}
          value={Number(numericValue).toFixed(
            param.step && param.step < 1 ? 2 : 0
          )}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            if (!Number.isFinite(n)) return;
            const clamped = Math.min(
              param.max ?? 100,
              Math.max(param.min ?? 0, n)
            );
            updateInput(param.key, clamped);
          }}
          disabled={disabled || isWired}
          className="nodrag nowheel w-12 shrink-0 rounded-lg border border-white/5 bg-[#050507] px-1.5 py-1 text-center font-mono text-xs text-zinc-100 outline-none focus:border-white/15 focus:ring-1 focus:ring-white/10 disabled:opacity-50 transition-colors"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => updateInput(param.key, param.defaultValue ?? 0)}
          className="nodrag flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50 active:scale-[0.9]"
          title={`Reset ${param.label} to default`}
        >
          <LucideIcons.RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        {showAddToRequestBtn && (
          <button
            type="button"
            disabled={isLocked}
            onClick={() => handlePromoteInput(param)}
            className="nodrag inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200 transition-colors disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.9]"
            title="Add to request inputs"
          >
            <LucideIcons.Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
