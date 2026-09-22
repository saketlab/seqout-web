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
          Single-cell studies with genetic (CRISPR knockout, CRISPRi, CRISPRa,
          RNAi, ORF, base and prime editing) or chemical (drug or biologic)
          perturbation evidence, across GEO, SRA, ENA, DDBJ DRA and GSA. A study
          mirrored in more than one archive is listed once. Every call is
          rule-based, from named methods such as Perturb-seq, CROP-seq and
          sci-Plex, guide-library and control-arm design tests, and a ChEBI
          compound lexicon; no model assigns a label. Each row carries its
          confidence and the signals behind it, and shows whether a counted
          matrix, raw FASTQ, both or neither is available. The default view
          keeps high and medium confidence; weak single-signal calls are one
          click away and include false positives. A compound named only in a
          study&apos;s title (shown separately from confirmed compounds) is
          often what is being studied, not what was applied, so it never raises
          confidence past low. Cell line and sample-material tags describe what
          was sequenced, not the perturbation.
        </Text>
        <PerturbationCollectionCard />
      </Flex>
    </>
  );
}
