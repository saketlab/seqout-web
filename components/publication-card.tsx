"use client";

import ProjectAuthors from "@/components/project-authors";
import { useToast } from "@/components/toast-provider";
import { copyToClipboard } from "@/utils/clipboard";
import { SERVER_URL } from "@/utils/constants";
import { cleanJournalName } from "@/utils/format";
import { doiHref, pmidHref, pubmedHref } from "@/utils/project";
import { fetchDoiSummary } from "@/utils/doi";
import { fetchPubmedSummary } from "@/utils/pubmed";
import type { StudyPublication } from "@/utils/types";
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  FileTextIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import {
  Badge,
  Box,
  Button,
  Card,
  Dialog,
  Flex,
  Link,
  Skeleton,
  Text,
  Tooltip,
} from "@radix-ui/themes";
import NextLink from "next/link";
import { useEffect, useRef, useState } from "react";

export type { StudyPublication };

type PublicationCardProps = {
  publication: StudyPublication;
  accession?: string;
};

function extractYear(pubDate: string | number | null): string | null {
  if (!pubDate) return null;
  // Coerce pub_date to a string before matching; the API can return a date string or a numeric year.
  const match = String(pubDate)
    .trim()
    .match(/^\d{4}/);
  return match ? match[0] : null;
}

function toCellAuthor(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0] + ".";
  const last = parts[parts.length - 1];
  const initials = parts
    .slice(0, -1)
    .map((p) => p[0].toUpperCase() + ".")
    .join("");
  return `${last}, ${initials}`;
}

function formatCellAuthors(authors: string): string {
  const list = authors
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
  const formatted = list.map(toCellAuthor);
  if (formatted.length > 10) {
    return formatted.slice(0, 10).join(", ") + ", et al.";
  }
  if (formatted.length > 1) {
    return (
      formatted.slice(0, -1).join(", ") +
      ", and " +
      formatted[formatted.length - 1]
    );
  }
  return formatted[0];
}

/** Publication fields needed to format a citation. */
type CitationFields = Pick<
  StudyPublication,
  "authors" | "pub_date" | "title" | "journal" | "doi"
>;

export function formatCellCitation(pub: CitationFields): string {
  const parts: string[] = [];
  if (pub.authors) {
    parts.push(formatCellAuthors(pub.authors));
  }
  const year = extractYear(pub.pub_date);
  if (year) {
    parts.push(`(${year}).`);
  }
  if (pub.title) {
    const title = pub.title.endsWith(".") ? pub.title : `${pub.title}.`;
    parts.push(title);
  }
  if (pub.journal) {
    parts.push(cleanJournalName(pub.journal) + ".");
  }
  if (pub.doi) {
    parts.push(doiHref(pub.doi));
  }
  return parts.join(" ");
}

const chipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  // 6px vertical padding + 12px icon + 6px = 24px tall, clears WCAG 2.5.8
  padding: "6px 12px",
  minHeight: "24px",
  borderRadius: "var(--radius-2)",
  border: "1px solid var(--gray-a7)",
  background: "var(--gray-a3)",
  color: "var(--gray-11)",
  fontSize: "var(--font-size-1)",
  fontWeight: 500,
  cursor: "pointer",
  lineHeight: 1,
};

export function CopyButton({
  label,
  getText,
  toast,
}: {
  label: string;
  getText: () => string | Promise<string | null> | null;
  toast: string;
}) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(timer.current ?? undefined), []);

  const handleClick = async () => {
    const text = await getText();
    if (!text || !copyToClipboard(text)) return;
    setCopied(true);
    clearTimeout(timer.current ?? undefined);
    timer.current = setTimeout(() => setCopied(false), 1500);
    showToast(toast);
  };

  return (
    <Tooltip content={copied ? "Copied!" : `Copy ${label}`}>
      <button type="button" onClick={handleClick} style={chipStyle}>
        {copied ? (
          <CheckIcon width="12" height="12" />
        ) : (
          <CopyIcon width="12" height="12" />
        )}
        {copied ? "Copied" : label}
      </button>
    </Tooltip>
  );
}

