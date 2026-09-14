import { decodeHtmlEntities } from "@/lib/project-og";
import type { NextRequest } from "next/server";

const WHITESPACE_RE = /\s/g;

/** True when a media-range in Accept is text/markdown with a nonzero q value. */
export function wantsMarkdown(request: NextRequest): boolean {
  const accept = request.headers.get("accept") ?? "";
  return accept.split(",").some((range) => {
    const [type, ...params] = range.trim().toLowerCase().split(";");
    if (type !== "text/markdown") return false;
    return !params.some((p) => p.replace(WHITESPACE_RE, "") === "q=0");
  });
}

export function markdownResponse(body: string, revalidateSeconds: number) {
  return new Response(`${body.trim()}\n`, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": `public, max-age=0, s-maxage=${revalidateSeconds}`,
      vary: "accept",
    },
  });
}

const TITLE_RE = /<title>([^<]*)<\/title>/i;
const DESCRIPTION_RE = /<meta\s+name="description"\s+content="([^"]*)"/i;

/** Pulls <title> and the meta description out of rendered HTML; no DOM parser needed for two tags. */
export function extractHeadMeta(html: string): {
  title: string;
  description: string;
} {
  const title = html.match(TITLE_RE)?.[1] ?? "";
  const description = html.match(DESCRIPTION_RE)?.[1] ?? "";
  return {
    title: decodeHtmlEntities(title.trim()),
    description: decodeHtmlEntities(description.trim()),
  };
}
