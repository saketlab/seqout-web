import { extractHeadMeta, markdownResponse } from "@/lib/agent-markdown";
import { SITE_URL } from "@/utils/constants";

export const revalidate = 3600;

/** Fallback for routes without a dedicated /agent handler: title and description scraped from the real HTML. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await params;
  const { origin, search } = new URL(request.url);
  const pathname = `/${(path ?? []).join("/")}`;

  let html: string;
  try {
    // request's own origin, not SITE_URL, so this also works outside production
    const res = await fetch(new URL(`${pathname}${search}`, origin), {
      headers: { accept: "text/html" },
      next: { revalidate },
    });
    if (!res.ok) {
      return new Response("Not found", { status: res.status });
    }
    html = await res.text();
  } catch {
    return new Response("Upstream fetch failed", { status: 502 });
  }

  const { title, description } = extractHeadMeta(html);
  const url = `${SITE_URL}${pathname}${search}`;
  const lines = [`# ${title || pathname}`, ""];
  if (description) lines.push(description, "");
  lines.push(
    `Interactive page: ${url}`,
    `REST API reference: ${SITE_URL}/api-docs`,
  );

  return markdownResponse(lines.join("\n"), revalidate);
}
