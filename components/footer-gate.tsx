"use client";

import Footer from "@/components/footer";
import { useProjectReady } from "@/utils/useProjectReady";
import { usePathname } from "next/navigation";

export default function FooterGate() {
  const pathname = usePathname();
  const projectReady = useProjectReady();
  const isProjectPage = pathname.startsWith("/p/");
  const isSearchResultsPage = pathname === "/search";
  const isAuthorsPage = pathname === "/authors" || pathname.startsWith("/authors/");
  const isMapPage = pathname === "/map";

  const isVisible =
    !isSearchResultsPage &&
    !isAuthorsPage &&
    !isMapPage &&
    (!isProjectPage || projectReady);

  if (!isVisible) return null;

  return <Footer />;
}
