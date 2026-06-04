"use client";

/**
 * @fileoverview Palette anchored to BottomToolbar “+”: recent list, category side panel, search.
 */

import { useState, useEffect, useRef, type RefObject } from "react";
import {
  Search,
  X,
  Clock3,
  Crop,
  Sparkles,
  Image,
  Video,
  Mic,
  Layers,
  ChevronRight,
} from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import { generateNodeId } from "@/lib/utils";
import { type Node } from "@xyflow/react";

type NodeCategory = "image" | "video" | "audio" | "others";

type CatalogNode = {
  id: string;
  label: string;
  nodeType: string;
  category: NodeCategory;
  icon: React.ReactNode;
};

const NODE_CATALOG: CatalogNode[] = [
  {
    id: "gemini",
    label: "Gemini",
    nodeType: "gemini",
    category: "others",
    icon: <Sparkles className="h-4 w-4 text-purple-600" />,
  },
  {
    id: "openRouter",
    label: "OpenRouter LLM",
    nodeType: "openRouter",
    category: "others",
    icon: <Sparkles className="h-4 w-4 text-blue-600" />,
  },
  {
    id: "cropImage",
    label: "Crop Image",
    nodeType: "cropImage",
    category: "image",
    icon: <Crop className="h-4 w-4 text-orange-500" />,
  },
  {
    id: "gptImage2",
    label: "GPT-Image-2",
    nodeType: "gptImage2",
    category: "image",
    icon: <Image className="h-4 w-4 text-pink-500" />,
  },
  {
    id: "klingV3",
    label: "Kling v3 (Video)",
    nodeType: "klingV3",
    category: "video",
    icon: <Video className="h-4 w-4 text-red-500" />,
  },
  {
    id: "mergeVideo",
    label: "Merge Videos",
    nodeType: "mergeVideo",
    category: "video",
    icon: <Video className="h-4 w-4 text-teal-500" />,
  },
  {
    id: "mergeAV",
    label: "Merge Audio & Video",
    nodeType: "mergeAV",
    category: "video",
    icon: <Video className="h-4 w-4 text-cyan-500" />,
  },
  {
    id: "extractAudio",
    label: "Extract Audio",
    nodeType: "extractAudio",
    category: "audio",
    icon: <Mic className="h-4 w-4 text-amber-500" />,
  },
];

const CATEGORIES: Array<{
  id: NodeCategory;
  label: string;
  icon: React.ReactNode;
}> = [
  { id: "image", label: "IMAGE", icon: <Image className="h-3.5 w-3.5" /> },
  { id: "video", label: "VIDEO", icon: <Video className="h-3.5 w-3.5" /> },
  { id: "audio", label: "AUDIO", icon: <Mic className="h-3.5 w-3.5" /> },
  { id: "others", label: "OTHERS", icon: <Layers className="h-3.5 w-3.5" /> },
];

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
        label: "Merge Audio & Video",
        inputs: { video_url: null, audio_url: null, audio_volume: 0.5 },
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
        inputs: { videoUrl: "", format: "mp3" },
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
          image_urls: [],
          video_urls: [],
          audio_urls: [],
          temperature: 0.5,
          maxTokens: 1024,
          topP: 1,
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
        image_urls: [],
        video_urls: [],
        audio_urls: [],
        temperature: 0.5,
        maxTokens: 1024,
        topP: 1,
      },
      output: null,
    },
  };
}

function NodeRow({
  entry,
  onSelect,
}: {
  entry: CatalogNode;
  onSelect: (nodeType: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(entry.nodeType)}
      className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:bg-gray-50"
    >
      {entry.icon}
      <span className="min-w-0 truncate text-[13px] text-gray-700">{entry.label}</span>
    </button>
  );
}

interface NodePickerProps {
  /** Wrapper around FAB + picker — outside clicks close; FAB clicks toggle only. */
  anchorRef: RefObject<HTMLDivElement | null>;
}

/** Dropdown search over nodes; category click opens a right-hand list for that category. */
export default function NodePicker({ anchorRef }: NodePickerProps) {
  const { setIsNodePickerOpen, addNode, nodes, viewportCenter } = useWorkflowStore();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<NodeCategory | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsNodePickerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setIsNodePickerOpen]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (anchorRef.current?.contains(target)) return;
      setIsNodePickerOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [anchorRef, setIsNodePickerOpen]);

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

  const q = query.trim().toLowerCase();
  const searchResults = q
    ? NODE_CATALOG.filter((n) => n.label.toLowerCase().includes(q))
    : null;

  const categoryNodes = activeCategory
    ? NODE_CATALOG.filter((n) => n.category === activeCategory)
    : [];

  const activeCategoryMeta = CATEGORIES.find((c) => c.id === activeCategory);

  return (
    <div
      className="absolute z-[60] flex -translate-x-24 items-end"
      style={{ bottom: "calc(100% + 14px)", left: 0 }}
    >
      <div
        className="w-[280px] shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-white/95 shadow-2xl backdrop-blur"
        style={{ height: 430 }}
      >
        <div className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                ref={searchRef}
                placeholder="Search nodes or models..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (e.target.value.trim()) setActiveCategory(null);
                }}
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

        <div className="overflow-y-auto px-2 pb-2 [scrollbar-width:thin]" style={{ height: 370 }}>
          {searchResults ? (
            <div className="space-y-0">
              {searchResults.map((n) => (
                <NodeRow key={n.id} entry={n} onSelect={handleSelect} />
              ))}
              {searchResults.length === 0 && (
                <div className="px-2.5 py-2 text-[12px] text-gray-400">
                  No results for &ldquo;{query}&rdquo;
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="pb-1">
                <div className="flex items-center gap-2 px-2 py-0.5 text-[11px] text-gray-500">
                  <Clock3 className="h-3.5 w-3.5" />
                  Recent
                </div>
                <div className="space-y-0">
                  {NODE_CATALOG.map((n) => (
                    <NodeRow key={n.id} entry={n} onSelect={handleSelect} />
                  ))}
                </div>
              </div>

              <div className="pt-1">
                {CATEGORIES.map((section) => {
                  const count = NODE_CATALOG.filter((n) => n.category === section.id).length;
                  const isActive = activeCategory === section.id;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() =>
                        setActiveCategory((prev) => (prev === section.id ? null : section.id))
                      }
                      className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-left text-[11px] font-medium uppercase tracking-wide transition-colors ${
                        isActive
                          ? "bg-gray-100 text-gray-800"
                          : "text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {section.icon}
                      <span className="flex-1">{section.label}</span>
                      <span className="text-[10px] font-normal text-gray-400">{count}</span>
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${
                          isActive ? "rotate-90" : ""
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {activeCategory && activeCategoryMeta && !searchResults && (
        <div
          className="ml-2 w-[240px] shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-white/95 shadow-2xl backdrop-blur"
          style={{ height: 430 }}
        >
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">
            {activeCategoryMeta.icon}
            {activeCategoryMeta.label}
          </div>
          <div className="overflow-y-auto px-2 py-2 [scrollbar-width:thin]" style={{ height: 388 }}>
            {categoryNodes.map((n) => (
              <NodeRow key={n.id} entry={n} onSelect={handleSelect} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
