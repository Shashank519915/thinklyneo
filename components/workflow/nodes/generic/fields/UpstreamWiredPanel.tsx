"use client";

import React from "react";
import { Handle, Position } from "@xyflow/react";
import * as LucideIcons from "lucide-react";
import { parseMediaList } from "@/lib/media-list";
import { classifyMediaUrl } from "@/lib/utils";

interface UpstreamWiredPanelProps {
  param: any;
  wiredValue: any;
  handleId: string;
}

export function UpstreamWiredPanel({
  param,
  wiredValue,
  handleId,
}: UpstreamWiredPanelProps) {
  const wiredIsMedia =
    param.type === "image-array" ||
    param.type === "video-array" ||
    param.type === "audio-array" ||
    param.type === "file-upload" ||
    param.handle?.type === "image" ||
    param.handle?.type === "video" ||
    param.handle?.type === "audio" ||
    param.handle?.type === "file" ||
    (typeof wiredValue === "string" &&
      wiredValue.length > 0 &&
      classifyMediaUrl(wiredValue) !== null);

  const mediaUrls = parseMediaList(wiredValue);
  const isVideo = param.type === "video-array";
  const isAudio = param.type === "audio-array";
  const primaryUrl = mediaUrls[0];
  const wiredStr =
    typeof wiredValue === "string" ? wiredValue : (primaryUrl ?? "");

  return (
    <div
      className={`nodrag rounded-lg border bg-[#0A0A0C]/60 px-3 py-2 min-h-[3rem] text-[13px] ${
        wiredIsMedia
          ? "input-connected-media border-[#7C3AED]/[0.14]"
          : "input-connected border-[#7C3AED]/[0.12]"
      }`}
    >
      <p className="text-[9px] font-semibold uppercase tracking-wider text-[#7C3AED] mb-1 font-mono">
        Connected upstream
      </p>

      {/* Arrays (Image, Video, Audio) */}
      {param.type === "image-array" ||
      param.type === "video-array" ||
      param.type === "audio-array" ? (
        mediaUrls.length > 0 ? (
          <div className="flex flex-col gap-2 mt-1">
            <div
              className={`grid gap-2 ${
                isVideo || isAudio ? "grid-cols-2" : "grid-cols-3"
              }`}
            >
              {mediaUrls.map((url, idx) => (
                <div
                  key={idx}
                  className="relative overflow-hidden bg-black rounded-lg border border-white/10"
                  style={{
                    aspectRatio: isVideo || isAudio ? "4 / 3" : "1 / 1",
                  }}
                >
                  <div className="absolute left-1 top-1 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                    {idx + 1}
                  </div>
                  {isVideo ? (
                    <video
                      src={url}
                      className="w-full h-full object-cover"
                      preload="metadata"
                      playsInline
                    />
                  ) : isAudio ? (
                    <div className="flex h-full w-full items-center justify-center p-1">
                      <audio
                        src={url}
                        controls
                        className="w-full"
                        preload="metadata"
                      />
                    </div>
                  ) : (
                    <img
                      src={url}
                      alt={`preview-${idx}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
            {!isVideo && !isAudio && (
              <div className="flex flex-col gap-1 max-h-20 overflow-y-auto">
                {mediaUrls.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline font-mono transition-colors"
                  >
                    {url}
                  </a>
                ))}
              </div>
            )}
          </div>
        ) : (
          <span className="italic text-xs text-zinc-500">
            {isVideo ? "Waiting for videos..." : "Waiting for images..."}
          </span>
        )
      ) : param.type === "file-upload" ||
        param.handle?.type === "image" ||
        param.handle?.type === "video" ||
        param.handle?.type === "audio" ||
        param.handle?.type === "file" ? (
        // Single File/Media preview
        (() => {
          if (!primaryUrl) {
            return (
              <span className="italic text-xs text-zinc-500">
                Waiting for file URL...
              </span>
            );
          }

          return (
            <div className="mt-2">
              {param.handle?.type === "audio" ||
              wiredStr.endsWith(".mp3") ||
              wiredStr.endsWith(".wav") ||
              wiredStr.endsWith(".ogg") ||
              wiredStr.endsWith(".m4a") ? (
                <div className="flex flex-col gap-2">
                  {mediaUrls.map((url, idx) => (
                    <div key={idx} className="relative inline-block w-full">
                      <audio
                        src={url}
                        controls
                        preload="metadata"
                        className="nodrag w-full"
                        style={{ minWidth: 160 }}
                      />
                    </div>
                  ))}
                </div>
              ) : param.handle?.type === "video" ||
                mediaUrls.some((u) => /\.(mp4|webm|mov)(\?|$)/i.test(u)) ? (
                mediaUrls.length > 1 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {mediaUrls.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative w-full overflow-hidden rounded-md"
                        style={{
                          border: "2px solid rgba(34, 197, 94, 0.3)",
                        }}
                      >
                        <video
                          src={url}
                          controls
                          preload="metadata"
                          className="nodrag w-full rounded-sm"
                          style={{ maxHeight: 120 }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className="relative w-full max-w-[260px] overflow-hidden rounded-md"
                    style={{
                      border: "2px solid rgba(34, 197, 94, 0.3)",
                    }}
                  >
                    <video
                      src={primaryUrl}
                      controls
                      preload="metadata"
                      className="nodrag w-full rounded-sm"
                      style={{ maxHeight: 160 }}
                    />
                  </div>
                )
              ) : param.handle?.type === "image" ||
                primaryUrl.startsWith("data:image") ||
                /\.(jpeg|jpg|gif|png|webp)(\?|$)/i.test(primaryUrl) ? (
                mediaUrls.length > 1 ? (
                  <div className="flex flex-wrap gap-2">
                    {mediaUrls.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative max-w-[100px] overflow-hidden rounded-md"
                        style={{
                          border: "2px solid rgba(59, 130, 246, 0.3)",
                        }}
                      >
                        <img
                          src={url}
                          alt={`Inbound preview ${idx + 1}`}
                          className="nodrag w-full h-full object-cover"
                          style={{ maxHeight: 100 }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className="relative max-w-[200px] overflow-hidden rounded-md"
                    style={{
                      border: "2px solid rgba(59, 130, 246, 0.3)",
                    }}
                  >
                    <img
                      src={primaryUrl}
                      alt="Inbound preview"
                      className="nodrag w-full h-full object-cover"
                      style={{ maxHeight: 140 }}
                    />
                  </div>
                )
              ) : (
                <div className="flex flex-col gap-1">
                  {mediaUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 overflow-hidden rounded-md px-2 py-1.5 bg-[#0C0C0E]/80 max-w-[240px]"
                      style={{
                        border: "2px solid rgba(168, 85, 247, 0.3)",
                      }}
                    >
                      <LucideIcons.FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="truncate text-xs text-zinc-300 font-mono">
                        {url.split("/").pop() || "Document"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()
      ) : (
        <div className="max-h-[120px] overflow-y-auto nowheel whitespace-pre-wrap break-words text-xs leading-normal text-zinc-400">
          {wiredValue !== null && wiredValue !== undefined
            ? String(wiredValue)
            : "Waiting for upstream value..."}
        </div>
      )}
    </div>
  );
}
