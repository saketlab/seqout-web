"use client";
import { OrganismNameMode } from "@/components/organism_filter";
import ResultCard from "@/components/result-card";
import SearchBar from "@/components/search-bar";
import {
  applyTimeFilter,
  rollingCutoff,
  SearchFilters,
  SearchOrganismRail,
  type SearchFacets,
} from "@/components/search-filters";
import { useSearchQuery } from "@/context/search_query";
import { track } from "@/utils/analytics";
import { ontologyParams, withTimeout } from "@/utils/api";
import { SERVER_URL } from "@/utils/constants";
import { DB_LABELS, SEARCH_DBS, type SearchDb } from "@/utils/db-colors";
import { downloadCsv } from "@/utils/exportCsv";
import { getProjectShortUrl } from "@/utils/shortUrl";
import {
  disabledOntologies,
  EXPANSION_PARAM,
  expansionDisabled,
  inheritedSettings,
  ONTOLOGIES,
  ONTOLOGY_PARAM,
} from "@/utils/termExpansion";
import { SearchResult } from "@/utils/types";
import {
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Cross1Icon,
  DownloadIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import {
  Button,
  Card,
  Flex,
  Link,
  Select,
  Separator,
  Skeleton,
  Spinner,
  Text,
  TextField,
  Tooltip,
} from "@radix-ui/themes";
import {
  useInfiniteQuery,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import NextLink from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type SortBy = "relevance" | "date" | "citations" | "journal";

type RelevanceCursor = { rank: number; accession: string };
type SortedCursor = { sort_value: string | number; accession: string };
type Cursor = RelevanceCursor | SortedCursor | null;

type SpellingCorrection = {
  original: string;
  suggested: string;
  distance: number | null;
};

type SpellingSuggestion = {
  corrected_query: string;
  corrections: SpellingCorrection[];
};

type SearchCorrection = {
  original_query: string;
  corrected_query: string;
  original_total: number;
  mode: "replaced" | "augmented";
  // Literal-typo matches (augmented mode) rendered as a page-1 block, kept out
  // of the paginated corrected stream so offset paging stays aligned.
  extra_results?: SearchResult[] | null;
};

type SearchResponse = {
  results: SearchResult[];
  total: number;
  took_ms: number;
  next_cursor: Cursor;
  suggestions?: SpellingSuggestion[];
  correction?: SearchCorrection;
};

type TimeFilter = "any" | "1" | "5" | "10" | "20" | "custom";

function DidYouMean({
  suggestion,
  searchParams,
  onNavigate,
}: {
  suggestion: SpellingSuggestion;
  searchParams: ReturnType<typeof import("next/navigation").useSearchParams>;
  onNavigate: (url: string) => void;
}) {
  const corrected = suggestion.corrected_query;
  const href = (() => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("q", corrected);
    p.delete("cursor_rank");
    p.delete("cursor_acc");
    return `/search?${p.toString()}`;
  })();

  return (
    <Text color="gray" size={"2"}>
      Did you mean:{" "}
      <Text
        asChild
        size={"2"}
        weight={"bold"}
        style={{
          color: "var(--accent-11)",
          cursor: "pointer",
          textDecoration: "underline",
        }}
      >
        <a
          href={href}
          onClick={(e) => {
            e.preventDefault();
            onNavigate(href);
          }}
        >
          {corrected}
        </a>
      </Text>
      ?
    </Text>
  );
}

function CorrectionNotice({ correction }: { correction: SearchCorrection }) {
  const { corrected_query, original_query, mode } = correction;
  // Banner separating literal matches from corrected-query results.
  if (mode !== "replaced") {
    return (
      <Flex align="center" gap="3">
        <Text color="gray" size={"3"}>
          Also showing results for{" "}
          <Text
            size={"2"}
            weight={"bold"}
            style={{ color: "var(--accent-11)" }}
          >
            {corrected_query}
          </Text>
        </Text>
        <Separator size="4" style={{ flex: 1, width: "auto" }} />
      </Flex>
    );
  }
  return (
    <Text color="gray" size={"3"}>
      Showing results for{" "}
      <Text size={"2"} weight={"bold"} style={{ color: "var(--accent-11)" }}>
        {corrected_query}
      </Text>
      . No results for{" "}
      <Text
        size={"2"}
        style={{
          textDecorationLine: "underline",
        }}
      >
        {original_query}
      </Text>
      .
    </Text>
  );
}

const SORT_CONFIG: Record<
  Exclude<SortBy, "relevance">,
  { param: string; order: string }
> = {
  date: { param: "year", order: "desc" },
  citations: { param: "citations", order: "desc" },
  journal: { param: "journal", order: "asc" },
};

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

// Text search fetches server pages by offset. Each perPage option divides the
// 200-row server page size, keeping each UI page within a server page.
const SERVER_PAGE_SIZE = 200;

// Below this share of the query's best rank, a result is flagged "Low relevance".
// Real matches rank far above synonym-only ones; this cutoff falls in the gap.
const LOW_RELEVANCE_FRACTION = 0.05;

const FILTER_PARAM_KEYS = {
  sortBy: "sort",
  time: "time",
  dateFrom: "date_from",
  dateTo: "date_to",
  organism: "filter_organism",
  journal: "filter_journal",
  country: "filter_country",
  libraryStrategy: "filter_library_strategy",
  librarySource: "filter_library_source",
  instrumentModel: "filter_instrument_model",
  platform: "filter_platform",
  multiPlatform: "multi_platform",
  longRead: "long_read",
} as const;

function parseSortBy(value: string | null): SortBy {
  return value === "relevance" ||
    value === "date" ||
    value === "citations" ||
    value === "journal"
    ? value
    : "relevance";
}

function parseTimeFilter(
  value: string | null,
  yearFrom: string | null,
  yearTo: string | null,
): TimeFilter {
  if (value === "custom" || yearFrom || yearTo) return "custom";
  return value === "1" || value === "5" || value === "10" || value === "20"
    ? value
    : "any";
}

function normalizeMultiValueFilter(values: string[]): string[] {
  return values.map((item) => item.trim()).filter(Boolean);
}

// Sidebar filters sent to the server for filtered, paginated results.
type SearchFilterParams = {
  organism: string | null;
  country: string[];
  library_strategy: string[];
  library_source: string[];
  instrument_model: string[];
  platform: string[];
  journal: string[];
  multi_platform: boolean;
  long_read: boolean;
  // Every time bound is day-level; the server's year_* params go unused.
  date_from?: string;
  date_to?: string;
};

function appendFilterParams(url: string, f: SearchFilterParams): string {
  const add = (k: string, v: string) =>
    (url += `&${k}=${encodeURIComponent(v)}`);
  if (f.organism) add("organism", f.organism);
  for (const v of f.country) add("country", v);
  for (const v of f.library_strategy) add("library_strategy", v);
  for (const v of f.library_source) add("library_source", v);
  for (const v of f.instrument_model) add("instrument_model", v);
  for (const v of f.platform) add("platform", v);
  for (const v of f.journal) add("journal", v);
  if (f.multi_platform) add("multi_platform", "true");
  if (f.long_read) add("long_read", "true");
  if (f.date_from) add("date_from", f.date_from);
  if (f.date_to) add("date_to", f.date_to);
  return url;
}

// Dataset-level download columns. Must stay in step with _DOWNLOAD_COLUMNS in the
// API (main.py): the text path gets this CSV from the server and the geo path
// builds it in the browser, and the two should be the same file.
const DOWNLOAD_COLUMNS = [
  "accession",
  "source",
  "title",
  "summary",
  "updated_at",
  "organisms",
  "countries",
  "instrument_models",
  "library_strategies",
];

function resultToCsvRow(r: SearchResult): Record<string, unknown> {
  const join = (v: string[] | null | undefined) => (v ?? []).join("; ");
  return {
    accession: r.accession,
    source: r.source,
    title: r.title,
    summary: r.summary,
    updated_at: r.updated_at,
    organisms: join(r.organisms),
    countries: join(r.countries),
    instrument_models: join(r.instrument_models),
    library_strategies: join(r.library_strategies),
  };
}

function buildSearchUrl(
  query: string,
  db: string | null,
  sortBy: SortBy,
  offset: number,
  filters: SearchFilterParams,
  noExpansion: boolean,
  excludeOntology: string[],
): string {
  let url = `${SERVER_URL}/search?q=${encodeURIComponent(query)}`;
  // Expansion off == the API's structured mode: the words as typed, no ontology
  // synonyms. /search/facets takes the same flag, so counts match the list.
  if (noExpansion) url += "&structured=true";
  url += ontologyParams(excludeOntology);
  if (db && (SEARCH_DBS as readonly string[]).includes(db)) {
    url += `&db=${encodeURIComponent(db)}`;
  }
  // Include sortby for filtered and unfiltered searches.
  if (sortBy !== "relevance") {
    const config = SORT_CONFIG[sortBy];
    url += `&sortby=${config.param}&order=${config.order}`;
  }
  // Offset paginates by absolute position, so any server page is one request.
  if (offset > 0) url += `&offset=${offset}`;
  return appendFilterParams(url, filters);
}

const getSearchResults = async (
  query: string | null,
  db: string | null,
  offset: number,
  sortBy: SortBy,
  filters: SearchFilterParams,
  noExpansion: boolean,
  excludeOntology: string[],
  signal?: AbortSignal,
): Promise<SearchResponse | null> => {
  if (!query) return null;
  const url = buildSearchUrl(
    query,
    db,
    sortBy,
    offset,
    filters,
    noExpansion,
    excludeOntology,
  );
  const res = await fetch(url, { signal: withTimeout(signal) });
  if (!res.ok) {
    throw new Error("Network Error");
  }
  return res.json();
};

const getGeoSearchResults = async (
  lat: string,
  lng: string,
  radiusKm: string | null,
  cursor: Cursor,
  organism: string | null,
  assayL1: string | null,
  assayL2: string | null,
  source: string | null,
  signal?: AbortSignal,
): Promise<SearchResponse | null> => {
  let url = `${SERVER_URL}/search/structured?geo_lat=${encodeURIComponent(lat)}&geo_lng=${encodeURIComponent(lng)}`;
  if (radiusKm) {
    url += `&geo_radius_km=${encodeURIComponent(radiusKm)}`;
  }
  if (organism) {
    url += `&organism=${encodeURIComponent(organism)}`;
  }
  if (assayL1) {
    url += `&assay_l1=${encodeURIComponent(assayL1)}`;
  }
  if (assayL2) {
    url += `&assay_l2=${encodeURIComponent(assayL2)}`;
  }
  if (source) {
    url += `&source=${encodeURIComponent(source)}`;
  }
  if (cursor && "rank" in cursor) {
    url += `&cursor_rank=${cursor.rank}&cursor_acc=${encodeURIComponent(cursor.accession)}`;
  }
  const res = await fetch(url, { signal: withTimeout(signal) });
  if (!res.ok) {
    throw new Error("Network Error");
  }
  return res.json();
};

function SearchOrganismRailSkeleton() {
  return (
    <Flex
      aria-hidden="true"
      display={{ initial: "none", md: "flex" }}
      direction="column"
      gap="4"
      width={{ md: "220px", lg: "280px" }}
      position="sticky"
      style={{ top: "6rem", height: "fit-content" }}
    >
      <Flex direction="column" gap="3">
        <Flex align="center" justify="between">
          <Skeleton height="1rem" width="9.5rem" />
          <Skeleton height="1.25rem" width="2.25rem" />
        </Flex>
        <Separator orientation="horizontal" size="4" />
        <Skeleton height="2rem" width="100%" />
      </Flex>

      <Skeleton height="2rem" width="8.5rem" />
    </Flex>
  );
}

function getPageRange(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "ellipsis")[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) pages.push("ellipsis");
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total - 1) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

