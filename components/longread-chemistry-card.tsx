"use client";
import { getJson } from "@/utils/api";
import { Badge, Flex, Spinner, Table, Text } from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";

export interface LongReadChemistryRun {
  run_accession: string;
  study_accession: string;
  instrument_platform: string | null;
  instrument_model: string | null;
  chemistry: string | null;
  chemistry_confidence: string | null;
  chemistry_source: string | null;
  basecaller_software: string | null;
  basecaller_software_version: string | null;
  flow_cell_id: string | null;
  ont_pore: string | null;
  ont_kit: string | null;
  ont_speed_bps: string | null;
  ont_model_tier: string | null;
  pacbio_platform_model: string | null;
  pacbio_chemistry_code: string | null;
  pacbio_binding_kit: string | null;
  pacbio_sequencing_kit: string | null;
  pacbio_smrtcell_kit: string | null;
}

interface LongReadChemistryResponse {
  accession: string;
  runs: LongReadChemistryRun[];
}

const CONFIDENCE_COLOR: Record<string, "green" | "blue" | "amber" | "gray"> = {
  exact: "green",
  declared: "blue",
  bucket: "amber",
  unknown: "gray",
};

export function useLongReadChemistry(accession: string) {
  return useQuery({
    queryKey: ["longread-chemistry", accession],
    queryFn: ({ signal }) =>
      getJson<LongReadChemistryResponse>(
        `/project/${encodeURIComponent(accession)}/longread-chemistry`,
        signal,
      ),
    staleTime: 5 * 60 * 1000,
  });
}

export default function LongReadChemistryCard({
  accession,
}: {
  accession: string;
}) {
  const { data, isLoading, isError } = useLongReadChemistry(accession);

  if (isLoading) return <Spinner />;
  if (isError || !data || data.runs.length === 0) return null;

  return (
    <Flex direction="column" gap="3">
      <Text size="2" color="gray">
        {data.runs.length} PacBio/Oxford Nanopore run
        {data.runs.length === 1 ? "" : "s"} in this study.
      </Text>
      <Table.Root variant="surface" size="1">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Run</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Instrument</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Chemistry</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Confidence</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {data.runs.map((r) => (
            <Table.Row key={r.run_accession}>
              <Table.Cell>{r.run_accession}</Table.Cell>
              <Table.Cell>{r.instrument_model ?? "—"}</Table.Cell>
              <Table.Cell>{r.chemistry ?? "unresolved"}</Table.Cell>
              <Table.Cell>
                <Badge
                  color={CONFIDENCE_COLOR[r.chemistry_confidence ?? "unknown"] ?? "gray"}
                  size="1"
                  variant="soft"
                >
                  {r.chemistry_confidence ?? "unknown"}
                </Badge>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Flex>
  );
}
