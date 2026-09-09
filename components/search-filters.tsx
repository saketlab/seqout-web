"use client";

import { DeepDiveSection } from "@/components/deep-dive-section";
import {
  OrganismFilter,
  OrganismNameMode,
  type ScientificFacet,
} from "@/components/organism_filter";
import type { SortBy } from "@/components/search-page-body";
import { DB_LABELS, SEARCH_DBS, type SearchDb } from "@/utils/db-colors";
import { SearchResult } from "@/utils/types";
import {
  CheckIcon,
  CrumpledPaperIcon,
  InfoCircledIcon,
  MagnifyingGlassIcon,
  MixerHorizontalIcon,
  TriangleLeftIcon,
  TriangleRightIcon,
} from "@radix-ui/react-icons";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  Flex,
  Link,
  Select,
  Separator,
  Tabs,
  Text,
  TextField,
  Tooltip,
} from "@radix-ui/themes";
import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import NextLink from "next/link";
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

countries.registerLocale(enLocale);

// Scrollable tabs with overflow arrows that indicate direction and scroll on click.
function ScrollableTabsList({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 1);
    setCanRight(Math.ceil(el.scrollLeft + el.clientWidth) < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    // Recompute on width changes (rail resize, opening the dialog, tab count).
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update]);

  const nudge = (dx: number) =>
    ref.current?.scrollBy({ left: dx, behavior: "smooth" });

  const arrowBase: CSSProperties = {
    position: "absolute",
    top: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    width: "2rem",
    border: "none",
    cursor: "pointer",
    color: "var(--gray-11)",
  };

  return (
    <div style={{ position: "relative" }}>
      <Tabs.List
        ref={ref}
        onScroll={update}
        style={{ overflowX: "auto", maxWidth: "100%", whiteSpace: "nowrap" }}
      >
        {children}
      </Tabs.List>
      {canLeft ? (
        <button
          type="button"
          aria-label="Scroll filters left"
          onClick={() => nudge(-160)}
          style={{
            ...arrowBase,
            left: 0,
            justifyContent: "flex-start",
            background:
              "linear-gradient(to right, var(--color-panel-solid) 55%, transparent)",
          }}
        >
          <TriangleLeftIcon width="18" height="18" />
        </button>
      ) : null}
      {canRight ? (
        <button
          type="button"
          aria-label="Scroll filters right"
          onClick={() => nudge(160)}
          style={{
            ...arrowBase,
            right: 0,
            justifyContent: "flex-end",
            background:
              "linear-gradient(to left, var(--color-panel-solid) 55%, transparent)",
          }}
        >
          <TriangleRightIcon width="18" height="18" />
        </button>
      ) : null}
    </div>
  );
}

const PLATFORM_DISPLAY: Record<string, string> = {
  ILLUMINA: "Illumina",
  OXFORD_NANOPORE: "Oxford Nanopore",
  PACBIO_SMRT: "PacBio",
  ION_TORRENT: "Ion Torrent",
  DNBSEQ: "DNBSEQ (MGI)",
  BGISEQ: "BGISEQ (MGI)",
  ELEMENT: "Element Biosciences",
  ABI_SOLID: "SOLiD",
  COMPLETE_GENOMICS: "Complete Genomics",
  LS454: "454 Life Sciences",
  HELICOS: "Helicos",
  ULTIMA: "Ultima Genomics",
  GENEMIND: "GeneMind",
  CAPILLARY: "Capillary",
  VELA_DIAGNOSTICS: "Vela Diagnostics",
  TAPESTRI: "Tapestri",
  GENAPSYS: "GenapSys",
  SINGULAR_GENOMICS: "Singular Genomics",
};

export type TimeFilter = "any" | "1" | "5" | "10" | "20" | "custom";

/** Exact facet counts from /search/facets, keyed by facet name. */
// Summed study match rank, used to order facet values by relevance. Zero for query-less searches.
export type SearchFacetList = {
  value: string;
  count: number;
  score?: number;
}[];
export type SearchFacets = {
  organism?: SearchFacetList;
  country?: SearchFacetList;
  journal?: SearchFacetList;
  library_strategy?: SearchFacetList;
  library_source?: SearchFacetList;
  instrument_model?: SearchFacetList;
};

/** Facet counts from loaded results, overridden by server totals for its capped top values. Client counts retain the long tail for search within filters. */
function buildFacetCounts(
  serverList: SearchFacetList | undefined,
  results: SearchResult[],
  extract: (r: SearchResult) => (string | null | undefined)[],
  normalize: (v: string) => string = (v) => v,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const result of results) {
    for (const raw of extract(result)) {
      const value = raw?.trim();
      if (!value) continue;
      const key = normalize(value);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  if (serverList) {
    for (const { value, count } of serverList)
      counts.set(normalize(value), count);
  }
  return counts;
}

type SearchFiltersProps = {
  sortBy: SortBy;
  setSortBy: (value: SortBy) => void;
  setTimeFilter: (value: TimeFilter) => void;
  timeFilter: TimeFilter;
  customYearRange: { from: string; to: string };
  setCustomYearRange: (value: { from: string; to: string }) => void;
  // Render the source selector when a handler is supplied.
  db?: string | null;
  query?: string | null;
  onDatabaseChange?: (value: SearchDb | "both") => void;
};

/** Rolling YYYY-MM-DD cutoff for a "last N years" preset. Shared with the URL builder to align client filtering with server date bounds. */
export function rollingCutoff(years: number): string {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - years);
  return cutoff.toISOString().slice(0, 10);
}

/**
 * Client-side date filter over anything carrying updated_at. Day-precise and
 * bounded identically to the server, so the rendered list and sidebar counts agree.
 */
export function applyTimeFilter<T extends { updated_at: string | null }>(
  results: T[],
  timeFilter: string,
  customYearRange: { from: string; to: string },
): T[] {
  if (timeFilter === "any") return results;
  let from: string;
  let to = "";
  if (timeFilter === "custom") {
    ({ from, to } = customYearRange);
    if (!from && !to) return results;
  } else {
    const years = parseInt(timeFilter);
    if (!years) return results;
    from = rollingCutoff(years);
  }
  const fromT = from ? new Date(from).getTime() : -Infinity;
  // Both bounds name a whole day, so the to bound runs to that day's last millisecond.
  const toT = to ? new Date(to).getTime() + 86_400_000 - 1 : Infinity;
  if (Number.isNaN(fromT) || Number.isNaN(toT)) return results;
  return results.filter((r) => {
    const t = new Date(r.updated_at ?? "").getTime();
    return !Number.isNaN(t) && t >= fromT && t <= toT;
  });
}

