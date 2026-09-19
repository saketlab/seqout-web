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

export const ontologyTermHref = (kind: OntologyKind, term: string) =>
  `/${kind}/${encodeURIComponent(term)}`;
