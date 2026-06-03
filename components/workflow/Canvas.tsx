"use client";

/**
 * @fileoverview React Flow shell: validates connections, keyboard UX, marquee selection (“Run N nodes” pill), minimap,
 * preview/history coordination via workflow store (`nextflow:auto-arrange`, `nextflow:run-selected`).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  MarkerType,
  SelectionMode,
  useReactFlow,
  useViewport,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useWorkflowStore } from "@/store/workflow-store";
import { evaluateCanvasConnection } from "@/lib/canvas-connection";
import { generateEdgeId, getSourceHandleColor } from "@/lib/utils";
import {
  cropImageDefinition,
  openrouterLlmDefinition,
  geminiDefinition,
  gptImage2Definition,
  klingV3Definition,
  mergeVideoDefinition,
  mergeAVDefinition,
  extractAudioDefinition,
  type NodeDefinition,
} from "@galaxy/shared";
import RequestInputsNode from "./nodes/RequestInputsNode";
import CropImageNode from "./nodes/CropImageNode";
import GenericNode from "./nodes/GenericNode";
import ResponseNode from "./nodes/ResponseNode";
import AnimatedEdge from "./edges/AnimatedEdge";
import BottomToolbar from "./BottomToolbar";
import ControlsBar from "./ControlsBar";
import { Map, Minimize2, Play, X } from "lucide-react";

const nodeTypes = {
  requestInputs: RequestInputsNode,
  cropImage: CropImageNode,
  gemini: GenericNode,
  openRouter: GenericNode,
  gptImage2: GenericNode,
  klingV3: GenericNode,
  mergeVideo: GenericNode,
  mergeAV: GenericNode,
  extractAudio: GenericNode,
  response: ResponseNode,
};

const edgeTypes = {
  animatedEdge: AnimatedEdge,
};

// Shared node defs for resolving Response result-slot labels from the source output handle.
const NODE_DEFINITIONS: Record<string, NodeDefinition> = {
  cropImage: cropImageDefinition,
  gemini: geminiDefinition,
  openRouter: openrouterLlmDefinition,
  gptImage2: gptImage2Definition,
  klingV3: klingV3Definition,
  mergeVideo: mergeVideoDefinition,
  mergeAV: mergeAVDefinition,
  extractAudio: extractAudioDefinition,
};

/** Label for a new Response slot: prefer the source output handle's label, then node name. */
function resolveResultLabel(sourceType: string | undefined, sourceHandle: string | null | undefined): string {
  if (!sourceType) return "Result";
  if (sourceType === "requestInputs") return "Request Input";
  const def = NODE_DEFINITIONS[sourceType];
  if (def) {
    const key = sourceHandle?.replace(/^out:/, "");
    const outLabel = key ? def.outputs?.find((o) => o.key === key)?.label : undefined;
    return outLabel || def.name || "Result";
  }
  return "Result";
}

/** MiniMap tint derived from persisted node.type string. */
function getNodeColor(type: string | undefined): string {
  switch (type) {
    case "requestInputs":
      return "#6B7280";
    case "cropImage":
      return "#F97316";
    case "gemini":
    case "openRouter":
      return "#3B82F6";
    case "gptImage2":
      return "#A855F7";
    case "klingV3":
      return "#EF4444";
    case "mergeVideo":
      return "#14B8A6";
    case "mergeAV":
      return "#06B6D4";
    case "extractAudio":
      return "#F59E0B";
    case "response":
      return "#6366F1";
    default:
      return "#9CA3AF";
  }
}

/**
 * Floating “Run N nodes” chip aligned to the marquee selection’s top-left in flow/viewport space.
 *
 * NOTE: Uses `selectionFinalized` so the pill renders after mouseup (stable box). Selection still includes visually selected
 * handles-only nodes (`requestInputs`) even though execution filters them out downstream.
 */
