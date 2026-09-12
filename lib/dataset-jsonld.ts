import { doiHref, primaryPublicationDoi } from "@/utils/project";
import type { StudyPublication } from "@/utils/types";

/** The subset of a project/sample's data that feeds Dataset JSON-LD — shared
 * shape for both `/p` (lib/project-og.tsx) and `/s` (app/s/[accession]/layout.tsx). */
export type DatasetSourceInfo = {
  title: string;
  authors: string[];
  organisms: string[];
  libraryStrategies: string[];
  publications: StudyPublication[];
  publishedAt: string | null;
  updatedAt: string | null;
};

type DatasetJsonLdInput = Omit<DatasetSourceInfo, "title"> & {
  name: string;
  description: string;
  url: string;
  identifier: string;
  keywords: string[];
  license: string;
  catalogName: string;
  catalogUrl: string;
  distribution?: {
    "@type": "DataDownload";
    encodingFormat: string;
    contentUrl: string;
  }[];
};

/**
 * Dataset JSON-LD shared by project (/p) and sample (/s) pages.
 *
 * Saket Lab operates seqout; it didn't create the underlying study/sample, so
 * it's the `publisher`, not the dataset's `creator`. `creator` is only set
 * when real study authors are available — a wrong attribution is worse than
 * none.
 */
export function buildDatasetJsonLd({
  name,
  description,
  url,
  identifier,
  keywords,
  license,
  catalogName,
  catalogUrl,
  authors,
  organisms,
  libraryStrategies,
  publications,
  publishedAt,
  updatedAt,
  distribution,
}: DatasetJsonLdInput): { jsonLd: object; citationDoi: string | null } {
  const citationDoi = primaryPublicationDoi(publications);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name,
    description,
    url,
    identifier,
    keywords,
    license,
    includedInDataCatalog: {
      "@type": "DataCatalog",
      name: catalogName,
      url: catalogUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "Saket Lab",
      url: "https://saketlab.org",
    },
    ...(authors.length > 0 && {
      creator: authors.map((authorName) => ({
        "@type": "Person",
        name: authorName,
      })),
    }),
    ...(publishedAt && { datePublished: publishedAt }),
    ...(updatedAt && { dateModified: updatedAt }),
    ...((organisms.length > 0 || libraryStrategies.length > 0) && {
      variableMeasured: [
        ...organisms.map((organism) => `organism: ${organism}`),
        ...libraryStrategies.map(
          (strategy) => `library strategy: ${strategy}`,
        ),
      ],
    }),
    ...(citationDoi && { citation: doiHref(citationDoi) }),
    ...(distribution && distribution.length > 0 && { distribution }),
  };

  return { jsonLd, citationDoi };
}

/** Shared 3-level seqout → Search → accession trail used on both /p and /s pages. */
export function buildBreadcrumbJsonLd(
  accession: string,
  canonicalUrl: string,
  siteUrl: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "seqout", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "Search",
        item: `${siteUrl}/search`,
      },
      { "@type": "ListItem", position: 3, name: accession, item: canonicalUrl },
    ],
  };
}
