import LongReadCollectionCard from "@/components/longread-collection-card";
import SearchBar from "@/components/search-bar";
import { Flex, Heading, Link, Text } from "@radix-ui/themes";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Long-read sequencing datasets: PacBio & Oxford Nanopore",
  description:
    "Every GEO, SRA, ENA, DDBJ and GSA study with PacBio or Oxford Nanopore sequencing, with instrument, library strategy, organism and download availability per study.",
  alternates: { canonical: "https://seqout.org/technology/longread" },
};

export default function LongReadPage() {
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
          Long-read datasets
        </Heading>
        <Text size={{ initial: "2", md: "3" }} color="gray">
          Studies with at least one PacBio or Oxford Nanopore experiment, across
          GEO, SRA, ENA, DDBJ DRA and GSA. A study mirrored in more than one
          archive is listed once. Hybrid studies also sequenced on a short-read
          platform. To search within long-read data by keyword, tick “Long-read
          studies only” in the search filters, or add{" "}
          <code>long_read=true</code> to an API search (
          <Link href="/api-docs">API docs</Link>).
        </Text>
        <LongReadCollectionCard />
      </Flex>
    </>
  );
}