/** Citation preview dialog with a copy action. getText runs on each open and may fetch asynchronously. */
export function CiteDialog({
  label,
  title,
  getText,
  toast,
}: {
  label: string;
  title: string;
  getText: () => string | Promise<string | null> | null;
  toast: string;
}) {
  const { showToast } = useToast();
  // null = still loading; the copy button stays disabled until text lands.
  const [text, setText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(timer.current ?? undefined), []);

  const handleCopy = () => {
    if (!text || !copyToClipboard(text)) return;
    setCopied(true);
    clearTimeout(timer.current ?? undefined);
    timer.current = setTimeout(() => setCopied(false), 1500);
    showToast(toast);
  };

  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (!open) return;
        setText(null);
        setCopied(false);
        Promise.resolve(getText()).then((t) => setText(t || "Unavailable"));
      }}
    >
      <Dialog.Trigger>
        <button type="button" style={chipStyle}>
          <FileTextIcon width="12" height="12" />
          {label}
        </button>
      </Dialog.Trigger>
      <Dialog.Content size="3">
        <Flex justify="between" align="center" gap="3" mb="3">
          <Dialog.Title mb="0">{title}</Dialog.Title>
          <Button onClick={handleCopy} disabled={!text}>
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? "Copied!" : "Copy"}
          </Button>
        </Flex>
        <div
          style={{
            width: "100%",
            maxWidth: "100%",
            overflow: "hidden",
            background: "var(--gray-3)",
            border: "1px solid var(--gray-6)",
            borderRadius: "8px",
          }}
        >
          <pre
            style={{
              margin: 0,
              width: "100%",
              boxSizing: "border-box",
              padding: "0.875rem",
              overflowY: "auto",
              maxHeight: "24rem",
              fontSize: "12px",
              lineHeight: "1.5",
              fontFamily: "var(--default-mono-font-family)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {text ?? "Loading…"}
          </pre>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export default function PublicationCard({
  publication: incoming,
  accession,
}: PublicationCardProps) {
  // Fetch missing publication details from NCBI PubMed. Tag fields with their PMID
  // to prevent stale responses from appearing on a different publication.
  const [fallback, setFallback] = useState<{
    pmid: string;
    extra: Partial<StudyPublication>;
  } | null>(null);
  useEffect(() => {
    const needsDetails =
      incoming.pmid &&
      !incoming.title &&
      !incoming.journal &&
      !incoming.authors;
    if (!needsDetails) return;
    const controller = new AbortController();
    fetchPubmedSummary(incoming.pmid!, controller.signal).then((extra) =>
      setFallback({ pmid: incoming.pmid!, extra }),
    );
    return () => controller.abort();
  }, [incoming]);

  // Submitter-provided citation with a DOI but no PMID: enrich it live from
  // OpenAlex so the raw text becomes a real title/journal/authors/citations.
  const [doiDetails, setDoiDetails] = useState<{
    doi: string;
    extra: Partial<StudyPublication>;
  } | null>(null);
  useEffect(() => {
    if (!incoming.submitter_provided || !incoming.doi) return;
    const controller = new AbortController();
    fetchDoiSummary(incoming.doi, controller.signal).then((extra) =>
      setDoiDetails({ doi: incoming.doi!, extra }),
    );
    return () => controller.abort();
  }, [incoming]);

  // Existing (non-null) fields always win over the fallback.
  const extra = fallback?.pmid === incoming.pmid ? fallback.extra : {};
  const publication: StudyPublication = {
    ...incoming,
    title: incoming.title ?? extra.title ?? null,
    journal: incoming.journal ?? extra.journal ?? null,
    authors: incoming.authors ?? extra.authors ?? null,
    pub_date: incoming.pub_date ?? extra.pub_date ?? null,
    doi: incoming.doi ?? extra.doi ?? null,
  };

  const year = extractYear(publication.pub_date);
  const cleanedJournal = publication.journal
    ? cleanJournalName(publication.journal)
    : null;
  const hasCitations =
    publication.citation_count != null && publication.citation_count > 0;
  const titleLink = publication.doi
    ? doiHref(publication.doi)
    : publication.pmid
      ? pubmedHref(publication.pmid)
      : null;

  const fetchBibtex = async (): Promise<string | null> => {
    if (!accession) return null;
    try {
      const res = await fetch(
        `${SERVER_URL}/project/${encodeURIComponent(accession)}/cite?type=all&format=bibtex`,
      );
      if (!res.ok) return null;
      const allBibtex = await res.text();
      if (!publication.pmid) return allBibtex;
      const entries = allBibtex.split(/\n\n+/);
      return (
        entries.find((e) => e.includes(`pmid    = {${publication.pmid}}`)) ??
        allBibtex
      );
    } catch {
      return null;
    }
  };

  // Submitter-provided <Citation> that never resolved to a PMID: show the raw
  // text as-submitted and flag it, so it's never mistaken for a verified record.
  if (incoming.submitter_provided && incoming.citation) {
    const submittedDoi = incoming.doi;
    // Live OpenAlex details for the DOI, when the fetch succeeded for this doi.
    const d = doiDetails?.doi === submittedDoi ? doiDetails.extra : {};
    // Fetch in flight: has a DOI to resolve but no result yet (success or fail).
    const loading = !!submittedDoi && doiDetails === null;
    const headline = d.title ?? incoming.citation; // enriched title, else raw text
    const dJournal = d.journal ? cleanJournalName(d.journal) : null;
    const dYear = extractYear(d.pub_date ?? null);
    const dCitations =
      d.citation_count != null && d.citation_count > 0 ? d.citation_count : null;
    return (
      <Card>
        <Flex direction="column" gap="2">
          <Flex gap="3" justify="between" align="start" wrap="wrap">
            {loading ? (
              <Box style={{ flex: "1 1 16rem", minWidth: 0 }}>
                <Skeleton height="1.4rem" width="92%" />
                <Box mt="2">
                  <Skeleton height="1.4rem" width="55%" />
                </Box>
              </Box>
            ) : submittedDoi ? (
              <Link
                size={{ initial: "2", md: "3" }}
                href={doiHref(submittedDoi)}
                target="_blank"
                rel="noopener noreferrer"
                weight="bold"
                underline="hover"
                wrap="pretty"
                style={{ color: "inherit", flex: "1 1 16rem", minWidth: 0 }}
              >
                {headline}
              </Link>
            ) : (
              <Text
                size={{ initial: "2", md: "3" }}
                wrap="pretty"
                style={{ flex: "1 1 16rem", minWidth: 0 }}
              >
                {headline}
              </Text>
            )}
            <Flex gap="2" align="center" wrap="wrap" style={{ flexShrink: 0 }}>
              {!loading && dCitations != null && (
                <Badge size="2" color="iris" variant="soft">
                  {dCitations.toLocaleString()} citations
                </Badge>
              )}
              {!loading && dJournal && (
                <Badge size="2" color="blue" variant="soft">
                  {dJournal}
                </Badge>
              )}
              {!loading && dYear && (
                <Text size="1" style={{ color: "var(--gray-11)" }}>
                  {dYear}
                </Text>
              )}
              <Tooltip content="Shown as submitted by the data submitter; details resolved from the cited DOI via OpenAlex, not a PubMed-linked record.">
                <Badge size="2" color="amber" variant="soft">
                  As submitted
                </Badge>
              </Tooltip>
            </Flex>
          </Flex>
          {loading ? (
            <Skeleton height="1rem" width="40%" />
          ) : (
            d.authors && (
              <ProjectAuthors
                authors={d.authors.split(",")}
                initialVisible={4}
                size="2"
              />
            )
          )}
          <Flex gap="2" align="center" wrap="wrap">
            {submittedDoi && (
              <Link
                href={doiHref(submittedDoi)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
              >
                <Badge
                  size="2"
                  color="gray"
                  variant="soft"
                  className="seqout-accession"
                  style={{ cursor: "pointer" }}
                >
                  doi:{submittedDoi}
                </Badge>
              </Link>
            )}
            <CiteDialog
              label="Cite"
              title="Citation"
              getText={() => incoming.citation ?? ""}
              toast="Citation copied"
            />
          </Flex>
        </Flex>
      </Card>
    );
  }

  return (
    <Card>
      <Flex direction="column" gap="2">
        {/* Title and publication metadata; metadata wraps below the title on narrow viewports. */}
        <Flex gap="3" justify="between" align="start" wrap="wrap">
          {titleLink ? (
            <Link
              size={{ initial: "2", md: "4" }}
              href={titleLink}
              target="_blank"
              weight={"bold"}
              underline="hover"
              wrap={"pretty"}
              style={{ color: "inherit" }}
              rel="noopener noreferrer"
            >
              {publication.title}
            </Link>
          ) : (
            <Text
              size={{ initial: "2", md: "3" }}
              weight="bold"
              style={{ flex: "1 1 16rem", minWidth: 0 }}
            >
              {publication.title}
            </Text>
          )}

          {(hasCitations || cleanedJournal || year) && (
            <Flex gap="2" align="center" wrap="wrap" style={{ flexShrink: 0 }}>
              {hasCitations && (
                <Badge size="2" color="iris" variant="soft">
                  {publication.citation_count!.toLocaleString()} citations
                </Badge>
              )}
              {cleanedJournal && (
                <Badge
                  size="2"
                  color="blue"
                  variant="soft"
                  style={{ cursor: publication.doi ? "pointer" : undefined }}
                  onClick={
                    publication.doi
                      ? (e) => {
                          e.stopPropagation();
                          window.open(doiHref(publication.doi!), "_blank");
                        }
                      : undefined
                  }
                >
                  {cleanedJournal}
                  {publication.doi && <ExternalLinkIcon />}
                </Badge>
              )}
              {year && (
                <Text size="1" style={{ color: "var(--gray-11)" }}>
                  {year}
                </Text>
              )}
            </Flex>
          )}
        </Flex>

        {publication.authors && (
          <ProjectAuthors
            authors={publication.authors.split(",")}
            initialVisible={4}
            size="2"
          />
        )}

        {/* PMID and DOI in Geist Mono, with citation and BibTeX copy actions. */}
        <Flex gap="2" align="center" wrap="wrap">
          {publication.pmid && (
            <>
              <Tooltip content="Search for linked projects">
                <NextLink
                  href={pmidHref(publication.pmid)}
                  prefetch={false}
                  style={{ textDecoration: "none" }}
                >
                  <Badge
                    size="2"
                    color="gray"
                    variant="soft"
                    className="seqout-accession"
                    style={{ cursor: "pointer" }}
                  >
                    PMID {publication.pmid}
                    <MagnifyingGlassIcon />
                  </Badge>
                </NextLink>
              </Tooltip>
              <Tooltip content="Open in PubMed">
                <Link
                  href={pubmedHref(publication.pmid)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open PMID ${publication.pmid} in PubMed`}
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
              </Tooltip>
              <CopyButton
                label="PMID"
                getText={() => publication.pmid}
                toast="PMID copied"
              />
            </>
          )}
          {publication.doi && !cleanedJournal && (
            <Link
              href={doiHref(publication.doi)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              <Badge
                size="2"
                color="gray"
                variant="soft"
                className="seqout-accession"
                style={{ cursor: "pointer" }}
              >
                doi:{publication.doi}
              </Badge>
            </Link>
          )}
          <CiteDialog
            label="Cite"
            title="Citation"
            getText={() => formatCellCitation(publication)}
            toast="Citation copied"
          />
          {accession && (
            <CiteDialog
              label="BibTeX"
              title="BibTeX"
              getText={fetchBibtex}
              toast="BibTeX copied"
            />
          )}
        </Flex>
      </Flex>
    </Card>
  );
}
