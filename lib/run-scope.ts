/**
 * @fileoverview Run-scope skip messages (orchestrator + history preview).
 */

export const OUT_OF_SCOPE_SKIP_ERROR = "Not selected in this run scope";

export function isOutOfScopeSkippedNodeRun(nr: {
  status: string;
  error?: string | null;
}): boolean {
  return nr.status === "skipped" && nr.error === OUT_OF_SCOPE_SKIP_ERROR;
}
