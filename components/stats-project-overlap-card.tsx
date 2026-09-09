"use client";

import SectionAnchor from "@/components/section-anchor";
import { DB_COLOR_MAP, DB_LABELS, type DbSource } from "@/utils/db-colors";
import { humanize } from "@/utils/format";
import { useProjectOverlap } from "@/utils/useStats";
import {
  Box,
  Flex,
  Heading,
  SegmentedControl,
  Skeleton,
  Table,
  Text,
} from "@radix-ui/themes";
import { useMemo, useState } from "react";

/** Inline SVG because ApexCharts has no UpSet type. */

const BAR_H = 132;
const ROW_H = 22;
const COL_W = 26;
const LEFT_W = 168;
const PAD = 8;

type Mode = "chart" | "table";
type Intersection = { sets: string[]; count: number; degree: number };

const label = (s: string) => DB_LABELS[s] ?? s;

function frac(v: number, max: number, log: boolean): number {
  return log
    ? Math.log10(Math.max(v, 1)) / Math.log10(Math.max(max, 10))
    : v / Math.max(max, 1);
}

export default function StatsProjectOverlapCard() {
  const { data, isLoading } = useProjectOverlap();
  const [mode, setMode] = useState<Mode>("chart");
  // the long tail of tiny combinations makes the matrix unreadable
  const [limit, setLimit] = useState(15);
  // linear renders every archive but the top two as a sliver
  const [logScale, setLogScale] = useState(true);

  const view = useMemo(() => {
    if (!data) return null;
    // both arrive ordered from SQL; not re-sorted here
    const rows = data.databases.map((id) => ({
      id,
      size: data.set_sizes[id] ?? 0,
    }));
    const cols = data.intersections.slice(0, limit);
    const maxCount = Math.max(...cols.map((c) => c.count), 1);
    const maxSet = Math.max(...rows.map((r) => r.size), 1);
    return {
      rows,
      cols,
      total: data.total_projects,
      builtAt: data.built_at,
      nCombinations: data.intersections.length,
      barFrac: (v: number) => frac(v, maxCount, logScale),
      setFrac: (v: number) => frac(v, maxSet, logScale),
    };
  }, [data, limit, logScale]);

  if (isLoading || !view) {
    return (
      <Flex direction="column" gap="3">
        <Skeleton height="24px" width="280px" />
        <Skeleton height="320px" />
      </Flex>
    );
  }

  const { rows, cols, total, builtAt, nCombinations, barFrac, setFrac } = view;
  const width = LEFT_W + cols.length * COL_W + PAD * 2;
  const height = BAR_H + rows.length * ROW_H + PAD * 3;
  const matrixTop = BAR_H + PAD * 2;
  const biggest = rows[0];
  const smallest = rows[rows.length - 1];

  return (
    <Flex direction="column" gap="3">
      <Flex align="center" justify="between" wrap="wrap" gap="2">
        <Flex align="center" gap="2">
          <Heading size="4">Projects shared across archives</Heading>
          <SectionAnchor id="project-overlap" />
        </Flex>
        <Flex align="center" gap="3">
          <SegmentedControl.Root
            size="1"
            value={String(limit)}
            onValueChange={(v) => setLimit(Number(v))}
          >
            <SegmentedControl.Item value="10">10</SegmentedControl.Item>
            <SegmentedControl.Item value="15">15</SegmentedControl.Item>
            <SegmentedControl.Item value={String(nCombinations)}>
              All
            </SegmentedControl.Item>
          </SegmentedControl.Root>
          <SegmentedControl.Root
            size="1"
            value={logScale ? "log" : "linear"}
            onValueChange={(v) => setLogScale(v === "log")}
          >
            <SegmentedControl.Item value="linear">Linear</SegmentedControl.Item>
            <SegmentedControl.Item value="log">Log</SegmentedControl.Item>
          </SegmentedControl.Root>
          <SegmentedControl.Root
            size="1"
            value={mode}
            onValueChange={(v) => setMode(v as Mode)}
          >
            <SegmentedControl.Item value="chart">Chart</SegmentedControl.Item>
            <SegmentedControl.Item value="table">Table</SegmentedControl.Item>
          </SegmentedControl.Root>
        </Flex>
      </Flex>

      <Text size="1" color="gray">
        {humanize(total)} projects across {rows.length} archives. A project is a
        connected component of cross-archive accession links, so the same study
        under GSE, SRP, PRJNA and E-MTAB counts once. Each bar is an{" "}
        <strong>exclusive</strong> count: every project appears in exactly one
        column.{" "}
        {logScale &&
          `Bars are log-scaled. ${label(biggest.id)} holds ${humanize(
            biggest.size,
          )} projects, ${label(smallest.id)} ${humanize(smallest.size)}.`}{" "}
        {/* Rebuilt by a script; refresh timing depends on that script. */}
        Links last mapped {new Date(builtAt).toLocaleDateString()}.
      </Text>

      {mode === "table" ? (
        <OverlapTable rows={cols} />
      ) : (
        <Box style={{ overflowX: "auto" }}>
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`UpSet plot: ${cols.length} archive combinations`}
            style={{ display: "block", minWidth: width }}
          >
            {rows.map((r, ri) =>
              ri % 2 === 0 ? (
                <rect
                  key={`zebra-${r.id}`}
                  x={PAD}
                  y={matrixTop + ri * ROW_H}
                  width={LEFT_W + cols.length * COL_W}
                  height={ROW_H}
                  fill="var(--gray-3)"
                />
              ) : null,
            )}

            {rows.map((r, ri) => {
              const cy = matrixTop + ri * ROW_H + ROW_H / 2;
              const sw = setFrac(r.size) * 44;
              return (
                <g key={r.id}>
                  <circle
                    cx={PAD + 5}
                    cy={cy}
                    r={3.5}
                    fill={DB_COLOR_MAP[r.id as DbSource]?.hex ?? "var(--gray-9)"}
                  />
                  <text
                    x={PAD + 14}
                    y={cy + 3.5}
                    fontSize={11}
                    fill="var(--gray-12)"
                  >
                    {label(r.id)}
                  </text>
                  <rect
                    x={LEFT_W - 8 - sw}
                    y={cy - 5}
                    width={sw}
                    height={10}
                    rx={2}
                    fill="var(--gray-7)"
                  />
                  <text
                    x={LEFT_W - 12 - sw}
                    y={cy + 3.5}
                    textAnchor="end"
                    fontSize={9}
                    fill="var(--gray-11)"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {humanize(r.size)}
                  </text>
                  <title>
                    {label(r.id)}: {r.size.toLocaleString()} projects total
                  </title>
                </g>
              );
            })}

            {cols.map((c, i) => {
              const h = Math.max(2, barFrac(c.count) * (BAR_H - 16));
              const left = LEFT_W + i * COL_W + PAD;
              const x = left + (COL_W - 2) / 2;
              const idx = c.sets.map((s) => rows.findIndex((r) => r.id === s));
              const y = (ri: number) => matrixTop + ri * ROW_H + ROW_H / 2;
              return (
                <g key={`col-${c.sets.join("+")}`}>
                  <title>
                    {c.sets.map(label).join(" + ")}:{" "}
                    {c.count.toLocaleString()} projects
                  </title>
                  <rect
                    x={left + 3}
                    y={BAR_H - h + PAD}
                    width={COL_W - 8}
                    height={h}
                    rx={3}
                    fill="var(--accent-9)"
                  />
                  {/* only the largest is labelled; at COL_W the top-3 collide */}
                  {i === 0 && (
                    <text
                      x={x}
                      y={BAR_H - h + PAD - 4}
                      textAnchor="middle"
                      fontSize={9}
                      fill="var(--gray-11)"
                    >
                      {humanize(c.count)}
                    </text>
                  )}
                  {idx.length > 1 && (
                    <line
                      x1={x}
                      y1={y(Math.min(...idx))}
                      x2={x}
                      y2={y(Math.max(...idx))}
                      stroke="var(--accent-9)"
                      strokeWidth={2}
                    />
                  )}
                  {rows.map((r, ri) => {
                    const on = idx.includes(ri);
                    return (
                      <circle
                        key={r.id}
                        cx={x}
                        cy={y(ri)}
                        r={on ? 4.5 : 4}
                        fill={on ? "var(--accent-9)" : "var(--gray-6)"}
                      />
                    );
                  })}
                </g>
              );
            })}
          </svg>
        </Box>
      )}
    </Flex>
  );
}

function OverlapTable({ rows }: { rows: Intersection[] }) {
  return (
    <Box style={{ overflowX: "auto" }}>
      <Table.Root size="1" variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Archives</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Archives in combination</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell align="right">Projects</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.map((r) => (
            <Table.Row key={r.sets.join("+")}>
              <Table.Cell>{r.sets.map(label).join(" + ")}</Table.Cell>
              <Table.Cell>{r.degree}</Table.Cell>
              <Table.Cell
                align="right"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {r.count.toLocaleString()}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