function Paginator({
  currentPage,
  totalPages,
  onPageChange,
  perPage,
  onPerPageChange,
  totalResults,
  displayResultsCount,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  perPage: PageSize;
  onPerPageChange: (size: PageSize) => void;
  totalResults: number;
  displayResultsCount: number;
}) {
  const [pageInputState, setPageInputState] = useState({
    currentPage,
    value: String(currentPage),
  });
  let pageInput = pageInputState.value;
  if (pageInputState.currentPage !== currentPage) {
    const nextState = {
      currentPage,
      value: String(currentPage),
    };
    setPageInputState(nextState);
    pageInput = nextState.value;
  }

  if (totalResults === 0) return null;
  // Dead UI when even the smallest option fits everything on one page: whichever
  // size the user picks, the view is identical.
  const showPageSize = totalResults > Math.min(...PAGE_SIZE_OPTIONS);
  const start = (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, displayResultsCount);
  const pages = getPageRange(currentPage, totalPages);
  const handlePageInputCommit = () => {
    const parsed = Number(pageInput);
    if (!Number.isFinite(parsed)) {
      setPageInputState({
        currentPage,
        value: String(currentPage),
      });
      return;
    }

    const nextPage = Math.min(Math.max(Math.trunc(parsed), 1), totalPages);
    setPageInputState({
      currentPage: nextPage,
      value: String(nextPage),
    });
    if (nextPage !== currentPage) {
      onPageChange(nextPage);
    }
  };

  return (
    <Flex direction="column" gap="3" align="center" py="2">
      <Flex gap="3" align="center" wrap="wrap" justify="center">
        <Text size="2" color="gray">
          {start.toLocaleString()}&ndash;{end.toLocaleString()} of{" "}
          {displayResultsCount.toLocaleString()} results
        </Text>
        {showPageSize && (
          <Flex gap="1" align="center">
            <Select.Root
              value={String(perPage)}
              onValueChange={(v) => onPerPageChange(Number(v) as PageSize)}
              size="1"
            >
              <Select.Trigger variant="ghost" />
              <Select.Content>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <Select.Item key={size} value={String(size)}>
                    {size} per page
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>
        )}
      </Flex>

      {totalPages > 1 && (
        <nav aria-label="Pagination">
          <Flex gap="1" align="center" wrap="wrap" justify="center">
            <Button
              variant="soft"
              size={{ initial: "2", md: "1" }}
              disabled={currentPage === 1}
              onClick={() => onPageChange(currentPage - 1)}
              aria-label="Previous page"
              className="seqout-paginator-btn"
            >
              <ChevronLeftIcon />
            </Button>
            {pages.map((p, i) =>
              p === "ellipsis" ? (
                <Text key={`e${i}`} size="2" color="gray" mx="1" aria-hidden>
                  &hellip;
                </Text>
              ) : (
                <Button
                  key={p}
                  variant={p === currentPage ? "solid" : "soft"}
                  size={{ initial: "2", md: "1" }}
                  onClick={() => onPageChange(p)}
                  aria-label={`Go to page ${p}`}
                  aria-current={p === currentPage ? "page" : undefined}
                  className="seqout-paginator-btn"
                >
                  {p}
                </Button>
              ),
            )}
            <Button
              variant="soft"
              size={{ initial: "2", md: "1" }}
              disabled={currentPage === totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              aria-label="Next page"
              className="seqout-paginator-btn"
            >
              <ChevronRightIcon />
            </Button>
            <Flex gap="2" align="center" ml={{ initial: "0", md: "2" }}>
              <Text size="2" color="gray" asChild>
                <label htmlFor="search-page-jump">Page</label>
              </Text>
              <TextField.Root
                id="search-page-jump"
                type="number"
                inputMode="numeric"
                min={1}
                max={totalPages}
                value={pageInput}
                onChange={(event) =>
                  setPageInputState({
                    currentPage,
                    value: event.target.value,
                  })
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handlePageInputCommit();
                  }
                }}
                onBlur={handlePageInputCommit}
                aria-label={`Go to page, 1 through ${totalPages}`}
                size="1"
                variant="surface"
                style={{ width: "4.5rem" }}
              />
              <Button
                variant="soft"
                size={{ initial: "2", md: "1" }}
                onClick={handlePageInputCommit}
                aria-label="Go to entered page"
              >
                Go
              </Button>
            </Flex>
          </Flex>
        </nav>
      )}
    </Flex>
  );
}

const SORT_LABELS: Record<SortBy, string> = {
  relevance: "Relevance",
  date: "Newest first",
  citations: "Most cited",
  journal: "By journal",
};

const TIME_LABELS: Record<string, string> = {
  any: "Any time",
  "1": "Last year",
  "5": "Last 5 years",
  "10": "Last 10 years",
  "20": "Last 20 years",
};

type ActiveFilterChipsProps = {
  sortBy: SortBy;
  onResetSort: () => void;
  timeFilter: string;
  customYearRange: { from: string; to: string };
  onResetTime: () => void;
  db: string | null;
  onResetDb: () => void;
  selectedOrganismKey: string | null;
  onResetOrganism: () => void;
  selectedJournalFilters: string[];
  setSelectedJournalFilters: (next: string[]) => void;
  selectedCountryFilters: string[];
  setSelectedCountryFilters: (next: string[]) => void;
  selectedLibraryStrategyFilters: string[];
  setSelectedLibraryStrategyFilters: (next: string[]) => void;
  selectedLibrarySourceFilters: string[];
  setSelectedLibrarySourceFilters: (next: string[]) => void;
  selectedInstrumentModelFilters: string[];
  setSelectedInstrumentModelFilters: (next: string[]) => void;
  selectedPlatformFilters: string[];
  setSelectedPlatformFilters: (next: string[]) => void;
  multiPlatformOnly: boolean;
  setMultiPlatformOnly: (next: boolean) => void;
  longReadOnly: boolean;
  setLongReadOnly: (next: boolean) => void;
  onClearAll: () => void;
};

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  // The whole chip removes the filter on click; the X icon signals that.
  return (
    <Button
      size="1"
      variant="soft"
      color="gray"
      onClick={onRemove}
      aria-label={`Remove ${label} filter`}
    >
      {label}
      <Cross1Icon />
    </Button>
  );
}

