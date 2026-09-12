import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Accessions use uppercase in every supported namespace; lowercase URLs duplicate their pages.
const ACCESSION_ROUTE = /^\/([pser])\/([^/]+)$/;
const ACCESSION_SHAPE = /^[A-Z0-9][A-Z0-9._-]*$/;
// Strip stray leading/trailing junk (quotes, punctuation, etc.), e.g. /p/%22GSE52529%22
const JUNK_RE = /^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const accessionMatch = pathname.match(ACCESSION_ROUTE);
  if (accessionMatch) {
    const [, kind, raw] = accessionMatch;
    let decoded: string;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      return NextResponse.next();
    }
    const normalized = decoded.replace(JUNK_RE, "").toUpperCase();
    if (normalized !== decoded && ACCESSION_SHAPE.test(normalized)) {
      const url = request.nextUrl.clone();
      url.pathname = `/${kind}/${encodeURIComponent(normalized)}`;
      return NextResponse.redirect(url, 301);
    }
    return NextResponse.next();
  }

  // /project/geo/{accession} -> /p/{accession}
  if (pathname.startsWith("/project/geo/")) {
    const accession = pathname.slice(13); // Remove '/project/geo/'
    if (accession) {
      const url = request.nextUrl.clone();
      url.pathname = `/p/${accession}`;
      return NextResponse.redirect(url, 301);
    }
  }

  // /project/sra/{accession} -> /p/{accession}
  if (pathname.startsWith("/project/sra/")) {
    const accession = pathname.slice(13); // Remove '/project/sra/'
    if (accession) {
      const url = request.nextUrl.clone();
      url.pathname = `/p/${accession}`;
      return NextResponse.redirect(url, 301);
    }
  }

  // /project/g/{accession} -> /p/{accession} (short GEO format)
  if (pathname.startsWith("/project/g/")) {
    const accession = pathname.slice(11); // Remove '/project/g/'
    if (accession) {
      const url = request.nextUrl.clone();
      url.pathname = `/p/${accession}`;
      return NextResponse.redirect(url, 301);
    }
  }

  // /project/s/{accession} -> /p/{accession}
  if (pathname.startsWith("/project/s/")) {
    const accession = pathname.slice(11); // Remove '/project/s/'
    if (accession) {
      const url = request.nextUrl.clone();
      url.pathname = `/p/${accession}`;
      return NextResponse.redirect(url, 301);
    }
  }

  // /project/gse/{accession} -> /p/{accession} (alternate GEO format)
  if (pathname.startsWith("/project/gse/")) {
    const accession = pathname.slice(13); // Remove '/project/gse/'
    if (accession) {
      const url = request.nextUrl.clone();
      url.pathname = `/p/${accession}`;
      return NextResponse.redirect(url, 301);
    }
  }

  // /technology/singlecell -> /technology/single-cell (renamed)
  if (pathname === "/technology/singlecell") {
    const url = request.nextUrl.clone();
    url.pathname = "/technology/single-cell";
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/p/:path*",
    "/s/:path*",
    "/e/:path*",
    "/r/:path*",
    "/project/geo/:path*",
    "/project/sra/:path*",
    "/project/g/:path*",
    "/project/s/:path*",
    "/project/gse/:path*",
    "/technology/singlecell",
  ],
};
