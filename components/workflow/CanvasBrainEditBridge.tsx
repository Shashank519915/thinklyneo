"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { BarbaWorkspaceProvider } from "@/components/workspace/navigation";
import {
  WorkspaceIslandProvider,
  WorkspacePersistentIsland,
  useWorkspaceIslandActions,
} from "@/components/workspace/shell/WorkspaceIslandContext";
import { useWorkspaceNavigate } from "@/components/workspace";
import {
  clearBrainEditHandoff,
  readBrainEditHandoff,
} from "@/lib/workspace/brain-edit-handoff";

function CanvasBrainEditRestore({ workflowId }: { workflowId: string }) {
  const { setBrainEditMode, clearBrainEditMode } = useWorkspaceIslandActions();
  const { navigate } = useWorkspaceNavigate();

  useEffect(() => {
    const handoff = readBrainEditHandoff();
    if (!handoff || handoff.workflowId !== workflowId) return;

    clearBrainEditHandoff();

    setBrainEditMode({
      workflowName: handoff.workflowName,
      morph: false,
      onDoneEditing: () => {
        clearBrainEditMode();
        navigate("/chat", "brain-restore");
      },
    });
  }, [workflowId, setBrainEditMode, clearBrainEditMode, navigate]);

  return null;
}

type CanvasBrainEditBridgeProps = {
  workflowId: string;
  children: ReactNode;
};

/** Barba + island chrome for standalone canvas routes (outside WorkspaceShell). */
export function CanvasBrainEditBridge({ workflowId, children }: CanvasBrainEditBridgeProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  return (
    <BarbaWorkspaceProvider wrapperRef={wrapperRef}>
      <WorkspaceIslandProvider>
        <div ref={wrapperRef} data-barba="wrapper" className="h-screen bg-[#050505]">
          <div className="pointer-events-none fixed inset-x-0 top-3 z-[200] flex justify-center">
            <div className="pointer-events-auto">
              <WorkspacePersistentIsland />
            </div>
          </div>
          <CanvasBrainEditRestore workflowId={workflowId} />
          <div
            data-barba="container"
            data-barba-namespace="playground"
            className="workspace-barba-container h-full"
          >
            <div
              data-workspace-swap-veil
              className="workspace-swap-veil pointer-events-none absolute inset-0 z-[60]"
              aria-hidden
            />
            {children}
          </div>
        </div>
      </WorkspaceIslandProvider>
    </BarbaWorkspaceProvider>
  );
}
