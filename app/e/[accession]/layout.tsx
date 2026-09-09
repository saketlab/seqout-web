import { SITE_URL } from "@/utils/constants";
import type { Metadata } from "next";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  params: Promise<{ accession: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { accession } = await params;
  const acc = decodeURIComponent(accession).toUpperCase();
  const canonicalUrl = `${SITE_URL}/e/${encodeURIComponent(acc)}`;
  const description = `Metadata, runs, and download links for experiment ${acc} on seqout.`;
  return {
    title: `${acc} - Experiment`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${acc} - Experiment`,
      description,
      url: canonicalUrl,
    },
    // ssr:false gives crawlers an empty body; indexing requires server rendering.
    robots: { index: false, follow: true },
  };
}

export default function ExperimentLayout({ children }: Props) {
  return children;
}
