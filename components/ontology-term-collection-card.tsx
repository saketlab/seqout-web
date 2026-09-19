"use client";

import AccessionLink from "@/components/accession-link";
import {
  Availability,
  CollectionTable,
  FacetSelect,
  SearchFilter,
  Stat,
  orderedFacetKeys,
  useSortFilterState,
  type ColumnDef,
} from "@/components/collection-card/shared";
import { humanize } from "@/utils/format";
import { ONTOLOGY_KINDS, type OntologyKind } from "@/utils/ontology-kinds";
import {
  useCollectionFacets,
  useOntologyTermProjects,
  useOntologyTermSummary,
  type DiseaseFacets,
  type OntologyTermProject as Row,
} from "@/utils/useStats";
import { Badge, Callout, Flex, Text } from "@radix-ui/themes";
import { useMemo } from "react";

const NO_ROWS: Row[] = [];
const NO_FACETS: DiseaseFacets = {};

// API returns facets alphabetically; "year" is omitted because the backend has no filter for it
const FACET_ORDER = [
  "source",
  "organism",
  "assay_l1",
  "journal",
  "country",
  "has_fastq",
  "has_sra",
  "is_single_cell",
  "is_long_read",
];

const FACET_LABELS: Record<string, string> = {
  source: "archive",
  organism: "organism",
  assay_l1: "assay",
  journal: "journal",
  country: "country",
  has_fastq: "has FASTQ",
  has_sra: "has .sra",
  is_single_cell: "single-cell",
  is_long_read: "long-read",
};

function matchedSamples(r: Row): number | null {
  return r.n_samples_with_tissue ?? r.n_samples_with_disease ?? null;
}

// "disease-term" avoids colliding with the curated collection hooks' cache keys
const KIND_META: Record<OntologyKind, { keyPrefix: string; matchedLabel: string }> = {
  tissue: { keyPrefix: "tissue", matchedLabel: "Any tissue" },
  disease: { keyPrefix: "disease-term", matchedLabel: "Any disease" },
};

function columns(kind: OntologyKind): ColumnDef<Row>[] {
  return [
    {
      label: "Study",
      sort: "study_accession",
      info: "Link to the full accession record.",
      render: (r) => <AccessionLink accession={r.study_accession} hideExternal />,
    },
    {
      label: "Title",
      sort: "title",
      info: "Study title.",
      render: (r) => (
        <Text size="1" title={r.title ?? undefined}>
          {r.title ?? "—"}
        </Text>
      ),
    },
    {
      label: "Archive",
      render: (r) => (
        <Badge size="1" variant="soft" color="gray">
          {r.source}
        </Badge>
      ),
      info: "Archive the study is submitted to.",
    },
    {
      label: "Organism",
      sort: "organism",
      info: "Dominant organism.",
      render: (r) => <Text size="1">{r.organism ?? "—"}</Text>,
    },
    {
      label: "Assay",
      info: "Assay category.",
      render: (r) => <Text size="1">{r.assay_l1 ?? "—"}</Text>,
    },
    {
      label: "Journal",
      info: "Publication journal.",
      render: (r) => (
        <Text size="1" color="gray">
          {r.journal ?? "—"}
        </Text>
      ),
    },
    {
      label: "Samples",
      sort: "n_samples",
      align: "right",
      info: "Samples in the study.",
      render: (r) => (r.n_samples != null ? humanize(r.n_samples) : "—"),
    },
    {
      label: KIND_META[kind].matchedLabel,
      align: "right",
      info: `Samples in this study with a resolved ${kind}. The Matched samples stat above counts those matching this term.`,
      render: (r) => {
        const n = matchedSamples(r);
        return n != null ? humanize(n) : "—";
      },
    },
    {
      label: "FASTQ",
      info: "Raw FASTQ availability and run count. Blank means unknown.",
      render: (r) => <Availability have={r.has_fastq} runs={r.n_fastq_runs} />,
    },
    {
      label: ".sra",
      info: "SRA/SRAlite availability and run count. Blank means unknown.",
      render: (r) => <Availability have={r.has_sra} runs={r.n_sra_runs} />,
    },
    {
      label: "Single-cell",
      info: "Whether the study has single-cell evidence.",
      render: (r) =>
        r.is_single_cell ? (
          <Badge size="1" variant="soft" color="teal">
            {r.single_cell_modality ?? "yes"}
          </Badge>
        ) : (
          <Text size="1" color="gray">
            —
          </Text>
        ),
    },
    {
      label: "Long-read",
      info: "Whether the study also has a PacBio or Oxford Nanopore experiment.",
      render: (r) =>
        r.is_long_read ? (
          <Badge size="1" variant="soft" color="orange">
            yes
          </Badge>
        ) : (
          <Text size="1" color="gray">
            —
          </Text>
        ),
    },
    {
      label: "Date",
      sort: "pub_date",
      align: "right",
      info: "Publication date of the study record.",
      render: (r) => r.pub_date ?? "—",
    },
  ];
}

