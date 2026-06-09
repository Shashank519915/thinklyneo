"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { getWorkspaceNamespace } from "@/lib/workspace";
import { cn } from "@/lib/utils";
import { useWorkspaceNavigate } from "../navigation";
import { WorkspacePersistentIsland } from "./WorkspaceIslandContext";

export function WorkspaceChromeMain({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const namespace = getWorkspaceNamespace(pathname);
  const { isTransitioning } = useWorkspaceNavigate();

  return (
    <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
      <WorkspacePersistentIsland />

      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <div
          data-barba="container"
          data-barba-namespace={namespace}
          className={cn(
            "workspace-barba-container relative flex h-full w-full flex-col",
            isTransitioning && "pointer-events-none workspace-barba-container--active",
          )}
        >
          <div
            data-workspace-swap-veil
            className="workspace-swap-veil pointer-events-none absolute inset-0 z-[60]"
            aria-hidden
          />
          {children}
        </div>
      </div>
    </div>
  );
}
