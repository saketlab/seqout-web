"use client";

import ChartFooter, { chartFooterEvents } from "@/components/chart-footer";
import SectionAnchor from "@/components/section-anchor";
import { CHART_SERIES_PALETTE, getApexChartTheme } from "@/utils/chart-theme";
import { DB_COLORS, DB_LABELS } from "@/utils/db-colors";
import exportExperimentsToCsv from "@/utils/exportCsv";
import { humanize } from "@/utils/format";
import type {
  EnrichedCoverage,
  EnrichedCoverageCount,
} from "@/utils/types";
import { useEnrichedCoverage } from "@/utils/useStats";
import { useReducedMotion } from "@/utils/useReducedMotion";
import { Flex, Heading, SegmentedControl, Skeleton, Text } from "@radix-ui/themes";
import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useMemo, useState } from "react";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type Metric = "Projects" | "Samples";
type Dimension = "source" | "organism" | "assay" | "assay_category";

const DIMENSIONS: { value: Dimension; label: string }[] = [
  { value: "source", label: "Source" },
  { value: "organism", label: "Organism" },
  { value: "assay", label: "Assay" },
  { value: "assay_category", label: "Assay category" },
];

const TOP_N = 15;
const UNENRICHED_COLOR = "#9ca3af";
// the API ranks by samples, so ranking by projects needs more than TOP_N rows
const FETCH_ROWS = 200;

type CoverageRow = { label: string; projects: number; samples: number };

/** Maps a dimension to its array and label field. */
function coverageRows(d: EnrichedCoverage, dim: Dimension): CoverageRow[] {
  const count = (r: EnrichedCoverageCount) => ({
    projects: r.projects,
    samples: r.samples,
  });
  switch (dim) {
    case "source":
      return d.by_source.map((r) => ({
        label: DB_LABELS[r.source] ?? r.source,
        ...count(r),
      }));
    case "organism":
      return d.by_organism.map((r) => ({ label: r.organism, ...count(r) }));
    case "assay":
      return d.by_assay.map((r) => ({ label: r.assay, ...count(r) }));
    case "assay_category":
      return d.by_assay_category.map((r) => ({
        label: r.assay_category,
        ...count(r),
      }));
  }
}

