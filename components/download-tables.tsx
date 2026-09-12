"use client";

import { CheckIcon, CopyIcon, DownloadIcon } from "@radix-ui/react-icons";
import {
  AlertDialog,
  Badge,
  Box,
  Button,
  Card,
  Code,
  Flex,
  Heading,
  Separator,
  Text,
} from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

// Static file host with HTTP range support; absolute URL so local dev also works.
const BASE = "https://seqout.org/data";

type Table = { file: string; name: string; desc: string };

const GROUPS: { source: string; tables: Table[] }[] = [
  {
    source: "NCBI Gene Expression Omnibus",
    tables: [
      {
        file: "geo_series",
        name: "GEO Series",
        desc: "Series (study) records",
      },
      { file: "geo_samples", name: "GEO Samples", desc: "Per-sample metadata" },
      {
        file: "geo_platforms",
        name: "GEO Platforms",
        desc: "Platform definitions",
      },
      {
        file: "geo_contributors",
        name: "GEO Contributors",
        desc: "Series contributors",
      },
    ],
  },
  {
    source: "NCBI Sequence Read Archive",
    tables: [
      { file: "sra_studies", name: "SRA Studies", desc: "Study (SRP) records" },
      {
        file: "sra_experiments",
        name: "SRA Experiments",
        desc: "Experiment (SRX) records",
      },
      {
        file: "sra_samples",
        name: "SRA Samples",
        desc: "Sample (SRS) records",
      },
      { file: "sra_runs", name: "SRA Runs", desc: "Run (SRR) records" },
      {
        file: "sra_submissions",
        name: "SRA Submissions",
        desc: "Submission records",
      },
      {
        file: "run_download_links",
        name: "Run Download Links",
        desc: "FASTQ/SRA URLs per run",
      },
    ],
  },
  {
    source: "EMBL-EBI European Nucleotide Archive",
    tables: [
      { file: "ena_studies", name: "ENA Studies", desc: "Study records" },
      {
        file: "ena_experiments",
        name: "ENA Experiments",
        desc: "Experiment records",
      },
      { file: "ena_samples", name: "ENA Samples", desc: "Sample records" },
    ],
  },
  {
    source: "EMBL-EBI ArrayExpress",
    tables: [
      {
        file: "arrayexpress_experiments",
        name: "ArrayExpress Experiments",
        desc: "Experiment records",
      },
      {
        file: "arrayexpress_samples",
        name: "ArrayExpress Samples",
        desc: "Per-sample metadata",
      },
    ],
  },
  {
    source: "CNCB-NGDC Genome Sequence Archive",
    tables: [
      { file: "gsa_studies", name: "GSA Studies", desc: "Study records" },
      {
        file: "gsa_experiments",
        name: "GSA Experiments",
        desc: "Experiment records",
      },
      { file: "gsa_samples", name: "GSA Samples", desc: "Sample records" },
      {
        file: "gsa_projects",
        name: "GSA Projects",
        desc: "BioProject records",
      },
    ],
  },
  {
    source: "DDBJ Sequence Read Archive",
    tables: [
      { file: "dra_studies", name: "DRA Studies", desc: "Study records" },
      {
        file: "dra_experiments",
        name: "DRA Experiments",
        desc: "Experiment records",
      },
      { file: "dra_samples", name: "DRA Samples", desc: "Sample records" },
      { file: "dra_runs", name: "DRA Runs", desc: "Run records" },
      {
        file: "dra_submissions",
        name: "DRA Submissions",
        desc: "Submission records",
      },
    ],
  },
  {
    source: "DDBJ Gene Expression Archive",
    tables: [
      {
        file: "gea_experiments",
        name: "GEA Experiments",
        desc: "Expression-archive experiments",
      },
      { file: "gea_samples", name: "GEA Samples", desc: "Per-sample metadata" },
    ],
  },
  {
    source: "Other metadata",
    tables: [
      {
        file: "unified_metadata",
        name: "Unified Metadata",
        desc: "Cross-source deduplicated projects",
      },
      {
        file: "unified_centers",
        name: "Unified Centers",
        desc: "Submitting centers & countries",
      },
      {
        file: "pubmed_metadata",
        name: "PubMed Metadata",
        desc: "Linked publications",
      },
    ],
  },
];

const ALL_FILES = GROUPS.flatMap((g) => g.tables);

