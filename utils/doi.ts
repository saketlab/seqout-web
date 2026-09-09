import type { StudyPublication } from "@/utils/types";

// OpenAlex works API, resolved by DOI. CORS-enabled; mailto joins the polite
// pool. Enriches a submitter-provided citation with a DOI that isn't in PubMed
// but is a real registered work.
const OPENALEX_BY_DOI = "https://api.openalex.org/works/https://doi.org/";

type OpenAlexWork = {
  display_name?: string;
  publication_date?: string;
  publication_year?: number;
  cited_by_count?: number;
  primary_location?: { source?: { display_name?: string } | null } | null;
  authorships?: { author?: { display_name?: string } }[];
};

/** Fetch publication metadata for a DOI from OpenAlex. Returns {} on failure so the caller can retain the raw citation. */
export async function fetchDoiSummary(
  doi: string,
  signal?: AbortSignal,
): Promise<Partial<StudyPublication>> {
  try {
    const res = await fetch(
      `${OPENALEX_BY_DOI}${encodeURIComponent(doi)}?mailto=seqout@gmail.com`,
      { signal },
    );
    if (!res.ok) return {};
    const w = (await res.json()) as OpenAlexWork;

    const authors =
      w.authorships
        ?.map((a) => a.author?.display_name?.trim())
        .filter((n): n is string => !!n)
        .join(", ") || null;

    return {
      title: w.display_name?.trim() || null,
      journal: w.primary_location?.source?.display_name?.trim() || null,
      pub_date:
        w.publication_date?.trim() ||
        (w.publication_year ? String(w.publication_year) : null),
      authors,
      citation_count:
        typeof w.cited_by_count === "number" ? w.cited_by_count : null,
    };
  } catch {
    return {};
  }
}
