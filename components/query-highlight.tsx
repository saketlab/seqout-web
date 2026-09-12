"use client";

import { getSearchHighlight } from "@/utils/api";
import { disabledOntologies, expansionDisabled } from "@/utils/termExpansion";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const HIGHLIGHT_NAME = "seqout-query";
/** Expansion-derived words with a distinct hue and source tooltip. */
const DERIVED_HIGHLIGHT_NAME = "seqout-query-derived";
const SHOW_MS = 50000;
/** Project pages fetch client-side, so give the text time to arrive. */
const GIVE_UP_MS = 10000;
const MAX_RANGES = 500;
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NAV", "FOOTER", "BUTTON"]);

/** Match whole words reported by Postgres, which includes matched inflections. Substring matching would also select unrelated words such as "accurate" for "rat". */
export function wordsPattern(words: string[]): RegExp | null {
  const escaped = words
    .filter((w) => w.trim())
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!escaped.length) return null;
  return new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${escaped.join("|")})(?![\\p{L}\\p{N}])`,
    "giu",
  );
}

/** Separate literal and expansion-derived matches. Case-fold lookups because server keys are lowercase and page text retains its case. */
export function partitionWords(
  words: string[],
  derived: Record<string, string> | undefined,
): { own: string[]; expanded: string[] } {
  const own: string[] = [];
  const expanded: string[] = [];
  for (const w of words) {
    (derived?.[w.toLowerCase()] ? expanded : own).push(w);
  }
  return { own, expanded };
}

/** The term a highlighted piece of text came from, or null if the query owns it. */
export function termForMatch(
  text: string,
  derived: Record<string, string> | undefined,
): string | null {
  return derived?.[text.trim().toLowerCase()] ?? null;
}

export function findRanges(pattern: RegExp): Range[] {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent || SKIP_TAGS.has(parent.tagName))
          return NodeFilter.FILTER_REJECT;
        return node.nodeValue?.trim()
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    },
  );
  const ranges: Range[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    pattern.lastIndex = 0;
    for (const m of node.nodeValue!.matchAll(pattern)) {
      const range = document.createRange();
      range.setStart(node, m.index);
      range.setEnd(node, m.index + m[0].length);
      ranges.push(range);
      if (ranges.length >= MAX_RANGES) return ranges;
    }
  }
  return ranges;
}

/**
 * Text position under the pointer. Two names for the same thing: the standard
 * one and WebKit/older-Blink's.
 */
function caretAt(x: number, y: number): { node: Node; offset: number } | null {
  const doc = document as Document & {
    caretPositionFromPoint?: (
      x: number,
      y: number,
    ) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  const pos = doc.caretPositionFromPoint?.(x, y);
  if (pos) return { node: pos.offsetNode, offset: pos.offset };
  const range = doc.caretRangeFromPoint?.(x, y);
  return range
    ? { node: range.startContainer, offset: range.startOffset }
    : null;
}

/** Highlight words matched by the search query in the URL. Expansion-derived words use a distinct hue and source tooltip. CSS highlight ranges require pointer hit-testing for tooltips. */
export default function QueryHighlight() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const accession = (useParams().accession as string | undefined) ?? "";
  // Use the URL expansion settings to highlight the words matched by the originating search.
  const noExpansion = expansionDisabled(searchParams);
  const excludeOntology = disabledOntologies(searchParams).join();

  useEffect(() => {
    // CSS Custom Highlight API: no DOM mutation, so React never fights it.
    if (!q || !accession || typeof CSS === "undefined" || !CSS.highlights)
      return;

    const abort = new AbortController();
    let poll: ReturnType<typeof setInterval> | undefined;
    let hide: ReturnType<typeof setTimeout> | undefined;
    let derivedRanges: Range[] = [];
    let tooltip: HTMLDivElement | null = null;
    let onMove: ((e: MouseEvent) => void) | undefined;

    const hideTooltip = () => {
      tooltip?.remove();
      tooltip = null;
    };

    const teardown = () => {
      CSS.highlights.delete(HIGHLIGHT_NAME);
      CSS.highlights.delete(DERIVED_HIGHLIGHT_NAME);
      derivedRanges = [];
      if (onMove) document.removeEventListener("mousemove", onMove);
      onMove = undefined;
      hideTooltip();
    };

    getSearchHighlight(
      q,
      accession,
      {
        structured: noExpansion,
        excludeOntology: excludeOntology ? excludeOntology.split(",") : [],
      },
      abort.signal,
    )
      .then(({ words, derived }) => {
        const { own, expanded } = partitionWords(words, derived);
        const ownPattern = wordsPattern(own);
        const expandedPattern = wordsPattern(expanded);
        if (!ownPattern && !expandedPattern) return;
        const deadline = Date.now() + GIVE_UP_MS;
        poll = setInterval(() => {
          const ownRanges = ownPattern ? findRanges(ownPattern) : [];
          const expandedRanges = expandedPattern
            ? findRanges(expandedPattern)
            : [];
          if (!ownRanges.length && !expandedRanges.length) {
            if (Date.now() > deadline) clearInterval(poll);
            return;
          }
          clearInterval(poll);
          if (ownRanges.length)
            CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(...ownRanges));
          if (expandedRanges.length) {
            CSS.highlights.set(
              DERIVED_HIGHLIGHT_NAME,
              new Highlight(...expandedRanges),
            );
            derivedRanges = expandedRanges;
            onMove = (e: MouseEvent) => {
              const caret = caretAt(e.clientX, e.clientY);
              const hit =
                caret &&
                derivedRanges.find((r) =>
                  r.isPointInRange(caret.node, caret.offset),
                );
              const term = hit ? termForMatch(hit.toString(), derived) : null;
              if (!term) return hideTooltip();
              if (!tooltip) {
                tooltip = document.createElement("div");
                tooltip.setAttribute("role", "tooltip");
                tooltip.style.cssText =
                  "position:fixed;z-index:9999;pointer-events:none;max-width:22rem;" +
                  "padding:4px 8px;border-radius:6px;font-size:12px;line-height:1.4;" +
                  "font-family:var(--default-font-family,ui-sans-serif,system-ui,sans-serif);" +
                  "background:var(--gray-12);color:var(--gray-1);" +
                  "box-shadow:0 4px 12px rgba(0,0,0,.18)";
                // Attach to the theme root, where --default-font-family and the gray scale are defined.
                (
                  document.querySelector(".seqout-root-theme") ?? document.body
                ).appendChild(tooltip);
              }
              tooltip.textContent = `Matched via “${term}”`;
              tooltip.style.left = `${Math.min(e.clientX + 12, window.innerWidth - 360)}px`;
              tooltip.style.top = `${e.clientY + 16}px`;
            };
            document.addEventListener("mousemove", onMove);
          }
          hide = setTimeout(teardown, SHOW_MS);
        }, 300);
      })
      // Highlighting is decoration; a failed lookup just means none.
      .catch(() => {});

    return () => {
      abort.abort();
      clearInterval(poll);
      clearTimeout(hide);
      teardown();
    };
  }, [q, accession, noExpansion, excludeOntology]);

  return (
    // Use a distinct hue for expanded matches while preserving the weight of literal matches.
    <style>{`
      ::highlight(${HIGHLIGHT_NAME}) { background-color: var(--amber-a6); color: var(--gray-12); }
      ::highlight(${DERIVED_HIGHLIGHT_NAME}) { background-color: var(--cyan-a6); color: var(--gray-12); text-decoration: underline dotted; text-underline-offset: 2px; }
    `}</style>
  );
}
