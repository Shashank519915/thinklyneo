export type WorkspaceTransitionMode =
  | "default"
  | "minimize"
  | "restore"
  | "open"
  | "close";

/** iOS drawer — morphs on screen */
const EASE_MORPH = "cubic-bezier(0.32, 0.72, 0, 1)";
/** Strong ease-out — exits feel responsive (Emil) */
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function getWorkspaceNamespace(
  pathname: string,
): "flow" | "chat" | "playground" | "default" {
  if (pathname.startsWith("/chat")) return "chat";
  if (pathname.startsWith("/dashboard")) return "flow";
  if (pathname.startsWith("/workflow")) return "playground";
  return "default";
}

export function resolveTransitionMode(
  fromPath: string,
  toPath: string,
  requested: WorkspaceTransitionMode = "default",
): WorkspaceTransitionMode {
  if (requested !== "default") return requested;
  const from = getWorkspaceNamespace(fromPath);
  const to = getWorkspaceNamespace(toPath);
  if (from === "flow" && to === "chat") return "minimize";
  if (from === "chat" && to === "flow") return "restore";
  if (from === "flow" && to === "playground") return "open";
  if (from === "playground" && to === "flow") return "close";
  return "default";
}

export function queryWorkspaceCard(root?: ParentNode | null): HTMLElement | null {
  return (root ?? document).querySelector("[data-workspace-card]");
}

function queryCards(root?: ParentNode | null): HTMLElement[] {
  const scope = root ?? document;
  return Array.from(scope.querySelectorAll<HTMLElement>("[data-workspace-card]"));
}

function queryIslands(root?: ParentNode | null): HTMLElement[] {
  const scope = root ?? document;
  return Array.from(scope.querySelectorAll<HTMLElement>("[data-workspace-island]"));
}

function cancelAnimations(elements: HTMLElement[]) {
  for (const el of elements) {
    el.getAnimations().forEach((a) => a.cancel());
  }
}

function settleAnimations(elements: HTMLElement[]) {
  for (const el of elements) {
    for (const anim of [...el.getAnimations()]) {
      anim.commitStyles();
      anim.cancel();
    }
  }
}

async function runAnimation(
  elements: HTMLElement[],
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
): Promise<void> {
  if (elements.length === 0) return;
  cancelAnimations(elements);
  await Promise.all(elements.map((el) => el.animate(keyframes, options).finished));
}

/** Snap enter targets to the leave end-state so the route swap does not pop. */
export function primeWorkspaceEnter(
  cardRoot: ParentNode | null | undefined,
  mode: WorkspaceTransitionMode,
  islandRoot?: ParentNode | null | undefined,
): void {
  if (prefersReducedMotion()) return;

  const { card, island } = getHandoffStyles(mode);
  for (const el of queryCards(cardRoot)) {
    Object.assign(el.style, card);
  }
  for (const el of queryIslands(islandRoot ?? cardRoot)) {
    Object.assign(el.style, island);
  }
}

export function clearWorkspaceInlineStyles(
  cardRoot?: ParentNode | null,
  islandRoot?: ParentNode | null,
): void {
  const all = [
    ...queryCards(cardRoot),
    ...queryIslands(islandRoot ?? cardRoot),
  ];
  for (const el of all) {
    el.style.opacity = "";
    el.style.transform = "";
    el.style.filter = "";
  }
}

type HandoffStyle = { opacity: string; transform: string; filter: string };

