import {
  generateSectionOgImage,
  sectionOgContentType,
  sectionOgSize,
} from "@/lib/section-og";
import { COLLECTIONS } from "./page";

export const size = sectionOgSize;
export const contentType = sectionOgContentType;

type Props = {
  params: Promise<{ collection: string }>;
};

export default async function OpengraphImage({ params }: Props) {
  const { collection } = await params;
  const meta = COLLECTIONS[collection];
  return generateSectionOgImage({
    badge: meta?.ogBadge ?? "Disease",
    title: meta?.heading ?? "Disease datasets",
    subtitle: meta?.ogSubtitle ?? "",
    footer: "Across GEO, SRA, ENA, and ArrayExpress",
    colors: { primary: "#c96570", secondary: "#9c4d56", accent: "#e8b0b6" },
  });
}
