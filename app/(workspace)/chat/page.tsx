"use client";

import ChatWorkspace from "@/components/chat/ChatWorkspace";
import { MacWindowShell, useWorkspaceNavigate } from "@/components/workspace";

export default function ChatPage() {
  const { navigate } = useWorkspaceNavigate();

  return (
    <div className="relative flex h-full w-full flex-col justify-start">
      <div className="z-10 flex flex-1 flex-col px-3 pb-3 pt-3">
        <MacWindowShell
          workspaceLabel="Chat Workspace"
          padded={false}
          onMinimize={() => navigate("/dashboard", "restore")}
        >
          <ChatWorkspace />
        </MacWindowShell>
      </div>
    </div>
  );
}
