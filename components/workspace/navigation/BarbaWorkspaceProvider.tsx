"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  animateWorkspaceEnter,
  animateWorkspaceLeave,
  beginSwapVeilArc,
  cancelSwapVeil,
  clearWorkspaceInlineStyles,
  finishSwapVeil,
  primeWorkspaceEnter,
  querySwapVeil,
  resolveTransitionMode,
  setBridgedEnterMode,
  consumeBridgedEnterMode,
  waitForWorkspaceCard,
  type WorkspaceTransitionMode,
} from "@/lib/workspace";

type WorkspaceNavContextValue = {
  navigate: (href: string, mode?: WorkspaceTransitionMode) => void;
  isTransitioning: boolean;
};

const WorkspaceNavContext = createContext<WorkspaceNavContextValue | null>(null);

export function useWorkspaceNavigate() {
  const ctx = useContext(WorkspaceNavContext);
  if (!ctx) {
    throw new Error("useWorkspaceNavigate must be used within BarbaWorkspaceProvider");
  }
  return ctx;
}

type BarbaWorkspaceProviderProps = {
  children: ReactNode;
  wrapperRef: RefObject<HTMLDivElement | null>;
};

function queryContainer(wrapper: HTMLDivElement | null) {
  return wrapper?.querySelector('[data-barba="container"]') ?? null;
}

function releaseTransition(
  wrapper: HTMLDivElement | null,
  pendingEnter: { current: WorkspaceTransitionMode | null },
  transitioning: { current: boolean },
  setIsTransitioning: (value: boolean) => void,
  swapVeilAnim?: { current: Animation | null },
  completedMode?: WorkspaceTransitionMode,
) {
  const container = queryContainer(wrapper);
  const veil = querySwapVeil(container ?? undefined);
  cancelSwapVeil(veil, swapVeilAnim?.current ?? null);
  if (swapVeilAnim) swapVeilAnim.current = null;
  if (wrapper) {
    clearWorkspaceInlineStyles(
      queryContainer(wrapper) ?? undefined,
      wrapper,
    );
  }
  pendingEnter.current = null;
  transitioning.current = false;
  setIsTransitioning(false);
  if (typeof window !== "undefined" && completedMode) {
    window.dispatchEvent(
      new CustomEvent("thinkly:workspace-transition-end", { detail: { mode: completedMode } }),
    );
  }
}

export function BarbaWorkspaceProvider({ children, wrapperRef }: BarbaWorkspaceProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const pendingEnter = useRef<WorkspaceTransitionMode | null>(null);
  const transitioning = useRef(false);
  const pathnameRef = useRef(pathname);
  const enterRunId = useRef(0);
  const swapVeilAnimRef = useRef<Animation | null>(null);
  const lastTransitionModeRef = useRef<WorkspaceTransitionMode>("default");

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useLayoutEffect(() => {
    const bridged = consumeBridgedEnterMode();
    if (bridged === null) return;

    pendingEnter.current = bridged;
    transitioning.current = true;
    setIsTransitioning(true);
  }, []);

  const navigateInternal = useCallback(
    async (href: string, mode: WorkspaceTransitionMode = "default") => {
      if (transitioning.current) return;

      const currentPath = pathnameRef.current.split("?")[0];
      const targetPath = href.split("?")[0];
      if (currentPath === targetPath) return;

      transitioning.current = true;
      setIsTransitioning(true);

      const resolvedMode = resolveTransitionMode(currentPath, targetPath, mode);
      lastTransitionModeRef.current = resolvedMode;
      const wrapper = wrapperRef.current;
      const container = queryContainer(wrapper);
      const veil = querySwapVeil(container ?? undefined);

      try {
        await animateWorkspaceLeave(container ?? undefined, resolvedMode, wrapper);

        // Single arc: swap while still clear, blur rises after and fades out slowly.
        swapVeilAnimRef.current = beginSwapVeilArc(veil);
        pendingEnter.current = resolvedMode;
        setBridgedEnterMode(resolvedMode);
        router.push(href);
      } catch (error) {
        console.error("[workspace] leave transition failed", error);
        releaseTransition(
          wrapperRef.current,
          pendingEnter,
          transitioning,
          setIsTransitioning,
          swapVeilAnimRef,
        );
      }
    },
    [router, wrapperRef],
  );

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    let disposed = false;
    let barbaInstance: { destroy: () => void } | null = null;

    void import("@barba/core").then(({ default: barba }) => {
      if (disposed) return;
      barbaInstance = barba.init({
        debug: process.env.NODE_ENV === "development",
        prevent: () => true,
        transitions: [
          {
            name: "workspace-minimize",
            leave: () => Promise.resolve(),
            enter: () => Promise.resolve(),
          },
        ],
      });
    });

    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>(
        "a[data-workspace-link]",
      );
      if (!anchor || transitioning.current) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      const path = href.split("?")[0];
      if (path === pathnameRef.current.split("?")[0]) return;

      event.preventDefault();
      const mode =
        (anchor.dataset.workspaceTransition as WorkspaceTransitionMode | undefined) ??
        "default";
      void navigateInternal(href, mode);
    };

    wrapper.addEventListener("click", onClick);
    return () => {
      disposed = true;
      wrapper.removeEventListener("click", onClick);
      barbaInstance?.destroy();
      releaseTransition(wrapper, pendingEnter, transitioning, setIsTransitioning, swapVeilAnimRef);
    };
  }, [wrapperRef, navigateInternal]);

  useLayoutEffect(() => {
    if (pendingEnter.current === null) return;

    const wrapper = wrapperRef.current;
    const container = queryContainer(wrapper);
    if (!container || !wrapper) return;

    primeWorkspaceEnter(container, pendingEnter.current, wrapper);
  }, [pathname, wrapperRef]);

  useEffect(() => {
    if (pendingEnter.current === null) return;

    const mode = pendingEnter.current;
    const runId = ++enterRunId.current;
    let cancelled = false;

    void (async () => {
      try {
        await waitForWorkspaceCard();
        if (cancelled || runId !== enterRunId.current) return;

        const wrapper = wrapperRef.current;
        const container = queryContainer(wrapper);
        const veil = querySwapVeil(container ?? undefined);
        const veilAnim = swapVeilAnimRef.current;
        pendingEnter.current = null;

        await Promise.all([
          animateWorkspaceEnter(container ?? undefined, mode, wrapper),
          finishSwapVeil(veil, veilAnim),
        ]);
        swapVeilAnimRef.current = null;
      } catch (error) {
        console.error("[workspace] enter transition failed", error);
      } finally {
        if (!cancelled && runId === enterRunId.current) {
          releaseTransition(
            wrapperRef.current,
            pendingEnter,
            transitioning,
            setIsTransitioning,
            swapVeilAnimRef,
            mode,
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, wrapperRef]);

  const navigate = useCallback(
    (href: string, mode: WorkspaceTransitionMode = "default") => {
      void navigateInternal(href, mode);
    },
    [navigateInternal],
  );

  return (
    <WorkspaceNavContext.Provider value={{ navigate, isTransitioning }}>
      {children}
    </WorkspaceNavContext.Provider>
  );
}
