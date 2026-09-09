"use client";

import EditableHeading from "@/components/editable-heading";
import { InstituteFilter } from "@/components/institute-filter";
import ResultCard from "@/components/result-card";
import SearchBar from "@/components/search-bar";
import {
  applyTimeFilter,
  SearchFilters,
  type TimeFilter,
} from "@/components/search-filters";
import type { SortBy } from "@/components/search-page-body";
import { getJson } from "@/utils/api";
import { authorHref } from "@/utils/project";
import { getProjectShortUrl } from "@/utils/shortUrl";
import { InfoCircledIcon, MixerHorizontalIcon } from "@radix-ui/react-icons";
import {
  Box,
  Button,
  Dialog,
  Flex,
  IconButton,
  Popover,
  Select,
  Text,
} from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as React from "react";

type AuthorProject = {
  accession: string;
  title: string | null;
  summary: string | null;
  updated_at: string | null;
  journal: string | null;
  doi: string | null;
  citation_count: number | null;
  authors: string | null;
  center_name?: string | null;
  institute?: string | null;
  country_code?: string | null;
  single_cell_modality?: string | null;
};

type AuthorProjectsResponse = {
  q: string;
  total: number;
  results: AuthorProject[];
  institutes: { name: string; count: number }[];
  took_ms: number;
};

const fetchAuthorProjects = async (name: string) => {
  // Wall-clock timing; the endpoint returns none.
  const start = performance.now();
  const data = await getJson<AuthorProjectsResponse>(
    `/author/projects?q=${encodeURIComponent(name)}&limit=200`,
  );
  return { ...data, took_ms: performance.now() - start };
};

// institute must already be lowercased.
function hasInstitute(r: AuthorProject, institute: string): boolean {
  return (r.institute ?? "")
    .split(";")
    .some((p) => p.trim().toLowerCase() === institute);
}

// The endpoint returns every match in one shot, so sorting is client-side.
// "relevance" keeps the server's name-match order.
function sortProjects(
  rows: AuthorProject[],
  sortBy: SortBy,
  dateOrder: "desc" | "asc",
): AuthorProject[] {
  if (sortBy === "relevance") return rows;
  // Missing values sort last in every mode.
  const missing = dateOrder === "asc" ? Infinity : -Infinity;
  const time = (r: AuthorProject) => {
    const t = new Date(r.updated_at ?? "").getTime();
    return Number.isNaN(t) ? missing : t;
  };
  const sorted = [...rows];
  if (sortBy === "citations")
    return sorted.sort(
      (a, b) => (b.citation_count ?? -1) - (a.citation_count ?? -1),
    );
  if (sortBy === "journal")
    return sorted.sort((a, b) => {
      if (!a.journal) return b.journal ? 1 : 0;
      if (!b.journal) return -1;
      return a.journal.localeCompare(b.journal);
    });
  return sorted.sort((a, b) =>
    dateOrder === "asc" ? time(a) - time(b) : time(b) - time(a),
  );
}

