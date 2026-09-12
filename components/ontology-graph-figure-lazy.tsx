"use client";

// Client-only: React Flow accesses the DOM. Split out of the (server) howsearchworks
// page so the ReactFlow runtime isn't in that route's initial bundle.
import dynamic from "next/dynamic";

const OntologyGraphFigure = dynamic(
  () => import("@/components/ontology-graph-figure"),
  { ssr: false },
);

export default OntologyGraphFigure;
