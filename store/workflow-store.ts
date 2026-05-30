/**
 * @fileoverview Zustand store backing every workflow canvas interaction: RF change application, selective undo/redo snapshots,
 * execution overlays, persisted history replay metadata, marquee selection bookkeeping.
 */

import { create } from "zustand";
import {
  type Node,
  type Edge,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";

export interface WorkflowField {
  id: string;
  type: "text_field" | "image_field";
  label: string;
  value: string | null;
}

export interface RequestInputsData {
  label: string;
  fields: WorkflowField[];
}

export interface CropImageData {
  label: string;
  inputs: {
    inputImage: string | null;
    x: number;
    y: number;
    w: number;
    h: number;
  };
  output: string | null;
}

export interface GeminiData {
  label: string;
  model: string;
  inputs: {
    prompt: string | null;
    systemPrompt: string | null;
    images: string[];
    video: string | null;
    audio: string | null;
    file: string | null;
    temperature: number;
    maxTokens: number;
    topP: number;
  };
  output: string | null;
}

export interface ResponseResult {
  id: string;
  label: string;
  value: string | null;
}

export interface ResponseData {
  label: string;
  results: ResponseResult[];
}

export type NodeData = RequestInputsData | CropImageData | GeminiData | ResponseData;

interface HistorySnapshot {
  nodes: Node[];
  edges: Edge[];
}

interface WorkflowRun {
  id: string;
  scope: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  nodeRuns: {
    id: string;
    nodeId: string;
    nodeName: string;
    status: string;
    startedAt: string;
    finishedAt?: string;
    durationMs?: number;
    inputs?: Record<string, unknown>;
    output?: string | null;
    error?: string;
  }[];
}

interface WorkflowStore {
  // Canvas state
  nodes: Node[];
  edges: Edge[];
  workflowId: string | null;
  workflowName: string;

  // Setters
  setWorkflowId: (id: string) => void;
  setWorkflowName: (name: string) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;

  // Node actions
  addNode: (node: Node) => void;
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void;
  deleteNode: (nodeId: string) => void;

  // Execution state
  executingNodeIds: string[];
  nodeOutputs: Record<string, unknown>;
  nodeErrors: Record<string, string>;
  isRunning: boolean;
  currentRunId: string | null;
  /** Scope of the in-flight run (for live history pill). Cleared when run ends. */
  currentRunScope: "full" | "partial" | "single" | null;

  // Execution actions
  setNodeExecuting: (nodeId: string, executing: boolean) => void;
  setNodeOutput: (nodeId: string, output: unknown) => void;
  setNodeError: (nodeId: string, error: string) => void;
  clearExecutionState: () => void;
  clearCanvasNodeData: () => void;
  setIsRunning: (running: boolean) => void;
  setCurrentRunId: (id: string | null) => void;
  setCurrentRunScope: (scope: "full" | "partial" | "single" | null) => void;

  // Preview mode — shows a historical run's outputs on the canvas
  previewRunId: string | null;
  previewRunTimestamp: string | null;
  previewNodeOutputs: Record<string, unknown>;
  previewNodeErrors: Record<string, string>;
  // nodeIds that were in the previewed run
  previewRunNodeIds: Set<string>;
  // per-node: field ids that existed in the run (for RequestInputs)
  previewRunNodeFields: Record<string, Set<string>>;
  // ghost info: nodes that ran historically but are gone from current canvas
  previewGhostNodes: Array<{ nodeId: string; nodeName: string; fields?: string[] }>;
  setPreviewRun: (run: WorkflowRun) => void;
  clearPreviewRun: () => void;

  // History (run history from DB)
  runHistory: WorkflowRun[];
  setRunHistory: (runs: WorkflowRun[]) => void;
  addRunHistory: (run: WorkflowRun) => void;

  // Undo/Redo
  undoStack: HistorySnapshot[];
  redoStack: HistorySnapshot[];
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  // UI state
  isNodePickerOpen: boolean;
  isHistoryPanelOpen: boolean;
  selectedNodeIds: string[];
  viewportCenter: { x: number; y: number };
  selectModeActive: boolean;
  setIsNodePickerOpen: (open: boolean) => void;
  setIsHistoryPanelOpen: (open: boolean) => void;
  setSelectedNodeIds: (ids: string[]) => void;
  setViewportCenter: (center: { x: number; y: number }) => void;
  setSelectModeActive: (active: boolean) => void;
}

const MAX_HISTORY = 50;
const UNDELETABLE_NODES = new Set(["request-inputs", "response"]);

/**
 * Hook used by every node component to get preview-aware output/error
 * and to know if this node should be blurred (exists in canvas but NOT in previewed run).
 */
export function useNodePreview(nodeId: string) {
  const {
    previewRunId,
    previewNodeOutputs,
    previewNodeErrors,
    previewRunNodeIds,
    previewRunNodeFields,
    executingNodeIds,
    nodeOutputs,
    nodeErrors,
    nodes,
  } = useWorkflowStore();

  const isPreviewMode = previewRunId !== null;
  // In preview: node is dimmed if it's NOT in the previewed run's node set
  const isDimmed = isPreviewMode && !previewRunNodeIds.has(nodeId);
  // Suppress glow during preview
  const isExecuting = isPreviewMode ? false : executingNodeIds.includes(nodeId);

  const node = nodes.find((n) => n.id === nodeId);

  const output = isPreviewMode ? (previewNodeOutputs[nodeId] ?? null) : (nodeOutputs[nodeId] ?? null);
  const error = isPreviewMode
    ? (previewNodeErrors[nodeId] ?? null)
    : (nodeErrors[nodeId] ?? (node?.data as any)?.error ?? null);
  // Field IDs that existed in the run for this node (undefined when not in preview)
  const runFieldIds: Set<string> | undefined = isPreviewMode ? (previewRunNodeFields[nodeId] ?? undefined) : undefined;

  return { isPreviewMode, isDimmed, isExecuting, output, error, runFieldIds };
}

/**
 * Global workflow store accessor — binds React Flow + execution UI.
 *
 * Most mutations intentionally avoid deep cloning defaults; callers must respect React Flow immutable expectations.
 */
export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  nodes: [],
  edges: [],
  workflowId: null,
  workflowName: "Untitled Workflow",

  setWorkflowId: (id) => set({ workflowId: id }),
  setWorkflowName: (name) => set({ workflowName: name }),

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
    }));
  },

  onEdgesChange: (changes) => {
    set((state) => {
      const nextEdges = applyEdgeChanges(changes, state.edges);
      const removedEdges = changes.filter((c) => c.type === "remove");
      
      if (removedEdges.length > 0) {
        let nextNodes = state.nodes;
        let nodesModified = false;
        
        for (const change of removedEdges) {
          const edge = state.edges.find((e) => e.id === change.id);
          if (edge) {
            const targetNode = state.nodes.find((n) => n.id === edge.target);
            if (targetNode?.type === "response") {
              const resultId = edge.targetHandle;
              if (resultId && resultId !== "result") {
                nextNodes = nextNodes.map((n) => {
                  if (n.id === targetNode.id) {
                    const currentResults = (n.data as any).results || [];
                    return {
                      ...n,
                      data: {
                        ...n.data,
                        results: currentResults.filter((r: any) => r.id !== resultId),
                      },
                    };
                  }
                  return n;
                });
                nodesModified = true;
              }
            }
          }
        }
        
        if (nodesModified) {
          return { edges: nextEdges, nodes: nextNodes };
        }
      }
      
      return { edges: nextEdges };
    });
  },

  addNode: (node) => {
    get().pushHistory();
    set((state) => ({ nodes: [...state.nodes, node] }));
  },

  updateNodeData: (nodeId, data) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      ),
    }));
  },

  deleteNode: (nodeId) => {
    if (UNDELETABLE_NODES.has(nodeId)) return;
    // Check if it's a response or request-inputs type
    const node = get().nodes.find((n) => n.id === nodeId);
    if (node?.type === "requestInputs" || node?.type === "response") return;

    get().pushHistory();
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      ),
    }));
  },

  // Execution state
  executingNodeIds: [],
  nodeOutputs: {},
  nodeErrors: {},
  isRunning: false,
  currentRunId: null,
  currentRunScope: null,

  setNodeExecuting: (nodeId, executing) => {
    set((state) => ({
      executingNodeIds: executing
        ? [...state.executingNodeIds.filter((id) => id !== nodeId), nodeId]
        : state.executingNodeIds.filter((id) => id !== nodeId),
    }));
  },

  setNodeOutput: (nodeId, output) => {
    set((state) => ({
      nodeOutputs: { ...state.nodeOutputs, [nodeId]: output },
    }));
  },

  setNodeError: (nodeId, error) => {
    set((state) => ({
      nodeErrors: { ...state.nodeErrors, [nodeId]: error },
    }));
  },

  clearExecutionState: () => {
    set({
      executingNodeIds: [],
      nodeOutputs: {},
      nodeErrors: {},
      isRunning: false,
      currentRunId: null,
      currentRunScope: null,
    });
  },

  clearCanvasNodeData: () => {
    set((state) => ({
      nodes: state.nodes.map((node) => {
        const cleanedData = { ...node.data };
        if ("output" in cleanedData) {
          cleanedData.output = null;
        }
        if ("error" in cleanedData) {
          cleanedData.error = null;
        } else {
          (cleanedData as any).error = null;
        }
        if (node.type === "response" && Array.isArray(cleanedData.results)) {
          cleanedData.results = (cleanedData.results as Array<Record<string, unknown>>).map((r) => ({
            ...r,
            value: null,
          }));
        }
        return { ...node, data: cleanedData };
      }),
    }));
  },

  setIsRunning: (running) => set({ isRunning: running }),
  setCurrentRunId: (id) => set({ currentRunId: id }),
  setCurrentRunScope: (scope) => set({ currentRunScope: scope }),

  // Preview mode
  previewRunId: null,
  previewRunTimestamp: null,
  previewNodeOutputs: {},
  previewNodeErrors: {},
  previewRunNodeIds: new Set(),
  previewRunNodeFields: {},
  previewGhostNodes: [],

  setPreviewRun: (run) => {
    const currentNodes = get().nodes;
    const currentNodeIds = new Set(currentNodes.map((n) => n.id));

    const previewNodeOutputs: Record<string, unknown> = {};
    const previewNodeErrors: Record<string, string> = {};
    const previewRunNodeIds = new Set<string>();
    const previewRunNodeFields: Record<string, Set<string>> = {};
    const previewGhostNodes: Array<{ nodeId: string; nodeName: string; fields?: string[] }> = [];

    for (const nr of run.nodeRuns) {
      previewRunNodeIds.add(nr.nodeId);
      if (nr.output !== undefined && nr.output !== null) {
        previewNodeOutputs[nr.nodeId] = nr.output;
      }
      if (nr.error) {
        previewNodeErrors[nr.nodeId] = nr.error;
      }
      // Capture field IDs from inputs (covers request-inputs fields and other handle keys)
      if (nr.inputs) {
        previewRunNodeFields[nr.nodeId] = new Set(Object.keys(nr.inputs));
      }
      // Track nodes from this run that no longer exist in the canvas
      if (!currentNodeIds.has(nr.nodeId)) {
        const fields = nr.inputs
          ? Object.keys(nr.inputs).filter((k) => !k.startsWith("in:"))
          : undefined;
        previewGhostNodes.push({
          nodeId: nr.nodeId,
          nodeName: nr.nodeName,
          fields: fields && fields.length > 0 ? fields : undefined,
        });
      }
    }

    set({
      previewRunId: run.id,
      previewRunTimestamp: run.startedAt,
      previewNodeOutputs,
      previewNodeErrors,
      previewRunNodeIds,
      previewRunNodeFields,
      previewGhostNodes,
    });
  },

  clearPreviewRun: () => {
    set({
      previewRunId: null,
      previewRunTimestamp: null,
      previewNodeOutputs: {},
      previewNodeErrors: {},
      previewRunNodeIds: new Set(),
      previewRunNodeFields: {},
      previewGhostNodes: [],
    });
  },

  // History
  runHistory: [],
  setRunHistory: (runs) => set({ runHistory: runs }),
  addRunHistory: (run) =>
    set((state) => ({ runHistory: [run, ...state.runHistory] })),

  // Undo/Redo
  undoStack: [],
  redoStack: [],

  pushHistory: () => {
    set((state) => {
      const snapshot: HistorySnapshot = {
        nodes: JSON.parse(JSON.stringify(state.nodes)),
        edges: JSON.parse(JSON.stringify(state.edges)),
      };
      const newStack = [...state.undoStack, snapshot].slice(-MAX_HISTORY);
      return { undoStack: newStack, redoStack: [] };
    });
  },

  undo: () => {
    set((state) => {
      if (state.undoStack.length === 0) return state;
      const current: HistorySnapshot = {
        nodes: JSON.parse(JSON.stringify(state.nodes)),
        edges: JSON.parse(JSON.stringify(state.edges)),
      };
      const newUndoStack = [...state.undoStack];
      const snapshot = newUndoStack.pop()!;
      return {
        nodes: snapshot.nodes,
        edges: snapshot.edges,
        undoStack: newUndoStack,
        redoStack: [...state.redoStack, current].slice(-MAX_HISTORY),
      };
    });
  },

  redo: () => {
    set((state) => {
      if (state.redoStack.length === 0) return state;
      const current: HistorySnapshot = {
        nodes: JSON.parse(JSON.stringify(state.nodes)),
        edges: JSON.parse(JSON.stringify(state.edges)),
      };
      const newRedoStack = [...state.redoStack];
      const snapshot = newRedoStack.pop()!;
      return {
        nodes: snapshot.nodes,
        edges: snapshot.edges,
        undoStack: [...state.undoStack, current].slice(-MAX_HISTORY),
        redoStack: newRedoStack,
      };
    });
  },

  // UI state
  isNodePickerOpen: false,
  isHistoryPanelOpen: true,
  selectedNodeIds: [],
  viewportCenter: { x: 400, y: 300 },
  selectModeActive: false,

  setIsNodePickerOpen: (open) => set({ isNodePickerOpen: open }),
  setIsHistoryPanelOpen: (open) => set({ isHistoryPanelOpen: open }),
  setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids }),
  setViewportCenter: (center) => set({ viewportCenter: center }),
  setSelectModeActive: (active) => set({ selectModeActive: active }),
}));
