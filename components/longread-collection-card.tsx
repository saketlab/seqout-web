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
import type { DiseaseFacetValue, LongReadProject } from "@/utils/useStats";
import {
  useLongReadFacets,
  useLongReadProjects,
  useLongReadSummary,
} from "@/utils/useStats";
import { Badge, Flex, Text } from "@radix-ui/themes";
import { useMemo } from "react";

const NO_ROWS: LongReadProject[] = [];
const NO_FACETS: Record<string, DiseaseFacetValue[]> = {};

// Facet order on the page; the API returns them alphabetically.
const FACET_ORDER = [
  "technology",
  "platform",
  "instrument_model",
  "library_strategy",
  "organism",
  "archive",
  "chemistry",
  "has_exact_chemistry",
  "assay_l1",
  "year",
  "long_read_only",
];

const FACET_LABELS: Record<string, string> = {
  technology: "technology",
  platform: "platform",
  instrument_model: "instrument",
  library_strategy: "strategy",
  organism: "organism",
  archive: "archive",
  chemistry: "chemistry",
  has_exact_chemistry: "exact chemistry only",
  assay_l1: "assay",
  year: "year",
  long_read_only: "long-read only",
};

function Technology({ values }: { values: string[] }) {
  return (
    <Flex gap="1" wrap="wrap">
      {values.map((v) => (
        <Badge
          key={v}
          size="1"
          variant="soft"
          color={v === "PacBio" ? "orange" : "teal"}
        >
          {v}
        </Badge>
      ))}
    </Flex>
  );
}

const COLUMNS: ColumnDef<LongReadProject>[] = [
  {
    label: "Study",
    sort: "study_accession",
    info: "Link to the full accession record. Mirrors in other archives are folded into this row.",
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
    label: "Technology",
    info: "PacBio, Oxford Nanopore, or both.",
    render: (r) => <Technology values={r.technologies} />,
  },
  {
    label: "Instruments",
    info: "Instrument models the long-read experiments name.",
    render: (r) => <TagList values={r.instrument_models} />,
  },
  {
    label: "Chemistry",
    info: "Sequencing chemistry per run: exact when read from the submitted BAM's own header, otherwise a model/date guess.",
    render: (r) => (
      <Flex align="center" gap="1" wrap="wrap">
        <TagList values={r.chemistries} color="gray" />
        {(r.n_chemistry_exact ?? 0) > 0 && (
          <Badge size="1" color="purple" variant="soft">
            {r.n_chemistry_exact} exact
          </Badge>
        )}
      </Flex>
    ),
  },
  {
    label: "Strategy",
    info: "Library strategies of the long-read experiments.",
    render: (r) => <TagList values={r.library_strategies} color="gray" />,
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
    label: "Long-read exp.",
    sort: "n_experiments",
    align: "right",
    info: "Long-read experiments, with the study's experiment total after the slash when it also used other platforms.",
    render: (r) => (
      <>
        {humanize(r.n_experiments)}
        {r.n_experiments_total != null &&
        r.n_experiments_total !== r.n_experiments ? (
          <Text size="1" color="gray">
            {" "}
            / {humanize(r.n_experiments_total)}
          </Text>
        ) : null}
      </>
    ),
  },
  {
    label: "Hybrid",
    info: "Whether the study also sequenced on a short-read platform. Blank when there are no experiment rows to compare.",
    render: (r) =>
      r.long_read_only == null ? (
        <Text size="1" color="gray">
          —
        </Text>
      ) : r.long_read_only ? (
        <Badge size="1" variant="soft" color="gray">
          long-read only
        </Badge>
      ) : (
        <Badge size="1" variant="soft" color="violet">
          hybrid
        </Badge>
      ),
  },
  {
    label: "Samples",
    sort: "n_samples",
    align: "right",
    info: "Samples in the study. Blank when the study is not in the unified catalogue.",
    render: (r) => (r.n_samples != null ? humanize(r.n_samples) : "—"),
  },
  {
    label: "Runs",
    sort: "n_runs",
    align: "right",
    info: "Runs in the download-links table, any platform.",
    render: (r) => (r.n_runs != null ? humanize(r.n_runs) : "—"),
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
    label: "Archives",
    info: "Archives the study appears in.",
    render: (r) => <TagList values={r.archives} color="gray" />,
  },
  {
    label: "Year",
    sort: "first_published",
    align: "right",
    info: "Publication year of the study record.",
    render: (r) => r.year ?? "—",
  },
];

export default function LongReadCollectionCard() {
  const { filters, sort, toggleSort, setFilter } = useSortFilterState({
    key: "n_experiments",
    order: "desc",
  });

  const summary = useLongReadSummary();
  const facets = useLongReadFacets();
  const projects = useLongReadProjects(filters, sort);

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
          <Stat label="PacBio" value={humanize(s.studies_pacbio)} />
          <Stat label="Oxford Nanopore" value={humanize(s.studies_nanopore)} />
          <Stat label="Both" value={humanize(s.studies_both)} />
          <Stat
            label="Hybrid with short reads"
            value={humanize(s.studies_hybrid)}
          />
          <Stat label="Human" value={humanize(s.studies_human)} />
          <Stat label="With FASTQ" value={humanize(s.studies_with_fastq)} />
          <Stat
            label="Exact chemistry"
            value={humanize(s.studies_exact_chemistry)}
          />
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
