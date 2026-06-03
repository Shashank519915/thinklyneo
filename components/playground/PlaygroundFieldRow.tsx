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
  const cls = "h-4 w-4";
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
  const locked = disabled || (isPromoted && false);

  const removeUrlAt = (index: number) => {
    const next = urls.filter((_, i) => i !== index);
    onChange(next.join(","));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground/70">
          <FieldIcon kind={kind} />
        </span>
        <label className="text-[13px] font-medium text-foreground">{field.label}</label>
        {isPromoted && (
          <span
            className="inline-flex items-center gap-0.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
            title="Added to request from a node on the workflow canvas"
          >
            <Link2 className="h-3 w-3" />
            Promoted
          </span>
        )}
        <span className="ml-auto text-[11px] capitalize text-muted-foreground/50">{kind}</span>
      </div>

      {kind === "select" && (field.selectOptions?.length ?? 0) > 0 && (
        <div className="relative">
          <button
            type="button"
            disabled={locked}
            onClick={() => !locked && setSelectOpen((o) => !o)}
            className={`flex h-10 w-full items-center justify-between rounded-[18px] border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring ${
              locked ? "cursor-not-allowed opacity-60" : "cursor-pointer"
            }`}
          >
            <span className="truncate">
              {field.selectOptions?.find((o) => o.value === displayValue)?.label ||
                displayValue ||
                "Select..."}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </button>
          {selectOpen && !locked && (
            <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-xl border border-border bg-card p-1 shadow-lg">
              {field.selectOptions?.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setSelectOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  {opt.value === displayValue && <Check className="h-3.5 w-3.5" />}
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
              className="h-2 min-w-[60px] flex-1 accent-primary disabled:opacity-60"
            />
            <input
              type="number"
              min={field.numberMin}
              max={field.numberMax}
              step={field.numberStep ?? 1}
              value={displayValue}
              disabled={locked}
              onChange={(e) => onChange(e.target.value)}
              className="w-14 rounded-lg border border-input bg-background px-1.5 py-1 text-center text-xs disabled:opacity-60"
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
            className="flex h-10 w-full rounded-[18px] border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          />
        )}

      {kind === "boolean" && (
        <label
          className={`flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5 ${
            locked ? "cursor-not-allowed opacity-60" : "cursor-pointer"
          }`}
        >
          <button
            type="button"
            role="switch"
            aria-checked={displayValue === "true"}
            disabled={locked}
            onClick={() => !locked && onChange(displayValue === "true" ? "false" : "true")}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
              displayValue === "true" ? "bg-primary" : "bg-input"
            } ${locked ? "opacity-60" : ""}`}
          >
            <span
              className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow transition-transform ${
                displayValue === "true" ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <span className="text-sm text-foreground">
            {displayValue === "true" ? "True" : "False"}
          </span>
        </label>
      )}

      {kind === "text" && (
        <div className="relative">
          <textarea
            placeholder={`Enter ${field.label}...`}
            rows={3}
            value={displayValue}
            disabled={locked}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[60px] w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
          />
          {onExpandText && !locked && (
            <button
              type="button"
              onClick={onExpandText}
              className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-md bg-muted/80 text-muted-foreground hover:bg-muted border-0 cursor-pointer"
              title="Expand"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {(kind === "image" || kind === "video" || kind === "audio" || kind === "file") && (
        <div className="space-y-2">
          <div className="relative">
            <button
              type="button"
              tabIndex={-1}
              disabled={locked || uploading || urls.length >= maxAssets}
              onClick={() => document.getElementById(`pg-file-${field.id}`)?.click()}
              className={`flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background px-4 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground ${
                locked || uploading ? "cursor-not-allowed opacity-60" : "cursor-pointer"
              }`}
            >
              {uploading ? (
                <>
                  <SpinningLogo size="sm" />
                  <span>Uploading...</span>
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
          </div>

          {kind === "image" && urls.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {urls.map((url, idx) => (
                <div key={idx} className="group relative">
                  <div
                    className="overflow-hidden rounded-lg bg-muted/30"
                    style={{ border: "2px solid rgba(59, 130, 246, 0.3)", aspectRatio: "1 / 1" }}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </div>
                  {!locked && (
                    <button
                      type="button"
                      onClick={() => removeUrlAt(idx)}
                      className="absolute right-1 top-1 z-10 rounded bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500 border-0 cursor-pointer"
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
            <div className="grid grid-cols-3 gap-2">
              {urls.map((url, idx) => (
                <div key={idx} className="group relative">
                  <div
                    className="overflow-hidden rounded-lg bg-muted/30"
                    style={{ border: "2px solid rgba(34, 197, 94, 0.3)", aspectRatio: "4 / 3" }}
                  >
                    <video
                      src={url}
                      className="h-full w-full object-cover"
                      preload="metadata"
                      playsInline
                    />
                  </div>
                  {!locked && (
                    <button
                      type="button"
                      onClick={() => removeUrlAt(idx)}
                      className="absolute right-1 top-1 z-10 rounded bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500 border-0 cursor-pointer"
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
            <div className="space-y-2">
              {urls.map((url, idx) => (
                <div key={idx} className="group relative">
                  <audio src={url} controls className="w-full" />
                  {!locked && (
                    <button
                      type="button"
                      onClick={() => removeUrlAt(idx)}
                      className="absolute right-1 top-1 z-10 rounded bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500 border-0 cursor-pointer"
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
            <div className="space-y-2">
              {urls.map((url, idx) => (
                <div key={idx} className="group relative">
                  <div
                    className="flex items-center gap-2 overflow-hidden rounded-lg bg-muted/30 px-3 py-2"
                    style={{ border: "2px solid rgba(168, 85, 247, 0.3)" }}
                  >
                    <FileText className="h-4 w-4 shrink-0 text-purple-500" />
                    <span className="truncate text-sm text-foreground">
                      {url.split("/").pop() ?? url}
                    </span>
                  </div>
                  {!locked && (
                    <button
                      type="button"
                      onClick={() => removeUrlAt(idx)}
                      className="absolute right-1 top-1 z-10 rounded bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500 border-0 cursor-pointer"
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
