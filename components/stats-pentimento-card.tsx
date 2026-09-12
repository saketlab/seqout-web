"use client";

import ChartFooter, { chartFooterEvents } from "@/components/chart-footer";
import SectionAnchor from "@/components/section-anchor";
import {
  BarList,
  ShareBar,
  StatTiles,
  toSegments,
} from "@/components/stats-ui";
import { CHART_SERIES_PALETTE, getApexChartTheme } from "@/utils/chart-theme";
import { formatOrganismName, humanize } from "@/utils/format";
import { usePentimentoOverview } from "@/utils/useStats";
import { useReducedMotion } from "@/utils/useReducedMotion";
import {
  Box,
  Flex,
  Heading,
  Skeleton,
  Text,
  VisuallyHidden,
} from "@radix-ui/themes";
import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useMemo } from "react";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const CLASS_COLOR: Record<string, string> = {
  culture: "var(--teal-9)",
  virus: "var(--blue-9)",
  pathogen: "var(--purple-9)",
};
const CLASS_LABEL: Record<string, string> = {
  culture: "Culture contaminant",
  virus: "Virus",
  pathogen: "Pathogen",
};

const KINGDOMS = [
  { key: "viral", label: "Viruses" },
  { key: "bacterial", label: "Bacteria" },
] as const;

const SEX_SEGMENTS = [
  { keys: ["male"], label: "Male", color: "var(--blue-9)" },
  { keys: ["female"], label: "Female", color: "var(--purple-9)" },
  {
    keys: ["no_verdict", "conflicting"],
    label: "No verdict",
    color: "var(--gray-6)",
  },
] as const;

const READ_END_SEGMENTS = [
  { key: "3'", label: "3'", color: "var(--blue-9)" },
  { key: "5'", label: "5'", color: "var(--purple-9)" },
  { key: "full-length", label: "Full-length", color: "var(--teal-9)" },
  { key: "no_call", label: "No call", color: "var(--gray-6)" },
] as const;

const ASSAY_GROUPS = [
  { key: "single_cell", label: "Single-cell assay", color: "var(--teal-9)" },
  { key: "not_single_cell", label: "Not single-cell", color: "var(--blue-9)" },
  { key: "no_call", label: "No call", color: "var(--gray-6)" },
] as const;

