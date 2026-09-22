import SpatialCollectionCard from "@/components/spatial-collection-card";
import SearchBar from "@/components/search-bar";
import { Flex, Heading, Text } from "@radix-ui/themes";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Spatial transcriptomics datasets: Visium, Xenium, MERFISH and more",
  description:
    "Browse studies flagged spatial transcriptomics across GEO, SRA, ENA, DDBJ and GSA, with the named platform where the study's own text gives one, resolution (single-cell, spot, ROI) and matrix/FASTQ availability.",
  alternates: { canonical: "https://seqout.org/technology/spatial" },
};

export default function SpatialPage() {
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
          Spatial transcriptomics datasets
        </Heading>
        <Text size={{ initial: "2", md: "3" }} color="gray">
          Studies flagged spatial transcriptomics, across GEO, SRA, ENA, DDBJ
          DRA and GSA. Platform (Visium, Xenium, MERFISH, CosMx, Slide-seq
          and others) is named when the study text mentions it; many studies
          only describe themselves as spatial transcriptomics generically.
          Resolution and technology group platforms into
          single-cell/imaging, spot/sequencing, or ROI/hybrid (GeoMx DSP).
        </Text>
        <SpatialCollectionCard />
      </Flex>
    </>
  );
}
