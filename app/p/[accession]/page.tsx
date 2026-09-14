"use client";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import QueryHighlight from "@/components/query-highlight";

// Dynamically import the appropriate project page component
const GeoProjectPage = dynamic(() => import("@/components/geo-project-page"), {
  ssr: false,
});

const SraProjectPage = dynamic(() => import("@/components/sra-project-page"), {
  ssr: false,
});

export default function UnifiedProjectPage() {
  const params = useParams();
  const accession = params.accession as string | undefined;

  // Detect project type from accession prefix
  // GEO projects: GSE, GPL, GDS, etc.
  // ArrayExpress: E-XXXX-NNN (similar structure to GEO - experiment → samples)
  // SRA projects: SRP, ERP, DRP (study → experiments → samples)
  const upperAccession = accession?.toUpperCase();
  const isGeoLike = upperAccession?.startsWith("G") || upperAccession?.startsWith("E-");

  return (
    <>
      {}
      <Suspense fallback={null}>
        <QueryHighlight />
      </Suspense>
      {isGeoLike ? <GeoProjectPage /> : <SraProjectPage />}
    </>
  );
}