function RunPill({
  selectedNodeIds,
  nodes,
  isRunning,
  selectModeActive,
  selectionFinalized,
}: {
  selectedNodeIds: string[];
  nodes: Node[];
  isRunning: boolean;
  selectModeActive: boolean;
  selectionFinalized: boolean;
}) {
  const { x: vpX, y: vpY, zoom } = useViewport();

  const n = selectedNodeIds.length;
  // Only show after mouse is released (selectionFinalized) and >1 node selected
  if (!selectModeActive || n <= 1 || isRunning || !selectionFinalized) return null;

  // Use ALL visually-selected nodes (node.selected === true) to match
  // the visual selection rectangle React Flow draws — which includes nodes
  // like RequestInputs that are excluded from execution but shown as selected.
  const visuallySelected = nodes.filter((nd) => nd.selected);
  if (visuallySelected.length === 0) return null;

  // Bounding box top-left in flow coordinates across all visually selected nodes
  let minX = Infinity, minY = Infinity;
  for (const nd of visuallySelected) {
    minX = Math.min(minX, nd.position.x);
    minY = Math.min(minY, nd.position.y);
  }

  // Convert flow → canvas-relative pixels:  screenPx = flowCoord * zoom + viewportOffset
  // Subtract React Flow's selection-rect outset (≈4px scaled) to align with the visual box edge
  const SELECTION_OUTSET = 4;
  const screenX = minX * zoom + vpX - SELECTION_OUTSET * zoom;
  const screenY = minY * zoom + vpY - SELECTION_OUTSET * zoom;

  // Base pill dimensions at zoom=1; CSS transform scales from top-left anchor
  const PILL_H = 32; // px at zoom=1
  const GAP    = 8;  // px gap above bounding box at zoom=1

  const handleRun = () => {
    window.dispatchEvent(
      new CustomEvent("nextflow:run-selected", { detail: { nodeIds: selectedNodeIds } })
    );
  };

  return (
    <button
      onClick={handleRun}
      className="absolute z-20 pointer-events-auto bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[13px] font-semibold rounded-lg shadow-lg transition-colors flex items-center gap-1.5 px-3.5 whitespace-nowrap"
      style={{
        left: screenX,
        // Offset upward by (PILL_H + GAP) scaled by zoom so pill sits above the box
        top: screenY - (PILL_H + GAP) * zoom,
        height: PILL_H,
        // Scale the whole pill from its top-left corner — same as how nodes scale
        transform: `scale(${zoom})`,
        transformOrigin: "top left",
      }}
    >
      <Play className="w-3 h-3 fill-white flex-shrink-0" />
      Run {n} nodes
    </button>
  );
}

