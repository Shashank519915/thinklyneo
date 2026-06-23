"use client";

import { Suspense, useRef, useState, type ReactNode } from "react";
import LeftSidebar from "@/components/workflow/LeftSidebar";
import { SpinningLogo } from "@/components/SpinningLogo";
import { BarbaWorkspaceProvider } from "../navigation";
import { WorkspaceChromeMain } from "./WorkspaceChromeMain";
import { WorkspaceIslandProvider } from "./WorkspaceIslandContext";

import { usePathname } from "next/navigation";

function WorkspaceShellInner({ children }: { children: ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();

  const isCanvas = pathname?.includes("/canvas");
  const sidebarWidth = sidebarCollapsed ? 76 : 260;

  return (
    <BarbaWorkspaceProvider wrapperRef={wrapperRef}>
      <WorkspaceIslandProvider>
        <div
          ref={wrapperRef}
          data-barba="wrapper"
          className="dotted-grid flex h-screen overflow-hidden bg-[#050505] text-foreground relative"
        >
          <LeftSidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
          <div 
            className="flex flex-1 min-w-0 overflow-hidden transition-[padding] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
            style={{ paddingLeft: isCanvas ? 0 : sidebarWidth }}
          >
            <WorkspaceChromeMain>{children}</WorkspaceChromeMain>
          </div>
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
