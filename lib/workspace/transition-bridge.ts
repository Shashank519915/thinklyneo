import type { WorkspaceTransitionMode } from "./transitions";

/** Carries pending enter mode across layout unmounts (e.g. dashboard → workflow). */
let pendingMode: WorkspaceTransitionMode | null = null;

export function setBridgedEnterMode(mode: WorkspaceTransitionMode) {
  pendingMode = mode;
}

export function consumeBridgedEnterMode(): WorkspaceTransitionMode | null {
  const mode = pendingMode;
  pendingMode = null;
  return mode;
}

export function clearBridgedEnterMode() {
  pendingMode = null;
}