function ActiveFilterChips(props: ActiveFilterChipsProps) {
  const chips: React.ReactNode[] = [];

  if (props.sortBy !== "relevance") {
    chips.push(
      <FilterChip
        key="sort"
        label={`Sort: ${SORT_LABELS[props.sortBy]}`}
        onRemove={props.onResetSort}
      />,
    );
  }

  if (props.timeFilter !== "any") {
    let timeLabel: string;
    if (props.timeFilter === "custom") {
      const { from, to } = props.customYearRange;
      timeLabel =
        from && to ? `${from}–${to}` : from ? `From ${from}` : `To ${to}`;
      timeLabel = `Time: ${timeLabel}`;
    } else {
      timeLabel = `Time: ${TIME_LABELS[props.timeFilter] ?? props.timeFilter}`;
    }
    chips.push(
      <FilterChip key="time" label={timeLabel} onRemove={props.onResetTime} />,
    );
  }

  if (props.db) {
    chips.push(
      <FilterChip
        key="db"
        label={`Source: ${DB_LABELS[props.db] ?? props.db}`}
        onRemove={props.onResetDb}
      />,
    );
  }

  if (props.selectedOrganismKey) {
    chips.push(
      <FilterChip
        key="organism"
        label={`Organism: ${props.selectedOrganismKey}`}
        onRemove={props.onResetOrganism}
      />,
    );
  }

  if (props.multiPlatformOnly) {
    chips.push(
      <FilterChip
        key="multi-platform"
        label="Multi-platform only"
        onRemove={() => props.setMultiPlatformOnly(false)}
      />,
    );
  }

  if (props.longReadOnly) {
    chips.push(
      <FilterChip
        key="long-read"
        label="Long-read only"
        onRemove={() => props.setLongReadOnly(false)}
      />,
    );
  }

  for (const journal of props.selectedJournalFilters) {
    chips.push(
      <FilterChip
        key={`j-${journal}`}
        label={`Journal: ${journal}`}
        onRemove={() =>
          props.setSelectedJournalFilters(
            props.selectedJournalFilters.filter((v) => v !== journal),
          )
        }
      />,
    );
  }

  for (const country of props.selectedCountryFilters) {
    chips.push(
      <FilterChip
        key={`c-${country}`}
        label={`Country: ${country}`}
        onRemove={() =>
          props.setSelectedCountryFilters(
            props.selectedCountryFilters.filter((v) => v !== country),
          )
        }
      />,
    );
  }

  for (const strategy of props.selectedLibraryStrategyFilters) {
    chips.push(
      <FilterChip
        key={`l-${strategy}`}
        label={`Library: ${strategy}`}
        onRemove={() =>
          props.setSelectedLibraryStrategyFilters(
            props.selectedLibraryStrategyFilters.filter((v) => v !== strategy),
          )
        }
      />,
    );
  }

  for (const source of props.selectedLibrarySourceFilters) {
    chips.push(
      <FilterChip
        key={`ls-${source}`}
        label={`Source: ${source}`}
        onRemove={() =>
          props.setSelectedLibrarySourceFilters(
            props.selectedLibrarySourceFilters.filter((v) => v !== source),
          )
        }
      />,
    );
  }

  for (const model of props.selectedInstrumentModelFilters) {
    chips.push(
      <FilterChip
        key={`i-${model}`}
        label={`Instrument: ${model}`}
        onRemove={() =>
          props.setSelectedInstrumentModelFilters(
            props.selectedInstrumentModelFilters.filter((v) => v !== model),
          )
        }
      />,
    );
  }

  for (const platform of props.selectedPlatformFilters) {
    chips.push(
      <FilterChip
        key={`p-${platform}`}
        label={`Platform: ${platform}`}
        onRemove={() =>
          props.setSelectedPlatformFilters(
            props.selectedPlatformFilters.filter((v) => v !== platform),
          )
        }
      />,
    );
  }

  if (chips.length === 0) return null;

  return (
    <Flex gap="2" align="center" wrap="wrap" pt="1">
      {chips}
      <Button
        variant="ghost"
        size="1"
        color="gray"
        ml="1"
        onClick={props.onClearAll}
        aria-label="Clear all filters"
      >
        Clear all
      </Button>
    </Flex>
  );
}

// Use rolling day-level bounds for 'last N years', matching applyTimeFilter's cutoff.
function timeFilterToYears(
  timeFilter: string,
  customYearRange: { from: string; to: string },
): { date_from?: string; date_to?: string } {
  if (timeFilter === "any") return {};
  if (timeFilter === "custom") {
    const { from, to } = customYearRange;
    return { date_from: from || undefined, date_to: to || undefined };
  }
  const years = parseInt(timeFilter);
  if (!years) return {};
  return { date_from: rollingCutoff(years) };
}

function applyOrganismFilter(
  results: SearchResult[],
  organismKey: string | null,
): SearchResult[] {
  if (!organismKey) return results;
  return results.filter((r) =>
    (r.organisms ?? []).some(
      (o) => o.trim().toLowerCase() === organismKey.toLowerCase(),
    ),
  );
}

function applyJournalFilter(
  results: SearchResult[],
  journals: string[],
): SearchResult[] {
  if (journals.length === 0) return results;
  const selectedJournals = new Set(journals);
  return results.filter((r) => {
    const journal = r.journal?.trim();
    return journal ? selectedJournals.has(journal) : false;
  });
}

function applyCountryFilter(
  results: SearchResult[],
  countries: string[],
): SearchResult[] {
  if (countries.length === 0) return results;
  const selectedCountries = new Set(
    countries.map((country) => country.toUpperCase()),
  );
  return results.filter((r) =>
    (r.countries ?? []).some((c) =>
      selectedCountries.has(c.trim().toUpperCase()),
    ),
  );
}

function applyLibraryStrategyFilter(
  results: SearchResult[],
  strategies: string[],
): SearchResult[] {
  if (strategies.length === 0) return results;
  const selectedStrategies = new Set(strategies);
  return results.filter((r) =>
    (r.library_strategies ?? []).some((s) => selectedStrategies.has(s.trim())),
  );
}

function applyInstrumentModelFilter(
  results: SearchResult[],
  models: string[],
): SearchResult[] {
  if (models.length === 0) return results;
  const selectedModels = new Set(models);
  return results.filter((r) =>
    (r.instrument_models ?? []).some((m) => selectedModels.has(m.trim())),
  );
}

function applyPlatformFilter(
  results: SearchResult[],
  platforms: string[],
): SearchResult[] {
  if (platforms.length === 0) return results;
  const selected = new Set(platforms);
  return results.filter((r) =>
    (r.platforms ?? []).some((p) => selected.has(p.trim())),
  );
}

function applyMultiPlatformFilter(
  results: SearchResult[],
  multiPlatformOnly: boolean,
): SearchResult[] {
  if (!multiPlatformOnly) return results;
  return results.filter((r) => (r.platforms ?? []).length >= 2);
}

const LONG_READ_PLATFORMS = new Set(["PACBIO_SMRT", "OXFORD_NANOPORE"]);

// Client-side twin of the server's long_read filter for the geo path. Only GEO
// and SRA rows carry platforms, so this can only narrow, never widen.
function applyLongReadFilter(
  results: SearchResult[],
  longReadOnly: boolean,
): SearchResult[] {
  if (!longReadOnly) return results;
  return results.filter((r) =>
    (r.platforms ?? []).some((p) => LONG_READ_PLATFORMS.has(p.trim())),
  );
}

function getAvailableJournals(results: SearchResult[]): Set<string> {
  const journals = new Set<string>();
  for (const result of results) {
    const journal = result.journal?.trim();
    if (journal) journals.add(journal);
  }
  return journals;
}

function getAvailableCountries(results: SearchResult[]): Set<string> {
  const countries = new Set<string>();
  for (const result of results) {
    for (const country of result.countries ?? []) {
      const normalizedCountry = country.trim().toUpperCase();
      if (normalizedCountry) countries.add(normalizedCountry);
    }
  }
  return countries;
}

function getAvailableLibraryStrategies(results: SearchResult[]): Set<string> {
  const strategies = new Set<string>();
  for (const result of results) {
    for (const strategy of result.library_strategies ?? []) {
      const normalizedStrategy = strategy.trim();
      if (normalizedStrategy) strategies.add(normalizedStrategy);
    }
  }
  return strategies;
}

function getAvailableInstrumentModels(results: SearchResult[]): Set<string> {
  const models = new Set<string>();
  for (const result of results) {
    for (const model of result.instrument_models ?? []) {
      const normalizedModel = model.trim();
      if (normalizedModel) models.add(normalizedModel);
    }
  }
  return models;
}

