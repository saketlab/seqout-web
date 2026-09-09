"use client";

import ResultCard from "@/components/result-card";
import SearchBar from "@/components/search-bar";
import { ApiError, getJson } from "@/utils/api";
import { getProjectShortUrl } from "@/utils/shortUrl";
import { Button, Card, Flex, Heading, Link, Text } from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SubmissionStudy = {
  accession: string;
  source: string;
  title: string | null;
  summary: string | null;
  published_at: string | null;
};

type SubmissionResponse = {
  submission: string;
  studies: SubmissionStudy[];
};

const isSubmission = (value: string) => /^[SED]RA\d+$/i.test(value.trim());

const INITIAL_ROWS = 100;

export default function SubmissionStudiesBody({
  accession,
}: {
  accession: string;
}) {
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);
  const acc = accession.toUpperCase();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["submission-studies", acc],
    queryFn: () => getJson<SubmissionResponse>(`/submission/${acc}`),
    enabled: isSubmission(acc),
    retry: false,
    staleTime: Infinity,
  });

  // 404 indicates an empty submission; other statuses indicate request failures.
  const noStudies = error instanceof ApiError && error.status === 404;

  const studies = data?.studies ?? [];
  const visible = showAll ? studies : studies.slice(0, INITIAL_ROWS);
  const soleStudy = studies.length === 1 ? studies[0].accession : null;

  // Redirect single-study submissions to the study page.
  useEffect(() => {
    if (soleStudy) router.replace(getProjectShortUrl(soleStudy));
  }, [soleStudy, router]);

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
        {/* Invalid-accession messages provide their own heading. */}
        {isSubmission(acc) && (
          <Heading size="6">Studies for submission {acc}</Heading>
        )}

        {isLoading && <Text color="gray">Searching…</Text>}

        {/* Explain invalid submission accessions before running the query. */}
        {!isSubmission(acc) && (
          <Flex
            align="center"
            justify="center"
            direction="column"
            height="20rem"
            gap="3"
          >
            <Text size={{ initial: "5", md: "6" }} weight="bold">
              {acc} isn&rsquo;t a submission accession
            </Text>
            <Text
              size="2"
              align="center"
              style={{ color: "var(--gray-11)", maxWidth: "32rem" }}
            >
              Submission accessions look like SRA123456, ERA123456 or DRA123456.
              For a study, sample or run, paste it into the search bar above.
            </Text>
          </Flex>
        )}

        {isError && (
          <Flex
            align="center"
            justify="center"
            direction="column"
            height="20rem"
            gap="3"
          >
            {noStudies ? (
              <>
                <Text size={{ initial: "5", md: "6" }} weight="bold">
                  No studies found for submission {acc}
                </Text>
                <Text
                  size="2"
                  align="center"
                  style={{ color: "var(--gray-11)", maxWidth: "32rem" }}
                >
                  No SRP/ERP/DRP study in seqout is filed under this submission.
                  The accession may belong to an archive we don&rsquo;t mirror,
                  or its studies may not be public yet.
                </Text>
                <Button variant="soft" asChild>
                  <NextLink href="/">Search by title or keywords</NextLink>
                </Button>
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
                  Couldn&rsquo;t load submission {acc}
                </Text>
                <Text
                  size="2"
                  align="center"
                  style={{ color: "var(--gray-11)", maxWidth: "32rem" }}
                >
                  The request failed before we could look this submission up, so
                  we don&rsquo;t know whether it has studies. This one is on us,
                  not your accession.
                </Text>
                <Button variant="soft" onClick={() => refetch()}>
                  Try again
                </Button>
              </>
            )}
          </Flex>
        )}

        {data && studies.length > 1 && (
          <Text color="gray" weight="light">
            {studies.length.toLocaleString()} studies
          </Text>
        )}

        {/* length 1 redirects; render the list only for the multi-study case */}
        {studies.length > 1 && (
          <Flex
            direction="column"
            gap="0"
            className="seqout-divided-list"
            style={{ paddingLeft: 0 }}
          >
            {visible.map((s) => (
              <ResultCard
                key={s.accession}
                accession={s.accession}
                source={s.source}
                title={s.title}
                summary={s.summary}
                updated_at={s.published_at}
                titleSize="4"
                href={getProjectShortUrl(s.accession)}
              />
            ))}
          </Flex>
        )}

        {!showAll && studies.length > INITIAL_ROWS && (
          <Flex justify="center" py="4">
            <Button variant="soft" onClick={() => setShowAll(true)}>
              Show all {studies.length.toLocaleString()} studies
            </Button>
          </Flex>
        )}
      </Flex>
    </>
  );
}
