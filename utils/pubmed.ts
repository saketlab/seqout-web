import type { StudyPublication } from "@/utils/types";

// Anonymous NCBI E-utilities requests have a 3 req/s cap; CORS is enabled on eutils.ncbi.nlm.nih.gov.
const ESUMMARY =
  "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json";

type EsummaryDoc = {
  title?: string;
  fulljournalname?: string;
  source?: string;
  pubdate?: string;
  authors?: { name?: string }[];
  articleids?: { idtype?: string; value?: string }[];
};

/** Fetch missing publication metadata from NCBI PubMed using the backend PMID. Returns {} on failure, preserving existing fields. */
export async function fetchPubmedSummary(
  pmid: string,
  signal?: AbortSignal,
): Promise<Partial<StudyPublication>> {
  try {
    const res = await fetch(`${ESUMMARY}&id=${encodeURIComponent(pmid)}`, {
      signal,
    });
    if (!res.ok) return {};
    const json = (await res.json()) as { result?: Record<string, EsummaryDoc> };
    const doc = json.result?.[pmid];
    if (!doc) return {};

    const doi = doc.articleids?.find((a) => a.idtype === "doi")?.value ?? null;
    const authors =
      doc.authors
        ?.map((a) => a.name?.trim())
        .filter((n): n is string => !!n)
        .join(", ") || null;

    return {
      title: doc.title?.trim() || null,
      journal: doc.fulljournalname?.trim() || doc.source?.trim() || null,
      pub_date: doc.pubdate?.trim() || null,
      authors,
      doi,
    };
  } catch {
    return {};
  }
}