function getHandoffStyles(mode: WorkspaceTransitionMode): {
  card: HandoffStyle;
  island: HandoffStyle;
} {
  if (mode === "minimize") {
    return {
      card: {
        opacity: "0.45",
        transform: "scale(0.94) translateY(32px)",
        filter: "blur(3px)",
      },
      island: {
        opacity: "0.7",
        transform: "scale(0.98) translateY(6px)",
        filter: "blur(1px)",
      },
    };
  }
  if (mode === "restore" || mode === "open") {
    return {
      card: {
        opacity: "0.5",
        transform: "scale(0.95) translateY(24px)",
        filter: "blur(2px)",
      },
      island: {
        opacity: "0.75",
        transform: "scale(0.98) translateY(4px)",
        filter: "blur(1px)",
      },
    };
  }
  if (mode === "close") {
    return {
      card: {
        opacity: "0.45",
        transform: "scale(0.94) translateY(28px)",
        filter: "blur(3px)",
      },
      island: {
        opacity: "0.65",
        transform: "scale(0.98) translateY(6px)",
        filter: "blur(1px)",
      },
    };
  }
  return {
    card: {
      opacity: "0",
      transform: "scale(0.98) translateY(12px)",
      filter: "blur(2px)",
    },
    island: {
      opacity: "0.6",
      transform: "scale(0.99) translateY(4px)",
      filter: "blur(1px)",
    },
  };
}

export async function animateWorkspaceLeave(
  cardRoot: ParentNode | null | undefined,
  mode: WorkspaceTransitionMode,
  islandRoot?: ParentNode | null | undefined,
): Promise<void> {
  if (prefersReducedMotion()) return;

  const cards = queryCards(cardRoot);
  const islands = queryIslands(islandRoot ?? cardRoot);
  const handoff = getHandoffStyles(mode);

  const cardKeyframes =
    mode === "minimize" || mode === "close"
      ? [
          { opacity: 1, transform: "scale(1) translateY(0px)", filter: "blur(0px)" },
          {
            opacity: 0.72,
            transform: "scale(0.98) translateY(10px)",
            filter: "blur(1px)",
            offset: 0.45,
          },
          {
            opacity: handoff.card.opacity,
            transform: handoff.card.transform,
            filter: handoff.card.filter,
          },
        ]
      : mode === "restore"
        ? [
            { opacity: 1, transform: "scale(1) translateY(0px)", filter: "blur(0px)" },
            {
              opacity: 0.7,
              transform: "scale(0.97) translateY(14px)",
              filter: "blur(2px)",
              offset: 0.5,
            },
            {
              opacity: handoff.card.opacity,
              transform: handoff.card.transform,
              filter: handoff.card.filter,
            },
          ]
        : mode === "open"
          ? [
              { opacity: 1, transform: "scale(1) translateY(0px)", filter: "blur(0px)" },
              {
                opacity: 0.35,
                transform: "scale(1.02) translateY(-6px)",
                filter: "blur(2px)",
                offset: 0.55,
              },
              {
                opacity: 0,
                transform: "scale(1.04) translateY(-12px)",
                filter: "blur(3px)",
              },
            ]
          : [
              { opacity: 1, transform: "scale(1) translateY(0px)", filter: "blur(0px)" },
              {
                opacity: 0,
                transform: "scale(0.98) translateY(10px)",
                filter: "blur(2px)",
              },
            ];

  const islandKeyframes =
    mode === "minimize" || mode === "close"
      ? [
          { opacity: 1, transform: "scale(1) translateY(0px)", filter: "blur(0px)" },
          {
            opacity: handoff.island.opacity,
            transform: handoff.island.transform,
            filter: handoff.island.filter,
          },
        ]
      : mode === "restore" || mode === "open"
        ? [
            { opacity: 1, transform: "scale(1) translateY(0px)", filter: "blur(0px)" },
            {
              opacity: handoff.island.opacity,
              transform: handoff.island.transform,
              filter: handoff.island.filter,
            },
          ]
          : [
              { opacity: 1, transform: "scale(1) translateY(0px)", filter: "blur(0px)" },
              {
                opacity: 0.5,
                transform: "scale(0.99) translateY(3px)",
                filter: "blur(1px)",
              },
            ];

  const duration =
    mode === "minimize" || mode === "close"
      ? 720
      : mode === "restore"
        ? 620
        : mode === "open"
          ? 580
          : 420;

  await Promise.all([
    runAnimation(cards, cardKeyframes, {
      duration,
      easing: EASE_OUT,
      fill: "forwards",
    }),
    runAnimation(islands, islandKeyframes, {
      duration: duration * 0.92,
      easing: EASE_OUT,
      fill: "forwards",
    }),
  ]);
}

