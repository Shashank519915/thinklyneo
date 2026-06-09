"use client";

import { Suspense, useRef, useState, type ReactNode } from "react";
import LeftSidebar from "@/components/workflow/LeftSidebar";
import { SpinningLogo } from "@/components/SpinningLogo";
import { BarbaWorkspaceProvider } from "../navigation";
import { WorkspaceChromeMain } from "./WorkspaceChromeMain";
import { WorkspaceIslandProvider } from "./WorkspaceIslandContext";

function WorkspaceShellInner({ children }: { children: ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <BarbaWorkspaceProvider wrapperRef={wrapperRef}>
      <WorkspaceIslandProvider>
        <div
          ref={wrapperRef}
          data-barba="wrapper"
          className="dotted-grid flex h-screen overflow-hidden bg-[#050505] text-foreground"
        >
          <LeftSidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
          <WorkspaceChromeMain>{children}</WorkspaceChromeMain>
        </div>
      </WorkspaceIslandProvider>
    </BarbaWorkspaceProvider>
  );
}

export function WorkspaceShell({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#050505]">
          <SpinningLogo size="lg" />
        </div>
      }
    >
      <WorkspaceShellInner>{children}</WorkspaceShellInner>
    </Suspense>
  );
}