export default function SearchPageBody() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const query = searchParams.get("q");
  const db = searchParams.get("db");
  const geoLat = searchParams.get("geo_lat");
  const geoLng = searchParams.get("geo_lng");
  const geoRadiusKm = searchParams.get("geo_radius_km");
  const geoOrganism = searchParams.get("organism");
  const geoAssayL1 = searchParams.get("assay_l1");
  const geoAssayL2 = searchParams.get("assay_l2");
  const geoSource = searchParams.get("source") ?? searchParams.get("db");
  const isGeoSearch = geoLat !== null && geoLng !== null;
  const { setLastSearchQuery } = useSearchQuery();

  useEffect(() => {
    if (query) {
      setLastSearchQuery(query);
      track("search", { search_term: query, ...(db ? { db } : {}) });
    }
  }, [query, db, setLastSearchQuery]);

  const updateSearchUrl = useCallback(
    (updates: Record<string, string | string[] | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (Array.isArray(value)) {
          params.delete(key);
          for (const item of normalizeMultiValueFilter(value)) {
            params.append(key, item);
          }
          continue;
        }

        if (value == null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      const nextQuery = params.toString();
      const currentQuery = searchParams.toString();
      if (nextQuery === currentQuery) return;

      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const sortBy = parseSortBy(searchParams.get(FILTER_PARAM_KEYS.sortBy));
  const customYearRange = useMemo(
    () => ({
      from: searchParams.get(FILTER_PARAM_KEYS.dateFrom) ?? "",
      to: searchParams.get(FILTER_PARAM_KEYS.dateTo) ?? "",
    }),
    [searchParams],
  );
  const timeFilter = parseTimeFilter(
    searchParams.get(FILTER_PARAM_KEYS.time),
    customYearRange.from,
    customYearRange.to,
  );

  const [organismNameMode, setOrganismNameMode] =
    useState<OrganismNameMode>("scientific");
  const selectedOrganismKey = searchParams.get(FILTER_PARAM_KEYS.organism);
  // expand=0 -> run the query as typed. Both /search and /search/facets take it,
  // so the list and the sidebar counts stay over the same match set.
  const noExpansion = expansionDisabled(searchParams);
  // Ontologies switched off in the expansion dialog. Repeatable param, passed
  // straight through to /search and /search/facets so list and counts agree.
  const excludeOntology = useMemo(
    () => disabledOntologies(searchParams),
    [searchParams],
  );
  const excludeOntologyKey = excludeOntology.join();

  // Inherit stored expansion defaults when the URL omits expansion settings.
  // Explicit URL settings take precedence so shared links preserve their search.
  const normalizedSettings = useRef(false);
  useEffect(() => {
    if (normalizedSettings.current) return;
    normalizedSettings.current = true;
    const inherited = inheritedSettings(searchParams);
    if (!inherited) return;
    updateSearchUrl({
      [EXPANSION_PARAM]: inherited.off ? "0" : null,
      [ONTOLOGY_PARAM]: inherited.disabled.join(",") || null,
    });
  }, [searchParams, updateSearchUrl]);

  // Client-side filters excluded from queryKey.
  const selectedJournalFilters = useMemo(
    () =>
      normalizeMultiValueFilter(searchParams.getAll(FILTER_PARAM_KEYS.journal)),
    [searchParams],
  );
  const selectedCountryFilters = useMemo(
    () =>
      normalizeMultiValueFilter(searchParams.getAll(FILTER_PARAM_KEYS.country)),
    [searchParams],
  );
  const selectedLibraryStrategyFilters = useMemo(
    () =>
      normalizeMultiValueFilter(
        searchParams.getAll(FILTER_PARAM_KEYS.libraryStrategy),
      ),
    [searchParams],
  );
  const selectedLibrarySourceFilters = useMemo(
    () =>
      normalizeMultiValueFilter(
        searchParams.getAll(FILTER_PARAM_KEYS.librarySource),
      ),
    [searchParams],
  );
  const selectedInstrumentModelFilters = useMemo(
    () =>
      normalizeMultiValueFilter(
        searchParams.getAll(FILTER_PARAM_KEYS.instrumentModel),
      ),
    [searchParams],
  );
  const selectedPlatformFilters = useMemo(
    () =>
      normalizeMultiValueFilter(
        searchParams.getAll(FILTER_PARAM_KEYS.platform),
      ),
    [searchParams],
  );
  const multiPlatformOnly =
    searchParams.get(FILTER_PARAM_KEYS.multiPlatform) === "true";
  const longReadOnly = searchParams.get(FILTER_PARAM_KEYS.longRead) === "true";

  // Sidebar filters sent to the server for filtered, paginated text search.
  const searchFilters: SearchFilterParams = useMemo(
    () => ({
      organism: selectedOrganismKey,
      country: selectedCountryFilters,
      library_strategy: selectedLibraryStrategyFilters,
      library_source: selectedLibrarySourceFilters,
      instrument_model: selectedInstrumentModelFilters,
      platform: selectedPlatformFilters,
      journal: selectedJournalFilters,
      multi_platform: multiPlatformOnly,
      long_read: longReadOnly,
      ...timeFilterToYears(timeFilter, customYearRange),
    }),
    [
      selectedOrganismKey,
      selectedCountryFilters,
      selectedLibraryStrategyFilters,
      selectedLibrarySourceFilters,
      selectedInstrumentModelFilters,
      selectedPlatformFilters,
      selectedJournalFilters,
      multiPlatformOnly,
      longReadOnly,
      timeFilter,
      customYearRange,
    ],
  );
  const filtersKey = JSON.stringify(searchFilters);

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState<PageSize>(20);

  // Reset to the first page whenever the query/filters change (adjust during render).
  const pageResetKey = JSON.stringify([
    query,
    db,
    sortBy,
    timeFilter,
    customYearRange,
    selectedOrganismKey,
    selectedJournalFilters,
    selectedCountryFilters,
    selectedLibraryStrategyFilters,
    selectedLibrarySourceFilters,
    selectedInstrumentModelFilters,
    perPage,
  ]);
  const [prevPageResetKey, setPrevPageResetKey] = useState(pageResetKey);
  if (pageResetKey !== prevPageResetKey) {
    setPrevPageResetKey(pageResetKey);
    setCurrentPage(1);
  }

  // Geo search filters client-side, so it needs the whole result set: keep the
  // infinite query that eagerly prefetches every page (cursor-paginated).
  const {
    data: geoData,
    isLoading: geoIsLoading,
    isError: geoIsError,
    refetch: geoRefetch,
    fetchNextPage,
    hasNextPage: geoHasNextPage,
    isFetchingNextPage: geoIsFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [
      "geo-search",
      geoLat,
      geoLng,
      geoRadiusKm,
      geoOrganism,
      geoAssayL1,
      geoAssayL2,
      geoSource,
    ],
    queryFn: async ({ pageParam, signal }) => {
      // Measure elapsed fetch and network time.
      const start = performance.now();
      const res = await getGeoSearchResults(
        geoLat!,
        geoLng!,
        geoRadiusKm,
        pageParam as Cursor,
        geoOrganism,
        geoAssayL1,
        geoAssayL2,
        geoSource,
        signal,
      );
      if (res) res.took_ms = performance.now() - start;
      return res;
    },
    initialPageParam: null as Cursor,
    getNextPageParam: (lastPage) => lastPage?.next_cursor ?? undefined,
    enabled: isGeoSearch,
  });

  // Fetch the server pages containing the UI page and cache them for revisits.
  // perPage divides the 200-row server page size; the range also handles boundary crossings.
  const neededServerPages = useMemo(() => {
    if (isGeoSearch || !query) return [];
    const startIdx = (currentPage - 1) * perPage;
    const first = Math.floor(startIdx / SERVER_PAGE_SIZE);
    const last = Math.floor((startIdx + perPage - 1) / SERVER_PAGE_SIZE);
    const pages: number[] = [];
    for (let p = first; p <= last; p++) pages.push(p);
    return pages;
  }, [isGeoSearch, query, currentPage, perPage]);

  // Share query configuration between live fetches and prefetches to reuse cache entries.
  const serverPageQuery = useCallback(
    (p: number) => ({
      queryKey: [
        "search",
        query,
        db,
        sortBy,
        filtersKey,
        noExpansion,
        excludeOntologyKey,
        p,
      ],
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        const start = performance.now();
        const res = await getSearchResults(
          query,
          db,
          p * SERVER_PAGE_SIZE,
          sortBy,
          searchFilters,
          noExpansion,
          excludeOntology,
          signal,
        );
        if (res) res.took_ms = performance.now() - start;
        return res;
      },
      enabled: !isGeoSearch && !!query,
    }),
    // searchFilters is captured via its stable JSON key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      query,
      db,
      sortBy,
      filtersKey,
      noExpansion,
      excludeOntologyKey,
      isGeoSearch,
    ],
  );

  const serverPageQueries = useQueries({
    queries: neededServerPages.map((p) => serverPageQuery(p)),
  });

  // Unify the geo (infinite) and text (per-page) sources behind one interface so
  // the rest of the component is agnostic to which is active.
  const anyTextLoading = serverPageQueries.some((q) => q.isLoading);
  const isError = isGeoSearch
    ? geoIsError
    : serverPageQueries.some((q) => q.isError);
  const isFetchingNextPage = isGeoSearch
    ? geoIsFetchingNextPage
    : serverPageQueries.some((q) => q.isFetching);
  const refetch = () => {
    if (isGeoSearch) geoRefetch();
    else serverPageQueries.forEach((q) => q.refetch());
  };
  const windowFirstServerPage = neededServerPages[0] ?? 0;

  // Fetch sidebar facet counts alongside text results. Fall back to client-derived
  // counts for geo search or unavailable server facets.
  const { data: facetsResponse, isLoading: facetsLoading } = useQuery({
    queryKey: [
      "search-facets",
      query,
      db,
      filtersKey,
      noExpansion,
      excludeOntologyKey,
    ],
    queryFn: async ({ signal }) => {
      let url = `${SERVER_URL}/search/facets?q=${encodeURIComponent(
        query ?? "",
      )}${db ? `&db=${db}` : ""}${noExpansion ? "&structured=true" : ""}${ontologyParams(
        excludeOntology,
      )}`;
      // Send active filters so each facet narrows by the others (exclude-self).
      url = appendFilterParams(url, searchFilters);
      const res = await fetch(url, { signal: withTimeout(signal) });
      if (!res.ok) throw new Error("Failed to fetch facets");
      return res.json() as Promise<{
        facets: SearchFacets;
        total?: number | null;
        max_rank?: number | null;
      }>;
    },
    enabled: !isGeoSearch && !!query,
  });
  const serverFacets = facetsResponse?.facets;

  // The exact total is deferred to the (parallel) facets request so /search can
  // return the first page without the expensive full count. Until it lands we
  // fall back to the loaded-row count and render an inexact "N+".
  const facetsTotal =
    typeof facetsResponse?.total === "number" ? facetsResponse.total : null;

  // Flag results scoring below the relevance threshold. Use the unfiltered
  // server max_rank so filtering preserves the cutoff; skip flags when it is unavailable.
  const lowRelevanceCutoff =
    typeof facetsResponse?.max_rank === "number" && facetsResponse.max_rank > 0
      ? facetsResponse.max_rank * LOW_RELEVANCE_FRACTION
      : null;
  const tookMs = isGeoSearch
    ? (geoData?.pages?.[0]?.took_ms ?? 0)
    : (serverPageQueries[0]?.data?.took_ms ?? 0);
  // Spelling suggestions ride on the offset-0 page (only surfaced on page 1).
  const suggestions = isGeoSearch
    ? geoData?.pages?.[0]?.suggestions
    : serverPageQueries.find((q) => q.data?.suggestions)?.data?.suggestions;
  // Auto-applied typo correction (backend already swapped in the corrected-query
  // results); we just render the banner. Geo/map search hits /search/structured,
  // which has no text query, so there's nothing to correct there.
  const correction = isGeoSearch
    ? undefined
    : serverPageQueries.find((q) => q.data?.correction)?.data?.correction;

  // Text search holds the displayed server page. Facets supply total and sidebar counts.
  const allResults = useMemo(() => {
    const flat = isGeoSearch
      ? (geoData?.pages.flatMap((page) => page?.results ?? []) ?? [])
      : serverPageQueries.flatMap((q) => q.data?.results ?? []);
    const seen = new Set<string>();
    return flat.filter((result) => {
      const id = `${result.source}:${result.accession}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [isGeoSearch, geoData, serverPageQueries]);

  // Geo returns its own (client-side) count; text search reads the deferred
  // total from facets, falling back to the loaded count while it's pending.
  const total = isGeoSearch
    ? (geoData?.pages?.[0]?.total ?? 0)
    : (facetsTotal ?? allResults.length);
  // Facets are pending only while fetching; a failed or missing total falls back to the loaded count with "+".
  const totalPending =
    !isGeoSearch && !!query && facetsTotal === null && facetsLoading;

  // Show the full-page skeleton while server page 0 loads with no rows.
  // Use row availability independently of the parallel facets total. Deeper page loads use the inline spinner.
  const isLoading = isGeoSearch
    ? geoIsLoading
    : !!query &&
      anyTextLoading &&
      allResults.length === 0 &&
      windowFirstServerPage === 0;
  // Keep the header, paginator, and rail mounted while a page jump fetches rows.
  const hasResults = isGeoSearch
    ? allResults.length > 0
    : total > 0 || allResults.length > 0;

  // Geo search filters client-side, so it still needs the whole result set:
  // keep eagerly prefetching every page. Text search paginates on the server and
  // fetches exactly the page it needs, so it never prefetches.
  const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isGeoSearch) return;
    if (geoHasNextPage && !geoIsFetchingNextPage) {
      prefetchTimerRef.current = setTimeout(() => fetchNextPage(), 150);
      return () => {
        if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
      };
    }
  }, [isGeoSearch, geoHasNextPage, geoIsFetchingNextPage, fetchNextPage]);

  // Prefetch the next server page when the total confirms it exists.
  const queryClient = useQueryClient();
  useEffect(() => {
    if (isGeoSearch || !query || total <= 0) return;
    const next = windowFirstServerPage + 1;
    if (next * SERVER_PAGE_SIZE >= total) return;
    queryClient.prefetchQuery(serverPageQuery(next));
  }, [
    isGeoSearch,
    query,
    total,
    windowFirstServerPage,
    serverPageQuery,
    queryClient,
  ]);

  // Snapshot sidebar results on first batch and on final load to prevent
  // facet counts from flickering as intermediate pages stream in.
  const [sidebarSnapshot, setSidebarSnapshot] = useState<SearchResult[]>([]);
  const [snapshotFrozen, setSnapshotFrozen] = useState(false);

  // Reset the snapshot when the search itself changes (adjust during render).
  const sidebarSearchKey = `${query}|${db}|${sortBy}`;
  const [prevSidebarSearchKey, setPrevSidebarSearchKey] =
    useState(sidebarSearchKey);
  const sidebarSearchChanged = sidebarSearchKey !== prevSidebarSearchKey;
  if (sidebarSearchChanged) {
    setPrevSidebarSearchKey(sidebarSearchKey);
    setSidebarSnapshot([]);
    setSnapshotFrozen(false);
  }

  // Geo streams pages in, so snapshot to stop facet counts flickering. Text
  // search draws its rail from serverFacets (exact) and only holds the current
  // server page client-side, so it just uses that directly.
  let sidebarResults = isGeoSearch ? sidebarSnapshot : allResults;
  if (isGeoSearch && !sidebarSearchChanged && !snapshotFrozen) {
    const allLoaded =
      !geoHasNextPage && !geoIsFetchingNextPage && allResults.length > 0;
    if (allLoaded) {
      setSidebarSnapshot(allResults);
      setSnapshotFrozen(true);
      sidebarResults = allResults;
    } else if (sidebarSnapshot.length === 0 && allResults.length > 0) {
      setSidebarSnapshot(allResults);
      sidebarResults = allResults;
    }
  }

  const filteredResults = useMemo(() => {
    // Text search is already filtered server-side; only geo filters client-side.
    if (!isGeoSearch) return allResults;
    let results = allResults;
    results = applyTimeFilter(results, timeFilter, customYearRange);
    results = applyOrganismFilter(results, selectedOrganismKey);
    results = applyJournalFilter(results, selectedJournalFilters);
    results = applyCountryFilter(results, selectedCountryFilters);
    results = applyLibraryStrategyFilter(
      results,
      selectedLibraryStrategyFilters,
    );
    results = applyInstrumentModelFilter(
      results,
      selectedInstrumentModelFilters,
    );
    results = applyPlatformFilter(results, selectedPlatformFilters);
    results = applyMultiPlatformFilter(results, multiPlatformOnly);
    results = applyLongReadFilter(results, longReadOnly);
    return results;
  }, [
    isGeoSearch,
    allResults,
    timeFilter,
    customYearRange,
    selectedOrganismKey,
    selectedJournalFilters,
    selectedCountryFilters,
    selectedLibraryStrategyFilters,
    selectedInstrumentModelFilters,
    selectedPlatformFilters,
    multiPlatformOnly,
    longReadOnly,
  ]);

  const moreFilterBaseResults = useMemo(() => {
    let results = sidebarResults;
    results = applyTimeFilter(results, timeFilter, customYearRange);
    results = applyOrganismFilter(results, selectedOrganismKey);
    return results;
  }, [sidebarResults, timeFilter, customYearRange, selectedOrganismKey]);

  const journalFilterResults = useMemo(() => {
    let results = moreFilterBaseResults;
    results = applyCountryFilter(results, selectedCountryFilters);
    results = applyLibraryStrategyFilter(
      results,
      selectedLibraryStrategyFilters,
    );
    results = applyInstrumentModelFilter(
      results,
      selectedInstrumentModelFilters,
    );
    return results;
  }, [
    moreFilterBaseResults,
    selectedCountryFilters,
    selectedLibraryStrategyFilters,
    selectedInstrumentModelFilters,
  ]);

  const countryFilterResults = useMemo(() => {
    let results = moreFilterBaseResults;
    results = applyJournalFilter(results, selectedJournalFilters);
    results = applyLibraryStrategyFilter(
      results,
      selectedLibraryStrategyFilters,
    );
    results = applyInstrumentModelFilter(
      results,
      selectedInstrumentModelFilters,
    );
    return results;
  }, [
    moreFilterBaseResults,
    selectedJournalFilters,
    selectedLibraryStrategyFilters,
    selectedInstrumentModelFilters,
  ]);

  const libraryStrategyFilterResults = useMemo(() => {
    let results = moreFilterBaseResults;
    results = applyJournalFilter(results, selectedJournalFilters);
    results = applyCountryFilter(results, selectedCountryFilters);
    results = applyInstrumentModelFilter(
      results,
      selectedInstrumentModelFilters,
    );
    return results;
  }, [
    moreFilterBaseResults,
    selectedJournalFilters,
    selectedCountryFilters,
    selectedInstrumentModelFilters,
  ]);

  const instrumentModelFilterResults = useMemo(() => {
    let results = moreFilterBaseResults;
    results = applyJournalFilter(results, selectedJournalFilters);
    results = applyCountryFilter(results, selectedCountryFilters);
    results = applyLibraryStrategyFilter(
      results,
      selectedLibraryStrategyFilters,
    );
    results = applyPlatformFilter(results, selectedPlatformFilters);
    results = applyMultiPlatformFilter(results, multiPlatformOnly);
    results = applyLongReadFilter(results, longReadOnly);
    return results;
  }, [
    moreFilterBaseResults,
    selectedJournalFilters,
    selectedCountryFilters,
    selectedLibraryStrategyFilters,
    selectedPlatformFilters,
    multiPlatformOnly,
    longReadOnly,
  ]);

  const platformFilterResults = useMemo(() => {
    let results = moreFilterBaseResults;
    results = applyJournalFilter(results, selectedJournalFilters);
    results = applyCountryFilter(results, selectedCountryFilters);
    results = applyLibraryStrategyFilter(
      results,
      selectedLibraryStrategyFilters,
    );
    results = applyInstrumentModelFilter(
      results,
      selectedInstrumentModelFilters,
    );
    return results;
  }, [
    moreFilterBaseResults,
    selectedJournalFilters,
    selectedCountryFilters,
    selectedLibraryStrategyFilters,
    selectedInstrumentModelFilters,
  ]);

  useEffect(() => {
    // Prune filters only for geo search, which holds the full set. Text search may
    // have valid filter matches on unloaded pages.
    if (!isGeoSearch) return;
    const nextJournalFilters = selectedJournalFilters.filter((journal) =>
      getAvailableJournals(journalFilterResults).has(journal),
    );
    const nextCountryFilters = selectedCountryFilters.filter((country) =>
      getAvailableCountries(countryFilterResults).has(country.toUpperCase()),
    );
    const nextLibraryStrategyFilters = selectedLibraryStrategyFilters.filter(
      (strategy) =>
        getAvailableLibraryStrategies(libraryStrategyFilterResults).has(
          strategy,
        ),
    );
    const nextInstrumentModelFilters = selectedInstrumentModelFilters.filter(
      (model) =>
        getAvailableInstrumentModels(instrumentModelFilterResults).has(model),
    );

    const journalsChanged =
      nextJournalFilters.length !== selectedJournalFilters.length;
    const countriesChanged =
      nextCountryFilters.length !== selectedCountryFilters.length;
    const libraryStrategiesChanged =
      nextLibraryStrategyFilters.length !==
      selectedLibraryStrategyFilters.length;
    const instrumentModelsChanged =
      nextInstrumentModelFilters.length !==
      selectedInstrumentModelFilters.length;

    if (
      !journalsChanged &&
      !countriesChanged &&
      !libraryStrategiesChanged &&
      !instrumentModelsChanged
    ) {
      return;
    }

    updateSearchUrl({
      [FILTER_PARAM_KEYS.journal]: nextJournalFilters,
      [FILTER_PARAM_KEYS.country]: nextCountryFilters,
      [FILTER_PARAM_KEYS.libraryStrategy]: nextLibraryStrategyFilters,
      [FILTER_PARAM_KEYS.instrumentModel]: nextInstrumentModelFilters,
    });
  }, [
    isGeoSearch,
    selectedJournalFilters,
    selectedCountryFilters,
    selectedLibraryStrategyFilters,
    selectedInstrumentModelFilters,
    journalFilterResults,
    countryFilterResults,
    libraryStrategyFilterResults,
    instrumentModelFilterResults,
    updateSearchUrl,
  ]);

  // Text search paginates server-side: the true total is the server count, and
  // filteredResults holds only the pages loaded so far. Geo filters client-side,
  // so its total is the filtered-set length.
  const filteredTotal = isGeoSearch ? filteredResults.length : total;
  const totalPages = Math.max(1, Math.ceil(filteredTotal / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * perPage;
  // Geo holds the full set, so slice by absolute index. Text search holds only
  // the current server page, so slice relative to where that page starts.
  const textLocalStart = startIdx - windowFirstServerPage * SERVER_PAGE_SIZE;
  const pageResults = isGeoSearch
    ? filteredResults.slice(startIdx, startIdx + perPage)
    : textLocalStart < 0
      ? []
      : filteredResults.slice(textLocalStart, textLocalStart + perPage);
  // Further pages: geo count grows while streaming; text uses the server total.
  const hasNextPage = isGeoSearch ? geoHasNextPage : safePage < totalPages;

  // Carry the organism filter and effective query to the project page for highlighting.
  const projectHref = (accession: string) => {
    const params = new URLSearchParams();
    if (selectedOrganismKey) params.set("organism", selectedOrganismKey);
    const effectiveQuery = correction?.corrected_query ?? query;
    if (effectiveQuery) params.set("q", effectiveQuery);
    // Carry the expansion settings so the project page highlights the words
    // that actually matched. Without them it re-expands with everything on and
    // lights up synonyms this search never used.
    if (effectiveQuery) {
      if (noExpansion) params.set(EXPANSION_PARAM, "0");
      if (excludeOntology.length)
        params.set(ONTOLOGY_PARAM, excludeOntology.join(","));
    }
    const qs = params.toString();
    return qs ? `${getProjectShortUrl(accession)}?${qs}` : undefined;
  };

  const renderResultCard = (searchResult: SearchResult) => (
    <ResultCard
      key={`${searchResult.source}:${searchResult.accession}`}
      accession={searchResult.accession}
      source={searchResult.source}
      title={searchResult.title}
      summary={searchResult.summary}
      updated_at={searchResult.updated_at}
      journal={searchResult.journal}
      doi={searchResult.doi}
      citation_count={searchResult.citation_count}
      authors={searchResult.authors}
      center_name={searchResult.center_name}
      country_code={searchResult.country_code}
      href={projectHref(searchResult.accession)}
      lowRelevance={
        lowRelevanceCutoff !== null &&
        typeof searchResult.rank === "number" &&
        searchResult.rank < lowRelevanceCutoff
      }
    />
  );
  // Literal-typo matches shown only on page 1 (augmented mode), above the
  // corrected stream that the banner labels "additional results".
  const extraResults = safePage === 1 ? (correction?.extra_results ?? []) : [];

  const liveStatusMessage = useMemo(() => {
    if (!query && !isGeoSearch) return "";
    if (isLoading) return "Loading search results.";
    if (isError) return "Search failed. The server could not be reached.";
    if (allResults.length === 0) return `No results found for ${query}.`;
    if (filteredTotal === 0) {
      return `${allResults.length.toLocaleString()} result${allResults.length === 1 ? "" : "s"} were filtered out. Try removing a filter.`;
    }
    const pageCount = pageResults.length;
    // Geo's total grows as pages stream in (client-side count); text search's
    // exact total is still loading (from facets). Either way show "N+".
    if ((isGeoSearch || totalPending) && hasNextPage) {
      return `${filteredTotal.toLocaleString()}+ results. Showing page ${safePage} of ${totalPages}, ${pageCount} result${pageCount === 1 ? "" : "s"}.`;
    }
    return `${filteredTotal.toLocaleString()} result${filteredTotal === 1 ? "" : "s"}. Showing page ${safePage} of ${totalPages}.`;
  }, [
    query,
    isGeoSearch,
    isLoading,
    isError,
    allResults.length,
    filteredTotal,
    pageResults.length,
    hasNextPage,
    safePage,
    totalPages,
    totalPending,
  ]);
  // Debounce SR announcements so rapid filter churn doesn't spam the user.
  const [announcedStatus, setAnnouncedStatus] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setAnnouncedStatus(liveStatusMessage), 500);
    return () => clearTimeout(id);
  }, [liveStatusMessage]);

  const resultsTopRef = useRef<HTMLDivElement>(null);
  const resultsListRef = useRef<HTMLDivElement>(null);
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    resultsTopRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return;
      }
      if (
        event.key !== "ArrowDown" &&
        event.key !== "ArrowUp" &&
        event.key !== "ArrowRight" &&
        event.key !== "Home" &&
        event.key !== "End"
      ) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          target.isContentEditable ||
          target.closest('[role="dialog"]')
        ) {
          return;
        }
      }
      const container = resultsListRef.current;
      if (!container) return;
      const links = Array.from(
        container.querySelectorAll<HTMLAnchorElement>(
          '[data-result-link="true"]',
        ),
      );
      if (links.length === 0) return;
      const activeEl = document.activeElement as HTMLElement | null;
      const currentIndex = activeEl
        ? links.indexOf(activeEl as HTMLAnchorElement)
        : -1;

      if (event.key === "ArrowRight") {
        if (currentIndex < 0) return;
        event.preventDefault();
        links[currentIndex]?.click();
        return;
      }

      let nextIndex: number;
      if (event.key === "ArrowDown") {
        nextIndex =
          currentIndex < 0 ? 0 : Math.min(currentIndex + 1, links.length - 1);
      } else if (event.key === "ArrowUp") {
        nextIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else {
        nextIndex = links.length - 1;
      }
      event.preventDefault();
      const next = links[nextIndex];
      if (!next) return;
      next.focus({ preventScroll: true });
      const card = next.closest("[data-result-card='true']") ?? next;
      card.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // More filters use an optimistic local copy; Apply commits selections to the URL
  // in one update. Chips and search read committed URL values.
  const committedMoreFilters = useMemo(
    () => ({
      journal: selectedJournalFilters,
      country: selectedCountryFilters,
      library_strategy: selectedLibraryStrategyFilters,
      library_source: selectedLibrarySourceFilters,
      instrument_model: selectedInstrumentModelFilters,
      platform: selectedPlatformFilters,
      multi_platform: multiPlatformOnly,
      long_read: longReadOnly,
    }),
    [
      selectedJournalFilters,
      selectedCountryFilters,
      selectedLibraryStrategyFilters,
      selectedLibrarySourceFilters,
      selectedInstrumentModelFilters,
      selectedPlatformFilters,
      multiPlatformOnly,
      longReadOnly,
    ],
  );
  const committedMoreKey = JSON.stringify(committedMoreFilters);
  const [localMore, setLocalMore] = useState(committedMoreFilters);
  // Sync the optimistic copy during render when URL filters change.
  const [prevCommittedMoreKey, setPrevCommittedMoreKey] =
    useState(committedMoreKey);
  if (committedMoreKey !== prevCommittedMoreKey) {
    setPrevCommittedMoreKey(committedMoreKey);
    setLocalMore(committedMoreFilters);
  }

  // Ticks update only the optimistic copy; nothing reloads until the user hits
  // the dialog's Apply button. Closing without applying discards the changes.
  const railSetJournal = (v: string[]) =>
    setLocalMore((p) => ({ ...p, journal: v }));
  const railSetCountry = (v: string[]) =>
    setLocalMore((p) => ({ ...p, country: v }));
  const railSetLibraryStrategy = (v: string[]) =>
    setLocalMore((p) => ({ ...p, library_strategy: v }));
  const railSetLibrarySource = (v: string[]) =>
    setLocalMore((p) => ({ ...p, library_source: v }));
  const railSetInstrumentModel = (v: string[]) =>
    setLocalMore((p) => ({ ...p, instrument_model: v }));
  const railSetPlatform = (v: string[]) =>
    setLocalMore((p) => ({ ...p, platform: v }));
  const railSetMultiPlatform = (v: boolean) =>
    setLocalMore((p) => ({ ...p, multi_platform: v }));
  const railSetLongRead = (v: boolean) =>
    setLocalMore((p) => ({ ...p, long_read: v }));
  const applyMoreFilters = () =>
    updateSearchUrl({
      [FILTER_PARAM_KEYS.journal]: localMore.journal,
      [FILTER_PARAM_KEYS.country]: localMore.country,
      [FILTER_PARAM_KEYS.libraryStrategy]: localMore.library_strategy,
      [FILTER_PARAM_KEYS.librarySource]: localMore.library_source,
      [FILTER_PARAM_KEYS.instrumentModel]: localMore.instrument_model,
      [FILTER_PARAM_KEYS.platform]: localMore.platform,
      [FILTER_PARAM_KEYS.multiPlatform]: localMore.multi_platform
        ? "true"
        : null,
      [FILTER_PARAM_KEYS.longRead]: localMore.long_read ? "true" : null,
    });
  const discardMoreFilters = () => setLocalMore(committedMoreFilters);

  const handleSetJournalFilters = useCallback(
    (arr: string[]) => {
      updateSearchUrl({
        [FILTER_PARAM_KEYS.journal]: arr,
      });
    },
    [updateSearchUrl],
  );
  const handleSetCountryFilters = useCallback(
    (arr: string[]) => {
      updateSearchUrl({
        [FILTER_PARAM_KEYS.country]: arr,
      });
    },
    [updateSearchUrl],
  );
  const handleSetLibraryStrategyFilters = useCallback(
    (arr: string[]) => {
      updateSearchUrl({
        [FILTER_PARAM_KEYS.libraryStrategy]: arr,
      });
    },
    [updateSearchUrl],
  );
  const handleSetLibrarySourceFilters = useCallback(
    (arr: string[]) => {
      updateSearchUrl({
        [FILTER_PARAM_KEYS.librarySource]: arr,
      });
    },
    [updateSearchUrl],
  );
  const handleSetInstrumentModelFilters = useCallback(
    (arr: string[]) => {
      updateSearchUrl({
        [FILTER_PARAM_KEYS.instrumentModel]: arr,
      });
    },
    [updateSearchUrl],
  );
  const handleSetPlatformFilters = useCallback(
    (arr: string[]) => {
      updateSearchUrl({
        [FILTER_PARAM_KEYS.platform]: arr,
      });
    },
    [updateSearchUrl],
  );
  const handleSetMultiPlatform = useCallback(
    (val: boolean) => {
      updateSearchUrl({
        [FILTER_PARAM_KEYS.multiPlatform]: val ? "true" : null,
      });
    },
    [updateSearchUrl],
  );
  const handleSetLongRead = useCallback(
    (val: boolean) => {
      updateSearchUrl({
        [FILTER_PARAM_KEYS.longRead]: val ? "true" : null,
      });
    },
    [updateSearchUrl],
  );
  const handleClearMoreFilters = useCallback(() => {
    updateSearchUrl({
      [FILTER_PARAM_KEYS.journal]: [],
      [FILTER_PARAM_KEYS.country]: [],
      [FILTER_PARAM_KEYS.libraryStrategy]: [],
      [FILTER_PARAM_KEYS.librarySource]: [],
      [FILTER_PARAM_KEYS.instrumentModel]: [],
      [FILTER_PARAM_KEYS.platform]: [],
      [FILTER_PARAM_KEYS.multiPlatform]: null,
      [FILTER_PARAM_KEYS.longRead]: null,
    });
  }, [updateSearchUrl]);

  const [showTopButton, setShowTopButton] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFailed, setDownloadFailed] = useState(false);

  const shouldShowOrganismRail = !isLoading && !isError && hasResults;
  const shouldReserveRailSpace = isLoading;
  // Release the reserved rail column and center the message for empty results or errors.
  const emptyStateFullWidth =
    !isLoading && (!!query || isGeoSearch) && (isError || !hasResults);

  useEffect(() => {
    const onScroll = () => {
      setShowTopButton(window.scrollY > 200);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleDownloadResults = async () => {
    if (isDownloading) return;
    if (!isGeoSearch && !query) return;

    setIsDownloading(true);
    setDownloadFailed(false);

    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\..+/, "")
      .replace("T", "_");

    try {
      // Geo search holds the full filtered result set for client-side export.
      if (isGeoSearch) {
        downloadCsv(
          filteredResults.map((r) => resultToCsvRow(r)),
          DOWNLOAD_COLUMNS,
          `seqout_results_${timestamp}.csv`,
        );
        return;
      }

      // Stream every text-search match using the same database and sidebar filters,
      // including the year range in searchFilters.
      let url = `${SERVER_URL}/download/query?q=${encodeURIComponent(
        // Download results for the effective query, including any applied spelling correction.
        correction?.corrected_query ?? query!,
      )}`;
      if (db && (SEARCH_DBS as readonly string[]).includes(db)) {
        url += `&db=${encodeURIComponent(db)}`;
      }
      // Include expansion settings so the CSV matches the displayed search.
      if (noExpansion) url += "&structured=true";
      url += ontologyParams(excludeOntology);
      url = appendFilterParams(url, searchFilters);

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Download failed");
      }

      const csvBlob = await res.blob();
      const objectUrl = URL.createObjectURL(csvBlob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `seqout_results_${timestamp}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error(error);
      setDownloadFailed(true);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDatabaseChange = useCallback(
    (value: SearchDb | "both") => {
      if (!query) return;

      const params = new URLSearchParams(searchParams.toString());
      params.set("q", query);
      if (value !== "both") {
        params.set("db", value);
      } else {
        params.delete("db");
      }

      const nextQuery = params.toString();
      router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname);
    },
    [query, searchParams, router, pathname],
  );

  const railProps = {
    results: sidebarResults,
    serverFacets,
    // Text search knows the exact total up front; geo derives it from its
    // (prefetched) result set, so let the rail fall back to results.length.
    totalCount: isGeoSearch ? undefined : total,
    journalResults: journalFilterResults,
    countryResults: countryFilterResults,
    libraryStrategyResults: libraryStrategyFilterResults,
    instrumentModelResults: instrumentModelFilterResults,
    organismNameMode,
    setOrganismNameMode,
    selectedOrganismKey,
    setSelectedOrganismFilter: (value: string | null) =>
      updateSearchUrl({
        [FILTER_PARAM_KEYS.organism]: value,
      }),
    // The rail reads the optimistic copy + Apply-gated setters so ticking several
    // boxes doesn't refetch per click; the URL (and search) update once on Apply.
    selectedJournalFilters: localMore.journal,
    setSelectedJournalFilters: railSetJournal,
    selectedCountryFilters: localMore.country,
    setSelectedCountryFilters: railSetCountry,
    selectedLibraryStrategyFilters: localMore.library_strategy,
    setSelectedLibraryStrategyFilters: railSetLibraryStrategy,
    selectedLibrarySourceFilters: localMore.library_source,
    setSelectedLibrarySourceFilters: railSetLibrarySource,
    selectedInstrumentModelFilters: localMore.instrument_model,
    setSelectedInstrumentModelFilters: railSetInstrumentModel,
    platformResults: platformFilterResults,
    selectedPlatformFilters: localMore.platform,
    setSelectedPlatformFilters: railSetPlatform,
    multiPlatformOnly: localMore.multi_platform,
    setMultiPlatformOnly: railSetMultiPlatform,
    longReadOnly: localMore.long_read,
    setLongReadOnly: railSetLongRead,
    onClearMoreFilters: handleClearMoreFilters,
    onApplyMoreFilters: applyMoreFilters,
    onDiscardMoreFilters: discardMoreFilters,
  };

  const hasAnyFilter =
    selectedOrganismKey != null ||
    selectedJournalFilters.length > 0 ||
    selectedCountryFilters.length > 0 ||
    selectedLibraryStrategyFilters.length > 0 ||
    selectedLibrarySourceFilters.length > 0 ||
    selectedInstrumentModelFilters.length > 0 ||
    selectedPlatformFilters.length > 0 ||
    multiPlatformOnly ||
    longReadOnly ||
    timeFilter !== "any" ||
    sortBy !== "relevance" ||
    db != null;

  const resetSort = useCallback(
    () => updateSearchUrl({ [FILTER_PARAM_KEYS.sortBy]: null }),
    [updateSearchUrl],
  );
  const resetTime = useCallback(
    () =>
      updateSearchUrl({
        [FILTER_PARAM_KEYS.time]: null,
        [FILTER_PARAM_KEYS.dateFrom]: null,
        [FILTER_PARAM_KEYS.dateTo]: null,
      }),
    [updateSearchUrl],
  );
  const resetDb = useCallback(
    () => handleDatabaseChange("both"),
    [handleDatabaseChange],
  );
  const resetOrganism = useCallback(
    () => updateSearchUrl({ [FILTER_PARAM_KEYS.organism]: null }),
    [updateSearchUrl],
  );
  const handleClearAllFilters = useCallback(() => {
    updateSearchUrl({
      [FILTER_PARAM_KEYS.sortBy]: null,
      [FILTER_PARAM_KEYS.time]: null,
      [FILTER_PARAM_KEYS.dateFrom]: null,
      [FILTER_PARAM_KEYS.dateTo]: null,
      [FILTER_PARAM_KEYS.organism]: null,
      [FILTER_PARAM_KEYS.journal]: [],
      [FILTER_PARAM_KEYS.country]: [],
      [FILTER_PARAM_KEYS.libraryStrategy]: [],
      [FILTER_PARAM_KEYS.librarySource]: [],
      [FILTER_PARAM_KEYS.instrumentModel]: [],
      [FILTER_PARAM_KEYS.platform]: [],
      [FILTER_PARAM_KEYS.multiPlatform]: null,
      [FILTER_PARAM_KEYS.longRead]: null,
    });
    if (db) handleDatabaseChange("both");
  }, [updateSearchUrl, db, handleDatabaseChange]);

  const filterToolbar = (
    <SearchFilters
      db={db}
      query={query}
      sortBy={sortBy}
      setSortBy={(value) =>
        updateSearchUrl({
          [FILTER_PARAM_KEYS.sortBy]: value === "relevance" ? null : value,
        })
      }
      setTimeFilter={(value) =>
        updateSearchUrl({
          [FILTER_PARAM_KEYS.time]: value === "any" ? null : value,
          [FILTER_PARAM_KEYS.dateFrom]:
            value === "custom" ? customYearRange.from : null,
          [FILTER_PARAM_KEYS.dateTo]:
            value === "custom" ? customYearRange.to : null,
        })
      }
      timeFilter={timeFilter}
      customYearRange={customYearRange}
      setCustomYearRange={(value) =>
        updateSearchUrl({
          [FILTER_PARAM_KEYS.time]: "custom",
          [FILTER_PARAM_KEYS.dateFrom]: value.from,
          [FILTER_PARAM_KEYS.dateTo]: value.to,
        })
      }
      onDatabaseChange={handleDatabaseChange}
    />
  );

  const activeFilterChips = (
    <ActiveFilterChips
      sortBy={sortBy}
      onResetSort={resetSort}
      timeFilter={timeFilter}
      customYearRange={customYearRange}
      onResetTime={resetTime}
      db={db}
      onResetDb={resetDb}
      selectedOrganismKey={selectedOrganismKey}
      onResetOrganism={resetOrganism}
      selectedJournalFilters={selectedJournalFilters}
      setSelectedJournalFilters={handleSetJournalFilters}
      selectedCountryFilters={selectedCountryFilters}
      setSelectedCountryFilters={handleSetCountryFilters}
      selectedLibraryStrategyFilters={selectedLibraryStrategyFilters}
      setSelectedLibraryStrategyFilters={handleSetLibraryStrategyFilters}
      selectedLibrarySourceFilters={selectedLibrarySourceFilters}
      setSelectedLibrarySourceFilters={handleSetLibrarySourceFilters}
      selectedInstrumentModelFilters={selectedInstrumentModelFilters}
      setSelectedInstrumentModelFilters={handleSetInstrumentModelFilters}
      selectedPlatformFilters={selectedPlatformFilters}
      setSelectedPlatformFilters={handleSetPlatformFilters}
      multiPlatformOnly={multiPlatformOnly}
      setMultiPlatformOnly={handleSetMultiPlatform}
      longReadOnly={longReadOnly}
      setLongReadOnly={handleSetLongRead}
      onClearAll={handleClearAllFilters}
    />
  );

  return (
    <>
      <SearchBar initialQuery={query} />

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="seqout-sr-only"
      >
        {announcedStatus}
      </div>

      <Flex
        gap={"4"}
        px={{ initial: "0", md: "4" }}
        width={{ initial: "98%", md: "100%" }}
        mx="auto"
        justify={{ initial: "start", md: "between" }}
        direction={{ initial: "column", md: "row" }}
      >
        <Flex
          gap="4"
          direction="column"
          width={
            emptyStateFullWidth
              ? "100%"
              : {
                  initial: "100%",
                  md: "calc(100% - 240px)",
                  lg: "calc(100% - 300px)",
                }
          }
          minWidth="0"
        >
          <div ref={resultsTopRef} />
          {!query && !isGeoSearch ? (
            <Text>Start by typing a search query above.</Text>
          ) : isLoading ? (
            <>
              <Flex gap="2" align="center">
                <Spinner size="1" />
                <Text color="gray" weight="light">
                  Fetching results...
                </Text>
              </Flex>
              <Skeleton width={"100%"} height={"6rem"} />
              <Skeleton width={"100%"} height={"6rem"} />
              <Skeleton width={"100%"} height={"6rem"} />
              <Skeleton width={"100%"} height={"6rem"} />
              <Skeleton width={"100%"} height={"6rem"} />
            </>
          ) : isError ? (
            <Flex
              role="alert"
              gap="3"
              align="center"
              justify="center"
              height={"20rem"}
              direction={"column"}
            >
              <Text size={{ initial: "5", md: "6" }} weight="bold">
                We couldn&rsquo;t reach the search server
              </Text>
              <Text
                size="2"
                align="center"
                style={{ color: "var(--gray-11)", maxWidth: "32rem" }}
              >
                The server may be under load, or the connection may have
                dropped. Your query is still in the URL — retrying is safe.
              </Text>
              <Flex gap="2" align="center" mt="1">
                <Button variant="surface" onClick={() => refetch()}>
                  <ReloadIcon /> Retry search
                </Button>
              </Flex>
            </Flex>
          ) : hasResults ? (
            <>
              <Flex justify="between" align="center" wrap="wrap" gap="2">
                <Text color="gray" weight={"light"}>
                  {totalPending ? (
                    <Skeleton>00,000</Skeleton>
                  ) : (
                    total.toLocaleString()
                  )}{" "}
                  result{total === 1 ? "" : "s"} in {(tookMs / 1000).toFixed(2)}
                  s
                  {!totalPending &&
                    hasAnyFilter &&
                    filteredTotal < allResults.length && (
                      <> ({filteredTotal.toLocaleString()} after filters)</>
                    )}
                </Text>
                {filterToolbar}
              </Flex>
              {activeFilterChips}

              {correction?.mode === "replaced" ? (
                <CorrectionNotice correction={correction} />
              ) : !correction && suggestions?.length ? (
                <DidYouMean
                  suggestion={suggestions[0]}
                  searchParams={searchParams}
                  onNavigate={(url) => router.push(url)}
                />
              ) : null}

              {extraResults.length > 0 && (
                <Flex
                  direction="column"
                  gap="0"
                  className="seqout-divided-list"
                  style={{ paddingLeft: 0 }}
                >
                  {extraResults.map(renderResultCard)}
                </Flex>
              )}

              {correction && correction.mode !== "replaced" && (
                <CorrectionNotice correction={correction} />
              )}

              {pageResults.length === 0 ? (
                <Flex
                  align="center"
                  justify="center"
                  direction={"column"}
                  height={"12rem"}
                  gap="2"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Spinner size="3" />
                      <Text color="gray" size="2" mt="2">
                        Loading this page&hellip;
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text size={{ initial: "3", md: "4" }} weight="bold">
                        No results match your filters
                      </Text>
                      <Text
                        size="2"
                        align="center"
                        style={{ color: "var(--gray-11)" }}
                      >
                        {filteredTotal === 0 && allResults.length > 0
                          ? `${allResults.length.toLocaleString()} result${allResults.length === 1 ? "" : "s"} were filtered out — try removing a filter to see them.`
                          : "Try clearing active filters or widening the time range."}
                      </Text>
                      {hasAnyFilter && (
                        <Button
                          variant="surface"
                          size="2"
                          onClick={handleClearAllFilters}
                          mt="1"
                        >
                          Clear all filters
                        </Button>
                      )}
                    </>
                  )}
                </Flex>
              ) : (
                <Flex
                  ref={resultsListRef}
                  direction="column"
                  gap="0"
                  className="seqout-divided-list"
                  style={{ paddingLeft: 0 }}
                >
                  {pageResults.map(renderResultCard)}
                </Flex>
              )}

              <Paginator
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                perPage={perPage}
                onPerPageChange={setPerPage}
                totalResults={filteredTotal}
                displayResultsCount={total}
              />
            </>
          ) : (
            <Flex
              align="center"
              justify="center"
              direction={"column"}
              height={"20rem"}
              gap="3"
            >
              <Text size={{ initial: "5", md: "6" }} weight="bold">
                {query ? (
                  <>No results for &ldquo;{query}&rdquo;</>
                ) : (
                  "No results found"
                )}
              </Text>
              {suggestions?.length ? (
                <DidYouMean
                  suggestion={suggestions[0]}
                  searchParams={searchParams}
                  onNavigate={(url) => router.push(url)}
                />
              ) : (
                <Text
                  size="2"
                  align="center"
                  style={{ color: "var(--gray-11)", maxWidth: "32rem" }}
                >
                  Try a different keyword, broaden your filters, or search by
                  accession (e.g.&nbsp;
                  <span className="seqout-accession">GSE196830</span>).
                </Text>
              )}
              {/* Explain restricted expansion settings and link to the control that widens the search. */}
              {noExpansion || excludeOntology.length ? (
                <Card mt="1" style={{ maxWidth: "32rem" }}>
                  <Text size="2" as="p" weight="medium" mb="1">
                    {noExpansion
                      ? "Term expansion is off"
                      : `${excludeOntology.length} of ${ONTOLOGIES.length} ontologies are switched off`}
                  </Text>
                  <Text size="2" as="p" style={{ color: "var(--gray-11)" }}>
                    {noExpansion
                      ? "Only your exact words were searched."
                      : "Some synonyms might have been left out."}{" "}
                    Adjust this with the term expansion button next to the
                    search box above.
                  </Text>
                </Card>
              ) : null}
              {/* Offer natural-language search alongside spelling suggestions. */}
              <Card mt="1" style={{ maxWidth: "32rem" }}>
                <Text size="2" as="p" weight="medium" mb="1">
                  Need to query in natural language?
                </Text>
                <Text size="2" as="p" style={{ color: "var(--gray-11)" }}>
                  Seqout can be used with the AI agent (e.g. Claude) of your
                  choice to search for and download datasets using natural
                  language. This can often substantially improve your chances of
                  finding relevant datasets.{" "}
                  <Link asChild underline="always">
                    <NextLink href="/mcp">Read more.</NextLink>
                  </Link>
                </Text>
              </Card>
            </Flex>
          )}
        </Flex>

        {isLoading ? (
          <SearchOrganismRailSkeleton />
        ) : shouldReserveRailSpace ? (
          <Flex
            display={{ initial: "none", md: "flex" }}
            direction="column"
            width={{ md: "220px", lg: "280px" }}
          />
        ) : shouldShowOrganismRail ? (
          <SearchOrganismRail {...railProps} showMobile={false} showDesktop />
        ) : null}

        {(shouldShowOrganismRail || filteredResults.length > 0) && (
          <Flex
            position="fixed"
            direction="column"
            align={"end"}
            gap="2"
            bottom={{ initial: "9", sm: "4" }}
            style={{ right: "1rem", zIndex: 999 }}
          >
            {showTopButton && (
              <Tooltip content="Go back to top">
                <Button
                  style={{ width: "fit-content", padding: 16 }}
                  onClick={() =>
                    window.scrollTo({ top: 0, behavior: "smooth" })
                  }
                  aria-label="Go back to top"
                >
                  <ArrowUpIcon />
                </Button>
              </Tooltip>
            )}
            {shouldShowOrganismRail ? (
              <SearchOrganismRail
                {...railProps}
                showMobile
                showDesktop={false}
              />
            ) : null}
            {filteredResults.length > 0 && (
              <Tooltip
                content={
                  downloadFailed
                    ? "Download failed. Please try again."
                    : "Download every matching dataset as CSV (one row per dataset)"
                }
              >
                <Button
                  onClick={handleDownloadResults}
                  disabled={isDownloading}
                  aria-busy={isDownloading}
                >
                  {isDownloading ? <Spinner /> : <DownloadIcon />}
                  {isDownloading ? "Preparing CSV..." : "Download results"}
                </Button>
              </Tooltip>
            )}
          </Flex>
        )}
      </Flex>
    </>
  );
}
