"use client";

// Navbar dialog showing the synonyms used for each search term. Fetches data when opened.

import OntologySettingsButton from "@/components/ontology-settings-button";
import {
  FakeSwitch,
  TermExpansionLearnMore,
  WaypointsIcon,
} from "@/components/term-expansion-control";
import { getOntologyTerm, getSearchExpansion } from "@/utils/api";
import {
  EXPANSION_PARAM,
  ONTOLOGIES,
  ONTOLOGY_COLORS,
  ONTOLOGY_PARAM,
  disabledOntologies,
  expansionDisabled,
  ontologyFromXref,
  sameOntologies,
  writeDisabledOntologies,
  writeExpansionPreference,
} from "@/utils/termExpansion";
import {
  Box,
  Button,
  Card,
  Dialog,
  Flex,
  Link,
  Select,
  Separator,
  Spinner,
  Switch,
  Text,
  Tooltip,
} from "@radix-ui/themes";
import { useQueries, useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Fragment, useState } from "react";

// Client-only: React Flow accesses the DOM.
const ExpansionGraph = dynamic(() => import("@/components/expansion-graph"), {
  ssr: false,
});

export default function ExpansionSection({ query }: { query: string }) {
  const [open, setOpen] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Pending expansion settings start from the displayed search and take effect on Apply.
  const ranExpanded = !expansionDisabled(searchParams);
  const ranWithout = disabledOntologies(searchParams);
  const [on, setOn] = useState(ranExpanded);
  const [without, setWithout] = useState(ranWithout);
  // Re-sync during render when the search changes, so pending controls don't
  // lag the results already shown.
  const [prevRan, setPrevRan] = useState<[boolean, string]>([
    ranExpanded,
    ranWithout.join(),
  ]);
  const ranKey: [boolean, string] = [ranExpanded, ranWithout.join()];
  if (prevRan[0] !== ranKey[0] || prevRan[1] !== ranKey[1]) {
    setPrevRan(ranKey);
    setOn(ranExpanded);
    setWithout(ranWithout);
  }
  // Skip the graph fetch when expansion is disabled or all ontologies are excluded.
  const allOff = without.length >= ONTOLOGIES.length;
  const expansionChanged = on !== ranExpanded;
  const ontologiesChanged = !sameOntologies(without, ranWithout);
  // Label the action for the pending expansion and ontology settings.
  const applyLabel = expansionChanged
    ? on
      ? "Search with term expansion"
      : "Search without term expansion"
    : "Search again with these ontologies";

  const applyExpansion = () => {
    const next = new URLSearchParams(searchParams.toString());
    if (on) next.delete(EXPANSION_PARAM);
    else next.set(EXPANSION_PARAM, "0");
    next.delete(ONTOLOGY_PARAM);
    if (without.length) next.set(ONTOLOGY_PARAM, without.join(","));
    writeExpansionPreference(on);
    writeDisabledOntologies(without);
    setOpen(false);
    router.push(`${pathname}?${next.toString()}`);
  };
  // Key the graph on pending ontology settings so it previews the search Apply will run.
  // Stays gated by open; ExpansionSummary already covers the ungated fetch.
  const { data, isLoading, isError } = useQuery({
    queryKey: ["search-expansion", query, without.join()],
    queryFn: ({ signal }) => getSearchExpansion(query, without, signal),
    enabled: open && query.trim().length > 0 && !allOff,
    staleTime: 5 * 60 * 1000,
  });

  // Only terms that kept at least one synonym have a graph to draw.
  const chunks = (data?.chunks ?? []).filter((c) => c.synonyms.length > 0);
  // Default to the first term if the selection is absent from the list.
  const active =
    chunks.find((c) => c.term === selectedTerm) ?? chunks[0] ?? null;

  if (!query.trim()) return null;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Tooltip content={`Term expansions (${ranExpanded ? "on" : "off"})`}>
        <Dialog.Trigger>
          <Button
            color="gray"
            variant="surface"
            size="3"
            aria-label={`Term expansion (${ranExpanded ? "on" : "off"})`}
          >
            <WaypointsIcon />
            <Box display={{ initial: "none", sm: "block" }}>
              <Text size="2">Term expansion</Text>
            </Box>
            <FakeSwitch checked={ranExpanded} />
          </Button>
        </Dialog.Trigger>
      </Tooltip>
      <Dialog.Content
        size="4"
        style={{ width: "56rem", maxWidth: "calc(100vw - 2rem)" }}
      >
        <Flex align="center" justify="between" gap="4">
          <Dialog.Title size="4" mb="0">
            Term expansion
          </Dialog.Title>
          <Flex align="center" gap="2">
            <OntologySettingsButton disabled={without} onChange={setWithout} />
            <Switch
              checked={on}
              onCheckedChange={setOn}
              aria-label="Term expansion"
            />
          </Flex>
        </Flex>
        <Dialog.Description mb="3">
          <TermExpansionLearnMore />
        </Dialog.Description>
        <Separator size="4" mb="3" />
        {allOff ? (
          <Card>
            <Text size="2" color="gray">
              Every ontology is switched off, so there are no synonyms to show.
              Turn at least one back on to see its effect.
            </Text>
          </Card>
        ) : isLoading ? (
          <Flex align="center" gap="2" py="4">
            <Spinner size="2" />
            <Text size="2" color="gray">
              Loading…
            </Text>
          </Flex>
        ) : isError ? (
          <Text size="2" color="gray">
            Could not load the expansion for this query.
          </Text>
        ) : data?.structured ? (
          <Card>
            <Text size="2" color="gray">
              This is a structured search, so it runs your exact terms with no
              term expansion. See{" "}
              <Link href="/howsearchworks#structured-search" target="_blank">
                Structured search
              </Link>
              .
            </Text>
          </Card>
        ) : active ? (
          <Flex direction="column" gap="2">
            {!ranExpanded && (
              <Text size="2" color="gray">
                This search ran without term expansion. These are the synonyms
                it would have used.
              </Text>
            )}
            <Flex align="center" gap="2" wrap="wrap">
              <Text size="2" weight="medium">
                Expansions for
              </Text>
              <Select.Root
                value={active.term}
                onValueChange={setSelectedTerm}
                disabled={chunks.length < 2}
              >
                <Select.Trigger />
                <Select.Content>
                  {chunks.map((c) => (
                    <Select.Item key={c.term} value={c.term}>
                      {c.term}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>
            <ExpansionGraph key={active.term} chunk={active} />
          </Flex>
        ) : (
          <Text size="2" color="gray">
            No term in this query has synonyms in the ontology graph, so the
            search ran your words as you typed them.
          </Text>
        )}
        {(expansionChanged || ontologiesChanged) && (
          <Flex justify="end" mt="4">
            <Button onClick={applyExpansion}>{applyLabel}</Button>
          </Flex>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}

/** Passive readout of which terms expanded, shown above the results list. Shares ExpansionSection's query key. */
export function ExpansionSummary({
  query,
  on,
  without,
}: {
  query: string;
  on: boolean;
  without: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setExpanded(false);
  }
  const allOff = without.length >= ONTOLOGIES.length;
  const { data } = useQuery({
    queryKey: ["search-expansion", query, without.join()],
    queryFn: ({ signal }) => getSearchExpansion(query, without, signal),
    enabled: on && query.trim().length > 0 && !allOff,
    staleTime: 5 * 60 * 1000,
  });
  const searchParams = useSearchParams();
  const router = useRouter();

  const chunks = data?.chunks ?? [];
  // search/expansion carries no xrefs, so fetch them separately per term.
  const ontologyQueries = useQueries({
    queries: chunks.map((c) => ({
      queryKey: ["ontology-term", c.term],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getOntologyTerm(c.term, signal),
      enabled: on && !data?.structured,
      staleTime: 10 * 60 * 1000,
    })),
  });

  if (!on || data?.structured) return null;
  // Two chunks can share a synonym; keep the first spelling seen.
  const seen = new Set<string>();
  const synonyms = chunks
    .flatMap((c) => c.synonyms)
    .filter((s) => s.trim())
    .filter((s) => {
      const key = s.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  if (synonyms.length === 0) return null;

  // First ontology (in canonical order) that has an xref for this synonym.
  const ontologyByTerm = new Map<string, string>();
  for (const q of ontologyQueries) {
    for (const syn of q.data?.synonyms ?? []) {
      const key = syn.name.toLowerCase();
      if (ontologyByTerm.has(key)) continue;
      for (const o of ONTOLOGIES) {
        if (syn.xrefs.some((x) => ontologyFromXref(x) === o.id)) {
          ontologyByTerm.set(key, o.id);
          break;
        }
      }
    }
  }
  const legend = ONTOLOGIES.filter((o) =>
    synonyms.some((s) => ontologyByTerm.get(s.toLowerCase()) === o.id),
  );

  // Searches this term standalone, keeping the current db/sort/filters.
  const termHref = (term: string) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("q", term);
    p.delete("cursor_rank");
    p.delete("cursor_acc");
    return `/search?${p.toString()}`;
  };

  const shown = expanded ? synonyms : synonyms.slice(0, 5);
  const rest = synonyms.length - shown.length;
  return (
    <Flex direction="column" gap="1">
      <Text size="1" color="gray">
        Expanded with synonyms:{" "}
        {shown.map((term, i) => {
          const href = termHref(term);
          const ontologyColor =
            ONTOLOGY_COLORS[ontologyByTerm.get(term.toLowerCase()) ?? ""];
          return (
            <Fragment key={`${term}-${i}`}>
              {i > 0 && ", "}
              <a
                href={href}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0)
                    return;
                  e.preventDefault();
                  router.push(href);
                }}
                style={SYNONYM_LINK_STYLE}
              >
                {ontologyColor && (
                  <span
                    aria-hidden
                    style={{ ...ONTOLOGY_DOT_STYLE, background: ontologyColor }}
                  />
                )}
                {term}
              </a>
            </Fragment>
          );
        })}{" "}
        {rest > 0 ? (
          <button
            type="button"
            aria-expanded={false}
            aria-label={`Show ${rest} more synonym${rest === 1 ? "" : "s"}`}
            onClick={() => setExpanded(true)}
            style={TOGGLE_BUTTON_STYLE}
          >
            +{rest} more
          </button>
        ) : (
          synonyms.length > 5 && (
            <button
              type="button"
              aria-expanded={true}
              aria-label="Show fewer synonyms"
              onClick={() => setExpanded(false)}
              style={TOGGLE_BUTTON_STYLE}
            >
              show less
            </button>
          )
        )}
      </Text>
      {legend.length > 0 && (
        <Flex gap="3" wrap="wrap">
          {legend.map((o) => (
            <Tooltip key={o.id} content={o.label}>
              <Text size="1" color="gray">
                <span
                  aria-hidden
                  style={{
                    ...ONTOLOGY_DOT_STYLE,
                    background: ONTOLOGY_COLORS[o.id],
                  }}
                />
                {o.id}
              </Text>
            </Tooltip>
          ))}
        </Flex>
      )}
    </Flex>
  );
}

// Padding grows the touch target; the negative margin cancels the visual shift.
const TOGGLE_BUTTON_STYLE = {
  background: "none",
  border: "none",
  padding: "6px 4px",
  margin: "-6px -4px",
  font: "inherit",
  color: "var(--accent-11)",
  cursor: "pointer",
} as const;

const SYNONYM_LINK_STYLE = {
  color: "var(--accent-11)",
  textDecorationLine: "none",
} as const;

const ONTOLOGY_DOT_STYLE = {
  display: "inline-block",
  width: "6px",
  height: "6px",
  borderRadius: "9999px",
  marginRight: "4px",
  verticalAlign: "middle",
} as const;
