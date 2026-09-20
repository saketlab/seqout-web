import OntologyTermCollectionCard from "@/components/ontology-term-collection-card";
import SearchBar from "@/components/search-bar";
import { SITE_URL } from "@/utils/constants";
import { escapeHtmlJson } from "@/utils/json";
import {
  ONTOLOGY_KINDS,
  ontologyTermHref,
  safeDecode,
  termSlug,
  type OntologyKind,
} from "@/utils/ontology-kinds";
import {
  fetchTermProjects,
  resolveOntologyTerm,
} from "@/utils/ontology-term-server";
import { Flex, Heading, Text } from "@radix-ui/themes";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import type { ReactNode } from "react";

export async function ontologyTermMetadata(
  kind: OntologyKind,
  slug: string,
): Promise<Metadata> {
  const r = await resolveOntologyTerm(kind, slug);
  if (r.status === "none") return {};
  const alternates = { canonical: `${SITE_URL}${ontologyTermHref(kind, r.term)}` };
  const title = `${r.label} datasets: GEO, SRA, ENA & more`;
  if (r.status === "unavailable") return { title, alternates };

  const { ontology, annotated } = ONTOLOGY_KINDS[kind];
  const studies = r.summary.studies.toLocaleString("en-US");
  return {
    title,
    // substring matches are arbitrary visitor spellings; index exact terms only
    robots: r.summary.resolution === "exact" ? undefined : { index: false, follow: true },
    description: `${studies} GEO, SRA, ENA, DDBJ, GSA and ArrayExpress studies with a sample ${annotated(r.inline)}, resolved through ${ontology} and its descendants, with organism, assay, sample count and FASTQ availability per study.`,
    alternates,
  };
}

export default async function OntologyTermPage({
  kind,
  slug,
  children,
}: {
  kind: OntologyKind;
  slug: string;
  children?: ReactNode;
}) {
  const r = await resolveOntologyTerm(kind, slug);
  // unknown terms return 404
  if (r.status === "none") notFound();
  // one URL per term; old %20 and mixed-case links redirect
  if (r.status === "ok" && safeDecode(slug) !== termSlug(r.term)) {
    permanentRedirect(ontologyTermHref(kind, r.term));
  }

  const { ontology, annotated } = ONTOLOGY_KINDS[kind];
  const { term, label, inline } = r;
  const summary = r.status === "ok" ? r.summary : undefined;
  const projects = summary && (await fetchTermProjects(kind, term));
  const url = `${SITE_URL}${ontologyTermHref(kind, term)}`;

  const jsonLd = summary && {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "seqout", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: `${label} datasets`, item: url },
        ],
      },
      {
        "@type": "CollectionPage",
        name: `${label} datasets`,
        url,
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: summary.studies,
          itemListElement: (projects?.results ?? [])
            .slice(0, 25)
            .map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `${SITE_URL}/p/${p.study_accession}`,
              name: p.title ?? p.study_accession,
            })),
        },
      },
    ],
  };

  return (
    <>
      {jsonLd && (
        <script type="application/ld+json">{escapeHtmlJson(jsonLd)}</script>
      )}
      <SearchBar />
      <Flex
        gap="4"
        py={{ initial: "4", md: "4" }}
        px={{ initial: "4", md: "0" }}
        ml={{ initial: "0", md: "13rem" }}
        mr={{ initial: "0", md: "16rem" }}
        direction="column"
      >
        <Heading as="h1" size={{ initial: "6", md: "8" }} weight="bold">
          {label} datasets
        </Heading>
        <Text size={{ initial: "2", md: "3" }} color="gray">
          Studies with at least one sample {annotated(inline)}, resolved through{" "}
          {ontology} identifiers and their descendants, across GEO, SRA, ENA,
          DDBJ, GSA and ArrayExpress. {children}
        </Text>
        <OntologyTermCollectionCard
          term={term}
          kind={kind}
          initialSummary={summary}
          initialProjects={projects || undefined}
        />
      </Flex>
    </>
  );
}
