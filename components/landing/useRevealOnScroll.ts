"use client";

import { useEffect, useRef, useState } from "react";

/**
 * IntersectionObserver hook for scroll-reveal animations.
 * Adds `.revealed` class when element enters viewport.
 * Respects prefers-reduced-motion by marking as immediately visible.
 */
export function useRevealOnScroll(
  options?: IntersectionObserverInit
): [React.RefObject<HTMLElement | null>, boolean] {
  const ref = useRef<HTMLElement | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    // Respect reduced-motion preference
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReduced) {
      setIsRevealed(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true);
          observer.unobserve(el);
        }
      },
      {
        threshold: 0.12,
        rootMargin: "-40px",
        ...options,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, isRevealed];
}
