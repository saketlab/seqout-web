import { useState } from "react";
import { SERVER_URL } from "./constants";
import {
  isAccessionUrl,
  parseAccessions,
  startsWithAccession,
} from "./accessionLinks";
import { getProjectShortUrl } from "./shortUrl";

const HISTORY_KEY = "searchHistory";
const MAX_HISTORY = 5;
// Carry sort, time, and source settings into a new search; reset the deeper facets.
const CARRIED_PARAM_KEYS = [
  "db",
  "sort",
  "time",
  "year_from",
  "year_to",
  "expand",
  "exclude_ontology",
];

const buildSearchUrl = (query: string, carry?: URLSearchParams | null) => {
  const params = new URLSearchParams();
  params.set("q", query);
  if (carry) {
    for (const key of CARRIED_PARAM_KEYS) {
      const value = carry.get(key);
      if (value) params.set(key, value);
    }
  }
  return `/search?${params.toString()}`;
};

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error("Failed to parse search history", e);
          return [];
        }
      }
    }
    return [];
  });

  const saveHistory = (newHistory: string[]) => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    setHistory(newHistory);
  };

  const performSearch = async (
    query: string,
    navigate: (url: string) => void,
    carry?: URLSearchParams | null,
  ) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const newHistory = [trimmed, ...history.filter((h) => h !== trimmed)].slice(
      0,
      MAX_HISTORY,
    );
    saveHistory(newHistory);

    // Jump to the first recognized accession in pasted text or an archive URL.
    if (startsWithAccession(trimmed) || isAccessionUrl(trimmed)) {
      const first = parseAccessions(trimmed)[0];
      if (first) {
        if (first.isPrj) {
          // PRJ* needs a server round-trip to resolve to its GSE/SRP study.
          try {
            const res = await fetch(
              `${SERVER_URL}/prj/${encodeURIComponent(first.raw)}`,
            );
            if (res.status === 500) {
              alert("project not found");
              return;
            }
            if (!res.ok) {
              navigate(buildSearchUrl(trimmed, carry));
              return;
            }
            const data = await res.json();
            const projectAccession =
              typeof data.project_accession === "string" &&
              data.project_accession
                ? data.project_accession
                : first.raw;
            navigate(getProjectShortUrl(projectAccession));
          } catch (error) {
            console.error("Error fetching project:", error);
            navigate(buildSearchUrl(trimmed, carry));
          }
          return;
        }

        if (first.isSubmission) {
          // Resolve submissions first: single-study submissions open the study; multiple studies open a listing.
          try {
            const res = await fetch(
              `${SERVER_URL}/submission/${encodeURIComponent(first.raw)}`,
            );
            if (res.ok) {
              const data = await res.json();
              const studies: { accession: string }[] = data.studies ?? [];
              if (studies.length === 1) {
                navigate(getProjectShortUrl(studies[0].accession));
              } else if (studies.length > 1) {
                navigate(first.url);
              } else {
                navigate(buildSearchUrl(trimmed, carry));
              }
              return;
            }
            // 404 (no studies) or any error → full-text search still helps.
            navigate(buildSearchUrl(trimmed, carry));
          } catch (error) {
            console.error("Error resolving submission:", error);
            navigate(buildSearchUrl(trimmed, carry));
          }
          return;
        }

        navigate(first.url);
        return;
      }
    }

    navigate(buildSearchUrl(trimmed, carry));
  };

  return { history, saveHistory, performSearch };
}
