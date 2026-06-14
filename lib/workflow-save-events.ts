export const WORKFLOW_SAVED_EVENT = "thinkly:workflow-saved";

export function dispatchWorkflowSaved(workflowId?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(WORKFLOW_SAVED_EVENT, { detail: { workflowId } }),
  );
}
