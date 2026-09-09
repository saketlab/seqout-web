// Query expansion defaults to off, using the API's structured mode.
// URL settings override the stored default so shared links preserve their search.
export const EXPANSION_PARAM = "expand";

const STORAGE_KEY = "seqout:term-expansion";

/** Whether the URL disables expansion, independently of the stored preference. */
export function expansionDisabled(params: {
  get(key: string): string | null;
}): boolean {
  return params.get(EXPANSION_PARAM) === "0";
}

/** Stored expansion default, false until enabled. */
export function readExpansionPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeExpansionPreference(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  } catch {
    // Storage unavailable; retain the setting for this page.
  }
}

/** Ontologies contributing synonyms, mirroring the server expansions.ONTOLOGIES list. The server ignores unknown IDs. */
export const ONTOLOGIES: readonly {
  id: string;
  label: string;
  description: string;
}[] = [
  {
    id: "MONDO",
    label: "Diseases (MONDO)",
    description: "Human diseases and disease-related conditions.",
  },
  {
    id: "MeSH",
    label: "MeSH",
    description: "Biomedical and health-related concepts.",
  },
  {
    id: "HGNC",
    label: "Genes (HGNC)",
    description: "Human genes and gene names.",
  },
  {
    id: "CHEBI",
    label: "Chemicals (ChEBI)",
    description: "Biologically relevant chemical entities.",
  },
  {
    id: "UBERON",
    label: "Anatomy (Uberon)",
    description: "Anatomical structures across species.",
  },
  {
    id: "CL",
    label: "Cell types (CL)",
    description: "Cell types and their relationships.",
  },
  {
    id: "EFO",
    label: "Experimental factors (EFO)",
    description: "Experimental variables and conditions.",
  },
  {
    id: "CVCL",
    label: "Cell lines (Cellosaurus)",
    description: "Biological cell lines and their properties.",
  },
] as const;

/** Same name the API takes, so the page URL copies straight into the request. */
export const ONTOLOGY_PARAM = "exclude_ontology";

const ONTOLOGY_STORAGE_KEY = "seqout:disabled-ontologies";
const KNOWN = new Set(ONTOLOGIES.map((o) => o.id));

function clean(ids: Iterable<string>): string[] {
  return [...new Set([...ids].filter((id) => KNOWN.has(id)))];
}

/** Ontologies this search had switched off: one comma-joined param. */
export function disabledOntologies(params: {
  get(key: string): string | null;
}): string[] {
  return clean(params.get(ONTOLOGY_PARAM)?.split(",") ?? []);
}

export function readDisabledOntologies(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ONTOLOGY_STORAGE_KEY);
    return raw ? clean(JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function writeDisabledOntologies(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      ONTOLOGY_STORAGE_KEY,
      JSON.stringify(clean(ids)),
    );
  } catch {
    // Storage unavailable; retain the setting for this page.
  }
}

/** Order-insensitive, so reordering the URL doesn't read as a pending change. */
export function sameOntologies(a: string[], b: string[]): boolean {
  return a.length === b.length && [...a].sort().join() === [...b].sort().join();
}

/** Stored expansion defaults to inherit when the URL omits explicit settings; null when the URL takes precedence. */
export function inheritedSettings(params: {
  has(key: string): boolean;
}): { off: boolean; disabled: string[] } | null {
  if (params.has(EXPANSION_PARAM) || params.has(ONTOLOGY_PARAM)) return null;
  const off = !readExpansionPreference();
  const disabled = readDisabledOntologies();
  return off || disabled.length ? { off, disabled } : null;
}
