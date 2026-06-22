"use client";

import { ReactNode } from "react";
import { MacWindowShell } from "@/components/workspace/shell/MacWindowShell";
import { useWorkspaceNavigate } from "@/components/workspace/navigation/BarbaWorkspaceProvider";

export default function ChatLayout({ children }: { children: ReactNode }) {
  const { navigate } = useWorkspaceNavigate();

  return (
    <div className="relative flex h-full w-full flex-col justify-start">
      <div className="z-10 flex flex-1 flex-col px-3 pb-3 pt-3">
        <MacWindowShell
          workspaceLabel="Chat Workspace"
          padded={false}
          onMinimize={() => navigate("/dashboard", "restore")}
        >
          {children}
        </MacWindowShell>
      </div>
    </div>
  );
}