function noMatchText(kind: OntologyKind, term: string): string {
  const hint =
    kind === "disease"
      ? ", or see /disease/rare and /disease/nord for the curated rare-disease catalogues"
      : "";
  return `"${term}" doesn't match any ${ONTOLOGY_KINDS[kind].ontology} ${kind} term. Try a broader or differently spelled term${hint}.`;
}

export default function OntologyTermCollectionCard({
  term,
  kind,
}: {
  term: string;
  kind: OntologyKind;
}) {
  const basePath = `/${kind}/${encodeURIComponent(term)}`;
  const keyPrefix = `${KIND_META[kind].keyPrefix}-${term}`;

  const { filters, sort, toggleSort, setFilter } = useSortFilterState({
    key: "pub_date",
    order: "desc",
  });

  const summary = useOntologyTermSummary(basePath, keyPrefix);
  const facets = useCollectionFacets(basePath, keyPrefix);
  const projects = useOntologyTermProjects<Row>(basePath, keyPrefix, filters, sort);

  const rows = useMemo(
    () => projects.data?.pages.flatMap((p) => p.results) ?? NO_ROWS,
    [projects.data],
  );
  const total = projects.data?.pages[0]?.total ?? 0;
  const facetData = facets.data ?? NO_FACETS;
  const facetKeys = useMemo(
    () => orderedFacetKeys(facetData, FACET_ORDER),
    [facetData],
  );
  const columnDefs = useMemo(() => columns(kind), [kind]);

  const s = summary.data;

  if (s === null) {
    return (
      <Callout.Root color="gray" my="5">
        <Callout.Text>{noMatchText(kind, term)}</Callout.Text>
      </Callout.Root>
    );
  }

  return (
    <Flex direction="column" gap="3" py="5">
      {s && (
        <>
          <Flex gap="3" wrap="wrap">
            <Stat label="Studies" value={humanize(s.studies)} />
            <Stat label="Samples" value={humanize(s.samples ?? 0)} />
            <Stat label="Matched samples" value={humanize(s.matched_samples ?? 0)} />
            <Stat label="With FASTQ" value={humanize(s.studies_with_fastq)} />
            <Stat label="Single-cell" value={humanize(s.studies_single_cell)} />
            <Stat label="Long-read" value={humanize(s.studies_long_read)} />
            <Stat label="Organisms" value={humanize(s.n_organisms)} />
          </Flex>
          {s.resolution === "substring" && (
            <Text size="1" color="gray">
              Matched via: {s.matched_labels.join(", ")}
            </Text>
          )}
        </>
      )}

      <Flex gap="4" wrap="wrap" align="center">
        <SearchFilter
          value={filters.q ?? null}
          onChange={(v) => setFilter("q", v)}
        />
        {facetKeys.map((facet) => (
          <FacetSelect
            key={facet}
            label={FACET_LABELS[facet] ?? facet.replaceAll("_", " ")}
            value={filters[facet] ?? null}
            onChange={(v) => setFilter(facet, v)}
            options={facetData[facet]}
          />
        ))}
      </Flex>

      <CollectionTable
        columns={columnDefs}
        rows={rows}
        total={total}
        isFetching={projects.isFetching && !projects.isFetchingNextPage}
        sort={sort}
        toggleSort={toggleSort}
        hasMore={projects.hasNextPage}
        isFetchingMore={projects.isFetchingNextPage}
        onLoadMore={() => projects.fetchNextPage()}
      />
    </Flex>
  );
}
