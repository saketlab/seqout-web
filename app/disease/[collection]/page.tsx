import DiseaseCollectionCard from "@/components/disease-collection-card";
import SearchBar from "@/components/search-bar";
import { Flex, Heading, Text } from "@radix-ui/themes";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

const SCOPE_NOTE =
  "Both are scoped to human patient material: cell lines and non-human models are excluded, and sample counts cover only the matching samples.";

export const COLLECTIONS: Record<
  string,
  {
    heading: string;
    title: string;
    description: string;
    blurb: string;
    ogBadge: string;
    ogSubtitle: string;
  }
> = {
  rare: {
    heading: "Rare disease datasets",
    title: "Rare disease datasets: GEO, SRA, ENA & ArrayExpress",
    description:
      "Explore sequencing studies annotated with NIH GARD rare diseases, matched by MONDO identifier, with per-study sample, cell, assay and sex breakdowns.",
    blurb: `Studies with at least one sample annotated with a NIH GARD rare disease, matched by MONDO identifier and its ancestor closure. ${SCOPE_NOTE}`,
    ogBadge: "Rare disease",
    ogSubtitle: "NIH GARD, matched by MONDO",
  },
  nord: {
    heading: "NORD rare disease datasets",
    title: "NORD rare disease datasets: GEO, SRA, ENA & ArrayExpress",
    description:
      "Explore sequencing studies annotated with a NORD rare disease, matched onto MONDO identifiers and their ancestor closure, with per-study sample, cell, assay and sex breakdowns.",
    blurb: `Studies with at least one sample annotated with a disease in NORD’s catalogue, matched by MONDO identifier and its ancestor closure. NORD publishes no identifier of its own, so the mapping is by name and covers 93% of its entries; the GARD collection is matched by exact cross-reference and is the stricter set. ${SCOPE_NOTE}`,
    ogBadge: "NORD",
    ogSubtitle: "NORD catalogue, matched by MONDO",
  },
};

export function generateStaticParams() {
  return Object.keys(COLLECTIONS).map((collection) => ({ collection }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ collection: string }>;
}): Promise<Metadata> {
  const { collection } = await params;
  const meta = COLLECTIONS[collection];
  if (!meta) return {};
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `https://seqout.org/disease/${collection}` },
  };
}

export default async function DiseasePage({
  params,
}: {
  params: Promise<{ collection: string }>;
}) {
  const { collection } = await params;
  const meta = COLLECTIONS[collection];
  if (!meta) notFound();

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
          {meta.heading}
        </Heading>
        <Text size={{ initial: "2", md: "3" }} color="gray">
          {meta.blurb}
        </Text>
        <DiseaseCollectionCard collection={collection} />
      </Flex>
    </>
  );
}
