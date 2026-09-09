"use client";
import { DownloadFastqSection } from "@/components/sra-project-page";
import { getJsonOrNull } from "@/utils/api";
import { normalizeAliases } from "@/utils/project";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Callout, Flex, Link, Tabs } from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";
import React from "react";

type RunsData = React.ComponentProps<typeof DownloadFastqSection>["runsData"];

/** Where a study came from, when it wasn't a declared cross-reference. */
function ViaPmidNote({ accession, pmid }: { accession: string; pmid: string }) {
  return (
    <Callout.Root color="orange" size="1" mb="3">
      <Callout.Icon>
        <InfoCircledIcon />
      </Callout.Icon>
      <Callout.Text>
        FASTQ files fetched from{" "}
        <Link href={`/p/${accession}`} target="_blank">
          {accession}
        </Link>{" "}
        , which was matched through the shared publication{" "}
        <Link href={`/pmid/${pmid}/`} target="_blank" rel="noopener noreferrer">
          PMID {pmid}
        </Link>
      </Callout.Text>
    </Callout.Root>
  );
}

export default function LinkedSraFastq({
  aliasField,
  agGridThemeClassName,
  inferredVia,
}: {
  aliasField: string | string[] | null | undefined;
  agGridThemeClassName: string;
  /** Accession -> PMID for studies resolved through a shared publication. */
  inferredVia?: Record<string, string>;
}) {
  const sraAliases = React.useMemo(
    () =>
      normalizeAliases(aliasField).filter((a) =>
        /^[SED]RP\d+$/.test(a.toUpperCase()),
      ),
    [aliasField],
  );
  const { data } = useQuery({
    queryKey: ["linked-sra-runs", sraAliases],
    queryFn: async () => {
      const entries = await Promise.all(
        sraAliases.map(async (accession) => ({
          accession,
          runsData: await getJsonOrNull<RunsData>(`/project/${accession}/runs`),
        })),
      );
      return entries.filter(
        (e): e is { accession: string; runsData: RunsData } =>
          !!e.runsData && e.runsData.total_runs > 0,
      );
    },
    enabled: sraAliases.length > 0,
  });
  const expTitleMap = React.useMemo(() => new Map<string, string>(), []);

  if (!data || data.length === 0) return null;

  const section = ({ accession, runsData }: (typeof data)[number]) => (
    <DownloadFastqSection
      accession={accession}
      runsData={runsData}
      agGridThemeClassName={agGridThemeClassName}
      expTitleMap={expTitleMap}
    />
  );

  // One study: attach it directly, noting the provenance when it was inferred.
  if (data.length === 1) {
    const only = data[0];
    return (
      <>
        {inferredVia?.[only.accession] && (
          <ViaPmidNote
            accession={only.accession}
            pmid={inferredVia[only.accession]}
          />
        )}
        {section(only)}
      </>
    );
  }

  // Several studies share the paper; let the user choose the project's data.
  return (
    <Tabs.Root defaultValue={data[0].accession}>
      <Tabs.List>
        {data.map(({ accession, runsData }) => (
          <Tabs.Trigger key={accession} value={accession}>
            {accession} ({runsData.total_runs})
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {data.map((entry) => (
        <Tabs.Content key={entry.accession} value={entry.accession} mt="4">
          {/* DownloadFastqSection returns a fragment that depends on its parent's flex gap. Match the page column gap inside Tabs.Content. */}
          <Flex direction="column" gap="4">
            {inferredVia?.[entry.accession] && (
              <ViaPmidNote
                accession={entry.accession}
                pmid={inferredVia[entry.accession]}
              />
            )}
            {section(entry)}
          </Flex>
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
