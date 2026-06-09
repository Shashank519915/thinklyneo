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
import { WorkspaceDynamicIslandFrame } from "./WorkspaceDynamicIslandFrame";

export type WorkspaceIslandConfig = {
  loading?: boolean;
  workflowsCount?: number;
  searchTerm?: string;
  creating?: boolean;
  createWorkflow?: () => void;
  onImportClick?: () => void;
};

const defaultConfig: WorkspaceIslandConfig = {
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
};

const WorkspaceIslandContext = createContext<WorkspaceIslandContextValue | null>(null);

function islandConfigEqual(a: WorkspaceIslandConfig, b: WorkspaceIslandConfig): boolean {
  return (
    a.loading === b.loading &&
    a.workflowsCount === b.workflowsCount &&
    a.searchTerm === b.searchTerm &&
    a.creating === b.creating &&
    a.createWorkflow === b.createWorkflow &&
    a.onImportClick === b.onImportClick
  );
}

export function WorkspaceIslandProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<WorkspaceIslandConfig>(defaultConfig);

  const setConfig = useCallback((next: WorkspaceIslandConfig) => {
    setConfigState((prev) => {
      const merged = { ...prev, ...next };
      return islandConfigEqual(prev, merged) ? prev : merged;
    });
  }, []);

  const value = useMemo(() => ({ config, setConfig }), [config, setConfig]);

  return (
    <WorkspaceIslandContext.Provider value={value}>{children}</WorkspaceIslandContext.Provider>
  );
}

/** Register page-specific island props. Island DOM stays in the shell (outside Barba container). */
export function useWorkspaceIsland(config: WorkspaceIslandConfig) {
  const { setConfig } = useContext(WorkspaceIslandContext) ?? {};
  if (!setConfig) {
    throw new Error("useWorkspaceIsland must be used within WorkspaceIslandProvider");
  }

  const {
    loading = false,
    workflowsCount,
    searchTerm = "",
    creating = false,
    createWorkflow = () => {},
    onImportClick = () => {},
  } = config;

  const createRef = useRef(createWorkflow);
  const importRef = useRef(onImportClick);
  createRef.current = createWorkflow;
  importRef.current = onImportClick;

  const invokeCreate = useCallback(() => createRef.current(), []);
  const invokeImport = useCallback(() => importRef.current(), []);

  useEffect(() => {
    setConfig({
      loading,
      workflowsCount,
      searchTerm,
      creating,
      createWorkflow: invokeCreate,
      onImportClick: invokeImport,
    });
  }, [setConfig, invokeCreate, invokeImport, loading, workflowsCount, searchTerm, creating]);

  // Reset only on page unmount — not when deps change mid-transition (e.g. creating → false).
  useEffect(() => {
    return () => {
      setConfig(defaultConfig);
    };
  }, [setConfig]);
}

/** Persistent island slot — sibling to Barba container, same layer as sidebar chrome. */
export function WorkspacePersistentIsland() {
  const ctx = useContext(WorkspaceIslandContext);
  const config = ctx?.config ?? defaultConfig;

  return (
    <WorkspaceDynamicIslandFrame>
      <DynamicIsland
        loading={config.loading ?? false}
        workflowsCount={config.workflowsCount ?? 0}
        searchTerm={config.searchTerm ?? ""}
        creating={config.creating ?? false}
        createWorkflow={config.createWorkflow ?? (() => {})}
        onImportClick={config.onImportClick ?? (() => {})}
      />
    </WorkspaceDynamicIslandFrame>
  );
}
