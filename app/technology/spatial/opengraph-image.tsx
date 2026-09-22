import {
  generateSectionOgImage,
  sectionOgContentType,
  sectionOgSize,
} from "@/lib/section-og";

export const size = sectionOgSize;
export const contentType = sectionOgContentType;

export default function OpengraphImage() {
  return generateSectionOgImage({
    badge: "Spatial",
    title: "Spatial transcriptomics datasets",
    subtitle: "Visium, Xenium, MERFISH & resolution/technology filters",
    footer: "Across GEO, SRA, ENA, DDBJ DRA, and GSA",
    colors: { primary: "#3f9d6e", secondary: "#2c7350", accent: "#a9dcc0" },
  });
}
