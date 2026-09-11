"use client";

import AccessionLink from "@/components/accession-link";
import {
  Availability,
  CollectionTable,
  FacetSelect,
  Stat,
  TagList,
  orderedFacetKeys,
  useSortFilterState,
  type ColumnDef,
} from "@/components/collection-card/shared";
import { humanize } from "@/utils/format";
import type { DiseaseFacetValue, SingleCellProject } from "@/utils/useStats";
import {
  useSingleCellFacets,
  useSingleCellProjects,
  useSingleCellSummary,
} from "@/utils/useStats";
import { Badge, Flex, Text } from "@radix-ui/themes";
import { useMemo } from "react";

const NO_ROWS: SingleCellProject[] = [];
const NO_FACETS: Record<string, DiseaseFacetValue[]> = {};

// Facet order on the page; the API returns them alphabetically.
const FACET_ORDER = [
  "modality",
  "cell_or_nucleus",
  "perturbation_method",
  "intervention_kind",
  "chemistry",
  "organism",
  "tissue",
  "assay_l1",
  "year",
  "has_matrix",
  "has_fastq",
  "is_long_read",
];

const FACET_LABELS: Record<string, string> = {
  modality: "modality",
  cell_or_nucleus: "cell / nucleus",
  perturbation_method: "perturbation method",
  intervention_kind: "intervention",
  chemistry: "chemistry",
  organism: "organism",
  tissue: "tissue",
  assay_l1: "assay",
  year: "year",
  has_matrix: "has matrix",
  has_fastq: "has FASTQ",
  is_long_read: "long-read only",
};

const COLUMNS: ColumnDef<SingleCellProject>[] = [
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
    label: "Modality",
    info: "Declared assay type: scRNA-seq, snATAC-seq, Multiome, Spatial Transcriptomics, or Other.",
    render: (r) =>
      r.single_cell_modality ? (
        <Badge size="1" variant="soft">
          {r.single_cell_modality}
        </Badge>
      ) : (
        <Text size="1" color="gray">
          —
        </Text>
      ),
  },
  {
    label: "Cell / nucleus",
    info: "Read-derived from intron fraction and mitochondrial %, independent of chemistry. Blank when never scanned or ambiguous.",
    render: (r) => (
      <TagList
        values={r.cell_or_nucleus}
        colorFor={(v) => (v === "single-nucleus" ? "purple" : "cyan")}
        labelFor={(v) => (v === "single-nucleus" ? "nucleus" : "cell")}
      />
    ),
  },
  {
    label: "Perturbation",
    info: "A named perturbation method (Perturb-seq, CROP-seq, ECCITE-seq, Mosaic-seq, sci-Plex) detected in the study's own title/description. This is a detected mention, not a confirmed experimental design; blank means no named method was detected, not that the study has none.",
    render: (r) => (
      <TagList values={r.perturbation_method} colorFor={() => "crimson"} />
    ),
  },
  {
    label: "Chemistry",
    info: "Read-derived barcode chemistry (10x Chromium 3'/5' v1-v4).",
    render: (r) => <TagList values={r.chemistries} color="gray" />,
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
    label: "Tissue",
    info: "Tissues profiled across this study's samples.",
    render: (r) => <TagList values={r.tissues} color="gray" />,
  },
  {
    label: "Samples",
    sort: "n_samples",
    align: "right",
    info: "Samples in the study.",
    render: (r) => (r.n_samples != null ? humanize(r.n_samples) : "—"),
  },
  {
    label: "Matrix",
    info: "Whether a counted matrix exists, with cell count when known (unfiltered/raw-barcode counts are excluded, not real cell counts).",
    render: (r) =>
      r.has_matrix ? (
        <Badge size="1" color="green" variant="soft">
          yes{r.n_cells ? ` (${humanize(r.n_cells)} cells)` : ""}
        </Badge>
      ) : (
        <Badge size="1" color="gray" variant="soft">
          no
        </Badge>
      ),
  },
  {
    label: "FASTQ",
    info: "Raw FASTQ availability and run count. Blank means unknown.",
    render: (r) => <Availability have={r.has_fastq} runs={r.n_fastq_runs} />,
  },
  {
    label: ".sra",
    info: "SRA/SRAlite availability. Blank means unknown.",
    render: (r) => <Availability have={r.has_sra} runs={r.n_runs} />,
  },
  {
    label: "Long-read",
    info: "Whether the study also has a PacBio or Oxford Nanopore experiment (e.g. long-read single-cell isoform sequencing).",
    render: (r) =>
      r.is_long_read ? (
        <Badge size="1" variant="soft" color="orange">
          long-read
        </Badge>
      ) : (
        <Text size="1" color="gray">
          —
        </Text>
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

export default function SingleCellCollectionCard() {
  const { filters, sort, toggleSort, setFilter } = useSortFilterState({
    key: "n_samples",
    order: "desc",
  });

  const summary = useSingleCellSummary();
  const facets = useSingleCellFacets();
  const projects = useSingleCellProjects(filters, sort);

  const rows = projects.data?.results ?? NO_ROWS;
  const total = projects.data?.total ?? 0;
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
          <Stat label="With matrix" value={humanize(s.studies_with_matrix)} />
          <Stat label="With FASTQ" value={humanize(s.studies_with_fastq)} />
          <Stat label="Also long-read" value={humanize(s.studies_long_read)} />
          <Stat
            label="Perturbation detected"
            value={humanize(s.studies_with_perturbation)}
          />
          <Stat label="Human" value={humanize(s.studies_human)} />
          <Stat label="Samples" value={humanize(s.samples ?? 0)} />
          <Stat label="Cells (filtered)" value={humanize(s.cells ?? 0)} />
        </Flex>
      ) : null}

      <Flex gap="4" wrap="wrap" align="center">
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
        isFetching={projects.isFetching}
        sort={sort}
        toggleSort={toggleSort}
      />
    </Flex>
  );
}
