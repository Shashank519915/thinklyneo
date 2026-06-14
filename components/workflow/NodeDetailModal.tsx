"use client";

/**
 * @fileoverview Per-node run detail modal (opened from RunDetailsModal → Inspect → "Show details").
 * Mirrors the reference: header, run summary, Input/Output sections with media previews and
 * clickable/copyable links, plus provider fallback attempts (same as RHP2).
 * Renders every recorded field — nothing is dropped.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Copy, ExternalLink, Check } from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import { classifyMediaUrl, formatDuration } from "@/lib/utils";
import {
  type NodeRunData,
  type RunField,
  buildInputFields,
  buildOutputFields,
  formatTimestampFull,
  looksLikeOpaquePayload,
  statusMeta,
  statusTextClass,
  truncateMiddle,
} from "./run-detail-utils";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title="Copy URL"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      className="shrink-0 rounded p-0.5 transition hover:bg-white/[0.08]"
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-400" aria-hidden />
      ) : (
        <Copy className="h-3 w-3 text-zinc-500 hover:text-zinc-300" aria-hidden />
      )}
    </button>
  );
}

/** Truncated link + copy + open-in-new-tab row for a media/URL value. */
function LinkRow({ url }: { url: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={url}
        className="truncate font-mono text-[11px] text-purple-400 hover:text-purple-300 hover:underline"
      >
        {truncateMiddle(url, 56)}
      </a>
      <CopyButton text={url} />
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title="Open in new tab"
        className="shrink-0 rounded p-0.5 transition hover:bg-white/[0.08]"
      >
        <ExternalLink className="h-3 w-3 text-zinc-500 hover:text-zinc-300" aria-hidden />
      </a>
    </span>
  );
}

/** Render a single field value: media preview + link, plain text, or JSON. */
function FieldValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-[11px] text-zinc-600">—</span>;
  }

  if (typeof value === "string") {
    const media = classifyMediaUrl(value.trim());
    if (media) {
      return (
        <div className="flex flex-col gap-2">
          {media.kind === "video" ? (
            <video
              src={media.url}
              controls
              preload="metadata"
              className="max-h-[150px] max-w-[250px] rounded-lg border border-white/[0.08]"
            />
          ) : media.kind === "audio" ? (
            <audio src={media.url} controls className="max-w-[250px]" />
          ) : media.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media.url}
              alt=""
              className="max-h-[150px] max-w-[250px] rounded-lg border border-white/[0.08] object-contain"
              loading="lazy"
            />
          ) : null}
          <LinkRow url={media.url} />
        </div>
      );
    }
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return <LinkRow url={value} />;
    }
    if (looksLikeOpaquePayload(value)) {
      return <span className="text-[11px] text-amber-400">Large/binary value omitted.</span>;
    }
    return (
      <span className="break-all text-[11px] leading-relaxed text-zinc-300">
        {value}
      </span>
    );
  }

  return (
    <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md border border-white/[0.08] bg-[#18181B] px-2 py-1.5 font-mono text-[10px] text-zinc-400">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function FieldCard({ field }: { field: RunField }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-white/[0.06] bg-white/[0.03] p-2">
      <div className="font-mono text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {field.label}
      </div>
      <div className="mt-0.5">
        <FieldValue value={field.value} />
      </div>
    </div>
  );
}

