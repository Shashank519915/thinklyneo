import { WorkflowShell } from "@/components/workflow-shell/WorkflowShell";

export default function PlaygroundWorkflowLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <WorkflowShell>{children}</WorkflowShell>;
}
