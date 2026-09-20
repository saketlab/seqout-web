import OntologyTermPage, {
  ontologyTermMetadata,
} from "@/components/ontology-term-page";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ term: string }>;
}): Promise<Metadata> {
  const { term } = await params;
  return ontologyTermMetadata("tissue", term);
}

export default async function TissuePage({
  params,
}: {
  params: Promise<{ term: string }>;
}) {
  const { term } = await params;
  return <OntologyTermPage kind="tissue" slug={term} />;
}
