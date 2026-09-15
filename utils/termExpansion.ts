import { useSyncExternalStore } from "react";

// Defaults to on ("0" stored means explicitly off); URL settings override the stored default so links stay shareable.
export const EXPANSION_PARAM = "expand";

const STORAGE_KEY = "seqout:term-expansion";
const CHANGE_EVENT = "seqout:term-expansion-change";

// Fallback for when localStorage throws (private mode, quota, disabled storage).
let memoryPreference: boolean | null = null;

/** Whether the URL disables expansion, independently of the stored preference. */
export function expansionDisabled(params: {
  get(key: string): string | null;
}): boolean {
  return params.get(EXPANSION_PARAM) === "0";
}

/** Stored expansion default, true unless explicitly turned off. */
export function readExpansionPreference(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "0";
  } catch {
    return memoryPreference ?? true;
  }
}

export function writeExpansionPreference(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  } catch {
    memoryPreference = on;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribeToExpansionPreference(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  // Reaches other open tabs; this tab's own write already dispatches the event above.
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** Live view of the stored preference; true on the server and until mount (avoids a hydration mismatch). */
export function useExpansionPreference(): boolean {
  return useSyncExternalStore(
    subscribeToExpansionPreference,
    readExpansionPreference,
    () => true,
  );
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

// Radix tokens theme-adapt automatically; picked distinct from hues Badges/charts already use.
export const ONTOLOGY_COLORS: Record<string, string> = {
  MONDO: "var(--tomato-9)",
  MeSH: "var(--cyan-9)",
  HGNC: "var(--jade-9)",
  CHEBI: "var(--orange-9)",
  UBERON: "var(--sky-9)",
  CL: "var(--plum-9)",
  EFO: "var(--amber-9)",
  CVCL: "var(--brown-9)",
};

/** Ontology id from a source CURIE, matching the server's xref-prefix rule. */
export function ontologyFromXref(xref: string): string {
  return xref.startsWith("CVCL_") ? "CVCL" : xref.split(":")[0];
}

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