function fmtBytes(n: number | null | undefined): string {
  if (n == null) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function triggerDownload(file: string) {
  const a = document.createElement("a");
  a.href = `${BASE}/${file}.parquet`;
  a.download = `${file}.parquet`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function fetchTableSizes(): Promise<Record<string, number | null>> {
  const entries = await Promise.all(
    ALL_FILES.map(async (t) => {
      try {
        const res = await fetch(`${BASE}/${t.file}.parquet`, {
          method: "HEAD",
        });
        const len = res.headers.get("content-length");
        return [t.file, len ? parseInt(len, 10) : null] as const;
      } catch {
        return [t.file, null] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}

export default function DownloadTables() {
  const { data: sizes = {} } = useQuery({
    queryKey: ["download-table-sizes"],
    queryFn: fetchTableSizes,
    staleTime: 60 * 60 * 1000,
  });
  const [copied, setCopied] = useState(false);
  const [askAll, setAskAll] = useState(false);

  const known = Object.values(sizes).filter((v): v is number => v != null);
  const total = known.reduce((a, b) => a + b, 0);
  const allLoaded = known.length === ALL_FILES.length;

  const wget = `wget -c ${BASE}/{${ALL_FILES.map((t) => t.file).join(",")}}.parquet`;

  function downloadAll() {
    ALL_FILES.forEach((t, i) => {
      window.setTimeout(() => triggerDownload(t.file), i * 500);
    });
  }

  async function copyWget() {
    try {
      await navigator.clipboard.writeText(wget);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <Flex direction="column" gap="4">
      <Card>
        <Flex
          direction={{ initial: "column", sm: "row" }}
          gap="3"
          align={{ initial: "stretch", sm: "center" }}
          justify="between"
        >
          <Flex direction="column" gap="1">
            <Text weight="medium">
              Get everything ({ALL_FILES.length} files
              {allLoaded ? `, ~${fmtBytes(total)}` : ""})
            </Text>
            <Text size="2" color="gray">
              A one-line <Code>wget</Code> with resume (<Code>-c</Code>) is the
              recommended way to fetch the full set.
            </Text>
          </Flex>
          <Button onClick={() => setAskAll(true)}>
            <DownloadIcon /> Download all
          </Button>
        </Flex>
        <Box mt="3">
          <Flex gap="2" align="center">
            <Box style={{ overflowX: "auto", flex: 1 }}>
              <Code size={"2"} style={{ whiteSpace: "nowrap" }}>
                {wget}
              </Code>
            </Box>
            <Button
              size="2"
              variant="soft"
              color={copied ? "green" : "gray"}
              onClick={copyWget}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </Flex>
        </Box>
      </Card>

      {GROUPS.map((group) => (
        <Card key={group.source}>
          <Flex direction="column" gap="2">
            <Heading as="h2" size="4">
              {group.source}
            </Heading>
            <Separator size="4" />
            {group.tables.map((t) => (
              <Flex
                key={t.file}
                gap="3"
                align="center"
                justify="between"
                py="1"
                wrap="wrap"
              >
                <Flex direction="column" style={{ minWidth: 0 }}>
                  <Flex gap="2" align="center" wrap="wrap">
                    <Text weight="medium">{t.name}</Text>
                    <Code size="1" color="gray">
                      {t.file}.parquet
                    </Code>
                  </Flex>
                  <Text size="1" color="gray">
                    {t.desc}
                  </Text>
                </Flex>
                <Flex gap="3" align="center">
                  <Badge color="gray" variant="soft">
                    {fmtBytes(sizes[t.file])}
                  </Badge>
                  <Button asChild size="2" variant="soft">
                    <a
                      href={`${BASE}/${t.file}.parquet`}
                      download={`${t.file}.parquet`}
                    >
                      <DownloadIcon /> Download
                    </a>
                  </Button>
                </Flex>
              </Flex>
            ))}
          </Flex>
        </Card>
      ))}
      <AlertDialog.Root open={askAll} onOpenChange={setAskAll}>
        <AlertDialog.Content maxWidth="480px">
          <AlertDialog.Title>
            Download all {ALL_FILES.length} files?
          </AlertDialog.Title>
          <AlertDialog.Description size="2">
            {allLoaded ? `~${fmtBytes(total)} total. ` : ""}This is a large
            download — the <Code>wget</Code> command below may be easier.
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button onClick={downloadAll}>
                <DownloadIcon /> Download all
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Flex>
  );
}
