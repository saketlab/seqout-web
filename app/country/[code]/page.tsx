import CountryCollectionCard from "@/components/country-collection-card";
import CountryFlagIcon from "@/components/country-flag-icon";
import SearchBar from "@/components/search-bar";
import { resolveCountrySlug } from "@/utils/country";
import { Flex, Heading, Text } from "@radix-ui/themes";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const country = resolveCountrySlug(code);
  if (!country) return {};
  return {
    title: `Sequencing datasets from ${country.name}: GEO, SRA, ENA & more`,
    description: `Every GEO, SRA, ENA, DDBJ, GSA and ArrayExpress study submitted from ${country.name}, with organism, assay, sample count and FASTQ/SRA availability per study.`,
    alternates: { canonical: `https://seqout.org/country/${code}` },
  };
}

export default async function CountryPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const country = resolveCountrySlug(code);
  if (!country) notFound();

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
        <Flex align="center" gap="2">
          <CountryFlagIcon code={country.code} label={country.name} />
          <Heading as="h1" size={{ initial: "6", md: "8" }} weight={"bold"}>
            Datasets from {country.name}
          </Heading>
        </Flex>
        <Text size={{ initial: "2", md: "3" }} color="gray">
          Studies whose submitter is located in {country.name}, across GEO,
          SRA, ENA, DDBJ, GSA and ArrayExpress. A study mirrored in more than
          one archive is listed once.
        </Text>
        <CountryCollectionCard code={country.code} />
      </Flex>
    </>
  );
}
