"use client";

import { track } from "@/utils/analytics";
import { useEffect } from "react";

// Delegated GA4 click tracking for buttons and links.
// Capture phase preserves events when handlers stop propagation. Label priority: aria-label > text > href.
export default function ClickTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const el = target?.closest<HTMLElement>("button, a, [role='button']");
      if (!el) return;
      const label =
        el.getAttribute("aria-label")?.trim() ||
        el.textContent?.trim().slice(0, 100) ||
        el.getAttribute("href") ||
        "(unlabeled)";
      const href = el.getAttribute("href") ?? undefined;
      track("ui_click", {
        label,
        tag: el.tagName.toLowerCase(),
        ...(href ? { href } : {}),
        path: window.location.pathname,
      });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () =>
      document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