export function SearchFilters({
  db,
  query,
  sortBy,
  setSortBy,
  setTimeFilter,
  timeFilter,
  customYearRange,
  setCustomYearRange,
  onDatabaseChange,
}: SearchFiltersProps) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Flex
      direction="row"
      gap="2"
      wrap="wrap"
      align="center"
      aria-label="Search filters"
    >
      <Select.Root
        value={sortBy}
        name="sort"
        onValueChange={(value) => setSortBy(value as SortBy)}
        size="1"
      >
        <Select.Trigger aria-label="Sort by" />
        <Select.Content>
          <Select.Group>
            <Select.Item value="relevance">Sort by relevance</Select.Item>
            <Select.Item value="date">Sort by date</Select.Item>
            <Select.Item value="citations">Sort by citations</Select.Item>
            <Select.Item value="journal">Sort by journal</Select.Item>
          </Select.Group>
        </Select.Content>
      </Select.Root>

      <Select.Root
        value={timeFilter}
        name="time"
        onValueChange={(value) => setTimeFilter(value as TimeFilter)}
        size="1"
      >
        <Select.Trigger aria-label="Time range" />
        <Select.Content>
          <Select.Group>
            <Select.Item value="any">Any time</Select.Item>
            <Select.Item value="1">Last year</Select.Item>
            <Select.Item value="5">Last 5 years</Select.Item>
            <Select.Item value="10">Last 10 years</Select.Item>
            <Select.Item value="20">Last 20 years</Select.Item>
            <Select.Item value="custom">Custom range</Select.Item>
          </Select.Group>
        </Select.Content>
      </Select.Root>

      {onDatabaseChange && (
        <Select.Root
          value={db ? db : "both"}
          onValueChange={(value) => {
            if (!query) return;
            onDatabaseChange(value as SearchDb | "both");
          }}
          size="1"
        >
          <Select.Trigger aria-label="Source database" />
          <Select.Content>
            <Select.Group>
              <Select.Item value="both">All sources</Select.Item>
              {SEARCH_DBS.map((key) => (
                <Select.Item key={key} value={key}>
                  {DB_LABELS[key]} only
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Content>
        </Select.Root>
      )}

      {timeFilter === "custom" && (
        <Flex gap="2" align="center">
          <TextField.Root
            type="date"
            min={MIN_DATE}
            max={today}
            value={customYearRange.from}
            onChange={(e) =>
              setCustomYearRange({ ...customYearRange, from: e.target.value })
            }
            onBlur={() =>
              setCustomYearRange(normalizeDateRange(customYearRange, today))
            }
            variant="surface"
            size="1"
            aria-label="From date"
          />
          <Text size="2" color="gray">
            to
          </Text>
          <TextField.Root
            type="date"
            min={MIN_DATE}
            max={today}
            value={customYearRange.to}
            onChange={(e) =>
              setCustomYearRange({ ...customYearRange, to: e.target.value })
            }
            onBlur={() =>
              setCustomYearRange(normalizeDateRange(customYearRange, today))
            }
            variant="surface"
            size="1"
            aria-label="To date"
          />
        </Flex>
      )}
    </Flex>
  );
}

const MIN_DATE = "2000-01-01";

/**
 * Normalize a date-range pair on blur:
 *   1. Clamp each non-empty bound to [MIN_DATE, today]
 *   2. If both bounds are present and inverted (from > to), swap them
 *
 * Empty inputs are left empty so users can still set a single open-ended
 * bound. Returns the same object identity if nothing changed, so the
 * setCustomYearRange call doesn't trigger an unnecessary URL update.
 */
function normalizeDateRange(
  range: { from: string; to: string },
  maxDate: string,
): { from: string; to: string } {
  const clamp = (raw: string): string => {
    const v = raw.trim();
    if (!v) return "";
    if (Number.isNaN(new Date(v).getTime())) return "";
    if (v < MIN_DATE) return MIN_DATE;
    if (v > maxDate) return maxDate;
    return v;
  };

  let from = clamp(range.from);
  let to = clamp(range.to);

  // ISO dates are lexicographically ordered, so a string compare is enough.
  if (from && to && from > to) [from, to] = [to, from];

  if (from === range.from && to === range.to) return range;
  return { from, to };
}

export function SearchOrganismRail({
  results,
  serverFacets,
  totalCount,
  journalResults,
  countryResults,
  libraryStrategyResults,
  instrumentModelResults,
  platformResults,
  organismNameMode,
  setOrganismNameMode,
  selectedOrganismKey,
  setSelectedOrganismFilter,
  selectedJournalFilters,
  setSelectedJournalFilters,
  selectedCountryFilters,
  setSelectedCountryFilters,
  selectedLibraryStrategyFilters,
  setSelectedLibraryStrategyFilters,
  selectedLibrarySourceFilters,
  setSelectedLibrarySourceFilters,
  selectedInstrumentModelFilters,
  setSelectedInstrumentModelFilters,
  selectedPlatformFilters,
  setSelectedPlatformFilters,
  multiPlatformOnly,
  setMultiPlatformOnly,
  longReadOnly,
  setLongReadOnly,
  onClearMoreFilters,
  onApplyMoreFilters,
  onDiscardMoreFilters,
  showMobile = false,
  showDesktop = true,
}: {
  results: SearchResult[];
  serverFacets?: SearchFacets;
  totalCount?: number;
  journalResults: SearchResult[];
  countryResults: SearchResult[];
  libraryStrategyResults: SearchResult[];
  instrumentModelResults: SearchResult[];
  platformResults: SearchResult[];
  organismNameMode: OrganismNameMode;
  setOrganismNameMode: (value: OrganismNameMode) => void;
  selectedOrganismKey: string | null;
  setSelectedOrganismFilter: (value: string | null) => void;
  selectedJournalFilters: string[];
  setSelectedJournalFilters: (value: string[]) => void;
  selectedCountryFilters: string[];
  setSelectedCountryFilters: (value: string[]) => void;
  selectedLibraryStrategyFilters: string[];
  setSelectedLibraryStrategyFilters: (value: string[]) => void;
  selectedLibrarySourceFilters: string[];
  setSelectedLibrarySourceFilters: (value: string[]) => void;
  selectedInstrumentModelFilters: string[];
  setSelectedInstrumentModelFilters: (value: string[]) => void;
  selectedPlatformFilters: string[];
  setSelectedPlatformFilters: (value: string[]) => void;
  multiPlatformOnly: boolean;
  setMultiPlatformOnly: (value: boolean) => void;
  longReadOnly: boolean;
  setLongReadOnly: (value: boolean) => void;
  onClearMoreFilters: () => void;
  // Commit the pending (optimistic) more-filter selections to the URL / search.
  onApplyMoreFilters: () => void;
  // Discard pending changes (called when the dialog closes without applying).
  onDiscardMoreFilters: () => void;
  showMobile?: boolean;
  showDesktop?: boolean;
}) {
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [organismsOpen, setOrganismsOpen] = useState(false);
  const [journalQuery, setJournalQuery] = useState("");
  const [countryQuery, setCountryQuery] = useState("");
  const [libraryStrategyQuery, setLibraryStrategyQuery] = useState("");
  const [librarySourceQuery, setLibrarySourceQuery] = useState("");
  const [instrumentModelQuery, setInstrumentModelQuery] = useState("");

  const journalCounts = buildFacetCounts(
    serverFacets?.journal,
    journalResults,
    (r) => [r.journal],
  );

  const journalOptions = Array.from(journalCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const normalizedJournalQuery = journalQuery.trim().toLowerCase();
  const visibleJournalOptions = normalizedJournalQuery
    ? journalOptions.filter((option) =>
        option.name.toLowerCase().includes(normalizedJournalQuery),
      )
    : journalOptions;

  const toggleJournalSelection = (journal: string) => {
    if (selectedJournalFilters.includes(journal)) {
      setSelectedJournalFilters(
        selectedJournalFilters.filter((value) => value !== journal),
      );
      return;
    }
    setSelectedJournalFilters([...selectedJournalFilters, journal]);
  };

  const countryCounts = buildFacetCounts(
    serverFacets?.country,
    countryResults,
    (r) => r.countries ?? [],
    (v) => v.toUpperCase(),
  );

  const countryOptions = Array.from(countryCounts.entries())
    .map(([code, count]) => ({
      code,
      label: countries.getName(code, "en", { select: "official" }) ?? code,
      count,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const normalizedCountryQuery = countryQuery.trim().toLowerCase();
  const visibleCountryOptions = normalizedCountryQuery
    ? countryOptions.filter(
        (option) =>
          option.label.toLowerCase().includes(normalizedCountryQuery) ||
          option.code.toLowerCase().includes(normalizedCountryQuery),
      )
    : countryOptions;

  const toggleCountrySelection = (countryCode: string) => {
    if (selectedCountryFilters.includes(countryCode)) {
      setSelectedCountryFilters(
        selectedCountryFilters.filter((value) => value !== countryCode),
      );
      return;
    }
    setSelectedCountryFilters([...selectedCountryFilters, countryCode]);
  };

  const libraryStrategyCounts = buildFacetCounts(
    serverFacets?.library_strategy,
    libraryStrategyResults,
    (r) => r.library_strategies ?? [],
  );

  const libraryStrategyOptions = Array.from(libraryStrategyCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const normalizedLibraryStrategyQuery = libraryStrategyQuery
    .trim()
    .toLowerCase();
  const visibleLibraryStrategyOptions = normalizedLibraryStrategyQuery
    ? libraryStrategyOptions.filter((option) =>
        option.name.toLowerCase().includes(normalizedLibraryStrategyQuery),
      )
    : libraryStrategyOptions;

  const toggleLibraryStrategySelection = (strategy: string) => {
    if (selectedLibraryStrategyFilters.includes(strategy)) {
      setSelectedLibraryStrategyFilters(
        selectedLibraryStrategyFilters.filter((value) => value !== strategy),
      );
      return;
    }
    setSelectedLibraryStrategyFilters([
      ...selectedLibraryStrategyFilters,
      strategy,
    ]);
  };

  // Server-authoritative: library_sources isn't on result rows, so counts come
  // purely from /search/facets (buildFacetCounts lets the server list win).
  const librarySourceCounts = buildFacetCounts(
    serverFacets?.library_source,
    [],
    () => [],
  );

  const librarySourceOptions = Array.from(librarySourceCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const normalizedLibrarySourceQuery = librarySourceQuery.trim().toLowerCase();
  const visibleLibrarySourceOptions = normalizedLibrarySourceQuery
    ? librarySourceOptions.filter((option) =>
        option.name.toLowerCase().includes(normalizedLibrarySourceQuery),
      )
    : librarySourceOptions;

  const toggleLibrarySourceSelection = (source: string) => {
    if (selectedLibrarySourceFilters.includes(source)) {
      setSelectedLibrarySourceFilters(
        selectedLibrarySourceFilters.filter((value) => value !== source),
      );
      return;
    }
    setSelectedLibrarySourceFilters([...selectedLibrarySourceFilters, source]);
  };

  const instrumentModelCounts = buildFacetCounts(
    serverFacets?.instrument_model,
    instrumentModelResults,
    (r) => r.instrument_models ?? [],
  );

  // Server organism facets use {value} → OrganismFilter wants {name}.
  const organismServerFacets: ScientificFacet[] | undefined =
    serverFacets?.organism?.map((f) => ({
      name: f.value,
      count: f.count,
      score: f.score,
    }));

  const instrumentModelOptions = Array.from(instrumentModelCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const normalizedInstrumentModelQuery = instrumentModelQuery
    .trim()
    .toLowerCase();
  const visibleInstrumentModelOptions = normalizedInstrumentModelQuery
    ? instrumentModelOptions.filter((option) =>
        option.name.toLowerCase().includes(normalizedInstrumentModelQuery),
      )
    : instrumentModelOptions;

  const toggleInstrumentModelSelection = (model: string) => {
    if (selectedInstrumentModelFilters.includes(model)) {
      setSelectedInstrumentModelFilters(
        selectedInstrumentModelFilters.filter((value) => value !== model),
      );
      return;
    }
    setSelectedInstrumentModelFilters([
      ...selectedInstrumentModelFilters,
      model,
    ]);
  };

  const platformCounts = new Map<string, number>();
  for (const result of platformResults) {
    for (const p of result.platforms ?? []) {
      const plat = p.trim();
      if (!plat) continue;
      platformCounts.set(plat, (platformCounts.get(plat) ?? 0) + 1);
    }
  }

  const platformOptions = Array.from(platformCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const [platformQuery, setPlatformQuery] = useState("");
  const normalizedPlatformQuery = platformQuery.trim().toLowerCase();
  const visiblePlatformOptions = normalizedPlatformQuery
    ? platformOptions.filter((option) =>
        (PLATFORM_DISPLAY[option.name] ?? option.name)
          .toLowerCase()
          .includes(normalizedPlatformQuery),
      )
    : platformOptions;

  const togglePlatformSelection = (platform: string) => {
    if (selectedPlatformFilters.includes(platform)) {
      setSelectedPlatformFilters(
        selectedPlatformFilters.filter((value) => value !== platform),
      );
      return;
    }
    setSelectedPlatformFilters([...selectedPlatformFilters, platform]);
  };

  const selectedFilterCount =
    selectedJournalFilters.length +
    selectedCountryFilters.length +
    selectedLibraryStrategyFilters.length +
    selectedLibrarySourceFilters.length +
    selectedInstrumentModelFilters.length +
    selectedPlatformFilters.length +
    (multiPlatformOnly ? 1 : 0) +
    (longReadOnly ? 1 : 0);

  return (
    <>
      {showMobile ? (
        <Flex
          display={{ initial: "flex", md: "none" }}
          direction="column"
          gap="2"
          align="end"
        >
          <Dialog.Root open={organismsOpen} onOpenChange={setOrganismsOpen}>
            <Dialog.Trigger>
              <Button>
                <MixerHorizontalIcon />
                Organisms
              </Button>
            </Dialog.Trigger>
            <Dialog.Content
              size="2"
              style={{
                width: "calc(100vw - 2rem)",
                maxWidth: "calc(100vw - 2rem)",
              }}
            >
              <Dialog.Title>Organisms</Dialog.Title>
              <Dialog.Description size="1">
                Narrow results by organism.
              </Dialog.Description>
              <Flex
                mt="3"
                width="100%"
                style={{ height: "24rem", overflowY: "auto" }}
              >
                <div style={{ width: "100%" }}>
                  <OrganismFilter
                    results={results}
                    serverFacets={organismServerFacets}
                    totalCount={totalCount}
                    mode={organismNameMode}
                    onChangeMode={setOrganismNameMode}
                    selectedKey={selectedOrganismKey}
                    onChangeSelection={setSelectedOrganismFilter}
                  />
                </div>
              </Flex>
            </Dialog.Content>
          </Dialog.Root>

          <Dialog.Root
            open={moreFiltersOpen}
            onOpenChange={(open) => {
              // Closing via X / overlay / Esc discards unapplied ticks.
              if (!open) onDiscardMoreFilters();
              setMoreFiltersOpen(open);
            }}
          >
            <Dialog.Trigger>
              <Button>
                <MixerHorizontalIcon />
                More filters
              </Button>
            </Dialog.Trigger>
            <Dialog.Content
              size="3"
              style={{
                width: "calc(100vw - 2rem)",
                maxWidth: "calc(100vw - 2rem)",
              }}
            >
              <Dialog.Title>
                <Flex align={"center"} justify={"between"}>
                  <Flex align={"center"} gap={"2"}>
                    <Text>More filters</Text>
                  </Flex>
                  <Flex align={"center"} gap={"2"}>
                    {selectedFilterCount > 0 ? (
                      <Button
                        size={"1"}
                        color="red"
                        variant="soft"
                        onClick={() => {
                          onClearMoreFilters();
                          setMoreFiltersOpen(false);
                        }}
                      >
                        <CrumpledPaperIcon /> Clear
                      </Button>
                    ) : null}
                    <Button
                      size={"1"}
                      color="green"
                      variant="soft"
                      onClick={() => {
                        onApplyMoreFilters();
                        setMoreFiltersOpen(false);
                      }}
                    >
                      <CheckIcon /> Apply filters
                    </Button>
                  </Flex>
                </Flex>
              </Dialog.Title>

              <Tabs.Root
                defaultValue="journals"
                style={{ marginTop: "0.5rem" }}
              >
                <ScrollableTabsList>
                  <Tabs.Trigger value="journals">
                    <Flex align="center" gap="1">
                      <span>Journals</span>
                      {selectedJournalFilters.length > 0 ? (
                        <Badge>{selectedJournalFilters.length}</Badge>
                      ) : null}
                    </Flex>
                  </Tabs.Trigger>
                  <Tabs.Trigger value="countries">
                    <Flex align="center" gap="1">
                      <span>Countries</span>
                      {selectedCountryFilters.length > 0 ? (
                        <Badge>{selectedCountryFilters.length}</Badge>
                      ) : null}
                    </Flex>
                  </Tabs.Trigger>
                  <Tabs.Trigger value="library-strategy">
                    <Flex align="center" gap="1">
                      <span>Library Strategy</span>
                      <Tooltip content="The sequencing approach used in the experiment — e.g. RNA-Seq, ChIP-Seq, Whole Genome, ATAC-Seq, or Bisulfite-Seq.">
                        <InfoCircledIcon
                          width="13"
                          height="13"
                          style={{ opacity: 0.6 }}
                        />
                      </Tooltip>
                      {selectedLibraryStrategyFilters.length > 0 ? (
                        <Badge>{selectedLibraryStrategyFilters.length}</Badge>
                      ) : null}
                    </Flex>
                  </Tabs.Trigger>
                  <Tabs.Trigger value="library-source">
                    <Flex align="center" gap="1">
                      <span>Library Source</span>
                      <Tooltip content="The type of source material sequenced — e.g. TRANSCRIPTOMIC, GENOMIC, METAGENOMIC, or SYNTHETIC.">
                        <InfoCircledIcon
                          width="13"
                          height="13"
                          style={{ opacity: 0.6 }}
                        />
                      </Tooltip>
                      {selectedLibrarySourceFilters.length > 0 ? (
                        <Badge>{selectedLibrarySourceFilters.length}</Badge>
                      ) : null}
                    </Flex>
                  </Tabs.Trigger>
                  <Tabs.Trigger value="instrument-models">
                    <Flex align="center" gap="1">
                      <span>Instrument Models</span>
                      {selectedInstrumentModelFilters.length > 0 ? (
                        <Badge>{selectedInstrumentModelFilters.length}</Badge>
                      ) : null}
                    </Flex>
                  </Tabs.Trigger>
                  <Tabs.Trigger value="platform">
                    <Flex align="center" gap="1">
                      <span>Platform</span>
                      {selectedPlatformFilters.length > 0 ||
                      multiPlatformOnly ||
                      longReadOnly ? (
                        <Badge>
                          {selectedPlatformFilters.length +
                            (multiPlatformOnly ? 1 : 0) +
                            (longReadOnly ? 1 : 0)}
                        </Badge>
                      ) : null}
                    </Flex>
                  </Tabs.Trigger>
                </ScrollableTabsList>

                <Tabs.Content
                  value="journals"
                  style={{ height: "17rem", overflow: "hidden" }}
                >
                  <Flex direction="column" gap="3" pt="3">
                    <TextField.Root
                      value={journalQuery}
                      onChange={(event) => setJournalQuery(event.target.value)}
                      placeholder="Search journals"
                      aria-label="Search journals"
                      size="2"
                    >
                      <TextField.Slot>
                        <MagnifyingGlassIcon height="16" width="16" />
                      </TextField.Slot>
                    </TextField.Root>
                    {visibleJournalOptions.length > 0 ? (
                      <Flex
                        direction="column"
                        gap="2"
                        style={{ maxHeight: "16rem", overflowY: "auto" }}
                      >
                        {visibleJournalOptions.map((journalOption) => (
                          <Text as="label" size="2" key={journalOption.name}>
                            <Flex align="center" justify="between" gap="2">
                              <Flex align="center" gap="2">
                                <Checkbox
                                  checked={selectedJournalFilters.includes(
                                    journalOption.name,
                                  )}
                                  onCheckedChange={() =>
                                    toggleJournalSelection(journalOption.name)
                                  }
                                />
                                <span>{journalOption.name}</span>
                              </Flex>
                              <Badge color="gray" variant="soft">
                                {journalOption.count}
                              </Badge>
                            </Flex>
                          </Text>
                        ))}
                      </Flex>
                    ) : (
                      <Text size="2" color="gray">
                        No journals found.
                      </Text>
                    )}
                  </Flex>
                </Tabs.Content>

                <Tabs.Content
                  value="countries"
                  style={{ height: "17rem", overflow: "hidden" }}
                >
                  <Flex direction="column" gap="3" pt="3">
                    <TextField.Root
                      value={countryQuery}
                      onChange={(event) => setCountryQuery(event.target.value)}
                      placeholder="Search countries"
                      aria-label="Search countries"
                      size="2"
                    >
                      <TextField.Slot>
                        <MagnifyingGlassIcon height="16" width="16" />
                      </TextField.Slot>
                    </TextField.Root>
                    {visibleCountryOptions.length > 0 ? (
                      <Flex
                        direction="column"
                        gap="2"
                        style={{ maxHeight: "16rem", overflowY: "auto" }}
                      >
                        {visibleCountryOptions.map((countryOption) => (
                          <Text as="label" size="2" key={countryOption.code}>
                            <Flex align="center" justify="between" gap="2">
                              <Flex align="center" gap="2">
                                <Checkbox
                                  checked={selectedCountryFilters.includes(
                                    countryOption.code,
                                  )}
                                  onCheckedChange={() =>
                                    toggleCountrySelection(countryOption.code)
                                  }
                                />
                                <span>{countryOption.label}</span>
                              </Flex>
                              <Badge color="gray" variant="soft">
                                {countryOption.count}
                              </Badge>
                            </Flex>
                          </Text>
                        ))}
                      </Flex>
                    ) : (
                      <Text size="2" color="gray">
                        No countries found.
                      </Text>
                    )}
                  </Flex>
                </Tabs.Content>

                <Tabs.Content
                  value="library-strategy"
                  style={{ height: "17rem", overflow: "hidden" }}
                >
                  <Flex direction="column" gap="3" pt="3">
                    <TextField.Root
                      value={libraryStrategyQuery}
                      onChange={(event) =>
                        setLibraryStrategyQuery(event.target.value)
                      }
                      placeholder="Search library strategies"
                      aria-label="Search library strategies"
                      size="2"
                    >
                      <TextField.Slot>
                        <MagnifyingGlassIcon height="16" width="16" />
                      </TextField.Slot>
                    </TextField.Root>
                    {visibleLibraryStrategyOptions.length > 0 ? (
                      <Flex
                        direction="column"
                        gap="2"
                        style={{ maxHeight: "16rem", overflowY: "auto" }}
                      >
                        {visibleLibraryStrategyOptions.map(
                          (libraryStrategyOption) => (
                            <Text
                              as="label"
                              size="2"
                              key={libraryStrategyOption.name}
                            >
                              <Flex align="center" justify="between" gap="2">
                                <Flex align="center" gap="2">
                                  <Checkbox
                                    checked={selectedLibraryStrategyFilters.includes(
                                      libraryStrategyOption.name,
                                    )}
                                    onCheckedChange={() =>
                                      toggleLibraryStrategySelection(
                                        libraryStrategyOption.name,
                                      )
                                    }
                                  />
                                  <span>{libraryStrategyOption.name}</span>
                                </Flex>
                                <Badge color="gray" variant="soft">
                                  {libraryStrategyOption.count}
                                </Badge>
                              </Flex>
                            </Text>
                          ),
                        )}
                      </Flex>
                    ) : (
                      <Text size="2" color="gray">
                        No library strategies found.
                      </Text>
                    )}
                  </Flex>
                </Tabs.Content>

                <Tabs.Content
                  value="library-source"
                  style={{ height: "17rem", overflow: "hidden" }}
                >
                  <Flex direction="column" gap="3" pt="3">
                    <TextField.Root
                      value={librarySourceQuery}
                      onChange={(event) =>
                        setLibrarySourceQuery(event.target.value)
                      }
                      placeholder="Search library sources"
                      aria-label="Search library sources"
                      size="2"
                    >
                      <TextField.Slot>
                        <MagnifyingGlassIcon height="16" width="16" />
                      </TextField.Slot>
                    </TextField.Root>
                    {visibleLibrarySourceOptions.length > 0 ? (
                      <Flex
                        direction="column"
                        gap="2"
                        style={{ maxHeight: "16rem", overflowY: "auto" }}
                      >
                        {visibleLibrarySourceOptions.map(
                          (librarySourceOption) => (
                            <Text
                              as="label"
                              size="2"
                              key={librarySourceOption.name}
                            >
                              <Flex align="center" justify="between" gap="2">
                                <Flex align="center" gap="2">
                                  <Checkbox
                                    checked={selectedLibrarySourceFilters.includes(
                                      librarySourceOption.name,
                                    )}
                                    onCheckedChange={() =>
                                      toggleLibrarySourceSelection(
                                        librarySourceOption.name,
                                      )
                                    }
                                  />
                                  <span>{librarySourceOption.name}</span>
                                </Flex>
                                <Badge color="gray" variant="soft">
                                  {librarySourceOption.count}
                                </Badge>
                              </Flex>
                            </Text>
                          ),
                        )}
                      </Flex>
                    ) : (
                      <Text size="2" color="gray">
                        No library sources found.
                      </Text>
                    )}
                  </Flex>
                </Tabs.Content>

                <Tabs.Content
                  value="instrument-models"
                  style={{ height: "17rem", overflow: "hidden" }}
                >
                  <Flex direction="column" gap="3" pt="3">
                    <TextField.Root
                      value={instrumentModelQuery}
                      onChange={(event) =>
                        setInstrumentModelQuery(event.target.value)
                      }
                      placeholder="Search instrument models"
                      aria-label="Search instrument models"
                      size="2"
                    >
                      <TextField.Slot>
                        <MagnifyingGlassIcon height="16" width="16" />
                      </TextField.Slot>
                    </TextField.Root>
                    {visibleInstrumentModelOptions.length > 0 ? (
                      <Flex
                        direction="column"
                        gap="2"
                        style={{ maxHeight: "16rem", overflowY: "auto" }}
                      >
                        {visibleInstrumentModelOptions.map(
                          (instrumentModelOption) => (
                            <Text
                              as="label"
                              size="2"
                              key={instrumentModelOption.name}
                            >
                              <Flex align="center" justify="between" gap="2">
                                <Flex align="center" gap="2">
                                  <Checkbox
                                    checked={selectedInstrumentModelFilters.includes(
                                      instrumentModelOption.name,
                                    )}
                                    onCheckedChange={() =>
                                      toggleInstrumentModelSelection(
                                        instrumentModelOption.name,
                                      )
                                    }
                                  />
                                  <span>{instrumentModelOption.name}</span>
                                </Flex>
                                <Badge color="gray" variant="soft">
                                  {instrumentModelOption.count}
                                </Badge>
                              </Flex>
                            </Text>
                          ),
                        )}
                      </Flex>
                    ) : (
                      <Text size="2" color="gray">
                        No instrument models found.
                      </Text>
                    )}
                  </Flex>
                </Tabs.Content>

                <Tabs.Content
                  value="platform"
                  style={{ height: "17rem", overflow: "hidden" }}
                >
                  <Flex direction="column" gap="3" pt="3">
                    <Text as="label" size="2">
                      <Flex align="center" gap="2">
                        <Checkbox
                          checked={multiPlatformOnly}
                          onCheckedChange={(checked) =>
                            setMultiPlatformOnly(checked === true)
                          }
                        />
                        <span>Multi-platform studies only</span>
                        <Tooltip content="Studies that sequenced the same samples on 2+ platforms (e.g. Illumina + Oxford Nanopore). Useful for benchmarking or hybrid assembly papers.">
                          <InfoCircledIcon
                            width="13"
                            height="13"
                            style={{ opacity: 0.6 }}
                          />
                        </Tooltip>
                      </Flex>
                    </Text>
                    <Text as="label" size="2">
                      <Flex align="center" gap="2">
                        <Checkbox
                          checked={longReadOnly}
                          onCheckedChange={(checked) =>
                            setLongReadOnly(checked === true)
                          }
                        />
                        <span>Long-read studies only</span>
                        <Tooltip content="Studies with PacBio or Oxford Nanopore sequencing in any archive, hybrid designs included. Browse the whole set at /technology/longread.">
                          <InfoCircledIcon
                            width="13"
                            height="13"
                            style={{ opacity: 0.6 }}
                          />
                        </Tooltip>
                      </Flex>
                    </Text>
                    <Separator size="4" />
                    <TextField.Root
                      value={platformQuery}
                      onChange={(event) => setPlatformQuery(event.target.value)}
                      placeholder="Search platforms"
                      aria-label="Search platforms"
                      size="2"
                    >
                      <TextField.Slot>
                        <MagnifyingGlassIcon height="16" width="16" />
                      </TextField.Slot>
                    </TextField.Root>
                    {visiblePlatformOptions.length > 0 ? (
                      <Flex
                        direction="column"
                        gap="2"
                        style={{ maxHeight: "16rem", overflowY: "auto" }}
                      >
                        {visiblePlatformOptions.map((platformOption) => (
                          <Text as="label" size="2" key={platformOption.name}>
                            <Flex align="center" justify="between" gap="2">
                              <Flex align="center" gap="2">
                                <Checkbox
                                  checked={selectedPlatformFilters.includes(
                                    platformOption.name,
                                  )}
                                  onCheckedChange={() =>
                                    togglePlatformSelection(platformOption.name)
                                  }
                                />
                                <span>
                                  {PLATFORM_DISPLAY[platformOption.name] ??
                                    platformOption.name}
                                </span>
                              </Flex>
                              <Badge color="gray" variant="soft">
                                {platformOption.count}
                              </Badge>
                            </Flex>
                          </Text>
                        ))}
                      </Flex>
                    ) : (
                      <Text size="2" color="gray">
                        No platforms found.
                      </Text>
                    )}
                  </Flex>
                </Tabs.Content>
              </Tabs.Root>
            </Dialog.Content>
          </Dialog.Root>
          <DeepDiveSection />
        </Flex>
      ) : null}

      {showDesktop ? (
        <Flex
          display={{ initial: "none", md: "flex" }}
          direction="column"
          gap="2"
          width={{ md: "220px", lg: "280px" }}
          position="sticky"
          style={{ top: "6rem", height: "fit-content" }}
        >
          <OrganismFilter
            results={results}
            serverFacets={organismServerFacets}
            totalCount={totalCount}
            mode={organismNameMode}
            onChangeMode={setOrganismNameMode}
            selectedKey={selectedOrganismKey}
            onChangeSelection={setSelectedOrganismFilter}
          />
          <Dialog.Root
            open={moreFiltersOpen}
            onOpenChange={(open) => {
              // Closing via X / overlay / Esc discards unapplied ticks.
              if (!open) onDiscardMoreFilters();
              setMoreFiltersOpen(open);
            }}
          >
            <Dialog.Trigger>
              <Button variant="classic">
                <MixerHorizontalIcon />
                More filters
                {selectedFilterCount > 0 ? (
                  <Badge variant="surface">{selectedFilterCount}</Badge>
                ) : null}
              </Button>
            </Dialog.Trigger>
            <Dialog.Content
              size="3"
              style={{
                width: "38rem",
                maxWidth: "calc(100vw - 2rem)",
              }}
            >
              <Dialog.Title>
                <Flex align={"center"} justify={"between"}>
                  <Flex align={"center"} gap={"2"}>
                    <Text>More filters</Text>
                  </Flex>
                  <Flex align={"center"} gap={"2"}>
                    {selectedFilterCount > 0 ? (
                      <Button
                        size={"1"}
                        color="red"
                        variant="soft"
                        onClick={() => {
                          onClearMoreFilters();
                          setMoreFiltersOpen(false);
                        }}
                      >
                        <CrumpledPaperIcon /> Clear
                      </Button>
                    ) : null}
                    <Button
                      size={"1"}
                      color="green"
                      variant="soft"
                      onClick={() => {
                        onApplyMoreFilters();
                        setMoreFiltersOpen(false);
                      }}
                    >
                      <CheckIcon /> Apply filters
                    </Button>
                  </Flex>
                </Flex>
              </Dialog.Title>

              <Tabs.Root
                defaultValue="journals"
                style={{ marginTop: "0.5rem" }}
              >
                <ScrollableTabsList>
                  <Tabs.Trigger value="journals">
                    <Flex align="center" gap="1">
                      <span>Journals</span>
                      {selectedJournalFilters.length > 0 ? (
                        <Badge>{selectedJournalFilters.length}</Badge>
                      ) : null}
                    </Flex>
                  </Tabs.Trigger>
                  <Tabs.Trigger value="countries">
                    <Flex align="center" gap="1">
                      <span>Countries</span>
                      {selectedCountryFilters.length > 0 ? (
                        <Badge>{selectedCountryFilters.length}</Badge>
                      ) : null}
                    </Flex>
                  </Tabs.Trigger>
                  <Tabs.Trigger value="library-strategy">
                    <Flex align="center" gap="1">
                      <span>Library Strategy</span>
                      <Tooltip content="The sequencing approach used in the experiment — e.g. RNA-Seq, ChIP-Seq, Whole Genome, ATAC-Seq, or Bisulfite-Seq.">
                        <InfoCircledIcon
                          width="13"
                          height="13"
                          style={{ opacity: 0.6 }}
                        />
                      </Tooltip>
                      {selectedLibraryStrategyFilters.length > 0 ? (
                        <Badge>{selectedLibraryStrategyFilters.length}</Badge>
                      ) : null}
                    </Flex>
                  </Tabs.Trigger>
                  <Tabs.Trigger value="library-source">
                    <Flex align="center" gap="1">
                      <span>Library Source</span>
                      <Tooltip content="The type of source material sequenced — e.g. TRANSCRIPTOMIC, GENOMIC, METAGENOMIC, or SYNTHETIC.">
                        <InfoCircledIcon
                          width="13"
                          height="13"
                          style={{ opacity: 0.6 }}
                        />
                      </Tooltip>
                      {selectedLibrarySourceFilters.length > 0 ? (
                        <Badge>{selectedLibrarySourceFilters.length}</Badge>
                      ) : null}
                    </Flex>
                  </Tabs.Trigger>
                  <Tabs.Trigger value="instrument-models">
                    <Flex align="center" gap="1">
                      <span>Instrument Models</span>
                      {selectedInstrumentModelFilters.length > 0 ? (
                        <Badge>{selectedInstrumentModelFilters.length}</Badge>
                      ) : null}
                    </Flex>
                  </Tabs.Trigger>
                  <Tabs.Trigger value="platform">
                    <Flex align="center" gap="1">
                      <span>Platform</span>
                      {selectedPlatformFilters.length > 0 ||
                      multiPlatformOnly ||
                      longReadOnly ? (
                        <Badge>
                          {selectedPlatformFilters.length +
                            (multiPlatformOnly ? 1 : 0) +
                            (longReadOnly ? 1 : 0)}
                        </Badge>
                      ) : null}
                    </Flex>
                  </Tabs.Trigger>
                </ScrollableTabsList>

                <Tabs.Content
                  value="journals"
                  style={{ height: "17rem", overflow: "hidden" }}
                >
                  <Flex direction="column" gap="3" pt="3">
                    <TextField.Root
                      value={journalQuery}
                      onChange={(event) => setJournalQuery(event.target.value)}
                      placeholder="Search journals"
                      aria-label="Search journals"
                      size="2"
                    >
                      <TextField.Slot>
                        <MagnifyingGlassIcon height="16" width="16" />
                      </TextField.Slot>
                    </TextField.Root>
                    {visibleJournalOptions.length > 0 ? (
                      <Flex
                        direction="column"
                        gap="2"
                        style={{ maxHeight: "16rem", overflowY: "auto" }}
                      >
                        {visibleJournalOptions.map((journalOption) => (
                          <Text as="label" size="2" key={journalOption.name}>
                            <Flex align="center" justify="between" gap="2">
                              <Flex align="center" gap="2">
                                <Checkbox
                                  checked={selectedJournalFilters.includes(
                                    journalOption.name,
                                  )}
                                  onCheckedChange={() =>
                                    toggleJournalSelection(journalOption.name)
                                  }
                                />
                                <span>{journalOption.name}</span>
                              </Flex>
                              <Badge color="gray" variant="soft">
                                {journalOption.count}
                              </Badge>
                            </Flex>
                          </Text>
                        ))}
                      </Flex>
                    ) : (
                      <Text size="2" color="gray">
                        No journals found.
                      </Text>
                    )}
                  </Flex>
                </Tabs.Content>

                <Tabs.Content
                  value="countries"
                  style={{ height: "17rem", overflow: "hidden" }}
                >
                  <Flex direction="column" gap="3" pt="3">
                    <TextField.Root
                      value={countryQuery}
                      onChange={(event) => setCountryQuery(event.target.value)}
                      placeholder="Search countries"
                      aria-label="Search countries"
                      size="2"
                    >
                      <TextField.Slot>
                        <MagnifyingGlassIcon height="16" width="16" />
                      </TextField.Slot>
                    </TextField.Root>
                    {visibleCountryOptions.length > 0 ? (
                      <Flex
                        direction="column"
                        gap="2"
                        style={{ maxHeight: "16rem", overflowY: "auto" }}
                      >
                        {visibleCountryOptions.map((countryOption) => (
                          <Text as="label" size="2" key={countryOption.code}>
                            <Flex align="center" justify="between" gap="2">
                              <Flex align="center" gap="2">
                                <Checkbox
                                  checked={selectedCountryFilters.includes(
                                    countryOption.code,
                                  )}
                                  onCheckedChange={() =>
                                    toggleCountrySelection(countryOption.code)
                                  }
                                />
                                <span>{countryOption.label}</span>
                              </Flex>
                              <Badge color="gray" variant="soft">
                                {countryOption.count}
                              </Badge>
                            </Flex>
                          </Text>
                        ))}
                      </Flex>
                    ) : (
                      <Text size="2" color="gray">
                        No countries found.
                      </Text>
                    )}
                  </Flex>
                </Tabs.Content>

                <Tabs.Content
                  value="library-strategy"
                  style={{ height: "17rem", overflow: "hidden" }}
                >
                  <Flex direction="column" gap="3" pt="3">
                    <TextField.Root
                      value={libraryStrategyQuery}
                      onChange={(event) =>
                        setLibraryStrategyQuery(event.target.value)
                      }
                      placeholder="Search library strategies"
                      aria-label="Search library strategies"
                      size="2"
                    >
                      <TextField.Slot>
                        <MagnifyingGlassIcon height="16" width="16" />
                      </TextField.Slot>
                    </TextField.Root>
                    {visibleLibraryStrategyOptions.length > 0 ? (
                      <Flex
                        direction="column"
                        gap="2"
                        style={{ maxHeight: "16rem", overflowY: "auto" }}
                      >
                        {visibleLibraryStrategyOptions.map(
                          (libraryStrategyOption) => (
                            <Text
                              as="label"
                              size="2"
                              key={libraryStrategyOption.name}
                            >
                              <Flex align="center" justify="between" gap="2">
                                <Flex align="center" gap="2">
                                  <Checkbox
                                    checked={selectedLibraryStrategyFilters.includes(
                                      libraryStrategyOption.name,
                                    )}
                                    onCheckedChange={() =>
                                      toggleLibraryStrategySelection(
                                        libraryStrategyOption.name,
                                      )
                                    }
                                  />
                                  <span>{libraryStrategyOption.name}</span>
                                </Flex>
                                <Badge color="gray" variant="soft">
                                  {libraryStrategyOption.count}
                                </Badge>
                              </Flex>
                            </Text>
                          ),
                        )}
                      </Flex>
                    ) : (
                      <Text size="2" color="gray">
                        No library strategies found.
                      </Text>
                    )}
                  </Flex>
                </Tabs.Content>

                <Tabs.Content
                  value="library-source"
                  style={{ height: "17rem", overflow: "hidden" }}
                >
                  <Flex direction="column" gap="3" pt="3">
                    <TextField.Root
                      value={librarySourceQuery}
                      onChange={(event) =>
                        setLibrarySourceQuery(event.target.value)
                      }
                      placeholder="Search library sources"
                      aria-label="Search library sources"
                      size="2"
                    >
                      <TextField.Slot>
                        <MagnifyingGlassIcon height="16" width="16" />
                      </TextField.Slot>
                    </TextField.Root>
                    {visibleLibrarySourceOptions.length > 0 ? (
                      <Flex
                        direction="column"
                        gap="2"
                        style={{ maxHeight: "16rem", overflowY: "auto" }}
                      >
                        {visibleLibrarySourceOptions.map(
                          (librarySourceOption) => (
                            <Text
                              as="label"
                              size="2"
                              key={librarySourceOption.name}
                            >
                              <Flex align="center" justify="between" gap="2">
                                <Flex align="center" gap="2">
                                  <Checkbox
                                    checked={selectedLibrarySourceFilters.includes(
                                      librarySourceOption.name,
                                    )}
                                    onCheckedChange={() =>
                                      toggleLibrarySourceSelection(
                                        librarySourceOption.name,
                                      )
                                    }
                                  />
                                  <span>{librarySourceOption.name}</span>
                                </Flex>
                                <Badge color="gray" variant="soft">
                                  {librarySourceOption.count}
                                </Badge>
                              </Flex>
                            </Text>
                          ),
                        )}
                      </Flex>
                    ) : (
                      <Text size="2" color="gray">
                        No library sources found.
                      </Text>
                    )}
                  </Flex>
                </Tabs.Content>

                <Tabs.Content
                  value="instrument-models"
                  style={{ height: "17rem", overflow: "hidden" }}
                >
                  <Flex direction="column" gap="3" pt="3">
                    <TextField.Root
                      value={instrumentModelQuery}
                      onChange={(event) =>
                        setInstrumentModelQuery(event.target.value)
                      }
                      placeholder="Search instrument models"
                      aria-label="Search instrument models"
                      size="2"
                    >
                      <TextField.Slot>
                        <MagnifyingGlassIcon height="16" width="16" />
                      </TextField.Slot>
                    </TextField.Root>
                    {visibleInstrumentModelOptions.length > 0 ? (
                      <Flex
                        direction="column"
                        gap="2"
                        style={{ maxHeight: "16rem", overflowY: "auto" }}
                      >
                        {visibleInstrumentModelOptions.map(
                          (instrumentModelOption) => (
                            <Text
                              as="label"
                              size="2"
                              key={instrumentModelOption.name}
                            >
                              <Flex align="center" justify="between" gap="2">
                                <Flex align="center" gap="2">
                                  <Checkbox
                                    checked={selectedInstrumentModelFilters.includes(
                                      instrumentModelOption.name,
                                    )}
                                    onCheckedChange={() =>
                                      toggleInstrumentModelSelection(
                                        instrumentModelOption.name,
                                      )
                                    }
                                  />
                                  <span>{instrumentModelOption.name}</span>
                                </Flex>
                                <Badge color="gray" variant="soft">
                                  {instrumentModelOption.count}
                                </Badge>
                              </Flex>
                            </Text>
                          ),
                        )}
                      </Flex>
                    ) : (
                      <Text size="2" color="gray">
                        No instrument models found.
                      </Text>
                    )}
                  </Flex>
                </Tabs.Content>

                <Tabs.Content
                  value="platform"
                  style={{ height: "17rem", overflow: "hidden" }}
                >
                  <Flex direction="column" gap="3" pt="3">
                    <Text as="label" size="2">
                      <Flex align="center" gap="2">
                        <Checkbox
                          checked={multiPlatformOnly}
                          onCheckedChange={(checked) =>
                            setMultiPlatformOnly(checked === true)
                          }
                        />
                        <span>Multi-platform studies only</span>
                        <Tooltip content="Studies that sequenced the same samples on 2+ platforms (e.g. Illumina + Oxford Nanopore). Useful for benchmarking or hybrid assembly papers.">
                          <InfoCircledIcon
                            width="13"
                            height="13"
                            style={{ opacity: 0.6 }}
                          />
                        </Tooltip>
                      </Flex>
                    </Text>
                    <Text as="label" size="2">
                      <Flex align="center" gap="2">
                        <Checkbox
                          checked={longReadOnly}
                          onCheckedChange={(checked) =>
                            setLongReadOnly(checked === true)
                          }
                        />
                        <span>Long-read studies only</span>
                        <Tooltip content="Studies with PacBio or Oxford Nanopore sequencing in any archive, hybrid designs included. Browse the whole set at /technology/longread.">
                          <InfoCircledIcon
                            width="13"
                            height="13"
                            style={{ opacity: 0.6 }}
                          />
                        </Tooltip>
                      </Flex>
                    </Text>
                    <Separator size="4" />
                    <TextField.Root
                      value={platformQuery}
                      onChange={(event) => setPlatformQuery(event.target.value)}
                      placeholder="Search platforms"
                      aria-label="Search platforms"
                      size="2"
                    >
                      <TextField.Slot>
                        <MagnifyingGlassIcon height="16" width="16" />
                      </TextField.Slot>
                    </TextField.Root>
                    {visiblePlatformOptions.length > 0 ? (
                      <Flex
                        direction="column"
                        gap="2"
                        style={{ maxHeight: "16rem", overflowY: "auto" }}
                      >
                        {visiblePlatformOptions.map((platformOption) => (
                          <Text as="label" size="2" key={platformOption.name}>
                            <Flex align="center" justify="between" gap="2">
                              <Flex align="center" gap="2">
                                <Checkbox
                                  checked={selectedPlatformFilters.includes(
                                    platformOption.name,
                                  )}
                                  onCheckedChange={() =>
                                    togglePlatformSelection(platformOption.name)
                                  }
                                />
                                <span>
                                  {PLATFORM_DISPLAY[platformOption.name] ??
                                    platformOption.name}
                                </span>
                              </Flex>
                              <Badge color="gray" variant="soft">
                                {platformOption.count}
                              </Badge>
                            </Flex>
                          </Text>
                        ))}
                      </Flex>
                    ) : (
                      <Text size="2" color="gray">
                        No platforms found.
                      </Text>
                    )}
                  </Flex>
                </Tabs.Content>
              </Tabs.Root>
            </Dialog.Content>
          </Dialog.Root>
          <DeepDiveSection />
          <Card variant="classic" size={"1"} asChild>
            <Text color="gray" size={"1"}>
              Search didn&apos;t help?{" "}
              <Link asChild underline="always">
                <NextLink href="/mcp">Ask seqout with an LLM</NextLink>
              </Link>{" "}
              in plain English or check out{" "}
              <Link asChild underline="always">
                <NextLink href={"/howsearchworks"}>how search works</NextLink>
              </Link>
              .
            </Text>
          </Card>
        </Flex>
      ) : null}
    </>
  );
}
