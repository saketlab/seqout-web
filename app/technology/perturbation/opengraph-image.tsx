import {
  generateSectionOgImage,
  sectionOgContentType,
  sectionOgSize,
} from "@/lib/section-og";

export const size = sectionOgSize;
export const contentType = sectionOgContentType;

export default function OpengraphImage() {
  return generateSectionOgImage({
    badge: "Perturbation",
    title: "Single-cell perturbation datasets",
    subtitle: "CRISPR screens, drug response & data availability",
    footer: "Across GEO, SRA, ENA, DDBJ DRA, and GSA",
    colors: { primary: "#8e6bbf", secondary: "#6d4f99", accent: "#cdb8ea" },
  });
}
