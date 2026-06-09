"use client";

import { useCallback, useEffect, useState } from "react";
import DynamicIsland from "@/components/dashboard/DynamicIsland";
import { WorkspaceDynamicIslandFrame } from "./WorkspaceDynamicIslandFrame";

type WorkspaceDynamicIslandProps = {
  loading?: boolean;
  workflowsCount?: number;
  searchTerm?: string;
  creating?: boolean;
  createWorkflow?: () => void;
  onImportClick?: () => void;
};

/** Dynamic Island with shared workspace positioning; fetches workflow count when not supplied. */
export function WorkspaceDynamicIsland({
  loading = false,
  workflowsCount: workflowsCountProp,
  searchTerm = "",
  creating = false,
  createWorkflow = () => {},
  onImportClick = () => {},
}: WorkspaceDynamicIslandProps) {
  const [workflowsCount, setWorkflowsCount] = useState(workflowsCountProp ?? 0);

  const fetchWorkflowCount = useCallback(async () => {
    try {
      const resp = await fetch("/api/workflows");
      const data = await resp.json();
      if (Array.isArray(data.data)) {
        setWorkflowsCount(data.data.length);
      }
    } catch {
      /* keep last count */
    }
  }, []);

  useEffect(() => {
    if (workflowsCountProp !== undefined) {
      setWorkflowsCount(workflowsCountProp);
      return;
    }
    void fetchWorkflowCount();
  }, [workflowsCountProp, fetchWorkflowCount]);

  return (
    <WorkspaceDynamicIslandFrame>
      <DynamicIsland
        loading={loading}
        workflowsCount={workflowsCount}
        searchTerm={searchTerm}
        creating={creating}
        createWorkflow={createWorkflow}
        onImportClick={onImportClick}
      />
    </WorkspaceDynamicIslandFrame>
  );
}