export default function AuthorProjectsBody({ name }: { name: string }) {
  const router = useRouter();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["author-projects", name],
    queryFn: () => fetchAuthorProjects(name),
    enabled: name.length >= 2,
  });

  const results = data?.results ?? [];
  const institutes = data?.institutes ?? [];
  const [selectedInstitute, setSelectedInstitute] = React.useState<
    string | null
  >(null);
  const [sortBy, setSortBy] = React.useState<SortBy>("relevance");
  const [dateOrder, setDateOrder] = React.useState<"desc" | "asc">("desc");
  const [timeFilter, setTimeFilter] = React.useState<TimeFilter>("any");
  const [customYearRange, setCustomYearRange] = React.useState({
    from: "",
    to: "",
  });

  const filtered = React.useMemo(() => {
    let rows = data?.results ?? [];
    if (selectedInstitute) {
      const target = selectedInstitute.toLowerCase();
      rows = rows.filter((r) => hasInstitute(r, target));
    }
    return sortProjects(
      applyTimeFilter(rows, timeFilter, customYearRange),
      sortBy,
      dateOrder,
    );
  }, [
    data?.results,
    selectedInstitute,
    timeFilter,
    customYearRange,
    sortBy,
    dateOrder,
  ]);

  const instituteFilter = (
    <InstituteFilter
      facets={institutes}
      totalCount={data?.total ?? results.length}
      selectedKey={selectedInstitute}
      onChangeSelection={setSelectedInstitute}
    />
  );

  return (
    <>
      <SearchBar />

      <Flex
        gap="4"
        mt={"4"}
        px={{ initial: "0", md: "4" }}
        width={{ initial: "98%", md: "100%" }}
        mx="auto"
        justify={{ initial: "start", md: "between" }}
        direction={{ initial: "column", md: "row" }}
      >
        <Flex
          gap="3"
          direction="column"
          width={{
            initial: "100%",
            md: "calc(100% - 240px)",
            lg: "calc(100% - 300px)",
          }}
          minWidth="0"
        >
          <Flex align="center" justify="between" gap="2">
            <EditableHeading
              label="Projects by"
              value={name}
              placeholder="Author name"
              editLabel="Edit author name"
              isValid={(next) => next.length >= 2}
              onSubmit={(next) => router.push(authorHref(next))}
            />
            <Popover.Root>
              <Popover.Trigger>
                <IconButton variant="soft" aria-label="About name matching">
                  <InfoCircledIcon />
                </IconButton>
              </Popover.Trigger>
              <Popover.Content maxWidth="340px">
                <Text size={"2"}>
                  Matched on first and last name, so common names may include
                  other projects by people with the same name.
                </Text>
              </Popover.Content>
            </Popover.Root>
          </Flex>

          {isLoading && <Text color="gray">Searching…</Text>}
          {isError && (
            <Text color="red">Something went wrong. Please try again.</Text>
          )}
          {!isLoading && !isError && results.length === 0 && (
            <Flex
              align="center"
              justify="center"
              direction="column"
              height="20rem"
              gap="3"
            >
              <Text size={{ initial: "5", md: "6" }} weight="bold">
                No projects found for &ldquo;{name}&rdquo;
              </Text>
              <Text
                size="2"
                align="center"
                style={{ color: "var(--gray-11)", maxWidth: "32rem" }}
              >
                Check the spelling or try just the last name. Only datasets
                linked to a publication (or GEO contributor) are findable.
              </Text>
            </Flex>
          )}
          {results.length > 0 && (
            <Flex align="center" justify="between" gap="2" wrap="wrap">
              <Text color="gray" weight="light">
                {data?.total?.toLocaleString()} result
                {data?.total === 1 ? "" : "s"} in{" "}
                {((data?.took_ms ?? 0) / 1000).toFixed(2)} seconds
                {filtered.length !== results.length &&
                  ` · ${filtered.length} shown`}
                {selectedInstitute && ` · ${selectedInstitute}`}
              </Text>
              <Flex gap="2" align="center" wrap="wrap">
                <SearchFilters
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  timeFilter={timeFilter}
                  setTimeFilter={setTimeFilter}
                  customYearRange={customYearRange}
                  setCustomYearRange={setCustomYearRange}
                />
                {sortBy === "date" && (
                  <Select.Root
                    value={dateOrder}
                    onValueChange={(v) => setDateOrder(v as "desc" | "asc")}
                    size="1"
                  >
                    <Select.Trigger aria-label="Date order" />
                    <Select.Content>
                      <Select.Item value="desc">Newest first</Select.Item>
                      <Select.Item value="asc">Oldest first</Select.Item>
                    </Select.Content>
                  </Select.Root>
                )}
              </Flex>
            </Flex>
          )}
          <Flex
            direction="column"
            gap="0"
            className="seqout-divided-list"
            style={{ paddingLeft: 0 }}
          >
            {filtered.map((r) => (
              <ResultCard
                key={r.accession}
                accession={r.accession}
                title={r.title}
                summary={r.summary}
                updated_at={r.updated_at}
                journal={r.journal}
                doi={r.doi}
                citation_count={r.citation_count}
                authors={r.authors}
                center_name={r.institute ?? r.center_name}
                country_code={r.country_code}
                href={getProjectShortUrl(r.accession)}
              />
            ))}
          </Flex>
        </Flex>

        {/* Desktop rail */}
        <Box
          width={{ md: "220px", lg: "280px" }}
          flexShrink="0"
          display={{
            initial: "none",
            md: institutes.length > 0 ? "block" : "none",
          }}
          style={{ alignSelf: "start", position: "sticky", top: "5rem" }}
        >
          {instituteFilter}
        </Box>
      </Flex>

      {/* Mobile rail */}
      {institutes.length > 0 && (
        <Flex
          display={{ initial: "flex", md: "none" }}
          position="fixed"
          direction="column"
          align="end"
          bottom={{ initial: "9", sm: "4" }}
          style={{ right: "1rem", zIndex: 999 }}
        >
          <Dialog.Root>
            <Dialog.Trigger>
              <Button>
                <MixerHorizontalIcon />
                Institutes
              </Button>
            </Dialog.Trigger>
            <Dialog.Content
              size="2"
              style={{
                width: "calc(100vw - 2rem)",
                maxWidth: "calc(100vw - 2rem)",
              }}
            >
              <Dialog.Title>Institutes</Dialog.Title>
              <Dialog.Description size="1">
                Narrow projects by institute.
              </Dialog.Description>
              <Flex
                mt="3"
                width="100%"
                style={{ height: "24rem", overflowY: "auto" }}
              >
                <div style={{ width: "100%" }}>{instituteFilter}</div>
              </Flex>
            </Dialog.Content>
          </Dialog.Root>
        </Flex>
      )}
    </>
  );
}
