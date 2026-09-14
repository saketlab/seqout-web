import { hasFlag } from "country-flag-icons";
import { readFile } from "node:fs/promises";
import path from "node:path";

/** Streams one flag's SVG per request, keeping the rest out of the client bundle. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const code = (await params).code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code) || !hasFlag(code)) {
    return new Response("Flag not found", { status: 404 });
  }

  const svg = await readFile(
    path.join(
      process.cwd(),
      "node_modules/country-flag-icons/3x2",
      `${code}.svg`,
    ),
    "utf8",
  );
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