export default function StatsPentimentoCard() {
  const { data, isLoading } = usePentimentoOverview();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const reduced = useReducedMotion();

  const { categories, series } = useMemo(() => {
    const rows = data?.assay_by_tissue ?? [];
    if (rows.length === 0) return { categories: [], series: [] };

    const totalBy = (key: "assay" | "tissue") => {
      const t = new Map<string, number>();
      for (const r of rows) t.set(r[key], (t.get(r[key]) ?? 0) + r.n_studies);
      return [...t.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
    };
    const assays = totalBy("assay");
    const tissues = totalBy("tissue");
    const at = new Map(
      rows.map((r) => [`${r.assay}\u0000${r.tissue}`, r.n_studies]),
    );

    return {
      categories: assays,
      series: tissues.map((t) => ({
        name: t,
        data: assays.map((a) => at.get(`${a}\u0000${t}`) ?? 0),
      })),
    };
  }, [data]);

  const chartOptions = useMemo<ApexOptions>(() => {
    const theme = getApexChartTheme(isDark);
    return {
      chart: {
        id: "seqout-pentimento-tissue",
        type: "bar",
        stacked: true,
        background: theme.background,
        toolbar: { show: false },
        foreColor: theme.foreColor,
        animations: { enabled: !reduced },
        events: chartFooterEvents,
      },
      plotOptions: { bar: { horizontal: true, borderRadius: 2 } },
      dataLabels: { enabled: false },
      xaxis: {
        categories,
        labels: { formatter: (v) => humanize(Number(v)) },
        title: { text: "Studies" },
      },
      colors: [...CHART_SERIES_PALETTE],
      legend: {
        position: "bottom",
        labels: { colors: theme.legendLabelColor },
      },
      grid: { strokeDashArray: 4, borderColor: theme.gridBorderColor },
      tooltip: {
        theme: isDark ? "dark" : "light",
        y: { formatter: (v) => `${v.toLocaleString()} studies` },
      },
    };
  }, [categories, isDark, reduced]);

  if (isLoading) {
    return (
      <Flex direction="column" gap="3" py={{ initial: "4", md: "5" }}>
        <Skeleton height="24px" width="280px" />
        <Skeleton height="240px" />
      </Flex>
    );
  }

  if (!data) return null;

  const sexCounts = Object.fromEntries(
    data.sex.map((s) => [s.verdict, s.n_samples]),
  );
  const assayCounts = Object.fromEntries(
    data.assay_groups.map((g) => [g.group_name, g.n_samples]),
  );
  const conflicting = sexCounts.conflicting ?? 0;
  const segments = toSegments(SEX_SEGMENTS, sexCounts);
  const byKingdom = KINGDOMS.map((k) => ({
    ...k,
    rows: data.top_microbes.filter((m) => m.kingdom === k.key),
    rates: READ_END_SEGMENTS.map((seg) => {
      const r = data.microbe_by_read_end.find(
        (x) => x.kingdom === k.key && x.read_end === seg.key,
      );
      return {
        label: seg.label,
        color: seg.color,
        hits: r?.n_samples ?? 0,
        screened: r?.n_screened ?? 0,
        pct: r && r.n_screened ? (100 * r.n_samples) / r.n_screened : 0,
      };
    }),
  }));
  const cal = data.low_breadth_calibration;
  const bgPct = cal.background_rows
    ? (100 * cal.background_pass) / cal.background_rows
    : 0;
  const tgPct = cal.target_rows ? (100 * cal.target_pass) / cal.target_rows : 0;
  const artifactPct = cal.target_pass
    ? (100 * cal.target_pass_artifact_prone) / cal.target_pass
    : 0;

  return (
    <Flex
      direction="column"
      gap="4"
      width="100%"
      py={{ initial: "4", md: "5" }}
    >
      <Flex align="center" gap="2">
        <Heading as="h2" size="5" weight="bold" ml="1">
          Read-level checks
        </Heading>
        <SectionAnchor id="pentimento" />
      </Flex>

      <Text size="2" color="gray">
        We compute these from the FASTQ files, so they hold even where the
        submitted metadata is wrong.
      </Text>

      <StatTiles
        stats={[
          { label: "Samples scanned", value: data.n_samples },
          { label: "Studies", value: data.n_studies },
          {
            label: "Samples with low-breadth signal",
            value: data.n_samples_with_evidence,
          },
          {
            label: "...of those, high-breadth",
            value: data.n_samples_with_hit,
          },
        ]}
      />

      <Box>
        <Text size="2" weight="bold" as="div" mb="1">
          Reference signal found in the reads
        </Text>
        <Text size="1" color="gray" as="div" mb="1">
          {data.microbe_by_class
            .map(
              (c) =>
                `${CLASS_LABEL[c.class] ?? c.class}: ${c.n_samples.toLocaleString()} samples (${c.n_samples_confirmed.toLocaleString()} high-breadth), ${c.n_organisms} organism${c.n_organisms === 1 ? "" : "s"}`,
            )
            .join(" · ")}
        </Text>
        <Text size="1" color="gray" as="div" mb="2">
          These thresholds measure breadth of coverage, which is a step short of
          a presence call. At the low-breadth cut, reagent and skin-flora taxa
          clear the same bar {bgPct.toFixed(2)}% of the time against{" "}
          {tgPct.toFixed(2)}% for pathogen- and culture-labelled taxa, so the
          low-breadth tier discriminates weakly from background. Skin flora can
          genuinely be present, which makes those background taxa an imperfect
          null, so read the comparison as a floor on the error rate.{" "}
          {artifactPct.toFixed(0)}% of the low-breadth bacterial rows are E.
          coli or M. hyorhinis alone (vector- and plasmid-associated signal,
          plus a cell-culture contaminant), so the bacterial headline mostly
          reflects those two organisms.
        </Text>
        <Flex gap="5" wrap="wrap">
          {byKingdom.map((k) =>
            k.rows.length ? (
              <BarList
                key={k.key}
                title={k.label}
                rows={k.rows.map((m) => ({
                  label:
                    m.kingdom === "bacterial"
                      ? `${formatOrganismName(m.organism)} · ${CLASS_LABEL[m.class] ?? m.class}`
                      : formatOrganismName(m.organism),
                  value: m.n_samples,
                  color: CLASS_COLOR[m.class] ?? "var(--gray-8)",
                }))}
              />
            ) : null,
          )}
        </Flex>
      </Box>

      <Box>
        <Text size="2" weight="bold" as="div" mb="1">
          Unadjusted signal rate by read-end call
        </Text>
        <Text size="1" color="gray" as="div" mb="2">
          Share of screened samples with a hit. The denominator removes the
          gross imbalance between 3&apos; and 5&apos; library counts, but
          controls nothing else: study, tissue, depth, organism mix, host and
          batch all still confound this. Treat it as exploratory: a gap here is
          worth a closer look.
        </Text>
        <Flex gap="5" wrap="wrap">
          {byKingdom.map((k) => (
            <BarList
              key={k.key}
              title={k.label}
              rows={k.rates.map((r) => ({
                label: `${r.label} · ${humanize(r.screened)} screened`,
                value: Number(r.pct.toFixed(3)),
                display: `${r.hits.toLocaleString()} · ${r.pct.toFixed(2)}%`,
                color: r.color,
              }))}
            />
          ))}
        </Flex>
      </Box>

      <Box>
        <Text size="2" weight="bold" as="div" mb="1">
          Assay read off the reads
        </Text>
        <Text size="1" color="gray" as="div" mb="2">
          The three groups cover every scanned sample. The bars below name the
          chemistry behind the single-cell group.
        </Text>
        <ShareBar
          segments={ASSAY_GROUPS.map((g) => ({
            ...g,
            n: assayCounts[g.key] ?? 0,
          }))}
        />
        <Box mt="3">
          <BarList
            rows={data.by_assay.map((a) => ({
              label: a.assay,
              value: a.n_samples,
              color: "var(--teal-9)",
            }))}
          />
        </Box>
      </Box>

      <Box>
        <Text size="2" weight="bold" as="div" mb="1">
          Sex called from reads
        </Text>
        <Text size="1" color="gray" as="div" mb="2">
          Share of every scanned sample.
          {conflicting > 0
            ? ` ${conflicting.toLocaleString()} samples had runs that disagreed.`
            : ""}
        </Text>
        <ShareBar segments={segments} />
      </Box>

      {series.length > 0 ? (
        <Box>
          <Text size="2" weight="bold" as="div" mb="1">
            Tissues by chemistry
          </Text>
          <Text size="1" color="gray" as="div" mb="2">
            Chemistry comes from the reads; tissue comes from the submitter. Top
            eight tissues, counted in studies.
          </Text>
          <VisuallyHidden asChild>
            <p>
              {`Stacked bar chart: study counts for ${categories.length} assays, broken down by tissue (${series
                .map((s) => s.name)
                .join(", ")}).`}
            </p>
          </VisuallyHidden>
          <Chart
            type="bar"
            options={chartOptions}
            series={series}
            height={Math.max(320, categories.length * 34 + 140)}
            width="100%"
          />
          <ChartFooter chartId="seqout-pentimento-tissue" />
        </Box>
      ) : null}
    </Flex>
  );
}
