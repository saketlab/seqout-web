"use client";

// Radial synonym graph for a query term, with React Flow pan, zoom, and dragging.

import type { ExpansionChunk } from "@/utils/api";
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "next-themes";

const nodeStyle = (isRoot: boolean): React.CSSProperties => ({
  padding: "6px 10px",
  fontSize: 11,
  lineHeight: 1.3,
  borderRadius: 6,
  textAlign: "center",
  width: 170,
  ...(isRoot ? { border: "2px solid var(--accent-9)" } : {}),
});

function build(chunk: ExpansionChunk): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [
    {
      id: "__root__",
      position: { x: 0, y: 0 },
      data: { label: chunk.term },
      style: nodeStyle(true),
    },
  ];
  const edges: Edge[] = [];
  const m = chunk.synonyms.length;
  const ring = 180 + m * 10;

  chunk.synonyms.forEach((syn, i) => {
    const angle = (2 * Math.PI * i) / m - Math.PI / 2;
    nodes.push({
      id: syn,
      position: { x: Math.cos(angle) * ring, y: Math.sin(angle) * ring },
      data: { label: syn },
      style: nodeStyle(false),
    });
    edges.push({
      id: `__root__->${syn}`,
      source: "__root__",
      target: syn,
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
    });
  });

  return { nodes, edges };
}

// Parent remounts per term (key=term); layout builds once, drags stay in React Flow's own state.
export default function ExpansionGraph({ chunk }: { chunk: ExpansionChunk }) {
  const initial = build(chunk);
  const [nodes, , onNodesChange] = useNodesState(initial.nodes);
  const [edges, , onEdgesChange] = useEdgesState(initial.edges);
  const { resolvedTheme } = useTheme();

  return (
    <div
      style={{
        height: 420,
        border: "1px solid var(--gray-5)",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        colorMode={resolvedTheme === "dark" ? "dark" : "light"}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        nodesConnectable={false}
        minZoom={0.1}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
