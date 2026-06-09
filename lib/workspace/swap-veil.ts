import { prefersReducedMotion } from "./transitions";

const EASE_MORPH = "cubic-bezier(0.32, 0.72, 0, 1)";

/** Slow rise after swap, gentle peak, long tail — no pre-swap hold. */
const SWAP_VEIL_KEYFRAMES: Keyframe[] = [
  { opacity: 0, backdropFilter: "blur(0px)", offset: 0 },
  { opacity: 0.12, backdropFilter: "blur(1px)", offset: 0.12 },
  { opacity: 0.28, backdropFilter: "blur(3px)", offset: 0.32 },
  { opacity: 0.48, backdropFilter: "blur(5px)", offset: 0.5 },
  { opacity: 0.52, backdropFilter: "blur(6px)", offset: 0.58 },
  { opacity: 0.22, backdropFilter: "blur(2px)", offset: 0.82 },
  { opacity: 0, backdropFilter: "blur(0px)", offset: 1 },
];

export function querySwapVeil(root?: ParentNode | null): HTMLElement | null {
  if (!root) return null;
  return root.querySelector<HTMLElement>("[data-workspace-swap-veil]");
}

/** Commit inline styles then cancel so a later reset does not resurrect an old keyframe. */
function settleVeilAnimations(veil: HTMLElement) {
  for (const anim of [...veil.getAnimations()]) {
    anim.commitStyles();
    anim.cancel();
  }
}

/**
 * Start a single arc: swap fires near the start (still clear), blur builds after,
 * peaks mid-way, then lingers out — avoids a pre-swap pause.
 */
export function beginSwapVeilArc(
  veil: HTMLElement | null,
  duration = 880,
): Animation | null {
  if (!veil || prefersReducedMotion()) return null;

  settleVeilAnimations(veil);

  return veil.animate(SWAP_VEIL_KEYFRAMES, {
    duration,
    easing: EASE_MORPH,
    fill: "forwards",
  });
}

/** Wait for the arc to finish (usually alongside enter animation). */
export async function finishSwapVeil(
  veil: HTMLElement | null,
  anim: Animation | null | undefined,
): Promise<void> {
  if (!veil || prefersReducedMotion()) {
    resetSwapVeil(veil);
    return;
  }

  try {
    if (anim && anim.playState !== "finished") {
      await anim.finished.catch(() => undefined);
    }
    if (anim && anim.playState !== "idle") {
      anim.commitStyles();
      anim.cancel();
    }
  } finally {
    resetSwapVeil(veil);
  }
}

/** @deprecated Stale import shim — use finishSwapVeil instead. */
export async function rampSwapVeilOut(
  veil: HTMLElement | null,
  _duration = 620,
): Promise<void> {
  const anim = veil?.getAnimations().at(0) ?? null;
  await finishSwapVeil(veil, anim);
}

export function cancelSwapVeil(
  veil: HTMLElement | null | undefined,
  anim: Animation | null | undefined,
) {
  if (anim) {
    try {
      anim.commitStyles();
    } catch {
      /* animation may already be detached */
    }
    anim.cancel();
  }
  resetSwapVeil(veil);
}

export function resetSwapVeil(veil: HTMLElement | null | undefined) {
  if (!veil) return;

  settleVeilAnimations(veil);
  veil.style.opacity = "0";
  veil.style.backdropFilter = "blur(0px)";
  veil.style.setProperty("-webkit-backdrop-filter", "blur(0px)");
  veil.style.pointerEvents = "none";
}
