import SingleCellCollectionCard from "@/components/single-cell-collection-card";
import SearchBar from "@/components/search-bar";
import { Flex, Heading, Text } from "@radix-ui/themes";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Single-cell sequencing datasets: technology, tissue & organism",
  description:
    "Every study with single-cell matrix or read evidence across GEO, SRA, ENA, DDBJ and GSA, with modality, cell/nucleus call, chemistry, tissue, organism and FASTQ/matrix availability per study.",
  alternates: { canonical: "https://seqout.org/technology/single-cell" },
};

export default function SingleCellPage() {
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
          Single-cell datasets
        </Heading>
        <Text size={{ initial: "2", md: "3" }} color="gray">
          Studies with a counted matrix or read-derived single-cell evidence,
          or a declared single-cell classification, across GEO, SRA, ENA,
          DDBJ DRA and GSA. A study mirrored in more than one archive is
          listed once. Chemistry and cell/nucleus calls are read-derived from
          the raw FASTQ where available; modality is the study&apos;s own
          declared assay type.
        </Text>
        <SingleCellCollectionCard />
      </Flex>
    </>
  );
}
