"use client";

// Pulsing dot nagging first-time users toward an unused feature; localStorage retires it once seen.

import type { CSSProperties } from "react";
import { useSyncExternalStore } from "react";

const EVENT = "seqout-first-visit-ping-change";

/** Shared by the navbar button and the search-bar icon, so either click retires both. */
export const HOW_SEARCH_WORKS_KEY = "seqout-how-search-works-clicked";

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** [seen, markSeen] for one feature, persisted under key; server snapshot is true so the ping never flashes for a returning user during hydration. */
export function useFirstVisit(key: string): [boolean, () => void] {
  const seen = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(key) === "true",
    () => true,
  );
  const markSeen = () => {
    window.localStorage.setItem(key, "true");
    window.dispatchEvent(new Event(EVENT));
  };
  return [seen, markSeen];
}

/** Absolutely positioned; requires a relatively positioned parent. */
export function FirstVisitPing({ style }: { style?: CSSProperties }) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        top: "-3px",
        left: "-3px",
        display: "flex",
        height: "8px",
        width: "8px",
        ...style,
      }}
    >
      <span
        className="animate-ping"
        style={{
          position: "absolute",
          display: "inline-flex",
          height: "100%",
          width: "100%",
          borderRadius: "9999px",
          backgroundColor: "var(--accent-9)",
          opacity: 0.75,
        }}
      />
      <span
        style={{
          position: "relative",
          display: "inline-flex",
          borderRadius: "9999px",
          height: "8px",
          width: "8px",
          backgroundColor: "var(--accent-9)",
        }}
      />
    </span>
  );
}
