"use client";

import { useState } from "react";
import {
  AlignLeft,
  Check,
  ChevronDown,
  FileText,
  Hash,
  Image,
  Link2,
  List,
  Maximize2,
  Music,
  ToggleLeft,
  Video,
  X,
} from "lucide-react";
import { SpinningLogo } from "@/components/SpinningLogo";
import type { WorkflowField } from "@/store/workflow-store";
import {
  acceptForFieldKind,
  getRequestFieldKind,
  isMultiAssetField,
  maxAssetsForField,
  type RequestFieldKind,
} from "@/lib/request-inputs";

export interface PlaygroundFieldRowProps {
  field: WorkflowField;
  value: string;
  disabled?: boolean;
  isPromoted?: boolean;
  uploading?: boolean;
  onChange: (value: string) => void;
  onUpload: (files: FileList | null, kind: RequestFieldKind) => void;
  onExpandText?: () => void;
}

function FieldIcon({ kind }: { kind: RequestFieldKind }) {
  const cls = "h-3.5 w-3.5";
  switch (kind) {
    case "image":
      return <Image className={cls} aria-hidden />;
    case "video":
      return <Video className={cls} aria-hidden />;
    case "audio":
      return <Music className={cls} aria-hidden />;
    case "select":
      return <List className={cls} aria-hidden />;
    case "number":
      return <Hash className={cls} aria-hidden />;
    case "boolean":
      return <ToggleLeft className={cls} aria-hidden />;
    case "file":
      return <FileText className={cls} aria-hidden />;
    default:
      return <AlignLeft className={cls} aria-hidden />;
  }
}

const fieldInputClass =
  "w-full rounded-xl border border-white/8 bg-[#08080A] text-sm text-zinc-200 outline-none transition-colors focus:border-purple-500/40 disabled:cursor-not-allowed disabled:opacity-50";

