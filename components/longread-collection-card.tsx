"use client";

import AccessionLink from "@/components/accession-link";
import { humanize } from "@/utils/format";
import type {
  DiseaseFacetValue,
  DiseaseFilters,
  DiseaseSort,
  LongReadProject,
} from "@/utils/useStats";
import {
  useLongReadFacets,
  useLongReadProjects,
  useLongReadSummary,
} from "@/utils/useStats";
import {
  Badge,
  Box,
  Card,
  Flex,
  Popover,
  Select,
  Table,
  Text,
} from "@radix-ui/themes";
import type { ReactNode } from "react";
import { useState } from "react";

const ALL = "__all__";
const NO_ROWS: LongReadProject[] = [];
const NO_FACETS: Record<string, DiseaseFacetValue[]> = {};
const MAX_OPTIONS = 40;
const TAG_PREVIEW = 2;

// Facet order on the page; the API returns them alphabetically.
const FACET_ORDER = [
  "technology",
  "platform",
  "instrument_model",
  "library_strategy",
  "organism",
  "archive",
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
  assay_l1: "assay",
  year: "year",
  long_read_only: "long-read only",
};

function TagList({
  values,
  color,
}: {
  values: string[] | null;
  color?: "gray";
}) {
  const [expanded, setExpanded] = useState(false);
  const list = values ?? [];
  if (list.length === 0) {
    return (
      <Text size="1" color="gray">
        —
      </Text>
    );
  }
  const hidden = list.length - TAG_PREVIEW;
  return (
    <Flex align="center" gap="1" wrap="wrap">
      {(expanded ? list : list.slice(0, TAG_PREVIEW)).map((v) => (
        <Badge key={v} size="1" variant="soft" color={color}>
          {v}
        </Badge>
      ))}
      {hidden > 0 ? (
        <Badge
          size="1"
          color="gray"
          role="button"
          tabIndex={0}
          title={expanded ? "Show fewer" : `Show all ${list.length}`}
          onClick={() => setExpanded((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setExpanded((v) => !v);
            }
          }}
          style={{ cursor: "pointer", userSelect: "none" }}
        >
          {expanded ? "show less" : `+${hidden}`}
        </Badge>
      ) : null}
    </Flex>
  );
}

function ColumnInfo({ text }: { text: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger>
        <Text
          size="1"
          color="gray"
          tabIndex={0}
          role="button"
          aria-label={text}
          style={{ cursor: "help", marginLeft: 3 }}
        >
          ⓘ
        </Text>
      </Popover.Trigger>
      <Popover.Content size="1" maxWidth="260px">
        <Text size="1">{text}</Text>
      </Popover.Content>
    </Popover.Root>
  );
}

function Availability({
  have,
  runs,
}: {
  have: boolean | null;
  runs: number | null;
}) {
  if (have == null) {
    return (
      <Text size="1" color="gray">
        —
      </Text>
    );
  }
  return have ? (
    <Badge size="1" color="green" variant="soft">
      yes{runs ? ` (${humanize(runs)})` : ""}
    </Badge>
  ) : (
    <Badge size="1" color="gray" variant="soft">
      no
    </Badge>
  );
}

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

const COLUMNS: {
  label: string;
  render: (r: LongReadProject) => ReactNode;
  info: string;
  sort?: string;
  align?: "right";
}[] = [
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
        {r.n_chemistry_exact ? (
          <Badge size="1" color="purple" variant="soft">
            {r.n_chemistry_exact} exact
          </Badge>
        ) : null}
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

function FacetSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  options: DiseaseFacetValue[];
}) {
  return (
    <Flex align="center" gap="2">
      <Text size="1" color="gray">
        {label}
      </Text>
      <Select.Root
        value={value ?? ALL}
        onValueChange={(v) => onChange(v === ALL ? null : v)}
        size="1"
      >
        <Select.Trigger />
        <Select.Content>
          <Select.Item value={ALL}>All</Select.Item>
          {options.slice(0, MAX_OPTIONS).map((o) => (
            <Select.Item key={o.value} value={o.value}>
              {o.value} ({humanize(o.studies)})
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </Flex>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Card size="1">
      <Flex direction="column" gap="1">
        <Text size="1" color="gray">
          {label}
        </Text>
        <Text size="4" weight="bold">
          {value}
        </Text>
      </Flex>
    </Card>
  );
}

export default function LongReadCollectionCard() {
  const [filters, setFilters] = useState<DiseaseFilters>({});
  const [sort, setSort] = useState<DiseaseSort>({
    key: "n_experiments",
    order: "desc",
  });

  const summary = useLongReadSummary();
  const facets = useLongReadFacets();
  const projects = useLongReadProjects(filters, sort);

  const rows = projects.data?.results ?? NO_ROWS;
  const total = projects.data?.total ?? 0;
  const facetData = facets.data ?? NO_FACETS;
  const facetKeys = [
    ...FACET_ORDER.filter((k) => k in facetData),
    ...Object.keys(facetData).filter((k) => !FACET_ORDER.includes(k)),
  ];

  const toggleSort = (key: string) =>
    setSort((s) =>
      s.key === key
        ? { key, order: s.order === "desc" ? "asc" : "desc" }
        : { key, order: "desc" },
    );

  const setFilter = (facet: string, v: string | null) =>
    setFilters((f) => {
      const next = { ...f };
      if (v) next[facet] = v;
      else delete next[facet];
      return next;
    });

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

      <Box style={{ overflowX: "auto" }}>
        <Table.Root size="1" variant="surface">
          <Table.Header>
            <Table.Row>
              {COLUMNS.map(({ label, sort: col, align, info }) => (
                <Table.ColumnHeaderCell key={label} align={align}>
                  <Text
                    size="1"
                    style={
                      col
                        ? { cursor: "pointer", userSelect: "none" }
                        : undefined
                    }
                    onClick={col ? () => toggleSort(col) : undefined}
                  >
                    {label}
                    {sort.key === col
                      ? sort.order === "desc"
                        ? " ↓"
                        : " ↑"
                      : ""}
                  </Text>
                  <ColumnInfo text={info} />
                </Table.ColumnHeaderCell>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((r) => (
              <Table.Row key={r.study_accession}>
                {COLUMNS.map((c) => (
                  <Table.Cell key={c.label} align={c.align}>
                    {c.render(r)}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
      <Text size="1" color="gray">
        {projects.isFetching
          ? "Loading…"
          : total > rows.length
            ? `Showing ${humanize(rows.length)} of ${humanize(total)} studies`
            : null}
      </Text>
    </Flex>
  );
}