export async function animateWorkspaceEnter(
  cardRoot: ParentNode | null | undefined,
  mode: WorkspaceTransitionMode,
  islandRoot?: ParentNode | null | undefined,
): Promise<void> {
  if (prefersReducedMotion()) return;

  const cards = queryCards(cardRoot);
  const islands = queryIslands(islandRoot ?? cardRoot);
  const handoff = getHandoffStyles(mode);

  primeWorkspaceEnter(cardRoot, mode, islandRoot);

  const cardKeyframes =
    mode === "minimize"
      ? [
          {
            opacity: handoff.card.opacity,
            transform: handoff.card.transform,
            filter: handoff.card.filter,
          },
          {
            opacity: 0.82,
            transform: "scale(0.97) translateY(16px)",
            filter: "blur(2px)",
            offset: 0.38,
          },
          { opacity: 1, transform: "scale(1) translateY(0px)", filter: "blur(0px)" },
        ]
      : mode === "restore" || mode === "open"
        ? [
            {
              opacity: handoff.card.opacity,
              transform: handoff.card.transform,
              filter: handoff.card.filter,
            },
            {
              opacity: 0.88,
              transform: "scale(0.98) translateY(-8px)",
              filter: "blur(1px)",
              offset: 0.42,
            },
            { opacity: 1, transform: "scale(1) translateY(0px)", filter: "blur(0px)" },
          ]
        : mode === "close"
          ? [
              {
                opacity: handoff.card.opacity,
                transform: handoff.card.transform,
                filter: handoff.card.filter,
              },
              {
                opacity: 0.85,
                transform: "scale(0.97) translateY(12px)",
                filter: "blur(2px)",
                offset: 0.4,
              },
              { opacity: 1, transform: "scale(1) translateY(0px)", filter: "blur(0px)" },
            ]
          : [
              {
                opacity: handoff.card.opacity,
                transform: handoff.card.transform,
                filter: handoff.card.filter,
              },
              { opacity: 1, transform: "scale(1) translateY(0px)", filter: "blur(0px)" },
            ];

  const islandKeyframes =
    mode === "minimize" || mode === "restore" || mode === "open" || mode === "close"
      ? [
          {
            opacity: handoff.island.opacity,
            transform: handoff.island.transform,
            filter: handoff.island.filter,
          },
          { opacity: 1, transform: "scale(1) translateY(0px)", filter: "blur(0px)" },
        ]
      : [
          {
            opacity: handoff.island.opacity,
            transform: handoff.island.transform,
            filter: handoff.island.filter,
          },
          { opacity: 1, transform: "scale(1) translateY(0px)", filter: "blur(0px)" },
        ];

  const duration =
    mode === "minimize"
      ? 840
      : mode === "restore" || mode === "open"
        ? 760
        : mode === "close"
          ? 800
          : 520;

  await Promise.all([
    runAnimation(cards, cardKeyframes, {
      duration,
      easing: EASE_MORPH,
      fill: "forwards",
    }),
    runAnimation(islands, islandKeyframes, {
      duration: duration * 0.95,
      easing: EASE_MORPH,
      fill: "forwards",
    }),
  ]);

  settleAnimations([...cards, ...islands]);
  clearWorkspaceInlineStyles(cardRoot, islandRoot);
}

export function waitForWorkspaceCard(maxMs = 2500): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const start = performance.now();
    const tick = () => {
      const card = queryWorkspaceCard();
      if (card) {
        resolve(card);
        return;
      }
      if (performance.now() - start > maxMs) {
        resolve(null);
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

/** Let Next paint the incoming route before enter choreography. */
export function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}
