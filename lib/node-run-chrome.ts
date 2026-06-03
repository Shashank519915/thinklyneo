/**
 * @fileoverview Shared border + run-button states while a workflow run or history preview is active.
 */

export type NodeRunButtonState = "idle" | "pending" | "running" | "done" | "error";

export function getNodeRunButtonState(
  isExecuting: boolean,
  isRunPending: boolean,
  isRunCompleted: boolean,
  isRunFailed: boolean
): NodeRunButtonState {
  if (isExecuting) return "running";
  if (isRunPending) return "pending";
  if (isRunFailed) return "error";
  if (isRunCompleted) return "done";
  return "idle";
}

/** Border class priority: dimmed → locked → executing → error → run pending → default. */
export function getNodeRunBorderClass(opts: {
  isDimmed: boolean;
  isLocked?: boolean;
  isExecuting: boolean;
  hasError: boolean;
  isRunPending: boolean;
}): string {
  if (opts.isDimmed) return "border-gray-200";
  if (opts.isLocked) return "border-yellow-400";
  if (opts.isExecuting) return "node-executing border-[#7C3AED]";
  if (opts.hasError) return "border-red-300";
  if (opts.isRunPending) return "border-yellow-400";
  return "border-gray-200";
}
