import { withTimeout } from "@/utils/api";
import { SERVER_API_BASE } from "@/utils/constants";
import { titleCaseTerm } from "@/utils/format";
import {
  ONTOLOGY_DEFAULT_SORT,
  safeDecode,
  slugToTerm,
  type OntologyKind,
} from "@/utils/ontology-kinds";
import type {
  OntologyTermProject,
  OntologyTermProjectsPage,
  OntologyTermSummary,
} from "@/utils/useStats";
import { cache } from "react";

const SSR_ROWS = 50;

const MAX_SLUG = 100;

type Term = {
  term: string;
  inline: string;
  label: string;
};

export type ResolvedTerm =
  | ({ status: "ok"; summary: OntologyTermSummary } & Term)
  // API unreachable: the page renders client-side
  | ({ status: "unavailable" } & Term)
  | { status: "none" };

// null: 404, undefined: unreachable
async function fetchJson<T>(path: string): Promise<T | null | undefined> {
  try {
    const res = await fetch(`${SERVER_API_BASE}${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
      signal: withTimeout(),
    });
    if (res.status === 404) return null;
    if (!res.ok) return undefined;
    return (await res.json()) as T;
  } catch {
    return undefined;
  }
}

function inlineLabel(term: string, s: OntologyTermSummary): string {
  const labels = s.resolution === "exact" ? s.matched_labels : [];
  return labels.find((l) => l !== l.toLowerCase()) ?? labels[0] ?? term;
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const fetchSummary = (kind: OntologyKind, term: string) =>
  fetchJson<OntologyTermSummary>(`/${kind}/${encodeURIComponent(term)}/summary`);

/** hyphens may be spaces ("bone-marrow") or literal ("covid-19"): try spaces first, exact match wins */
export const resolveOntologyTerm = cache(
  async (kind: OntologyKind, slug: string): Promise<ResolvedTerm> => {
    const decoded = safeDecode(slug).trim().toLowerCase();
    if (!decoded || decoded.length > MAX_SLUG || /[\u0000-\u001f]/.test(decoded)) {
      return { status: "none" };
    }
    const spaced = slugToTerm(decoded);
    const results = [{ term: spaced, summary: await fetchSummary(kind, spaced) }];
    const done = results[0].summary?.resolution === "exact" && results[0].summary.studies > 0;
    if (!done && decoded !== spaced) {
      results.push({ term: decoded, summary: await fetchSummary(kind, decoded) });
    }

    const failed = results.some((r) => r.summary === undefined);
    const hits = results.flatMap((r) =>
      r.summary && r.summary.studies > 0 ? [{ term: r.term, summary: r.summary }] : [],
    );
    const best = hits.find((h) => h.summary.resolution === "exact") ?? hits[0];
    if (failed && best?.summary.resolution !== "exact") {
      return { status: "unavailable", term: spaced, inline: spaced, label: titleCaseTerm(spaced) };
    }
    if (!best) return { status: "none" };

    const inline = inlineLabel(best.term, best.summary);
    return {
      status: "ok",
      term: best.term,
      inline,
      label: capitalise(inline),
      summary: best.summary,
    };
  },
);

export async function termLabel(kind: OntologyKind, slug: string): Promise<string> {
  const r = await resolveOntologyTerm(kind, slug);
  return r.status === "none" ? titleCaseTerm(slugToTerm(slug)) : r.label;
}

export async function fetchTermProjects(
  kind: OntologyKind,
  term: string,
): Promise<OntologyTermProjectsPage<OntologyTermProject> | undefined> {
  const { key, order } = ONTOLOGY_DEFAULT_SORT;
  return (
    (await fetchJson<OntologyTermProjectsPage<OntologyTermProject>>(
      `/${kind}/${encodeURIComponent(term)}/projects?limit=${SSR_ROWS}&sort=${key}&order=${order}`,
    )) ?? undefined
  );
}
