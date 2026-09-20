import {
  generateSectionOgImage,
  sectionOgContentType,
  sectionOgSize,
} from "@/lib/section-og";
import { termLabel } from "@/utils/ontology-term-server";
import { COLLECTIONS } from "./page";

export const size = sectionOgSize;
export const contentType = sectionOgContentType;

type Props = {
  params: Promise<{ collection: string }>;
};

export default async function OpengraphImage({ params }: Props) {
  const { collection } = await params;
  const meta = COLLECTIONS[collection];
  const title =
    meta?.heading ?? `${await termLabel("disease", collection)} datasets`;
  return generateSectionOgImage({
    badge: meta?.ogBadge ?? "Disease",
    title,
    subtitle: meta?.ogSubtitle ?? "",
    footer: "Across GEO, SRA, ENA, and ArrayExpress",
    colors: { primary: "#c96570", secondary: "#9c4d56", accent: "#e8b0b6" },
  });
}
