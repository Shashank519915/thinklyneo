"use client";

import ChatInterface from "@/components/chat/ChatInterface";
import {
  MacWindowShell,
  useWorkspaceIsland,
  useWorkspaceNavigate,
} from "@/components/workspace";

export default function ChatPage() {
  const { navigate } = useWorkspaceNavigate();

  useWorkspaceIsland({
    createWorkflow: () => navigate("/dashboard"),
    onImportClick: () => navigate("/dashboard"),
  });

  return (
    <div className="relative flex h-full w-full flex-col justify-start">
      <div className="z-10 flex flex-1 flex-col px-3 pb-3 pt-3">
        <MacWindowShell
          workspaceLabel="Chat Workspace"
          padded={false}
          onMinimize={() => navigate("/dashboard", "restore")}
        >
          <ChatInterface />
        </MacWindowShell>
      </div>
    </div>
  );
}
