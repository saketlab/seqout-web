import {
  generateSectionOgImage,
  sectionOgContentType,
  sectionOgSize,
} from "@/lib/section-og";

export const size = sectionOgSize;
export const contentType = sectionOgContentType;

export default function OpengraphImage() {
  return generateSectionOgImage({
    badge: "Single-cell",
    title: "Single-cell sequencing datasets",
    subtitle: "Modality, chemistry & cell calls",
    footer: "Across GEO, SRA, ENA, DDBJ DRA, and GSA",
    colors: { primary: "#4fb0a5", secondary: "#3a8880", accent: "#a8ddd6" },
  });
}
