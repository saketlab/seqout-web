"use client";

import AccessionLink from "@/components/accession-link";
import {
  Availability,
  CollectionTable,
  FacetSelect,
  SearchFilter,
  Stat,
  TagGroups,
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
  PerturbationConfidence,
  PerturbationProject,
  PerturbationType,
} from "@/utils/useStats";
import {
  usePerturbationFacets,
  usePerturbationProjects,
  usePerturbationSummary,
} from "@/utils/useStats";
import { Badge, Flex, Select, Text } from "@radix-ui/themes";
import { useMemo } from "react";

const NO_ROWS: PerturbationProject[] = [];
const NO_FACETS: Record<string, DiseaseFacetValue[]> = {};
const DEFAULT_SORT: DiseaseSort = { key: "confidence", order: "desc" };
const DEFAULT_FILTERS: DiseaseFilters = { min_confidence: "medium" };

// api returns facets alphabetically; confidence is a separate min-threshold control
const FACET_ORDER = [
  "perturbation_type",
  "genetic_subtype",
  "perturbation_method",
  "compound",
  "readout_assay",
  "cell_line",
  "data_availability",
  "organism",
  "tissue",
  "year",
];

const FACET_LABELS: Record<string, string> = {
  perturbation_type: "type",
  genetic_subtype: "genetic tool",
  perturbation_method: "method",
  cell_line: "cell line",
  data_availability: "data",
};

const CONFIDENCE_OPTIONS: { value: PerturbationConfidence; label: string }[] = [
  { value: "high", label: "High only" },
  { value: "medium", label: "High + medium" },
  { value: "low", label: "All, incl. weak evidence" },
];

const TYPE_COLOR: Record<PerturbationType, BadgeColor> = {
  genetic: "violet",
  chemical: "orange",
  both: "crimson",
  other: "gray",
};