export default function NodeDetailModal({
  nodeRun,
  onClose,
}: {
  nodeRun: NodeRunData;
  onClose: () => void;
}) {
  const nodes = useWorkflowStore((s) => s.nodes);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  const meta = statusMeta(nodeRun.status);
  const inputFields = buildInputFields(nodeRun, nodes);
  const outputFields = buildOutputFields(nodeRun, nodes);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className="wf-canvas-panel relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-[18px]"
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-white/[0.08] px-4 py-3">
          <h2 className="truncate text-sm font-semibold text-zinc-100">
            {nodeRun.nodeName} — Details
          </h2>
          <p className="text-[11px] text-zinc-500">
            Input / Output with clickable links and media previews
          </p>
        </div>

        {/* Body */}
        <div className="max-h-[calc(85vh-80px)] overflow-auto p-4">
          {/* Summary */}
          <div className="rounded-xl border border-white/[0.08] bg-[#121215] p-4">
            <div className="text-sm font-medium text-zinc-100">Summary</div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">Status:</span>
                <span className={`font-medium ${statusTextClass(nodeRun.status)}`}>{meta.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">Duration:</span>
                <span className="font-medium text-zinc-200">{formatDuration(nodeRun.durationMs)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">Started:</span>
                <span className="text-zinc-200">{formatTimestampFull(nodeRun.startedAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">Finished:</span>
                <span className="text-zinc-200">{formatTimestampFull(nodeRun.finishedAt)}</span>
              </div>
            </div>
            {nodeRun.providerUsed && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="text-zinc-500">Provider:</span>
                <span className="font-medium text-purple-400">{nodeRun.providerUsed}</span>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3">
            {/* Input */}
            <div className="rounded-xl border border-white/[0.08] bg-[#121215] p-4">
              <div className="text-sm font-medium text-zinc-100">Input</div>
              <div className="mt-1 truncate text-[11px] text-zinc-500">
                {inputFields.length} field{inputFields.length === 1 ? "" : "s"}
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {inputFields.length === 0 ? (
                  <span className="text-[11px] text-zinc-600">No input recorded.</span>
                ) : (
                  inputFields.map((f) => <FieldCard key={f.key} field={f} />)
                )}
              </div>
            </div>

            {/* Output */}
            <div className="rounded-xl border border-white/[0.08] bg-[#121215] p-4">
              <div className="text-sm font-medium text-zinc-100">Output</div>
              <div className="mt-1 truncate text-[11px] text-zinc-500">
                {outputFields.length} field{outputFields.length === 1 ? "" : "s"}
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {outputFields.length === 0 ? (
                  <span className="text-[11px] text-zinc-600">No output recorded.</span>
                ) : (
                  outputFields.map((f) => <FieldCard key={f.key} field={f} />)
                )}
              </div>
            </div>

            {/* Provider fallback attempts (shown when present, mirrors RHP2) */}
            {nodeRun.providerAttempts && nodeRun.providerAttempts.length > 0 && (
              <div className="rounded-xl border border-white/[0.08] bg-[#121215] p-4">
                <div className="text-sm font-medium text-zinc-100">Attempts</div>
                <div className="mt-3 space-y-1.5">
                  {nodeRun.providerAttempts.map((attempt, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col gap-0.5 rounded border border-white/[0.08] bg-white/[0.03] px-2 py-1.5 text-[10px]"
                    >
                      <div className="flex items-center justify-between font-medium">
                        <span className="font-semibold text-zinc-300">{attempt.providerId}</span>
                        <div className="flex shrink-0 items-center gap-1.5 font-mono text-[9px]">
                          <span className={attempt.status === "success" ? "font-bold text-emerald-400" : "text-red-400"}>
                            {attempt.status.toUpperCase()}
                          </span>
                          <span className="text-zinc-600">({attempt.durationMs}ms)</span>
                        </div>
                      </div>
                      {attempt.error && (
                        <p className="mt-0.5 whitespace-pre-wrap break-words text-[9px] font-normal leading-normal text-red-400">
                          Error: {attempt.error}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error (only when present) */}
            {nodeRun.error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <div className="text-sm font-medium text-red-400">Error</div>
                <p className="mt-2 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-red-300">
                  {nodeRun.error}
                </p>
              </div>
            )}

            {/* Execution logs (only when present) — dark terminal block, same as RHP2 */}
            {nodeRun.logs && (
              <div className="rounded-xl border border-white/[0.08] bg-[#121215] p-4">
                <div className="text-sm font-medium text-zinc-100">Execution Logs</div>
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md bg-neutral-900 px-3 py-2 font-mono text-[10px] leading-snug text-neutral-200">
                  {nodeRun.logs}
                </pre>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          aria-label="Close"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>,
    document.body
  );
}
