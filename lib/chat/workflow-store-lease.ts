/** Prevents concurrent chat previews/live runs from corrupting the global workflow store. */
let holder: string | null = null;

export function acquireWorkflowStoreLease(owner: string): boolean {
  if (holder !== null && holder !== owner) return false;
  holder = owner;
  return true;
}

export function releaseWorkflowStoreLease(owner: string): void {
  if (holder === owner) holder = null;
}

export function hasWorkflowStoreLease(owner: string): boolean {
  return holder === owner;
}
