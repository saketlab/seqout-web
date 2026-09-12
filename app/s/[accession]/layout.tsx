import {
  buildBreadcrumbJsonLd,
  buildDatasetJsonLd,
  type DatasetSourceInfo,
} from "@/lib/dataset-jsonld";
import {
  type Archive,
  ARCHIVE_CATALOG_URLS as CATALOG_URLS,
  ARCHIVE_LICENSE_URLS as LICENSE_URLS,
  SITE_URL,
} from "@/utils/constants";
import { escapeHtmlJson } from "@/utils/json";
import { ARCHIVE_BY_DB, dbForAccession } from "@/utils/db-colors";
import { doiHref, normalizeAliases, normalizeAuthors } from "@/utils/project";
import type { StudyPublication } from "@/utils/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

const API_BASE_URL = process.env.PYSRAWEB_API_BASE ?? "https://seqout.org/api";

export const revalidate = 86400;

type Props = {
  children: ReactNode;
  params: Promise<{ accession: string }>;
};

function detectSampleType(accession: string): {
  type: string;
  database: Archive;
} {
  const upper = accession.toUpperCase();
  const database = ARCHIVE_BY_DB[dbForAccession(upper) ?? "sra"];
  if (upper.startsWith("GSM")) return { type: "GEO Sample", database };
  if (/^[SED]RX/.test(upper))
    return { type: `${database} Experiment`, database };
  if (/^[SED]RS/.test(upper)) return { type: `${database} Sample`, database };
  if (upper.startsWith("SAM")) return { type: "BioSample", database };
  return { type: "Sample", database };
}

async function requireSampleTitle(accession: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(
      `${API_BASE_URL}/sample-detail/${encodeURIComponent(accession)}`,
      { next: { revalidate: 3600 } },
    );
  } catch {
    throw new Error(`Sample lookup failed for ${accession}`);
  }

  if (res.status === 404 || res.status === 422) notFound();
  if (!res.ok) throw new Error(`Sample lookup failed for ${accession}`);

  const data = await res.json();
  const sample = data?.sample;
  if (!sample) notFound();
  return sample.title?.trim() || accession;
}

// samples reuse the parent project's authors/citation, same as the Parent project section
type SampleDatasetInfo = DatasetSourceInfo;

/** Same /sample-detail/{accession} payload as requireSampleTitle, plus the nested project fields Dataset JSON-LD needs. */
async function fetchSampleDatasetInfo(
  accession: string,
): Promise<SampleDatasetInfo> {
  let res: Response;
  try {
    res = await fetch(
      `${API_BASE_URL}/sample-detail/${encodeURIComponent(accession)}`,
      { next: { revalidate: 3600 } },
    );
  } catch {
    throw new Error(`Sample lookup failed for ${accession}`);
  }

  if (res.status === 404 || res.status === 422) notFound();
  if (!res.ok) throw new Error(`Sample lookup failed for ${accession}`);

  const data = await res.json();
  const sample = data?.sample;
  if (!sample) notFound();

  const project = data?.project as
    | {
        authors?: string | string[] | null;
        organisms?: string | string[] | null;
        library_strategies?: string[] | null;
        publications?: StudyPublication[] | null;
        published_at?: string | null;
        updated_at?: string | null;
      }
    | null
    | undefined;

  return {
    title: sample.title?.trim() || accession,
    authors: normalizeAuthors(project?.authors ?? null),
    organisms: normalizeAliases(project?.organisms ?? null),
    libraryStrategies: (project?.library_strategies ?? []).filter(Boolean),
    publications: project?.publications ?? [],
    publishedAt: project?.published_at ?? null,
    updatedAt: project?.updated_at ?? null,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const accession = (await params).accession.toUpperCase();
  const title = await requireSampleTitle(accession);
  const { type: sampleType, database } = detectSampleType(accession);

  const pageTitle = `${accession} - ${title}`;
  const description = `Explore ${sampleType} ${accession}: ${title}. View metadata, experiment info, and download links on seqout.`;
  const canonicalUrl = `${SITE_URL}/s/${encodeURIComponent(accession)}`;

  return {
    title: pageTitle,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${title} • ${accession}`,
      description: `${sampleType} on ${database} • ${title}`,
      type: "article",
      url: canonicalUrl,
    },
    twitter: {
      card: "summary",
      title: `${title} • ${accession}`,
      description: `${sampleType} on ${database}`,
    },
  };
}

export default async function SampleLayout({ children, params }: Props) {
  const accession = (await params).accession.toUpperCase();
  const {
    title,
    authors,
    organisms,
    libraryStrategies,
    publications,
    publishedAt,
    updatedAt,
  } = await fetchSampleDatasetInfo(accession);
  const { type: sampleType, database } = detectSampleType(accession);
  const description = `Explore ${sampleType} ${accession}: ${title}. View metadata, experiment info, and download links on seqout.`;

  const canonicalUrl = `${SITE_URL}/s/${encodeURIComponent(accession)}`;

  const { jsonLd, citationDoi } = buildDatasetJsonLd({
    name: `${accession} - ${title}`,
    description,
    url: canonicalUrl,
    identifier: accession,
    keywords: [
      database,
      "sequencing",
      "sample metadata",
      "genomics",
      accession,
    ],
    license: LICENSE_URLS[database],
    catalogName: database,
    catalogUrl: CATALOG_URLS[database],
    authors,
    organisms,
    libraryStrategies,
    publications,
    publishedAt,
    updatedAt,
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(accession, canonicalUrl, SITE_URL);

  return (
    <>
      {citationDoi && <link rel="cite-as" href={doiHref(citationDoi)} />}
      <script type="application/ld+json">{escapeHtmlJson(jsonLd)}</script>
      <script type="application/ld+json">
        {escapeHtmlJson(breadcrumbJsonLd)}
      </script>
      {children}
    </>
  );
}
