"use client";

import EditableHeading from "@/components/editable-heading";
import {
  CiteDialog,
  CopyButton,
  formatCellCitation,
} from "@/components/publication-card";
import ResultCard from "@/components/result-card";
import SearchBar from "@/components/search-bar";
import { ApiError, getJson } from "@/utils/api";
import { ARCHIVE_LIST_TEXT } from "@/utils/constants";
import { cleanJournalName, formatPubDate } from "@/utils/format";
import { doiHref, isPmid, pmidHref, pubmedHref } from "@/utils/project";
import { getProjectShortUrl } from "@/utils/shortUrl";
import type { StudyPublication } from "@/utils/types";
import { ExternalLinkIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import {
  Badge,
  Button,
  Card,
  Flex,
  IconButton,
  Link,
  Popover,
  Text,
} from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type PublicationProject = {
  accession: string;
  source: string;
  title: string | null;
  summary: string | null;
  published_at: string | null;
  via: string | null;
  center_name: string | null;
  country_code: string | null;
};

type PublicationResponse = Pick<
  StudyPublication,
  | "pmid"
  | "title"
  | "journal"
  | "doi"
  | "pub_date"
  | "authors"
  | "citation_count"
> & {
  projects: PublicationProject[];
};

const fetchPublication = async (pmid: string) => {
  // Wall-clock timing; the endpoint returns none.
  const start = performance.now();
  const data = await getJson<PublicationResponse>(
    `/publication?pmid=${encodeURIComponent(pmid)}`,
  );
  return { ...data, took_ms: performance.now() - start };
};

const INITIAL_ROWS = 100;

export default function PublicationProjectsBody({ pmid }: { pmid: string }) {
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["publication-projects", pmid],
    queryFn: () => fetchPublication(pmid),
    enabled: isPmid(pmid),
    retry: false,
    staleTime: Infinity,
  });

  // 404 covers both an unknown PMID and a paper with no linked submissions. Other statuses indicate request failures.
  const notLinked = error instanceof ApiError && error.status === 404;

  const projects = data?.projects ?? [];
  const visible = showAll ? projects : projects.slice(0, INITIAL_ROWS);
  const pubDate = formatPubDate(data?.pub_date ?? null);
  // Prefer DOI; the page PMID provides a PubMed fallback.
  const titleLink = data?.doi ? doiHref(data.doi) : pubmedHref(pmid);

  return (
    <>
      <SearchBar />

      <Flex
        gap="4"
        mt="4"
        ml={{ initial: "0", md: "12rem" }}
        mr={{ initial: "0", md: "8rem" }}
        px={{ initial: "4", md: "3" }}
        direction="column"
      >
        <Flex align="center" justify="between" gap="2">
          <EditableHeading
            label="Projects for PMID"
            value={pmid}
            placeholder="PMID"
            editLabel="Edit PMID"
            inputMode="numeric"
            isValid={isPmid}
            onSubmit={(next) => router.push(pmidHref(next))}
          />
          <Popover.Root>
            <Popover.Trigger>
              <IconButton variant="soft" aria-label="About publication links">
                <InfoCircledIcon />
              </IconButton>
            </Popover.Trigger>
            <Popover.Content maxWidth={"16rem"}>
              <Text size="2">
                Projects are linked to publications by the archive, so
                submission errors may occasionally associate an unrelated
                project with a paper.
              </Text>
            </Popover.Content>
          </Popover.Root>
        </Flex>

        {isLoading && <Text color="gray">Searching…</Text>}
        {isError && (
          <Flex
            align="center"
            justify="center"
            direction="column"
            height="20rem"
            gap="3"
          >
            {notLinked ? (
              <>
                <Text size={{ initial: "5", md: "6" }} weight="bold">
                  No datasets linked to PMID {pmid}
                </Text>
                <Text
                  size="2"
                  align="center"
                  style={{ color: "var(--gray-11)", maxWidth: "32rem" }}
                >
                  Datasets are linked to papers by the archives&rsquo; own
                  submission metadata. Nothing in {ARCHIVE_LIST_TEXT} cites this
                  PMID. The publication may not have an associated public
                  dataset, or the submitter may have recorded a different PMID.
                </Text>
                <Flex gap="3" mt="1" wrap="wrap" justify="center">
                  <Button variant="soft" asChild>
                    <a
                      href={pubmedHref(pmid)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Check {pmid} on PubMed <ExternalLinkIcon />
                    </a>
                  </Button>
                  <Button variant="soft" asChild>
                    <NextLink href="/">Search by title or keywords</NextLink>
                  </Button>
                </Flex>
                <Card mt="1" style={{ maxWidth: "32rem" }}>
                  <Text size="2" as="p" weight="medium" mb="1">
                    Need to query in natural language?
                  </Text>
                  <Text size="2" as="p" style={{ color: "var(--gray-11)" }}>
                    Seqout can be used with the AI agent (e.g. Claude) of your
                    choice to search for and download datasets using natural
                    language. This can often substantially improve your chances
                    of finding relevant datasets.{" "}
                    <Link asChild underline="always">
                      <NextLink href="/mcp">Read more.</NextLink>
                    </Link>
                  </Text>
                </Card>
              </>
            ) : (
              <>
                <Text size={{ initial: "5", md: "6" }} weight="bold">
                  Couldn&rsquo;t load PMID {pmid}
                </Text>
                <Text
                  size="2"
                  align="center"
                  style={{ color: "var(--gray-11)", maxWidth: "32rem" }}
                >
                  The request failed before we could look this paper up, so we
                  don&rsquo;t know whether it has datasets. This one is on us,
                  not your PMID.
                </Text>
                <Button variant="soft" onClick={() => refetch()}>
                  Try again
                </Button>
              </>
            )}
          </Flex>
        )}

        {data && (
          <Card>
            <Flex direction="column" gap="1">
              {data.title && (
                <Link
                  size="4"
                  href={titleLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  weight="bold"
                  underline="hover"
                  wrap="pretty"
                  style={{ color: "inherit" }}
                >
                  {data.title}
                </Link>
              )}
              {data.authors && (
                <Text size="2" color="gray">
                  {data.authors}
                </Text>
              )}
              <Flex gap="2" align="center" wrap="wrap" mt="1">
                {data.citation_count != null && data.citation_count > 0 && (
                  <Badge size="2" color="iris" variant="soft">
                    {data.citation_count.toLocaleString()} citations
                  </Badge>
                )}
                {data.journal &&
                  (data.doi ? (
                    <Badge size="2" color="blue" variant="soft" asChild>
                      <a
                        href={doiHref(data.doi)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        {cleanJournalName(data.journal)} <ExternalLinkIcon />
                      </a>
                    </Badge>
                  ) : (
                    <Badge size="2" color="blue" variant="soft">
                      {cleanJournalName(data.journal)} <ExternalLinkIcon />
                    </Badge>
                  ))}
                {pubDate && (
                  <Badge size="2" color="gray" variant="soft">
                    {pubDate}
                  </Badge>
                )}
                <Link
                  href={pubmedHref(pmid)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open PMID ${pmid} in PubMed`}
                  style={{ textDecoration: "none" }}
                >
                  <Badge
                    size="2"
                    color="gray"
                    variant="soft"
                    style={{ cursor: "pointer" }}
                  >
                    View on PubMed
                    <ExternalLinkIcon />
                  </Badge>
                </Link>
                <CopyButton
                  label="PMID"
                  getText={() => pmid}
                  toast="PMID copied"
                />
                {/* BibTeX requires a project accession; this page spans projects linked to a paper. */}
                <CiteDialog
                  label="Cite"
                  title="Citation"
                  getText={() => formatCellCitation(data)}
                  toast="Citation copied"
                />
              </Flex>
            </Flex>
          </Card>
        )}

        {data && projects.length > 0 && (
          <Text color="gray" weight="light">
            Found {projects.length.toLocaleString()} project
            {projects.length === 1 ? "" : "s"} in{" "}
            {(data.took_ms / 1000).toFixed(2)} seconds
          </Text>
        )}

        {/* Show an empty state for a paper with no linked projects. */}
        {data && projects.length === 0 && (
          <Text size="2" style={{ color: "var(--gray-11)" }}>
            We have this paper, but no dataset in {ARCHIVE_LIST_TEXT} is linked
            to it yet.
          </Text>
        )}

        <Flex
          direction="column"
          gap="0"
          className="seqout-divided-list"
          style={{ paddingLeft: 0 }}
        >
          {/* journal/authors/citations are the same paper on every row; the header shows them once */}
          {visible.map((p) => (
            <ResultCard
              key={`${p.source}:${p.accession}`}
              accession={p.accession}
              source={p.source}
              title={p.title}
              summary={p.summary}
              updated_at={p.published_at}
              center_name={p.center_name}
              country_code={p.country_code}
              titleSize="4"
              centerOnOwnRow
              href={getProjectShortUrl(p.accession)}
            />
          ))}
        </Flex>

        {!showAll && projects.length > INITIAL_ROWS && (
          <Flex justify="center" py="4">
            <Button variant="soft" onClick={() => setShowAll(true)}>
              Show all {projects.length.toLocaleString()} projects
            </Button>
          </Flex>
        )}
      </Flex>
    </>
  );
}
