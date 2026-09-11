"use client";

import AccessionLink from "@/components/accession-link";
import {
  Availability,
  CollectionTable,
  FacetSelect,
  TagList,
  useSortFilterState,
  type ColumnDef,
} from "@/components/collection-card/shared";
import { humanize } from "@/utils/format";
import type {
  DiseaseFacets,
  DiseaseProject,
  DiseaseScope,
} from "@/utils/useStats";
import { useDiseaseFacets, useDiseaseProjects } from "@/utils/useStats";
import { Flex, Select, Text } from "@radix-ui/themes";
import { useMemo, useState } from "react";

const NO_ROWS: DiseaseProject[] = [];
const NO_FACETS: DiseaseFacets = {};

const SCOPES: { value: DiseaseScope; label: string }[] = [
  { value: "human_primary", label: "Human primary" },
  { value: "patient_derived_model", label: "Patient-derived model" },
  { value: "cell_line", label: "Cell line" },
  { value: "all", label: "Everything" },
];

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

const COLUMNS: ColumnDef<DiseaseProject>[] = [
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

export default function DiseaseCollectionCard({
  collection,
}: {
  collection: string;
}) {
  const { filters, sort, toggleSort, setFilter } = useSortFilterState({
    key: "cells",
    order: "desc",
  });
  const [scope, setScope] = useState<DiseaseScope>("human_primary");

  const facets = useDiseaseFacets(collection);
  const projects = useDiseaseProjects(collection, filters, sort, scope);

  const rows = projects.data?.results ?? NO_ROWS;
  const total = projects.data?.total ?? 0;
  const facetEntries = useMemo(
    () => Object.entries(facets.data ?? NO_FACETS),
    [facets.data],
  );

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
        {facetEntries.map(([facet, options]) => (
          <FacetSelect
            key={facet}
            label={facet.replaceAll("_", " ")}
            value={filters[facet] ?? null}
            onChange={(v) => setFilter(facet, v)}
            options={options}
            maxOptions={30}
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
