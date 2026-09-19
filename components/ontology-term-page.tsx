import OntologyTermCollectionCard from "@/components/ontology-term-collection-card";
import SearchBar from "@/components/search-bar";
import { titleCaseTerm } from "@/utils/format";
import { ONTOLOGY_KINDS, type OntologyKind } from "@/utils/ontology-kinds";
import { Flex, Heading, Text } from "@radix-ui/themes";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export function ontologyTermMetadata(
  kind: OntologyKind,
  term: string,
): Metadata {
  const decoded = decodeURIComponent(term);
  const { ontology, annotated } = ONTOLOGY_KINDS[kind];
  return {
    title: `${titleCaseTerm(decoded)} datasets: GEO, SRA, ENA & more`,
    description: `Every GEO, SRA, ENA, DDBJ, GSA and ArrayExpress study with a sample ${annotated(decoded)}, resolved through ${ontology} and its descendants, with organism, assay, sample count and FASTQ availability per study.`,
    alternates: { canonical: `https://seqout.org/${kind}/${term}` },
  };
}

export default function OntologyTermPage({
  kind,
  term,
  children,
}: {
  kind: OntologyKind;
  term: string;
  children?: ReactNode;
}) {
  const decoded = decodeURIComponent(term);
  const { ontology, annotated } = ONTOLOGY_KINDS[kind];

  return (
    <>
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
          {titleCaseTerm(decoded)} datasets
        </Heading>
        <Text size={{ initial: "2", md: "3" }} color="gray">
          Studies with at least one sample {annotated(decoded)}, resolved
          through {ontology} identifiers and their descendants, across GEO, SRA,
          ENA, DDBJ, GSA and ArrayExpress. {children}
        </Text>
        <OntologyTermCollectionCard term={decoded} kind={kind} />
      </Flex>
    </>
  );
}
