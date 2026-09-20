export type OntologyKind = "tissue" | "disease";

export const ONTOLOGY_KINDS: Record<
  OntologyKind,
  { ontology: string; annotated: (term: string) => string }
> = {
  tissue: {
    ontology: "UBERON",
    annotated: (term) => `annotated as ${term} tissue`,
  },
  disease: {
    ontology: "MONDO",
    annotated: (term) => `annotated with ${term}`,
  },
};

export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** default term-table sort; the server-rendered first page uses it too */
export const ONTOLOGY_DEFAULT_SORT = { key: "pub_date", order: "desc" } as const;

/** lowercase, hyphenated: "Bone marrow" -> "bone-marrow" */
export const termSlug = (term: string) =>
  term.trim().toLowerCase().replace(/\s+/g, "-");

export const ontologyTermHref = (kind: OntologyKind, term: string) =>
  `/${kind}/${encodeURIComponent(termSlug(term))}`;

/** inverse of termSlug for the common case: "bone-marrow" -> "bone marrow" */
export const slugToTerm = (slug: string) => safeDecode(slug).replace(/-/g, " ");

/** the API wants the real term, spaces included */
export const ontologyTermApiPath = (kind: OntologyKind, term: string) =>
  `/${kind}/${encodeURIComponent(term)}`;
