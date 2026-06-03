"use client";

/**
 * @fileoverview Palette anchored to BottomToolbar “+”: instantiates Gemini/Crop nodes at viewport center (`viewportCenter`).
 */

import { useState, useEffect, useRef } from "react";
import {
  Search, X, Clock3, Crop, Sparkles,
  Image, Video, Mic, Layers, ChevronRight,
} from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import { generateNodeId } from "@/lib/utils";
import { type Node } from "@xyflow/react";

// ─── Our two functional nodes ────────────────────────────────────────────────

const RECENT_NODES = [
  {
    id: "gemini",
    label: "Gemini",
    nodeType: "gemini",
    icon: <Sparkles className="h-4 w-4 text-purple-600" />,
  },
  {
    id: "openRouter",
    label: "OpenRouter LLM",
    nodeType: "openRouter",
    icon: <Sparkles className="h-4 w-4 text-blue-600" />,
  },
  {
    id: "cropImage",
    label: "Crop Image",
    nodeType: "cropImage",
    icon: <Crop className="h-4 w-4 text-orange-500" />,
  },
  {
    id: "gptImage2",
    label: "GPT-Image-2",
    nodeType: "gptImage2",
    icon: <Image className="h-4 w-4 text-pink-500" />,
  },
  {
    id: "klingV3",
    label: "Kling v3 (Video)",
    nodeType: "klingV3",
    icon: <Video className="h-4 w-4 text-red-500" />,
  },
  {
    id: "mergeVideo",
    label: "Merge Videos",
    nodeType: "mergeVideo",
    icon: <Video className="h-4 w-4 text-teal-500" />,
  },
  {
    id: "mergeAV",
    label: "Merge A/V",
    nodeType: "mergeAV",
    icon: <Video className="h-4 w-4 text-cyan-500" />,
  },
  {
    id: "extractAudio",
    label: "Extract Audio",
    nodeType: "extractAudio",
    icon: <Mic className="h-4 w-4 text-amber-500" />,
  },
];

// ─── Reference category sections (non-clickable, display-only) ───────────────

const SECTIONS = [
  {
    id: "image",
    label: "IMAGE",
    icon: <Image className="h-3.5 w-3.5" />,
    items: ["Generate Image", "Edit Image", "3D"],
  },
  {
    id: "video",
    label: "VIDEO",
    icon: <Video className="h-3.5 w-3.5" />,
    items: ["Generate Video", "Enhance Video", "BG Remover"],
  },
  {
    id: "audio",
    label: "AUDIO",
    icon: <Mic className="h-3.5 w-3.5" />,
    items: ["Text to Speech", "Music Generation", "Sound Effects", "Other Audio Tools"],
  },
  {
    id: "others",
    label: "OTHERS",
    icon: <Layers className="h-3.5 w-3.5" />,
    items: ["Input", "Utility", "LLM Call"],
  },
];

// ─── Node factory ─────────────────────────────────────────────────────────────

