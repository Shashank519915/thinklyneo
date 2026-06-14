const STORAGE_KEY = "thinkly:brain-edit-handoff";

export type BrainEditHandoff = {
  chatId: string;
  workflowId: string;
  workflowName?: string;
};

export function stashBrainEditHandoff(data: BrainEditHandoff): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

export function readBrainEditHandoff(): BrainEditHandoff | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BrainEditHandoff;
    if (!parsed?.chatId || !parsed?.workflowId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearBrainEditHandoff(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