const CONFIDENCE_COLOR: Record<PerturbationConfidence, BadgeColor> = {
  high: "green",
  medium: "amber",
  low: "gray",
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

const EVIDENCE_LABEL: Record<string, string> = {
  method_text: "named method in study text",
  guide_text: "guide RNA in study text",
  crispr_text: "CRISPR in study text",
  rnai_orf_text: "RNAi / ORF / editing in study text",
  pooled_text: "pooled or genome-scale screen wording",
  library_guide: "guide library in SRA experiments",
  library_crispr: "CRISPR/perturbation in SRA experiments",
  sample_genetic: "CRISPR/RNAi tool in sample metadata",
  design_compound: "compound in sample treatments",
  control_arm: "control arm beside the compound",
  drug_text_named: "drug/compound screen wording",
  drug_text: "drug response wording",
};

const COLUMNS: ColumnDef<PerturbationProject>[] = [
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
    label: "Type",
    info: "Genetic (CRISPR, RNAi, ORF, base/prime editing), chemical (drug or biologic), both, or other (cytokine or stimulation with a control). Germline knockout and transgenic models are not counted.",
    render: (r) => (
      <Badge size="1" variant="soft" color={TYPE_COLOR[r.perturbation_type]}>
        {r.perturbation_type}
      </Badge>
    ),
  },
  {
    label: "Confidence",
    sort: "confidence",
    info: "How strong the rule-based evidence is. High: a named method (Perturb-seq, CROP-seq, sci-Plex and so on), a guide library with screen text, or several compound treatments beside a control. Medium: corroborated by a second signal. Low: a single weak signal, expect false positives. Hover a badge for the signals that fired.",
    render: (r) => (
      <Badge
        size="1"
        variant="soft"
        color={CONFIDENCE_COLOR[r.confidence]}
        title={r.evidence.map((e) => EVIDENCE_LABEL[e] ?? e).join("; ")}
      >
        {r.confidence}
      </Badge>
    ),
  },
  {
    label: "Method",
    info: "A named perturbation method detected in the study's own title, summary or abstract (Perturb-seq, CROP-seq, ECCITE-seq, Mosaic-seq, sci-Plex and others). Blank does not mean the study has none.",
    render: (r) => <TagList values={r.perturbation_methods} color="crimson" />,
  },
  {
    label: "Genetic tool",
    info: "CRISPR knockout, CRISPRi, CRISPRa, RNAi, ORF or base/prime editing, as stated in the study text.",
    render: (r) => <TagList values={r.genetic_subtypes} color="violet" />,
  },
  {
    label: "Compounds",
    info: "Solid orange: drugs/biologics matched to ChEBI in a sample treatment value, a confirmed applied condition. Gray “title:” badges: a compound named only in the study's own title -- often what is being studied (a receptor, a resistance mechanism), not something applied to cells; this evidence alone never reaches medium/high confidence, so treat it as a lead, not a result. Both empty when the drug arms are described only in supplementary files or cell barcodes (for example sci-Plex).",
    render: (r) => (
      <TagGroups
        groups={[
          { values: r.compounds, color: "orange" },
          { values: r.title_compounds, color: "gray", prefix: "title:" },
        ]}
      />
    ),
  },
  {
    label: "Readout",
    info: "Sample-level assay categories recorded in the study, for example single-cell transcriptomics or chromatin accessibility.",
    render: (r) => <TagList values={r.readout_assays} color="gray" />,
  },
  {
    label: "Material",
    info: "Named cell lines and sample-material categories (cell line, primary tissue, organoid, xenograft, iPSC-derived and so on) from the study's own sample metadata. This describes what was sequenced, not the perturbation: a cell-line tag here says nothing about whether the perturbation was genetic or chemical.",
    render: (r) => (
      <TagGroups
        groups={[
          { values: r.cell_lines, color: "cyan" },
          { values: r.sample_types, color: "gray" },
        ]}
      />
    ),
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
    info: "Cells in the counted matrix when known. Unfiltered raw-barcode matrices are excluded.",
    render: (r) => (r.n_cells != null ? humanize(r.n_cells) : "—"),
  },
  {
    label: "FASTQ",
    info: "Raw FASTQ availability and run count. Blank means unknown.",
    render: (r) => <Availability have={r.has_fastq} runs={r.n_fastq_runs} />,
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

export default function PerturbationCollectionCard() {
  const { filters, sort, toggleSort, setFilter } = useSortFilterState(
    DEFAULT_SORT,
    DEFAULT_FILTERS,
  );

  const summary = usePerturbationSummary();
  const facets = usePerturbationFacets();
  const projects = usePerturbationProjects(filters, sort);

  const rows = useMemo(
    () => projects.data?.pages.flatMap((p) => p.results) ?? NO_ROWS,
    [projects.data],
  );
  const total = projects.data?.pages[0]?.total ?? 0;
  const facetData = facets.data ?? NO_FACETS;
  const facetKeys = useMemo(
    () =>
      orderedFacetKeys(facetData, FACET_ORDER).filter(
        (k) => k !== "confidence",
      ),
    [facetData],
  );

  const s = summary.data;

  return (
    <Flex direction="column" gap="3" py="5">
      {s ? (
        <Flex gap="3" wrap="wrap">
          <Stat
            label="Studies (high + medium)"
            value={humanize(s.studies_high_medium)}
          />
          <Stat label="High confidence" value={humanize(s.studies_high)} />
          <Stat label="Genetic" value={humanize(s.studies_genetic)} />
          <Stat label="Chemical" value={humanize(s.studies_chemical)} />
          <Stat
            label="Matrix + FASTQ"
            value={humanize(s.studies_matrix_and_fastq)}
          />
          <Stat label="With matrix" value={humanize(s.studies_with_matrix)} />
          <Stat label="With FASTQ" value={humanize(s.studies_with_fastq)} />
          <Stat label="Human" value={humanize(s.studies_human)} />
        </Flex>
      ) : null}

      <Flex gap="4" wrap="wrap" align="center">
        <SearchFilter
          value={filters.q ?? null}
          onChange={(v) => setFilter("q", v)}
        />
        <Flex align="center" gap="2">
          <Text size="1" color="gray">
            evidence
          </Text>
          <Select.Root
            value={filters.min_confidence}
            onValueChange={(v) => setFilter("min_confidence", v)}
            size={{ initial: "2", md: "1" }}
          >
            <Select.Trigger />
            <Select.Content>
              {CONFIDENCE_OPTIONS.map((o) => (
                <Select.Item key={o.value} value={o.value}>
                  {o.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Flex>
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