/** Creates default node data payloads before `viewportCenter`-based placement and `addNode`. */
function createNode(nodeType: string): Node {
  const id = generateNodeId();
  const position = { x: 0, y: 0 };

  if (nodeType === "cropImage") {
    return {
      id,
      type: "cropImage",
      position,
      data: {
        label: "Crop Image",
        inputs: { inputImage: null, x: 0, y: 0, w: 100, h: 100 },
        output: null,
      },
    };
  }

  if (nodeType === "gptImage2") {
    return {
      id,
      type: "gptImage2",
      position,
      data: {
        label: "GPT-Image-2",
        inputs: { prompt: "", negativePrompt: "", aspectRatio: "1:1" },
        output: null,
      },
    };
  }

  if (nodeType === "klingV3") {
    return {
      id,
      type: "klingV3",
      position,
      data: {
        label: "Kling v3",
        inputs: { prompt: "", inputImage: null, aspectRatio: "16:9", duration: "5s" },
        output: null,
      },
    };
  }

  if (nodeType === "mergeVideo") {
    return {
      id,
      type: "mergeVideo",
      position,
      data: {
        label: "Merge Videos",
        inputs: { video_urls: [], transition: "none" },
        output: null,
      },
    };
  }

  if (nodeType === "mergeAV") {
    return {
      id,
      type: "mergeAV",
      position,
      data: {
        label: "Merge A/V",
        inputs: { videoUrl: "", audioUrl: "" },
        output: null,
      },
    };
  }

  if (nodeType === "extractAudio") {
    return {
      id,
      type: "extractAudio",
      position,
      data: {
        label: "Extract Audio",
        inputs: { videoUrl: "" },
        output: null,
      },
    };
  }

  if (nodeType === "openRouter") {
    return {
      id,
      type: "openRouter",
      position,
      data: {
        label: "OpenRouter LLM",
        inputs: {
          prompt: "",
          systemPrompt: "",
          images: [],
          video: null,
          audio: null,
          file: null,
          temperature: 1.0,
          maxTokens: 2048,
          topP: 0.95,
        },
        output: null,
      },
    };
  }

  return {
    id,
    type: "gemini",
    position,
    data: {
      label: "Gemini",
      inputs: {
        prompt: "",
        systemPrompt: "",
        images: [],
        video: null,
        audio: null,
        file: null,
        temperature: 1.0,
        maxTokens: 2048,
        topP: 0.95,
      },
      output: null,
    },
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

/** Dropdown search over “recent” tool entries; backdrop closes picker on Escape / outside mouse down. */
export default function NodePicker() {
  const { setIsNodePickerOpen, addNode, nodes, viewportCenter } = useWorkflowStore();
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 50);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsNodePickerOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setIsNodePickerOpen]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Element)) {
        setIsNodePickerOpen(false);
      }
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 100);
    return () => document.removeEventListener("mousedown", handler);
  }, [setIsNodePickerOpen]);

  const handleSelect = (nodeType: string) => {
    const node = createNode(nodeType);
    const stagger = (nodes.length % 5) * 30;
    node.position = {
      x: viewportCenter.x - 190 + stagger,
      y: viewportCenter.y - 100 + stagger,
    };
    addNode(node);
    setIsNodePickerOpen(false);
  };

  const filteredRecent = query
    ? RECENT_NODES.filter((n) => n.label.toLowerCase().includes(query.toLowerCase()))
    : RECENT_NODES;

  return (
    /* Position: above the + button, offset left to centre over it */
    <div
      className="absolute z-[60] -translate-x-24"
      style={{ bottom: "calc(100% + 14px)", left: 0 }}
    >
      <div
        ref={containerRef}
        className="w-[280px] overflow-hidden rounded-2xl border border-gray-200 bg-white/95 shadow-2xl backdrop-blur"
        style={{ height: 430 }}
      >
        {/* Search header */}
        <div className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                ref={searchRef}
                placeholder="Search nodes or models..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-xl border border-transparent bg-transparent py-2 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsNodePickerOpen(false)}
              className="shrink-0 rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-2 pb-2 [scrollbar-width:thin]" style={{ height: 370 }}>

          {/* Recent section — our two functional nodes */}
          <div className="pb-1">
            <div className="flex items-center gap-2 px-2 py-0.5 text-[11px] text-gray-500">
              <Clock3 className="h-3.5 w-3.5" />
              Recent
            </div>
            <div className="space-y-0">
              {filteredRecent.map((n) => (
                <div
                  key={n.id}
                  draggable
                  onClick={() => handleSelect(n.nodeType)}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-gray-50"
                >
                  {n.icon}
                  <div className="min-w-0">
                    <div className="truncate text-[13px] text-gray-700">{n.label}</div>
                  </div>
                </div>
              ))}
              {filteredRecent.length === 0 && (
                <div className="px-2.5 py-2 text-[12px] text-gray-400">
                  No results for &ldquo;{query}&rdquo;
                </div>
              )}
            </div>
          </div>

          {/* Category sections — display only, matching reference structure */}
          {!query && (
            <div className="pt-1">
              {SECTIONS.map((section) => (
                <div key={section.id} className="pt-1.5">
                  <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    {section.icon}
                    {section.label}
                  </div>
                  <div className="flex flex-col gap-0">
                    {section.items.map((item) => (
                      <div
                        key={item}
                        className="flex select-none items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors cursor-default hover:bg-gray-50"
                      >
                        <span className="min-w-0 flex-1 text-[13px] leading-snug text-gray-700">
                          {item}
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
