"use client";

import ChartFooter, { chartFooterEvents } from "@/components/chart-footer";
import SectionAnchor from "@/components/section-anchor";
import {
  getApexChartTheme,
  getMutedBandColors,
  technologyColor,
} from "@/utils/chart-theme";
import { humanize } from "@/utils/format";
import type { ScQualityPoint } from "@/utils/types";
import { useScQuality, useScQualitySamples } from "@/utils/useStats";
import { useReducedMotion } from "@/utils/useReducedMotion";
import {
  Box,
  Flex,
  Heading,
  SegmentedControl,
  Skeleton,
  Switch,
  Text,
  VisuallyHidden,
} from "@radix-ui/themes";
import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useMemo, useState } from "react";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const METRIC = {
  counts: {
    label: "Counts",
    median: "median_ncount",
    p25: "p25_ncount",
    p75: "p75_ncount",
    dot: "ncount",
    axis: "Median UMIs per cell",
  },
  genes: {
    label: "Genes",
    median: "median_nfeature",
    p25: "p25_nfeature",
    p75: "p75_nfeature",
    dot: "nfeature",
    axis: "Median genes per cell",
  },
} as const;

type MetricKey = keyof typeof METRIC;

const key = (technology: string, year: number) => `${technology}\u0000${year}`;

