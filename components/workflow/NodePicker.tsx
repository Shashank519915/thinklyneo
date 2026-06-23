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
import {
  EXECUTABLE_NODE_DEFINITIONS,
  buildDefaultNodeInputs,
} from "@shashank519915/shared";
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

/** Creates default node data from shared `NodeDefinition` (single source of truth for inputs). */
function createNode(nodeType: string): Node {
  const def = EXECUTABLE_NODE_DEFINITIONS[nodeType];
  if (!def) {
    throw new Error(`Unknown node type: ${nodeType}`);
  }
  return {
    id: generateNodeId(),
    type: nodeType,
    position: { x: 0, y: 0 },
    data: {
      label: def.name,
      inputs: buildDefaultNodeInputs(def),
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
      className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-white/[0.06]"
    >
      {entry.icon}
      <span className="min-w-0 truncate text-[13px] text-zinc-200">{entry.label}</span>
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
        className="w-[280px] shrink-0 p-[5px] rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md shadow-2xl fade-scale-in"
        style={{ height: 430 }}
      >
        <div className="relative w-full h-full rounded-[calc(1rem-5px)] bg-[#0A0A0C]/90 border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-hidden flex flex-col">
          <div className="absolute inset-0 pointer-events-none glass-noise z-0" />
          
          <div className="p-2.5 relative z-10">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  ref={searchRef}
                  placeholder="Search nodes or models..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (e.target.value.trim()) setActiveCategory(null);
                  }}
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.04] py-2 pl-10 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsNodePickerOpen(false)}
                className="shrink-0 rounded-lg p-2 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto px-2 pb-2 [scrollbar-width:thin] flex-1 relative z-10">
            {searchResults ? (
              <div className="space-y-0">
                {searchResults.map((n) => (
                  <NodeRow key={n.id} entry={n} onSelect={handleSelect} />
                ))}
                {searchResults.length === 0 && (
                  <div className="px-2.5 py-2 text-[12px] text-zinc-500">
                    No results for &ldquo;{query}&rdquo;
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="pb-1">
                  <div className="flex items-center gap-2 px-2 py-0.5 text-[11px] text-zinc-500">
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
                            ? "bg-white/10 text-zinc-100"
                            : "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300"
                        }`}
                      >
                        {section.icon}
                        <span className="flex-1">{section.label}</span>
                        <span className="text-[10px] font-normal text-zinc-600">{count}</span>
                        <ChevronRight
                          className={`h-4 w-4 shrink-0 text-zinc-600 transition-transform ${
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
      </div>

      {activeCategory && activeCategoryMeta && !searchResults && (
        <div
          className="ml-2 w-[240px] shrink-0 p-[5px] rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md shadow-2xl fade-scale-in"
          style={{ height: 430 }}
        >
          <div className="relative w-full h-full rounded-[calc(1rem-5px)] bg-[#0A0A0C]/90 border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-hidden flex flex-col">
            <div className="absolute inset-0 pointer-events-none glass-noise z-0" />
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500 relative z-10">
              {activeCategoryMeta.icon}
              {activeCategoryMeta.label}
            </div>
            <div className="overflow-y-auto px-2 py-2 [scrollbar-width:thin] flex-1 relative z-10">
              {categoryNodes.map((n) => (
                <NodeRow key={n.id} entry={n} onSelect={handleSelect} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
