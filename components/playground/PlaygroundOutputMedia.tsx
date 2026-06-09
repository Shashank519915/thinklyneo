"use client";

import { ExternalLink, FileText, Music, Play } from "lucide-react";
import type { PlaygroundOutputSection } from "@/lib/playground-output";

type PlaygroundOutputMediaProps = {
  section: PlaygroundOutputSection;
};

export function PlaygroundOutputMedia({ section }: PlaygroundOutputMediaProps) {
  if (section.kind === "error" && section.error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
        <p className="font-mono text-xs text-red-300">{section.error}</p>
      </div>
    );
  }

  if (section.kind === "image" && section.url) {
    return (
      <div className="group relative overflow-hidden rounded-xl border border-white/8 bg-black/40">
        <img
          src={section.url}
          alt={section.label}
          className="max-h-[min(52vh,520px)] w-full object-contain"
          loading="lazy"
        />
        <a
          href={section.url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-black/60 text-white/80 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:text-white"
          title="Open image"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  if (section.kind === "video" && section.url) {
    return (
      <div className="overflow-hidden rounded-xl border border-white/8 bg-black/50">
        <video
          src={section.url}
          controls
          playsInline
          className="max-h-[min(52vh,520px)] w-full bg-black object-contain"
          preload="metadata"
        />
      </div>
    );
  }

  if (section.kind === "audio" && section.url) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 text-purple-300">
          <Music className="h-4 w-4" />
        </div>
        <audio src={section.url} controls className="min-w-0 flex-1" preload="metadata" />
      </div>
    );
  }

  if (section.text) {
    const isJson =
      section.text.trim().startsWith("{") || section.text.trim().startsWith("[");
    return (
      <div className="overflow-hidden rounded-xl border border-white/8 bg-[#08080A]">
        <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
          <FileText className="h-3.5 w-3.5 text-zinc-500" />
          <span className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">
            {isJson ? "JSON" : "Text"}
          </span>
        </div>
        <pre className="max-h-48 overflow-auto p-3 font-mono text-[11px] leading-relaxed text-zinc-300 [scrollbar-width:thin]">
          {section.text}
        </pre>
      </div>
    );
  }

  return null;
}

export function PlaygroundEmptyOutput({ running }: { running?: boolean }) {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 px-4 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03]">
        <Play className="h-5 w-5 text-zinc-600" />
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-300">
          {running ? "Executing workflow" : "No output yet"}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {running
            ? "Results will stream here as nodes complete"
            : "Configure inputs and press Run"}
        </p>
      </div>
    </div>
  );
}
