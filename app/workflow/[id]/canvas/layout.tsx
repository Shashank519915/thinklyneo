"use client";

import { useParams } from "next/navigation";
import { CanvasBrainEditBridge } from "@/components/workflow/CanvasBrainEditBridge";

export default function WorkflowCanvasLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const params = useParams();
  const workflowId = params.id as string;

  return <CanvasBrainEditBridge workflowId={workflowId}>{children}</CanvasBrainEditBridge>;
}
