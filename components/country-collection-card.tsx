"use client";

import AccessionLink from "@/components/accession-link";
import {
  Availability,
  CollectionTable,
  FacetSelect,
  SearchFilter,
  Stat,
  TagList,
  orderedFacetKeys,
  useSortFilterState,
  type ColumnDef,
} from "@/components/collection-card/shared";
import { humanize } from "@/utils/format";
import type { CountryProject, DiseaseFacetValue } from "@/utils/useStats";
import {
  useCountryFacets,
  useCountryProjects,
  useCountrySummary,
} from "@/utils/useStats";
import { Badge, Flex, Text } from "@radix-ui/themes";
import { useMemo } from "react";

const NO_ROWS: CountryProject[] = [];
const NO_FACETS: Record<string, DiseaseFacetValue[]> = {};

// Facet order on the page; the API returns them alphabetically.
const FACET_ORDER = [
  "source",
  "organism",
  "assay_l1",
  "year",
  "has_fastq",
  "has_sra",
  "is_single_cell",
  "has_matrix",
  "has_long_read",
];

const FACET_LABELS: Record<string, string> = {
  source: "archive",
  organism: "organism",
  assay_l1: "assay",
  year: "year",
  has_fastq: "has FASTQ",
  has_sra: "has .sra",
  is_single_cell: "single-cell",
  has_matrix: "has matrix",
  has_long_read: "long-read",
};

const COLUMNS: ColumnDef<CountryProject>[] = [
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
    label: "Single-cell",
    info: "Whether the study has single-cell evidence, with matrix availability and cell count when known.",
    render: (r) =>
      r.is_single_cell ? (
        <Flex align="center" gap="1" wrap="wrap">
          <Badge size="1" variant="soft" color="teal">
            {r.single_cell_modality ?? "yes"}
          </Badge>
          {r.has_matrix ? (
            <Badge size="1" variant="soft" color="green">
              matrix{r.n_cells ? ` (${humanize(r.n_cells)})` : ""}
            </Badge>
          ) : null}
        </Flex>
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
      r.has_long_read ? (
        <TagList values={r.technologies} colorFor={(v) => (v === "PacBio" ? "orange" : "teal")} />
      ) : (
        <Text size="1" color="gray">
          —
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
    label: "Year",
    sort: "year",
    align: "right",
    info: "Publication year of the study record.",
    render: (r) => r.year ?? "—",
  },
];

export default function CountryCollectionCard({ code }: { code: string }) {
  const { filters, sort, toggleSort, setFilter } = useSortFilterState({
    key: "year",
    order: "desc",
  });

  const summary = useCountrySummary(code);
  const facets = useCountryFacets(code);
  const projects = useCountryProjects(code, filters, sort);

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

  const s = summary.data;

  return (
    <Flex direction="column" gap="3" py="5">
      {s ? (
        <Flex gap="3" wrap="wrap">
          <Stat label="Studies" value={humanize(s.studies)} />
          <Stat label="Samples" value={humanize(s.samples ?? 0)} />
          <Stat label="With FASTQ" value={humanize(s.studies_with_fastq)} />
          <Stat label="Single-cell" value={humanize(s.studies_single_cell)} />
          <Stat label="Long-read" value={humanize(s.studies_long_read)} />
          <Stat label="Organisms" value={humanize(s.n_organisms)} />
        </Flex>
      ) : null}

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
        columns={COLUMNS}
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
