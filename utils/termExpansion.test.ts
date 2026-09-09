import { describe, expect, it } from "vitest";
import {
  EXPANSION_PARAM,
  ONTOLOGIES,
  disabledOntologies,
  expansionDisabled,
  inheritedSettings,
  sameOntologies,
  writeDisabledOntologies,
  readExpansionPreference,
  writeExpansionPreference,
} from "./termExpansion";

describe("expansionDisabled", () => {
  it("is off only for the explicit expand=0", () => {
    expect(expansionDisabled(new URLSearchParams("expand=0"))).toBe(true);
    expect(expansionDisabled(new URLSearchParams("q=liver"))).toBe(false);
    // Other values enable expansion to preserve shared-link behavior.
    expect(expansionDisabled(new URLSearchParams("expand=1"))).toBe(false);
    expect(expansionDisabled(new URLSearchParams("expand=false"))).toBe(false);
  });

  it("names the param the search URL carries", () => {
    expect(EXPANSION_PARAM).toBe("expand");
  });
});

describe("expansion preference", () => {
  it("defaults to off with no storage (SSR) and round-trips with it", () => {
    expect(readExpansionPreference()).toBe(false);

    const store = new Map<string, string>();
    const g = globalThis as { window?: unknown };
    g.window = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
      },
    };
    try {
      // A browser that has never touched the switch searches the words as typed.
      expect(readExpansionPreference()).toBe(false);
      writeExpansionPreference(true);
      expect(readExpansionPreference()).toBe(true);
      writeExpansionPreference(false);
      expect(readExpansionPreference()).toBe(false);
    } finally {
      delete g.window;
    }
  });
});

describe("ontology exclusions", () => {
  it("mirrors the eight ingested ontologies and drops unknown ids", () => {
    expect(ONTOLOGIES).toHaveLength(8);
    const params = new URLSearchParams(
      "exclude_ontology=MeSH&exclude_ontology=nope&exclude_ontology=MeSH",
    );
    // Deduplicate and drop unknown IDs so URL settings correspond to supported filters.
    expect(disabledOntologies(params)).toEqual(["MeSH"]);
    expect(disabledOntologies(new URLSearchParams("q=liver"))).toEqual([]);
  });

  it("compares sets, not order", () => {
    expect(sameOntologies(["MeSH", "CL"], ["CL", "MeSH"])).toBe(true);
    expect(sameOntologies(["MeSH"], ["MeSH", "CL"])).toBe(false);
    expect(sameOntologies([], [])).toBe(true);
  });
});

// No window in this environment, so the stored default reads as the default.
function withStorage(run: () => void) {
  const store = new Map<string, string>();
  const g = globalThis as { window?: unknown };
  g.window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    },
  };
  try {
    run();
  } finally {
    delete g.window;
  }
}

describe("disabledOntologies", () => {
  it("reads the comma-joined param", () => {
    const joined = new URLSearchParams("exclude_ontology=MeSH,MONDO");
    expect(disabledOntologies(joined)).toEqual(["MeSH", "MONDO"]);
    expect(disabledOntologies(new URLSearchParams("q=liver"))).toEqual([]);
    // Unknown ids are dropped: the server ignores them, so keeping them would
    // only make the URL claim a filter that never ran.
    expect(disabledOntologies(new URLSearchParams("exclude_ontology=MeSH,x"))).toEqual([
      "MeSH",
    ]);
  });
});

describe("inheritedSettings", () => {
  it("hands a param-less search URL this browser's stored default", () => {
    withStorage(() => {
      writeExpansionPreference(true);
      writeDisabledOntologies(["MeSH"]);
      expect(inheritedSettings(new URLSearchParams("q=liver"))).toEqual({
        off: false,
        disabled: ["MeSH"],
      });
    });
  });

  it("leaves a URL that names either param alone", () => {
    withStorage(() => {
      writeExpansionPreference(false);
      writeDisabledOntologies(["MeSH"]);
      // Explicit beats stored, so a shared link searches what its sender saw.
      expect(inheritedSettings(new URLSearchParams("q=liver&expand=0"))).toBe(
        null,
      );
      expect(
        inheritedSettings(new URLSearchParams("q=liver&exclude_ontology=CL")),
      ).toBe(null);
    });
  });

  it("does nothing when the stored default is what the URL already means", () => {
    withStorage(() => {
      writeExpansionPreference(true);
      writeDisabledOntologies([]);
      expect(inheritedSettings(new URLSearchParams("q=liver"))).toBe(null);
    });
  });
});