/** React Flow tree with store wiring (nodes/edges, undo, select mode panning vs marquee per `selectionOnDrag`). */
function CanvasInner({ readOnly = false }: { readOnly?: boolean }) {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    setNodes,
    setEdges,
    pushHistory,
    setSelectedNodeIds,
    selectedNodeIds,
    isRunning,
    undo,
    redo,
    previewRunId,
    previewGhostNodes,
    clearPreviewRun,
    setViewportCenter,
    selectModeActive,
    setSelectModeActive,
    setReadOnly,
  } = useWorkflowStore();
  const workflowIdStore = useWorkflowStore((s) => s.workflowId);

  // Synchronize readOnly prop to Zustand store
  useEffect(() => {
    setReadOnly(readOnly);
    return () => setReadOnly(false);
  }, [readOnly, setReadOnly]);

  const { screenToFlowPosition, fitView, getViewport, setViewport } = useReactFlow();
  const [minimapOpen, setMinimapOpen] = useState(true);
  const [selectionFinalized, setSelectionFinalized] = useState(false);
  const clipboardRef = useRef<typeof nodes>([]);
  const fittedWorkflowRef = useRef<string | null>(null);

  // Keep viewportCenter in sync so NodePicker can place nodes at current view center,
  // and persist the full viewport (pan + zoom) per workflow so reloads restore the view.
  const canvasRef = useRef<HTMLDivElement>(null);
  const viewportStorageKey = workflowIdStore ? `galaxy:viewport:${workflowIdStore}` : null;

  const updateViewportCenter = useCallback(() => {
    const el = canvasRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const center = screenToFlowPosition({ x: width / 2, y: height / 2 });
    setViewportCenter(center);

    // Persist current pan/zoom (skip in read-only views so they don't overwrite the user's edit view)
    if (!readOnly && viewportStorageKey) {
      try {
        const vp = getViewport();
        window.localStorage.setItem(viewportStorageKey, JSON.stringify(vp));
      } catch {
        /* localStorage unavailable (private mode / quota) — non-fatal */
      }
    }
  }, [screenToFlowPosition, setViewportCenter, readOnly, viewportStorageKey, getViewport]);

  // Track whether the drag-selection is complete (mouse released).
  // The pill only shows after mouseup so it appears on the final compact bounding box.
  // We only clear selectionFinalized when the mousedown lands on the ReactFlow pane itself
  // (not on overlays like RunPill, MiniMap toggle, etc.) to prevent pill from blinking on click.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't reset when clicking overlays (buttons, pills, panels on top of canvas)
      if (target.closest("button") || target.closest("[data-overlay]")) return;
      // Only reset when clicking the RF pane background itself
      const pane = el.querySelector(".react-flow__pane");
      if (pane && pane.contains(target)) {
        setSelectionFinalized(false);
      }
    };
    const onUp = () => setSelectionFinalized(true);
    el.addEventListener("mousedown", onDown);
    el.addEventListener("mouseup",   onUp);
    return () => {
      el.removeEventListener("mousedown", onDown);
      el.removeEventListener("mouseup",   onUp);
    };
  }, []);

  const isValidConnectionCallback = useCallback(
    (connection: Connection | Edge) => {
      return evaluateCanvasConnection(nodes, edges, connection).allowed;
    },
    [nodes, edges]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const evaluation = evaluateCanvasConnection(nodes, edges, connection);
      if (!evaluation.allowed) {
        if (evaluation.reason === "duplicate-target") {
          window.alert(
            evaluation.error ??
              "Only one connection is allowed for this input. Disconnect the existing wire first."
          );
        } else if (evaluation.reason === "single-video-only") {
          window.alert(
            evaluation.error ??
              "Merge Audio & Video accepts only one video input."
          );
        } else if (evaluation.reason === "cycle") {
          console.warn("Connection would create a cycle:", evaluation.error);
        }
        return;
      }

      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      let finalTargetHandle = connection.targetHandle;

      if (targetNode?.type === "response") {
        const defaultLabel = resolveResultLabel(sourceNode?.type as string | undefined, connection.sourceHandle);

        // If connecting to the generic 'result' handle (the empty slot drop zone)
        if (connection.targetHandle === "result") {
          const newResultId = `res_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          finalTargetHandle = newResultId;
          
          const existingResults = (targetNode.data as any).results || [];
          const { updateNodeData } = useWorkflowStore.getState();
          updateNodeData(targetNode.id, {
            results: [...existingResults, { id: newResultId, label: defaultLabel, value: null }]
          });
        }
      }

      pushHistory();
      const edgeColor = getSourceHandleColor(connection.sourceHandle);
      const newEdge: Edge = {
        ...connection,
        id: generateEdgeId(),
        type: "animatedEdge",
        data: { color: edgeColor },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColor,
          width: 16,
          height: 16,
        },
        source: connection.source ?? "",
        target: connection.target ?? "",
        targetHandle: finalTargetHandle,
      };
      setEdges(addEdge(newEdge, edges));
    },
    [nodes, edges, pushHistory, setEdges]
  );

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: Node[] }) => {
      // Exclude requestInputs from selection (per assignment requirement)
      const filtered = selectedNodes
        .filter((n) => n.type !== "requestInputs")
        .map((n) => n.id);
      setSelectedNodeIds(filtered);
    },
    [setSelectedNodeIds]
  );

  // Keyboard shortcuts
  useEffect(() => {
    if (readOnly) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      // Ctrl/Cmd+Z → undo
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault(); undo(); return;
      }
      // Ctrl/Cmd+Shift+Z or Ctrl+Y → redo
      if (((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) ||
          ((e.metaKey || e.ctrlKey) && e.key === "y")) {
        e.preventDefault(); redo(); return;
      }
      // Ctrl/Cmd+A → select all (non-protected)
      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        e.preventDefault();
        const selectable = nodes.filter((n) => n.type !== "requestInputs" && n.type !== "response");
        setSelectedNodeIds(selectable.map((n) => n.id));
        setNodes(nodes.map((n) => ({ ...n, selected: n.type !== "requestInputs" && n.type !== "response" })));
        return;
      }
      // Esc → deselect all
      if (e.key === "Escape") {
        setSelectedNodeIds([]);
        setNodes(nodes.map((n) => ({ ...n, selected: false })));
        return;
      }
      // Ctrl/Cmd+C → copy selected nodes
      if ((e.metaKey || e.ctrlKey) && e.key === "c" && !e.shiftKey) {
        const selected = nodes.filter((n) => selectedNodeIds.includes(n.id));
        if (selected.length > 0) {
          clipboardRef.current = selected;
        }
        return;
      }
      // Ctrl/Cmd+V → paste copied nodes
      if ((e.metaKey || e.ctrlKey) && e.key === "v" && !e.shiftKey) {
        if (clipboardRef.current.length === 0) return;
        e.preventDefault();
        pushHistory();
        const offset = 40;
        const newNodes = clipboardRef.current.map((n) => ({
          ...n,
          id: `${n.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          position: { x: n.position.x + offset, y: n.position.y + offset },
          selected: true,
          data: { ...n.data },
        }));
        setNodes([...nodes.map((n) => ({ ...n, selected: false })), ...newNodes]);
        return;
      }
      // Ctrl/Cmd+D → duplicate (without edges)
      if ((e.metaKey || e.ctrlKey) && e.key === "d" && !e.shiftKey) {
        const selected = nodes.filter((n) => selectedNodeIds.includes(n.id));
        if (selected.length === 0) return;
        e.preventDefault();
        pushHistory();
        const offset = 40;
        const newNodes = selected.map((n) => ({
          ...n,
          id: `${n.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          position: { x: n.position.x + offset, y: n.position.y + offset },
          selected: true,
          data: { ...n.data },
        }));
        setNodes([...nodes.map((n) => ({ ...n, selected: false })), ...newNodes]);
        return;
      }
      // Ctrl/Cmd+Shift+D → duplicate with edges
      if ((e.metaKey || e.ctrlKey) && e.key === "d" && e.shiftKey) {
        const selected = nodes.filter((n) => selectedNodeIds.includes(n.id));
        if (selected.length === 0) return;
        e.preventDefault();
        pushHistory();
        const offset = 40;
        const idMap: Record<string, string> = {};
        const newNodes = selected.map((n) => {
          const newId = `${n.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          idMap[n.id] = newId;
          return {
            ...n,
            id: newId,
            position: { x: n.position.x + offset, y: n.position.y + offset },
            selected: true,
            data: { ...n.data },
          };
        });
        const selectedIdSet = new Set(selected.map((n) => n.id));
        const newEdges = edges
          .filter((e) => selectedIdSet.has(e.source) && selectedIdSet.has(e.target))
          .map((e) => ({
            ...e,
            id: `${e.id}-copy-${Date.now()}`,
            source: idMap[e.source] ?? e.source,
            target: idMap[e.target] ?? e.target,
          }));
        setNodes([...nodes.map((n) => ({ ...n, selected: false })), ...newNodes]);
        setEdges([...edges, ...newEdges]);
        return;
      }
      // F → fit view
      if (e.key === "f" || e.key === "F") {
        e.preventDefault(); fitView({ padding: 0.1, duration: 400 }); return;
      }
      // S → toggle select mode
      if (e.key === "s" || e.key === "S") {
        e.preventDefault(); setSelectModeActive(!selectModeActive); return;
      }
      // Shift+A → auto-arrange
      if (e.shiftKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("nextflow:auto-arrange"));
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, fitView, selectModeActive, setSelectModeActive, nodes, edges, selectedNodeIds, setNodes, setEdges, pushHistory, setSelectedNodeIds]);

  useEffect(() => {
    fittedWorkflowRef.current = null;
  }, [workflowIdStore]);

  /**
   * On workflow load, restore the previously saved pan/zoom from localStorage.
   * Falls back to `fitView` only when there is no saved viewport (first visit / cleared storage),
   * so we no longer clobber the user's chosen zoom on every reload.
   */
  useEffect(() => {
    if (!workflowIdStore || nodes.length === 0) return;
    if (fittedWorkflowRef.current === workflowIdStore) return;
    fittedWorkflowRef.current = workflowIdStore;

    let saved: { x: number; y: number; zoom: number } | null = null;
    if (viewportStorageKey) {
      try {
        const raw = window.localStorage.getItem(viewportStorageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (
            parsed &&
            typeof parsed.x === "number" &&
            typeof parsed.y === "number" &&
            typeof parsed.zoom === "number"
          ) {
            saved = parsed;
          }
        }
      } catch {
        saved = null;
      }
    }

    const t = window.setTimeout(() => {
      if (saved) {
        setViewport(saved, { duration: 0 });
      } else {
        fitView({ padding: 0.12, duration: 220 });
      }
    }, 100);
    return () => window.clearTimeout(t);
  }, [workflowIdStore, nodes.length, fitView, setViewport, viewportStorageKey]);

  return (
    <div ref={canvasRef} className="relative h-full w-full overflow-hidden bg-[#F5F5F5]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        isValidConnection={isValidConnectionCallback}
        onNodesChange={readOnly ? undefined : (changes) => {
          // Push history before any remove changes (Delete/Backspace key path)
          const hasRemove = changes.some(
            (c) => c.type === "remove" &&
              c.id !== "request-inputs" && c.id !== "response" &&
              (() => { const n = nodes.find((x) => x.id === c.id); return n?.type !== "requestInputs" && n?.type !== "response"; })()
          );
          if (hasRemove) pushHistory();

          const filtered = changes.filter((c) => {
            if (c.type === "remove") {
              const node = nodes.find((n) => n.id === c.id);
              if (node?.type === "requestInputs" || node?.type === "response") return false;
              if (c.id === "request-inputs" || c.id === "response") return false;
            }
            return true;
          });
          onNodesChange(filtered);
        }}
        onEdgesChange={readOnly ? undefined : onEdgesChange}
        onConnect={readOnly ? undefined : onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        minZoom={0.2}
        maxZoom={2.5}
        panOnScroll
        zoomOnScroll
        // In select mode: disable pan-on-drag, enable selection rectangle on drag
        panOnDrag={readOnly ? true : (selectModeActive ? false : true)}
        selectionOnDrag={readOnly ? false : selectModeActive}
        selectionMode={SelectionMode.Partial}
        onMoveEnd={updateViewportCenter}
        onNodeDragStart={readOnly ? undefined : () => pushHistory()}
        onSelectionChange={readOnly ? undefined : onSelectionChange}
        deleteKeyCode={readOnly ? null : ["Backspace", "Delete"]}
        multiSelectionKeyCode={readOnly ? null : "Shift"}
        fitViewOptions={{ padding: 0.1 }}
        style={{ background: "#F5F5F5" }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
        nodesFocusable={!readOnly}
        edgesFocusable={!readOnly}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color="#D1D5DB"
        />

        {/* MiniMap inside ReactFlow — must be a child of ReactFlow */}
        {minimapOpen && (
          <MiniMap
            nodeColor={(node) => getNodeColor(node.type)}
            maskColor="rgba(0,0,0,0.75)"
            style={{
              width: 160,
              height: 100,
              border: "1px solid #374151",
              borderRadius: 8,
              background: "#111827",
            }}
            position="bottom-right"
            zoomable
            pannable
          />
        )}
      </ReactFlow>

      {/* MiniMap collapse button — large white rounded square at top-right outside corner */}
      {minimapOpen ? (
        <button
          onClick={() => setMinimapOpen(false)}
          className="absolute bottom-[92px] right-[8px] w-9 h-9 flex items-center justify-center bg-white hover:bg-gray-50 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-700 transition-colors shadow-md z-20"
          title="Collapse minimap"
        >
          <Minimize2 className="w-4 h-4" />
        </button>
      ) : (
        <div className="absolute bottom-4 right-4 z-10">
          <button
            onClick={() => setMinimapOpen(true)}
            className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-xl shadow-md text-gray-500 hover:bg-gray-50 transition-colors"
            title="Show minimap"
          >
            <Map className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Bottom-left controls bar */}
      {!readOnly && (
        <div className="absolute bottom-4 left-4 z-10">
          <ControlsBar />
        </div>
      )}

      {/* Bottom-centre toolbar (sticky note + add node button) */}
      {!readOnly && <BottomToolbar />}

      {/* Run N nodes pill — floats above top-left of selected nodes bounding box */}
      {!readOnly && (
        <RunPill
          selectedNodeIds={selectedNodeIds}
          nodes={nodes}
          isRunning={isRunning}
          selectModeActive={selectModeActive}
          selectionFinalized={selectionFinalized}
        />
      )}

      {/* Preview mode banner and info button are rendered in page.tsx (above the Canvas) */}
    </div>
  );
}

/** Wraps `<ReactFlowProvider>` around `CanvasInner` so hooks like `useReactFlow()` resolve correctly. */
export default function Canvas({ readOnly = false }: { readOnly?: boolean }) {
  return (
    <ReactFlowProvider>
      <CanvasInner readOnly={readOnly} />
    </ReactFlowProvider>
  );
}
