import PerturbationCollectionCard from "@/components/perturbation-collection-card";
import SearchBar from "@/components/search-bar";
import { Flex, Heading, Text } from "@radix-ui/themes";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Single-cell perturbation datasets: CRISPR screens and drug response",
  description:
    "Browse single-cell studies with genetic (CRISPR, RNAi, ORF) or chemical (drug) perturbation evidence across GEO, SRA, ENA, DDBJ and GSA, with detection confidence, readout assay, and matrix/FASTQ availability.",
  alternates: { canonical: "https://seqout.org/technology/perturbation" },
};

export default function PerturbationPage() {
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
        <Heading as="h1" size={{ initial: "6", md: "8" }} weight={"bold"}>
          Single-cell perturbation datasets
        </Heading>
        <Text size={{ initial: "2", md: "3" }} color="gray">
          Single-cell studies with genetic (CRISPR, RNAi, ORF, base/prime
          editing) or chemical (drug or biologic) perturbation evidence,
          across GEO, SRA, ENA, DDBJ DRA and GSA. A study mirrored in more
          than one archive appears once. Every call is rule-based, from
          named methods, guide-library and control-arm design tests, and a
          ChEBI compound lexicon; The default view
          keeps high and medium confidence.
        </Text>
        <PerturbationCollectionCard />
      </Flex>
    </>
  );
}
