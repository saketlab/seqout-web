"use client";

// Client-only: deck.gl accesses the DOM. Split out of the (server) stats
// page so the deck.gl/AG Grid runtime isn't in that route's initial bundle.
import dynamic from "next/dynamic";

const StatsGlobalContributionsCard = dynamic(
  () => import("@/components/stats-global-contributions-card"),
  { ssr: false },
);

export default StatsGlobalContributionsCard;
