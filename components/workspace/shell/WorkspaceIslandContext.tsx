"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import DynamicIsland from "@/components/dashboard/DynamicIsland";
import { BrainEditIsland } from "@/components/chat/BrainEditIsland";
import { CanvasWorkflowIsland } from "@/components/workflow/CanvasWorkflowIsland";
import { WorkspaceDynamicIslandFrame } from "./WorkspaceDynamicIslandFrame";
import { WORKFLOW_SAVED_EVENT } from "@/lib/workflow-save-events";

export type WorkspaceIslandMode = "dashboard" | "brain-edit" | "canvas";

export type WorkspaceIslandConfig = {
  mode?: WorkspaceIslandMode;
  loading?: boolean;
  workflowsCount?: number;
  searchTerm?: string;
  creating?: boolean;
  createWorkflow?: () => void;
  onImportClick?: () => void;
  canvas?: {
    workflowName?: string;
  };
  brainEdit?: {
    workflowName?: string;
    synced?: boolean;
    onDoneEditing?: () => void;
  };
};

const defaultConfig: WorkspaceIslandConfig = {
  mode: "dashboard",
  loading: false,
  workflowsCount: undefined,
  searchTerm: "",
  creating: false,
  createWorkflow: () => {},
  onImportClick: () => {},
};

type WorkspaceIslandContextValue = {
  config: WorkspaceIslandConfig;
  setConfig: (config: WorkspaceIslandConfig) => void;
  islandMorphExpanded: boolean;
  setBrainEditMode: (opts: {
    workflowName?: string;
    onDoneEditing: () => void;
    morph?: boolean;
  }) => void;
  clearBrainEditMode: () => void;
};

const WorkspaceIslandContext = createContext<WorkspaceIslandContextValue | null>(null);

export function useWorkspaceIslandActions() {
  const ctx = useContext(WorkspaceIslandContext);
  if (!ctx) {
    throw new Error("useWorkspaceIslandActions must be used within WorkspaceIslandProvider");
  }
  return {
    setBrainEditMode: ctx.setBrainEditMode,
    clearBrainEditMode: ctx.clearBrainEditMode,
  };
}

function islandConfigEqual(a: WorkspaceIslandConfig, b: WorkspaceIslandConfig): boolean {
  return (
    a.mode === b.mode &&
    a.loading === b.loading &&
    a.workflowsCount === b.workflowsCount &&
    a.searchTerm === b.searchTerm &&
    a.creating === b.creating &&
    a.createWorkflow === b.createWorkflow &&
    a.onImportClick === b.onImportClick &&
    a.brainEdit?.workflowName === b.brainEdit?.workflowName &&
    a.brainEdit?.synced === b.brainEdit?.synced &&
    a.brainEdit?.onDoneEditing === b.brainEdit?.onDoneEditing &&
    a.canvas?.workflowName === b.canvas?.workflowName
  );
}

export function WorkspaceIslandProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<WorkspaceIslandConfig>(defaultConfig);
  const [islandMorphExpanded, setIslandMorphExpanded] = useState(false);
  const canvasFallbackRef = useRef<WorkspaceIslandConfig["canvas"]>(null);

  useEffect(() => {
    const handler = () => setIslandMorphExpanded(false);
    window.addEventListener("thinkly:workspace-transition-end", handler);
    return () => window.removeEventListener("thinkly:workspace-transition-end", handler);
  }, []);

  const setConfig = useCallback((next: WorkspaceIslandConfig) => {
    setConfigState((prev) => {
      const merged = { ...prev, ...next };
      if (merged.mode === "canvas" && merged.canvas) {
        canvasFallbackRef.current = merged.canvas;
      }
      return islandConfigEqual(prev, merged) ? prev : merged;
    });
  }, []);

  const setBrainEditMode = useCallback(
    (opts: { workflowName?: string; onDoneEditing: () => void; morph?: boolean }) => {
      if (opts.morph !== false) {
        setIslandMorphExpanded(true);
      } else {
        setIslandMorphExpanded(false);
      }
      setConfigState((prev) => ({
        ...prev,
        mode: "brain-edit",
        brainEdit: {
          workflowName: opts.workflowName,
          synced: false,
          onDoneEditing: opts.onDoneEditing,
        },
      }));
    },
    [],
  );

  const clearBrainEditMode = useCallback(() => {
    setIslandMorphExpanded(false);
    setConfigState((prev) => {
      const fallback = canvasFallbackRef.current;
      if (fallback) {
        return {
          ...prev,
          mode: "canvas",
          brainEdit: undefined,
          canvas: fallback,
        };
      }
      return {
        ...prev,
        mode: "dashboard",
        brainEdit: undefined,
      };
    });
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      setConfigState((prev) => {
        if (prev.mode !== "brain-edit" || !prev.brainEdit) return prev;
        return {
          ...prev,
          brainEdit: { ...prev.brainEdit, synced: true },
        };
      });
    };
    window.addEventListener(WORKFLOW_SAVED_EVENT, handler);
    return () => window.removeEventListener(WORKFLOW_SAVED_EVENT, handler);
  }, []);

  const value = useMemo(
    () => ({
      config,
      setConfig,
      islandMorphExpanded,
      setBrainEditMode,
      clearBrainEditMode,
    }),
    [config, setConfig, islandMorphExpanded, setBrainEditMode, clearBrainEditMode],
  );

  return (
    <WorkspaceIslandContext.Provider value={value}>{children}</WorkspaceIslandContext.Provider>
  );
}

