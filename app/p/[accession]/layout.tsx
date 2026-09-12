import {
  fetchProjectDatasetInfo,
  fetchProjectTitleLookup,
} from "@/lib/project-og";
import { buildBreadcrumbJsonLd, buildDatasetJsonLd } from "@/lib/dataset-jsonld";
import { escapeHtmlJson } from "@/utils/json";
import {
  type Archive,
  ARCHIVE_CATALOG_URLS as CATALOG_URLS,
  ARCHIVE_LICENSE_URLS as LICENSE_URLS,
  SITE_URL,
} from "@/utils/constants";
import {
  ARCHIVE_BY_DB,
  dbForAccession,
  type DbSource,
} from "@/utils/db-colors";
import { doiHref } from "@/utils/project";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

export const revalidate = 86400;

type Props = {
  children: ReactNode;
  params: Promise<{ accession: string }>;
};

const PROJECT_NOUN: Record<DbSource, string> = {
  geo: "Series",
  sra: "Study",
  ena: "Study",
  arrayexpress: "Experiment",
  gsa: "Study",
  dra: "Study",
  gea: "Experiment",
};

function detectProjectType(accession: string): {
  type: string;
  database: Archive;
} {
  const db = dbForAccession(accession) ?? "sra";
  const database = ARCHIVE_BY_DB[db];
  return { type: `${database} ${PROJECT_NOUN[db]}`, database };
}

async function requireProjectTitle(accession: string): Promise<string> {
  const lookup = await fetchProjectTitleLookup(accession);
  if (lookup.status === "missing") notFound();
  if (lookup.status === "error") {
    throw new Error(`Project lookup failed for ${accession}`);
  }
  return lookup.title;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const accession = (await params).accession.toUpperCase();
  const title = await requireProjectTitle(accession);
  const { type: projectType, database } = detectProjectType(accession);

  const pageTitle = `${accession} - ${title}`;
  const description = `Explore ${projectType} ${accession}: ${title}. View unified metadata, samples, experiments, and similar projects on seqout.`;
  const image = `/p/${encodeURIComponent(accession)}/opengraph-image`;
  const canonicalUrl = `${SITE_URL}/p/${encodeURIComponent(accession)}`;

  return {
    title: pageTitle,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${title} • ${accession}`,
      description: `${projectType} on ${database} • ${title}`,
      type: "article",
      url: canonicalUrl,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${accession} - ${title} (${database})`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} • ${accession}`,
      description: `${projectType} on ${database}`,
      images: [image],
    },
  };
}

export default async function ProjectLayout({ children, params }: Props) {
  const accession = (await params).accession.toUpperCase();
  const lookup = await fetchProjectDatasetInfo(accession);
  if (lookup.status === "missing") notFound();
  if (lookup.status === "error") {
    throw new Error(`Project lookup failed for ${accession}`);
  }
  const {
    title,
    authors,
    organisms,
    libraryStrategies,
    publications,
    publishedAt,
    updatedAt,
  } = lookup.data;
  const { type: projectType, database } = detectProjectType(accession);
  const description = `Explore ${projectType} ${accession}: ${title}. View unified metadata, samples, experiments, and similar projects on seqout.`;

  const canonicalUrl = `${SITE_URL}/p/${encodeURIComponent(accession)}`;

  const { jsonLd, citationDoi } = buildDatasetJsonLd({
    name: `${accession} - ${title}`,
    description,
    url: canonicalUrl,
    identifier: accession,
    keywords: [
      database,
      "sequencing",
      "sample metadata",
      "experiment metadata",
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
    distribution: [
      {
        "@type": "DataDownload",
        encodingFormat: "text/csv",
        contentUrl: `${SITE_URL}/api/project/${encodeURIComponent(
          accession,
        )}/metadata/download`,
      },
      {
        "@type": "DataDownload",
        encodingFormat: "text/tab-separated-values",
        contentUrl: `${SITE_URL}/api/project/${encodeURIComponent(
          accession,
        )}/runs/download`,
      },
    ],
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