export default function StatsScQualityCard() {
  const { data, isLoading } = useScQuality();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const reduced = useReducedMotion();
  const [metric, setMetric] = useState<MetricKey>("counts");
  const [showDots, setShowDots] = useState(false);
  const { data: samples, isLoading: samplesLoading } =
    useScQualitySamples(showDots);

  const { years, techs, at, overall, declared } = useMemo(() => {
    const points = data?.points ?? [];
    const techs = (data?.technologies ?? []).map((t) => t.technology);
    const at = new Map<string, ScQualityPoint>();
    for (const p of points) {
      const k = key(p.technology, p.year);
      if (p.evidence === "read" || !at.has(k)) at.set(k, p);
    }
    return {
      techs,
      at,
      overall: new Map((data?.overall ?? []).map((p) => [p.year, p])),
      years: [...new Set(points.map((p) => p.year))].sort((a, b) => a - b),
      declared: (data?.technologies ?? [])
        .filter((t) => !t.evidence.includes("read"))
        .map((t) => t.technology),
    };
  }, [data]);

  const series = useMemo(() => {
    const { fill, line } = getMutedBandColors(isDark);
    const { median, p25, p75, dot } = METRIC[metric];
    const round = (v: number | null | undefined) =>
      v == null ? null : Math.round(v);
    const band = years.flatMap((y) => {
      const o = overall.get(y);
      const lo = round(o?.[p25]);
      const hi = round(o?.[p75]);
      return lo == null || hi == null ? [] : [{ x: y, y: [lo, hi] }];
    });
    return [
      {
        name: "All chemistries (IQR)",
        type: "rangeArea",
        color: fill,
        data: band,
      },
      {
        name: "All chemistries (median)",
        type: "line",
        color: line,
        data: years.map((y) => ({ x: y, y: round(overall.get(y)?.[median]) })),
      },
      ...techs.map((technology, i) => ({
        name: technology,
        type: "line",
        color: technologyColor(technology, i),
        data: years.map((y) => ({
          x: y,
          y: round(at.get(key(technology, y))?.[median]),
        })),
      })),
      ...(showDots && samples
        ? [
            {
              name: "Individual matrices",
              type: "scatter",
              color: line,
              data: samples.points
                .map((p) => ({ x: p.year, y: round(p[dot]) }))
                .filter((d) => d.y != null && d.y > 0),
            },
          ]
        : []),
    ];
  }, [techs, at, overall, years, metric, showDots, samples, isDark]);

  const flatValues = useMemo(
    () =>
      series.flatMap((s) =>
        s.data.flatMap((d) =>
          d.y == null ? [] : typeof d.y === "number" ? [d.y] : d.y,
        ),
      ),
    [series],
  );

  const decades = useMemo(() => {
    const vs = flatValues.filter((v): v is number => v != null && v > 0);
    if (vs.length === 0) return null;
    let min = Infinity;
    let max = 0;
    for (const v of vs) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const lo = Math.floor(Math.log10(min));
    const hi = Math.ceil(Math.log10(max));
    return { lo: 10 ** lo, hi: 10 ** hi, ticks: hi - lo };
  }, [flatValues]);

  const chartOptions = useMemo<ApexOptions>(() => {
    const theme = getApexChartTheme(isDark);
    return {
      chart: {
        id: "seqout-sc-quality",
        type: "rangeArea",
        background: theme.background,
        toolbar: { show: false },
        foreColor: theme.foreColor,
        animations: { enabled: !reduced },
        events: chartFooterEvents,
        zoom: { enabled: false },
      },
      stroke: {
        width: series.map((s, i) =>
          s.type === "scatter" ? 0 : i === 0 ? 0 : i === 1 ? 5 : 2,
        ),
        curve: "straight",
      },
      fill: {
        type: "solid",
        opacity: series.map((s, i) =>
          s.type === "scatter" ? 0.22 : i === 0 ? 0.18 : 1,
        ),
      },
      markers: {
        size: series.map((s, i) =>
          s.type === "scatter"
            ? 2
            : i < 2
              ? 0
              : s.data.filter((d) => d.y != null).length < 3
                ? 7
                : 3,
        ),
        strokeWidth: 0,
        hover: { sizeOffset: 3 },
      },
      dataLabels: { enabled: false },
      xaxis: {
        type: "category",
        title: { text: "Archive release year" },
        tickPlacement: "on",
      },
      yaxis: {
        logarithmic: true,
        min: decades?.lo,
        max: decades?.hi,
        tickAmount: decades?.ticks,
        title: { text: METRIC[metric].axis },
        labels: { formatter: (v) => humanize(Math.round(Number(v))) },
      },
      legend: {
        position: "bottom",
        height: 64,
        itemMargin: { horizontal: 8, vertical: 2 },
        labels: { colors: theme.legendLabelColor },
      },
      grid: { strokeDashArray: 4, borderColor: theme.gridBorderColor },
      tooltip: {
        theme: isDark ? "dark" : "light",
        y: { formatter: (v) => (v == null ? "?" : v.toLocaleString()) },
      },
    };
  }, [metric, isDark, reduced, series, decades]);

  if (isLoading) {
    return (
      <Flex direction="column" gap="3" py={{ initial: "4", md: "5" }}>
        <Skeleton height="24px" width="280px" />
        <Skeleton height="320px" />
      </Flex>
    );
  }

  if (!data || series.length === 0) return null;

  return (
    <Flex
      direction="column"
      gap="4"
      width="100%"
      py={{ initial: "4", md: "5" }}
    >
      <Flex align="center" gap="2" id="sc-quality">
        <Heading as="h2" size="5" weight="bold" ml="1">
          Single-cell depth over time
        </Heading>
        <SectionAnchor id="sc-quality" />
      </Flex>

      <Text size="2" color="gray">
        Median UMIs and genes per cell, read from the matrices.
      </Text>

      <SegmentedControl.Root
        size="1"
        value={metric}
        onValueChange={(v) => setMetric(v as MetricKey)}
      >
        <SegmentedControl.Item value="counts">
          {METRIC.counts.label}
        </SegmentedControl.Item>
        <SegmentedControl.Item value="genes">
          {METRIC.genes.label}
        </SegmentedControl.Item>
      </SegmentedControl.Root>

      <Flex align="center" gap="2" asChild>
        <label>
          <Switch size="1" checked={showDots} onCheckedChange={setShowDots} />
          <Text size="2" color="gray">
            Show individual matrices
            {showDots && samplesLoading && " (loading...)"}
            {showDots && samples
              ? ` (${samples.n_shown.toLocaleString()} of ${samples.n_total.toLocaleString()})`
              : ""}
          </Text>
        </label>
      </Flex>

      <Box>
        <VisuallyHidden asChild>
          <p>
            {`Range-area and line chart: ${METRIC[metric].axis} by year for ${series
              .map((s) => s.name)
              .join(", ")}.`}
          </p>
        </VisuallyHidden>
        <Chart
          options={chartOptions}
          series={series}
          type="rangeArea"
          height={400}
        />
        <ChartFooter chartId="seqout-sc-quality" />
      </Box>

      <Text size="1" color="gray">
        Median per year over cells clearing each matrix&apos;s count
        threshold; grey is the pooled IQR and its median. Needs{" "}
        {data.min_matrices}+ matrices from {data.min_studies}+ studies. Dots are
        one matrix each, not one study, subsampled per chemistry and year.
        {declared.length > 0 && (
          <>
            {" "}
            Chemistry read from FASTQs for 10x and Drop-seq;{" "}
            {declared.slice(0, 4).join(", ")}
            {declared.length > 4 ? " and others" : ""} use the declared assay.
          </>
        )}
      </Text>
    </Flex>
  );
}