/** Register page-specific island props. Island DOM stays in the shell (outside Barba container). */
export function useWorkspaceIsland(config: WorkspaceIslandConfig) {
  const ctx = useContext(WorkspaceIslandContext);
  if (!ctx) {
    throw new Error("useWorkspaceIsland must be used within WorkspaceIslandProvider");
  }
  const { setConfig, setBrainEditMode, clearBrainEditMode } = ctx;

  const {
    loading = false,
    workflowsCount,
    searchTerm = "",
    creating = false,
    createWorkflow = () => {},
    onImportClick = () => {},
    canvas,
  } = config;

  const createRef = useRef(createWorkflow);
  const importRef = useRef(onImportClick);
  createRef.current = createWorkflow;
  importRef.current = onImportClick;

  const invokeCreate = useCallback(() => createRef.current(), []);
  const invokeImport = useCallback(() => importRef.current(), []);

  const canvasWorkflowName = canvas?.workflowName;

  useEffect(() => {
    if (config.mode === "brain-edit") return;

    if (config.mode === "canvas") {
      setConfig({
        mode: "canvas",
        canvas: { workflowName: canvasWorkflowName },
      });
      return;
    }

    setConfig({
      mode: "dashboard",
      loading,
      workflowsCount,
      searchTerm,
      creating,
      createWorkflow: invokeCreate,
      onImportClick: invokeImport,
    });
  }, [
    setConfig,
    invokeCreate,
    invokeImport,
    loading,
    workflowsCount,
    searchTerm,
    creating,
    config.mode,
    canvasWorkflowName,
  ]);

  useEffect(() => {
    return () => {
      if (config.mode !== "brain-edit" && config.mode !== "canvas") {
        setConfig(defaultConfig);
      }
    };
  }, [setConfig, config.mode]);

  return { setBrainEditMode, clearBrainEditMode };
}

/** Persistent island slot — sibling to Barba container, same layer as sidebar chrome. */
export function WorkspacePersistentIsland() {
  const ctx = useContext(WorkspaceIslandContext);
  const config = ctx?.config ?? defaultConfig;
  const islandMorphExpanded = ctx?.islandMorphExpanded ?? false;

  return (
    <WorkspaceDynamicIslandFrame>
      {config.mode === "brain-edit" && config.brainEdit?.onDoneEditing ? (
        <BrainEditIsland
          workflowName={config.brainEdit.workflowName}
          synced={config.brainEdit.synced}
          morphExpanded={islandMorphExpanded}
          onDoneEditing={config.brainEdit.onDoneEditing}
        />
      ) : config.mode === "canvas" ? (
        <CanvasWorkflowIsland workflowName={config.canvas?.workflowName} />
      ) : (
        <DynamicIsland
          loading={config.loading ?? false}
          workflowsCount={config.workflowsCount ?? 0}
          searchTerm={config.searchTerm ?? ""}
          creating={config.creating ?? false}
          createWorkflow={config.createWorkflow ?? (() => {})}
          onImportClick={config.onImportClick ?? (() => {})}
        />
      )}
    </WorkspaceDynamicIslandFrame>
  );
}
