import {
  generateSectionOgImage,
  sectionOgContentType,
  sectionOgSize,
} from "@/lib/section-og";
import { termLabel } from "@/utils/ontology-term-server";

export const size = sectionOgSize;
export const contentType = sectionOgContentType;

type Props = {
  params: Promise<{ term: string }>;
};

export default async function OpengraphImage({ params }: Props) {
  const { term } = await params;
  return generateSectionOgImage({
    badge: "Tissue",
    title: `${await termLabel("tissue", term)} datasets`,
    subtitle: "Resolved through UBERON and its descendants",
    footer: "Across GEO, SRA, ENA, DDBJ, GSA, and ArrayExpress",
    colors: { primary: "#7a6ba0", secondary: "#5c5087", accent: "#c1b8dd" },
  });
}
