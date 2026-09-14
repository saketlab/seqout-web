import { markdownResponse } from "@/lib/agent-markdown";
import { fetchProjectDatasetInfo } from "@/lib/project-og";
import { SITE_URL } from "@/utils/constants";
import { doiHref } from "@/utils/project";

export const revalidate = 3600;

/** Markdown mirror of /p/[accession] for Accept: text/markdown, wired up in proxy.ts. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ accession: string }> },
) {
  const accession = (await params).accession.toUpperCase();
  const lookup = await fetchProjectDatasetInfo(accession);
  if (lookup.status === "missing") {
    return new Response("Not found", { status: 404 });
  }
  if (lookup.status === "error") {
    return new Response("Upstream lookup failed", { status: 502 });
  }

  const {
    title,
    authors,
    organisms,
    libraryStrategies,
    publications,
    publishedAt,
    updatedAt,
  } = lookup.data;
  const encoded = encodeURIComponent(accession);

  const lines = [
    `# ${accession}: ${title}`,
    "",
    `Interactive page: ${SITE_URL}/p/${encoded}`,
    `Metadata (JSON): ${SITE_URL}/api/project/${encoded}`,
    `Samples and experiments (CSV): ${SITE_URL}/api/project/${encoded}/metadata/download`,
    "",
  ];

  if (organisms.length) lines.push(`**Organisms:** ${organisms.join(", ")}`);
  if (libraryStrategies.length)
    lines.push(`**Library strategies:** ${libraryStrategies.join(", ")}`);
  if (authors.length) lines.push(`**Authors:** ${authors.join(", ")}`);
  if (publishedAt) lines.push(`**Published:** ${publishedAt}`);
  if (updatedAt) lines.push(`**Last updated:** ${updatedAt}`);

  if (publications.length) {
    lines.push("", "## Publications");
    for (const pub of publications) {
      const venue = [pub.journal, pub.pub_date].filter(Boolean).join(", ");
      const doi = pub.doi ? ` - ${doiHref(pub.doi)}` : "";
      lines.push(`- ${pub.title ?? "Untitled"}${venue ? ` (${venue})` : ""}${doi}`);
    }
  }

  return markdownResponse(lines.join("\n"), revalidate);
}
