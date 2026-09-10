"use client";

// Navbar dialog showing the synonyms used for each search term. Fetches data when opened.

import OntologySettingsButton from "@/components/ontology-settings-button";
import {
  TermExpansionLearnMore,
  WaypointsIcon,
} from "@/components/term-expansion-control";
import { getSearchExpansion } from "@/utils/api";
import {
  EXPANSION_PARAM,
  ONTOLOGIES,
  ONTOLOGY_PARAM,
  disabledOntologies,
  expansionDisabled,
  sameOntologies,
  writeDisabledOntologies,
  writeExpansionPreference,
} from "@/utils/termExpansion";
import {
  Button,
  Card,
  Dialog,
  Flex,
  IconButton,
  Link,
  Select,
  Separator,
  Spinner,
  Switch,
  Text,
  Tooltip,
} from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

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
      <Tooltip content="Term expansions">
        <Dialog.Trigger>
          <IconButton variant="surface" size="3" aria-label="Term expansions">
            <WaypointsIcon />
          </IconButton>
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
