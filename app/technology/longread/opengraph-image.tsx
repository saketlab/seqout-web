import {
  generateSectionOgImage,
  sectionOgContentType,
  sectionOgSize,
} from "@/lib/section-og";

export const size = sectionOgSize;
export const contentType = sectionOgContentType;

export default function OpengraphImage() {
  return generateSectionOgImage({
    badge: "Long-read",
    title: "Long-read sequencing datasets",
    subtitle: "PacBio & Oxford Nanopore",
    footer: "Across GEO, SRA, ENA, DDBJ DRA, and GSA",
    colors: { primary: "#d9a441", secondary: "#ab7f2f", accent: "#f0d9a0" },
  });
}