export default function StatsEnrichmentCoverageCard() {
  const [dimension, setDimension] = useState<Dimension>("source");
  const [metric, setMetric] = useState<Metric>("Samples");
  const { data, isLoading, isError } = useEnrichedCoverage(FETCH_ROWS);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const reduced = useReducedMotion();

  const key = metric === "Projects" ? "projects" : "samples";

  // only source has a denominator to stack against
  const { series, categories, colors, stacked } = useMemo(() => {
    if (!data) return { series: [], categories: [], colors: [], stacked: false };

    if (dimension === "source") {
      const rows = data.by_source;
      const enriched = rows.map((r) => r[key]);
      const rest = rows.map((r) => {
        const total = r[metric === "Projects" ? "total_projects" : "total_samples"];
        // reltuples is an estimate and can land under the enriched count
        return Math.max(0, (total ?? r[key]) - r[key]);
      });
      return {
        series: [
          { name: "Enriched", data: enriched },
          { name: "Not enriched", data: rest },
        ],
        categories: coverageRows(data, "source").map((r) => r.label),
        colors: [
          rows.length === 1 ? DB_COLORS[rows[0].source] : CHART_SERIES_PALETTE[2],
          UNENRICHED_COLOR,
        ],
        stacked: true,
      };
    }

    const top = [...coverageRows(data, dimension)]
      .sort((a, b) => b[key] - a[key])
      .slice(0, TOP_N);
    return {
      series: [{ name: "Enriched", data: top.map((r) => r[key]) }],
      categories: top.map((r) => r.label),
      colors: [CHART_SERIES_PALETTE[2]],
      stacked: false,
    };
  }, [data, dimension, key, metric]);

  const chartOptions = useMemo<ApexOptions>(() => {
    const theme = getApexChartTheme(isDark);
    const horizontal = dimension !== "source";
    const label = DIMENSIONS.find((d) => d.value === dimension)?.label ?? "";
    const distinct = data?.distinct_values?.[dimension];
    return {
      chart: {
        id: "seqout-enrichment-coverage",
        type: "bar",
        stacked,
        stackType: "normal",
        background: theme.background,
        toolbar: { show: false },
        foreColor: theme.foreColor,
        animations: { enabled: !reduced },
        events: chartFooterEvents,
      },
      title: {
        text:
          dimension === "source"
            ? `Enrichment coverage: ${metric.toLowerCase()} per source`
            : `Enriched ${metric.toLowerCase()}: top ${label.toLowerCase()}`,
        align: "left",
        style: {
          fontSize: "16px",
          fontWeight: "600",
          fontFamily:
            "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
          color: theme.titleColor,
        },
      },
      subtitle: {
        text:
          dimension === "source"
            ? "Share of each archive carrying standardised ontology metadata; archive totals are row estimates"
            : `Top ${TOP_N} of ${distinct ? humanize(distinct) : "all"} ${label.toLowerCase()} values, counted per enriched sample`,
        align: "left",
        style: {
          fontSize: "12px",
          fontFamily:
            "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
          color: theme.subtitleColor,
        },
      },
      plotOptions: { bar: { horizontal, borderRadius: 3, columnWidth: "55%" } },
      dataLabels: { enabled: false },
      // Apex merges options on update, so an empty object never clears the formatter the other orientation set; every axis field below stays explicit.
      xaxis: {
        categories,
        labels: {
          formatter: (v) => (horizontal ? humanize(Number(v)) : String(v)),
        },
        title: { text: horizontal ? metric : label },
      },
      yaxis: {
        labels: {
          formatter: (v) => (horizontal ? String(v) : humanize(Math.round(v))),
        },
        title: { text: horizontal ? "" : metric },
      },
      colors,
      legend: {
        show: stacked,
        position: "bottom",
        labels: { colors: theme.legendLabelColor },
      },
      grid: { strokeDashArray: 4, borderColor: theme.gridBorderColor },
      tooltip: {
        theme: isDark ? "dark" : "light",
        y: {
          formatter: (v, opts) => {
            const base = `${v.toLocaleString()} ${metric.toLowerCase()}`;
            if (dimension !== "source" || opts?.seriesIndex !== 0) return base;
            const pct =
              data?.by_source[opts.dataPointIndex]?.[
                metric === "Projects" ? "pct_projects" : "pct_samples"
              ];
            return pct == null ? base : `${base} (${pct}% of the archive)`;
          },
        },
      },
    };
  }, [dimension, metric, categories, colors, stacked, isDark, reduced, data]);

  function exportCsv() {
    if (!data) return;
    // source keeps its total/pct columns
    const rows =
      dimension === "source"
        ? data.by_source
        : coverageRows(data, dimension).map((r) => ({
            [dimension]: r.label,
            projects: r.projects,
            samples: r.samples,
          }));
    exportExperimentsToCsv(
      rows as unknown as Record<string, unknown>[],
      `seqout-enrichment-coverage-${dimension}.csv`,
    );
  }

  return (
    <Flex direction="column" width="100%" py={{ initial: "4", md: "5" }}>
      <Flex justify="between" align="center" mb="4" gap="3" wrap="wrap">
        <Flex align="center" gap="2">
          <Heading as="h2" size="5" weight="bold" ml="1">
            Enrichment coverage
          </Heading>
          <SectionAnchor id="enrichment-coverage" />
        </Flex>
        <Flex gap="3" align="center" wrap="wrap">
          <SegmentedControl.Root
            value={dimension}
            onValueChange={(v) => setDimension(v as Dimension)}
            size="1"
          >
            {DIMENSIONS.map((d) => (
              <SegmentedControl.Item key={d.value} value={d.value}>
                {d.label}
              </SegmentedControl.Item>
            ))}
          </SegmentedControl.Root>
          <SegmentedControl.Root
            value={metric}
            onValueChange={(v) => setMetric(v as Metric)}
            size="1"
          >
            <SegmentedControl.Item value="Projects">Projects</SegmentedControl.Item>
            <SegmentedControl.Item value="Samples">Samples</SegmentedControl.Item>
          </SegmentedControl.Root>
        </Flex>
      </Flex>

      {isLoading ? (
        <Flex direction="column" gap="3" justify="end" style={{ height: 420 }}>
          <Skeleton width="100%" height="360px" />
        </Flex>
      ) : isError || series.length === 0 ? (
        <Text color="gray" size="2" ml="1">
          Enrichment coverage is not available yet.
        </Text>
      ) : (
        <>
          <Chart
            type="bar"
            options={chartOptions}
            series={series}
            height={
              dimension === "source"
                ? 400
                : Math.max(360, categories.length * 28 + 140)
            }
            width="100%"
          />
          <Flex justify="end" mt="2">
            <Text
              size="1"
              color="gray"
              onClick={exportCsv}
              style={{ cursor: "pointer" }}
            >
              Download CSV
            </Text>
          </Flex>
        </>
      )}
      <ChartFooter chartId="seqout-enrichment-coverage" />
    </Flex>
  );
}
