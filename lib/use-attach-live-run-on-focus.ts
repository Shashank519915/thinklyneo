"use client";

import { useEffect, useRef } from "react";

/**
 * When the tab becomes visible, refresh history and try to attach a server-side
 * running workflow if no live SSE subscriber is mounted (e.g. run started via API
 * while this tab was in the background).
 */
export function useAttachLiveRunOnFocus(
  attach: () => void | Promise<void>,
  hasLiveSubscriber: boolean
): void {
  const attachRef = useRef(attach);
  attachRef.current = attach;

  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState !== "visible") return;
      window.dispatchEvent(new CustomEvent("nextflow:refresh-history"));
      if (!hasLiveSubscriber) {
        void attachRef.current();
      }
    };

    document.addEventListener("visibilitychange", handleVisible);
    return () => document.removeEventListener("visibilitychange", handleVisible);
  }, [hasLiveSubscriber]);
}
