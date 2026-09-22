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
  type BadgeColor,
  type ColumnDef,
} from "@/components/collection-card/shared";
import { humanize } from "@/utils/format";
import type {
  DataAvailability,
  DiseaseFacetValue,
  DiseaseFilters,
  DiseaseSort,
  SpatialProject,
  SpatialResolution,
  SpatialTechnology,
} from "@/utils/useStats";
import {
  useSpatialFacets,
  useSpatialProjects,
  useSpatialSummary,
} from "@/utils/useStats";
import { Badge, Flex, Text } from "@radix-ui/themes";
import { useMemo } from "react";

function BadgeOrDash({
  value,
  color,
}: {
  value: string | null;
  color: BadgeColor;
}) {
  return value ? (
    <Badge size="1" variant="soft" color={color}>
      {value}
    </Badge>
  ) : (
    <Text size="1" color="gray">
      —
    </Text>
  );
}

const NO_ROWS: SpatialProject[] = [];
const NO_FACETS: Record<string, DiseaseFacetValue[]> = {};
const DEFAULT_SORT: DiseaseSort = { key: "year", order: "desc" };
const DEFAULT_FILTERS: DiseaseFilters = {};

const FACET_ORDER = [
  "platform",
  "resolution",
  "technology",
  "data_availability",
  "organism",
  "tissue",
  "readout_assay",
  "cell_line",
  "sample_type",
  "year",
];

const FACET_LABELS: Record<string, string> = {
  data_availability: "data",
  cell_line: "cell line",
  sample_type: "sample type",
  readout_assay: "readout",
};

const RESOLUTION_COLOR: Record<SpatialResolution, BadgeColor> = {
  "single-cell": "violet",
  spot: "cyan",
  roi: "amber",
};

const TECHNOLOGY_COLOR: Record<SpatialTechnology, BadgeColor> = {
  imaging: "grass",
  sequencing: "blue",
  hybrid: "orange",
};

const AVAILABILITY: Record<
  DataAvailability,
  { label: string; color: BadgeColor }
> = {
  both: { label: "matrix + FASTQ", color: "green" },
  matrix_only: { label: "matrix only", color: "blue" },
  fastq_only: { label: "FASTQ only", color: "cyan" },
  neither: { label: "neither", color: "gray" },
};

const COLUMNS: ColumnDef<SpatialProject>[] = [
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
    label: "Platform",
    info: "Platform name(s) found in the study's own title, summary or abstract (Visium, Xenium, MERFISH, and so on). Often blank, for studies that only say \"spatial transcriptomics\" generically. A named platform reflects a text mention, e.g. a comparison paper naming a platform it did not run.",
    render: (r) => <TagList values={r.platforms} color="crimson" />,
  },
  {
    label: "Resolution",
    info: "Single-cell (imaging-based: Xenium, MERFISH, CosMx, and similar), spot (coarser than single-cell: Visium, Slide-seq, and similar), or roi (GeoMx DSP, region-of-interest, not single-cell resolution). Blank when no platform was named.",
    render: (r) => (
      <BadgeOrDash
        value={r.resolution}
        color={r.resolution ? RESOLUTION_COLOR[r.resolution] : "gray"}
      />
    ),
  },
  {
    label: "Technology",
    info: "Imaging (FISH/probe hybridization, read out by microscopy), sequencing (NGS readout), or hybrid (GeoMx DSP: optical ROI selection, sequencing/nCounter readout). Tracks resolution one-to-one today but is a separate classification. Blank when no platform was named.",
    render: (r) => (
      <BadgeOrDash
        value={r.technology}
        color={r.technology ? TECHNOLOGY_COLOR[r.technology] : "gray"}
      />
    ),
  },
  {
    label: "Readout",
    info: "Sample-level assay categories recorded in the study.",
    render: (r) => <TagList values={r.readout_assays} color="gray" />,
  },
  {
    label: "Organism",
    sort: "organism",
    info: "Dominant organism; the badge count shows how many the study spans.",
    render: (r) => (
      <Flex align="center" gap="1" wrap="wrap">
        <Text size="1">{r.organism ?? "—"}</Text>
        {r.organisms && r.organisms.length > 1 ? (
          <Badge size="1" color="gray" variant="soft">
            +{r.organisms.length - 1}
          </Badge>
        ) : null}
      </Flex>
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
    label: "Data",
    info: "Whether a counted matrix, raw FASTQ, both or neither is available.",
    render: (r) => {
      const a = AVAILABILITY[r.data_availability];
      return (
        <Badge size="1" variant="soft" color={a.color}>
          {a.label}
        </Badge>
      );
    },
  },
  {
    label: "Cells",
    sort: "n_cells",
    align: "right",
    info: "Cells in the counted matrix when known.",
    render: (r) => (r.n_cells != null ? humanize(r.n_cells) : "—"),
  },
  {
    label: "FASTQ",
    info: "Raw FASTQ availability and run count. Blank means unknown.",
    render: (r) => <Availability have={r.has_fastq} runs={r.n_fastq_runs} />,
  },
  {
    label: "Long-read",
    info: "Whether the study also has a PacBio or Oxford Nanopore experiment.",
    render: (r) => (
      <BadgeOrDash value={r.is_long_read ? "long-read" : null} color="orange" />
    ),
  },
  {
    label: "Year",
    sort: "year",
    align: "right",
    info: "Publication year of the study record.",
    render: (r) => r.year ?? "—",
  },
];

export default function SpatialCollectionCard() {
  const { filters, sort, toggleSort, setFilter } = useSortFilterState(
    DEFAULT_SORT,
    DEFAULT_FILTERS,
  );

  const summary = useSpatialSummary();
  const facets = useSpatialFacets();
  const projects = useSpatialProjects(filters, sort);

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
          <Stat
            label="Named platform"
            value={humanize(s.studies_named_platform)}
          />
          <Stat
            label="Single-cell resolution"
            value={humanize(s.studies_single_cell_res)}
          />
          <Stat label="Spot resolution" value={humanize(s.studies_spot_res)} />
          <Stat label="ROI (GeoMx)" value={humanize(s.studies_roi_res)} />
          <Stat
            label="Matrix + FASTQ"
            value={humanize(s.studies_matrix_and_fastq)}
          />
          <Stat label="With matrix" value={humanize(s.studies_with_matrix)} />
          <Stat label="Human" value={humanize(s.studies_human)} />
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
