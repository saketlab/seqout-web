"use client";

import AccessionLink from "@/components/accession-link";
import { humanize } from "@/utils/format";
import type {
  DiseaseFacets,
  DiseaseFacetValue,
  DiseaseFilters,
  DiseaseProject,
  DiseaseScope,
  DiseaseSort,
} from "@/utils/useStats";
import { useDiseaseFacets, useDiseaseProjects } from "@/utils/useStats";
import {
  Badge,
  Box,
  Flex,
  Popover,
  Select,
  Table,
  Text,
} from "@radix-ui/themes";
import type { ReactNode } from "react";
import { useState } from "react";

const ALL = "__all__";
const NO_ROWS: DiseaseProject[] = [];
const NO_FACETS: DiseaseFacets = {};

const SCOPES: { value: DiseaseScope; label: string }[] = [
  { value: "human_primary", label: "Human primary" },
  { value: "patient_derived_model", label: "Patient-derived model" },
  { value: "cell_line", label: "Cell line" },
  { value: "all", label: "Everything" },
];

const MAX_OPTIONS = 30;

function SexCell({
  male,
  female,
  missing,
}: {
  male: number;
  female: number;
  missing?: number;
}) {
  if (!male && !female && !missing) {
    return (
      <Text size="1" color="gray">
        —
      </Text>
    );
  }
  return (
    <Text size="1">
      {male}M / {female}F
      {missing ? (
        <Text size="1" color="gray">
          {" "}
          ({missing} unstated)
        </Text>
      ) : null}
    </Text>
  );
}

const TAG_PREVIEW = 2;

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
    // null and [] share the placeholder; the column tooltip distinguishes them.
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

const COLUMNS: {
  label: string;
  render: (r: DiseaseProject) => ReactNode;
  info: string;
  sort?: string;
  align?: "right";
}[] = [
  {
    label: "Study",
    sort: "study_accession",
    info: "Link to the full accession record.",
    render: (r) => <AccessionLink accession={r.study_accession} hideExternal />,
  },
  {
    label: "Title",
    sort: "title",
    info: "Study Title.",
    render: (r) => (
      <Text size="1" title={r.title ?? undefined}>
        {r.title ?? "—"}
      </Text>
    ),
  },
  {
    label: "Disease",
    info: "MONDO terms for this study's samples.",
    render: (r) => <TagList values={r.diseases} />,
  },
  {
    label: "MONDO",
    info: "Ontology ids corresponding to the Disease column.",
    render: (r) => <TagList values={r.mondo_ids} color="gray" />,
  },
  {
    label: "Rare disease",
    info: "Ancestors of the MONDO ids that are catalogue entries.",
    render: (r) => <TagList values={r.catalogue_diseases} />,
  },
  {
    label: "Disease parents",
    info: "Ancestors the enrichment stored per sample, catalogued or not.",
    render: (r) => <TagList values={r.ancestors} />,
  },
  {
    label: "Reported ancestry",
    info: "Ancestry or ethnicity as stated in the sample metadata.",
    render: (r) => <TagList values={r.ancestries} />,
  },
  {
    label: "Inheritance",
    info: "Mode of inheritance from HPO, Orphanet and GARD.",
    render: (r) => <TagList values={r.inheritance} />,
  },
  {
    label: "Samples",
    sort: "n_samples",
    align: "right",
    info: "Samples in scope, with the study total after the slash.",
    render: (r) => (
      <>
        {humanize(r.n_samples_in_scope)}
        {r.n_samples_in_scope !== r.n_samples ? (
          <Text size="1" color="gray">
            {" "}
            / {humanize(r.n_samples)}
          </Text>
        ) : null}
      </>
    ),
  },
  {
    label: "Cells",
    sort: "cells",
    align: "right",
    info: "Cells counted across the samples. Blank means unmeasured.",
    render: (r) => (r.cells ? humanize(r.cells) : "—"),
  },
  {
    label: "Assay",
    sort: "assay_category",
    info: "Assay category these samples fall into.",
    render: (r) => <Text size="1">{r.assay_category ?? "—"}</Text>,
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
    label: "Sex (stated)",
    info: "Sex as stated in the sample metadata; the rest are unstated.",
    render: (r) => (
      <SexCell
        male={r.stated_male}
        female={r.stated_female}
        missing={r.stated_missing}
      />
    ),
  },
  {
    label: "Sex (reads)",
    info: "Sex called from the reads by preflightx, not from metadata.",
    render: (r) => <SexCell male={r.reads_male} female={r.reads_female} />,
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

export default function DiseaseCollectionCard({
  collection,
}: {
  collection: string;
}) {
  const [filters, setFilters] = useState<DiseaseFilters>({});
  const [sort, setSort] = useState<DiseaseSort>({
    key: "cells",
    order: "desc",
  });
  const [scope, setScope] = useState<DiseaseScope>("human_primary");

  const facets = useDiseaseFacets(collection);
  const projects = useDiseaseProjects(collection, filters, sort, scope);

  const rows = projects.data?.results ?? NO_ROWS;
  const total = projects.data?.total ?? 0;

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

  return (
    <Flex direction="column" gap="3" py="5">
      <Flex gap="4" wrap="wrap" align="center">
        <Flex align="center" gap="2">
          <Text size="1" color="gray">
            scope
          </Text>
          <Select.Root
            value={scope}
            onValueChange={(v) => setScope(v as DiseaseScope)}
            size="1"
          >
            <Select.Trigger />
            <Select.Content>
              {SCOPES.map((o) => (
                <Select.Item key={o.value} value={o.value}>
                  {o.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Flex>
        {Object.entries(facets.data ?? NO_FACETS).map(([facet, options]) => (
          <FacetSelect
            key={facet}
            label={facet.replaceAll("_", " ")}
            value={filters[facet] ?? null}
            onChange={(v) => setFilter(facet, v)}
            options={options}
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
