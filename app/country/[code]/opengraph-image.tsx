import {
  generateSectionOgImage,
  sectionOgContentType,
  sectionOgSize,
  type SectionOgPoint,
} from "@/lib/section-og";
import { resolveCountrySlug } from "@/utils/country";
import { SERVER_API_BASE } from "@/utils/constants";

export const size = sectionOgSize;
export const contentType = sectionOgContentType;

type Props = {
  params: Promise<{ code: string }>;
};

async function fetchPoints(code: string): Promise<SectionOgPoint[]> {
  try {
    const res = await fetch(`${SERVER_API_BASE}/country/${code}/points`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.points) ? data.points : [];
  } catch {
    return [];
  }
}

export default async function OpengraphImage({ params }: Props) {
  const { code } = await params;
  const country = resolveCountrySlug(code);
  const points = country ? await fetchPoints(country.code) : [];
  return generateSectionOgImage({
    badge: country?.name ?? "Country",
    title: `Datasets from ${country?.name ?? "this country"}`,
    subtitle: "Organism, assay & FASTQ availability",
    footer: "Across GEO, SRA, ENA, DDBJ, GSA, and ArrayExpress",
    colors: { primary: "#4a90a4", secondary: "#376d7c", accent: "#9cc9d4" },
    points,
  });
}