export default function PlaygroundFieldRow({
  field,
  value,
  disabled = false,
  isPromoted = false,
  uploading = false,
  onChange,
  onUpload,
  onExpandText,
}: PlaygroundFieldRowProps) {
  const kind = getRequestFieldKind(field);
  const displayValue = value ?? "";
  const [selectOpen, setSelectOpen] = useState(false);
  const maxAssets = maxAssetsForField(field);
  const urls = displayValue ? displayValue.split(",").filter(Boolean) : [];
  const locked = disabled;

  const removeUrlAt = (index: number) => {
    const next = urls.filter((_, i) => i !== index);
    onChange(next.join(","));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-zinc-500">
          <FieldIcon kind={kind} />
        </span>
        <label className="text-[13px] font-medium text-zinc-200">{field.label}</label>
        {isPromoted && (
          <span
            className="inline-flex items-center gap-0.5 rounded-md border border-purple-500/20 bg-purple-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-purple-300"
            title="Promoted from canvas"
          >
            <Link2 className="h-2.5 w-2.5" />
            Linked
          </span>
        )}
        <span className="ml-auto font-mono text-[10px] capitalize text-zinc-600">{kind}</span>
      </div>

      {kind === "select" && (field.selectOptions?.length ?? 0) > 0 && (
        <div className="relative">
          <button
            type="button"
            disabled={locked}
            onClick={() => !locked && setSelectOpen((o) => !o)}
            className={`flex h-9 w-full items-center justify-between ${fieldInputClass} px-3 ${
              locked ? "cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            <span className="truncate text-left">
              {field.selectOptions?.find((o) => o.value === displayValue)?.label ||
                displayValue ||
                "Select…"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
          </button>
          {selectOpen && !locked && (
            <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-xl border border-white/10 bg-[#0C0C0E] p-1 shadow-xl">
              {field.selectOptions?.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setSelectOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-300 hover:bg-white/5"
                >
                  {opt.value === displayValue && <Check className="h-3.5 w-3.5 text-purple-400" />}
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {kind === "number" &&
        field.numberMin !== undefined &&
        field.numberMax !== undefined && (
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={field.numberMin}
              max={field.numberMax}
              step={field.numberStep ?? 1}
              value={displayValue !== "" ? Number(displayValue) : field.numberMin}
              disabled={locked}
              onChange={(e) => onChange(e.target.value)}
              className="h-1.5 min-w-[60px] flex-1 accent-purple-500 disabled:opacity-50"
            />
            <input
              type="number"
              min={field.numberMin}
              max={field.numberMax}
              step={field.numberStep ?? 1}
              value={displayValue}
              disabled={locked}
              onChange={(e) => onChange(e.target.value)}
              className="w-14 rounded-lg border border-white/8 bg-[#08080A] px-1.5 py-1 text-center font-mono text-xs text-zinc-300 disabled:opacity-50"
            />
          </div>
        )}

      {kind === "number" &&
        (field.numberMin === undefined || field.numberMax === undefined) && (
          <input
            type="number"
            step="any"
            value={displayValue}
            disabled={locked}
            onChange={(e) => onChange(e.target.value)}
            className={`h-9 ${fieldInputClass} px-3`}
          />
        )}

      {kind === "boolean" && (
        <label
          className={`flex items-center gap-3 rounded-xl border border-white/8 bg-[#08080A] px-3 py-2 ${
            locked ? "cursor-not-allowed opacity-50" : "cursor-pointer"
          }`}
        >
          <button
            type="button"
            role="switch"
            aria-checked={displayValue === "true"}
            disabled={locked}
            onClick={() => !locked && onChange(displayValue === "true" ? "false" : "true")}
            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
              displayValue === "true" ? "bg-purple-600" : "bg-zinc-700"
            }`}
          >
            <span
              className={`block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
                displayValue === "true" ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
          <span className="text-sm text-zinc-300">
            {displayValue === "true" ? "True" : "False"}
          </span>
        </label>
      )}

      {kind === "text" && (
        <div className="relative">
          <textarea
            placeholder={`Enter ${field.label}…`}
            rows={3}
            value={displayValue}
            disabled={locked}
            onChange={(e) => onChange(e.target.value)}
            className={`min-h-[72px] resize-y px-3 py-2.5 ${fieldInputClass}`}
          />
          {onExpandText && !locked && (
            <button
              type="button"
              onClick={onExpandText}
              className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-md border border-white/8 bg-[#0C0C0E]/90 text-zinc-400 hover:text-zinc-200"
              title="Expand"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {(kind === "image" || kind === "video" || kind === "audio" || kind === "file") && (
        <div className="space-y-2">
          <button
            type="button"
            disabled={locked || uploading || urls.length >= maxAssets}
            onClick={() => document.getElementById(`pg-file-${field.id}`)?.click()}
            className={`flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/12 bg-white/[0.02] text-xs text-zinc-500 transition-colors hover:border-purple-500/30 hover:text-zinc-300 ${
              locked || uploading ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            }`}
          >
            {uploading ? (
              <>
                <SpinningLogo size="sm" />
                Uploading…
              </>
            ) : (
              <span className="capitalize">Upload {kind}</span>
            )}
          </button>
          <input
            id={`pg-file-${field.id}`}
            hidden
            accept={acceptForFieldKind(kind)}
            multiple={isMultiAssetField(kind, field.mediaMaxCount)}
            type="file"
            onChange={(e) => {
              void onUpload(e.target.files, kind);
              e.target.value = "";
            }}
          />

          {kind === "image" && urls.length > 0 && (
            <div className="grid grid-cols-3 gap-1.5">
              {urls.map((url, idx) => (
                <div key={idx} className="group relative aspect-square overflow-hidden rounded-lg border border-white/8 bg-black/30">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  {!locked && (
                    <button
                      type="button"
                      onClick={() => removeUrlAt(idx)}
                      className="absolute right-1 top-1 rounded bg-black/70 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      title="Remove"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {kind === "video" && urls.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5">
              {urls.map((url, idx) => (
                <div key={idx} className="group relative aspect-video overflow-hidden rounded-lg border border-white/8 bg-black/40">
                  <video src={url} className="h-full w-full object-cover" preload="metadata" playsInline />
                  {!locked && (
                    <button
                      type="button"
                      onClick={() => removeUrlAt(idx)}
                      className="absolute right-1 top-1 rounded bg-black/70 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      title="Remove"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {kind === "audio" && urls.length > 0 && (
            <div className="space-y-1.5">
              {urls.map((url, idx) => (
                <div key={idx} className="group relative rounded-lg border border-white/8 bg-white/[0.02] p-2">
                  <audio src={url} controls className="h-8 w-full" />
                  {!locked && (
                    <button
                      type="button"
                      onClick={() => removeUrlAt(idx)}
                      className="absolute right-2 top-2 rounded bg-black/70 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      title="Remove"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {kind === "file" && urls.length > 0 && (
            <div className="space-y-1.5">
              {urls.map((url, idx) => (
                <div
                  key={idx}
                  className="group relative flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-purple-400" />
                  <span className="truncate font-mono text-[11px] text-zinc-400">
                    {url.split("/").pop() ?? url}
                  </span>
                  {!locked && (
                    <button
                      type="button"
                      onClick={() => removeUrlAt(idx)}
                      className="ml-auto rounded p-0.5 text-zinc-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
                      title="Remove"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
