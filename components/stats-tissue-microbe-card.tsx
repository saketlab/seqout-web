"use client";

import { formatOrganismName } from "@/utils/format";
import SectionAnchor from "@/components/section-anchor";
import { useTissueMicrobes } from "@/utils/useStats";
import type { TissueMicrobeCell } from "@/utils/types";
import {
  Box,
  Checkbox,
  Flex,
  Heading,
  Skeleton,
  Text,
  VisuallyHidden,
} from "@radix-ui/themes";
import { useMemo, useState } from "react";

const MAX_TISSUES = 20;
const MAX_ORGANISMS = 16;

type GroupKey = "sample" | "culture" | "background";

const GROUPS: {
  key: GroupKey;
  label: string;
  tint: string;
  blurb: string;
}[] = [
  {
    key: "sample",
    label: "In the sample",
    tint: "blue",
    blurb:
      "Reads from an organism that plausibly came with the tissue: a virus or a pathogen that the prevalence sweep leaves unflagged.",
  },
  {
    key: "culture",
    label: "Cell-culture contamination",
    tint: "amber",
    blurb:
      "Mycoplasma species infect cultured cell lines. A positive says the line was contaminated in somebody's incubator, so the tissue label records where the line originally came from.",
  },
  {
    key: "background",
    label: "Reagent and host background",
    tint: "gray",
    blurb:
      "Organisms that turn up at a similar rate across unrelated tissues, so the sweep flags them as prevalent: gut and skin bacteria carried in extraction kits and on hands (E. coli, C. acnes), plus retroviruses such as murine leukemia virus that sit in the mouse germline and are read straight off the host genome.",
  },
];

function groupOf(c: TissueMicrobeCell): GroupKey {
  if (c.class === "culture") return "culture";
  if (c.is_background || c.is_endogenous) return "background";
  return "sample";
}

function why(c: TissueMicrobeCell) {
  if (c.class === "culture") return "cell-culture contaminant";
  if (c.is_endogenous) return "read off the host genome";
  if (c.is_background) return "prevalence-flagged background";
  return c.class;
}

function shade(rate: number, max: number) {
  if (rate <= 0 || max <= 0) return 0;
  return Math.min(1, Math.sqrt(rate / max));
}

const key = (tissue: string, organism: string) => `${tissue}\u0000${organism}`;

function tooltip(c: TissueMicrobeCell) {
  const organism = formatOrganismName(c.organism);
  return [
    `${c.tissue} / ${organism}`,
    `${c.rate_pct.toFixed(2)}% (${c.positives.toLocaleString()} of ${c.screened.toLocaleString()} screened)`,
    `${c.positives_confirmed.toLocaleString()} high-breadth, ${c.studies} studies`,
    why(c),
  ].join("\n");
}

export default function StatsTissueMicrobeCard() {
  const { data, isLoading } = useTissueMicrobes();
  const [showContaminants, setShowContaminants] = useState(true);

  const grid = useMemo(() => {
    const cells = (data?.cells ?? []).filter(
      (c) => showContaminants || groupOf(c) === "sample",
    );
    if (cells.length === 0) return null;

    const sample = new Map<string, TissueMicrobeCell>();
    const byOrganism = new Map<string, number>();
    const byTissue = new Map<string, number>();
    for (const c of cells) {
      if (!sample.has(c.organism)) sample.set(c.organism, c);
      byOrganism.set(
        c.organism,
        (byOrganism.get(c.organism) ?? 0) + c.positives,
      );
      byTissue.set(c.tissue, (byTissue.get(c.tissue) ?? 0) + c.positives);
    }
    const top = (m: Map<string, number>, n: number) =>
      [...m.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([k]) => k);

    const order = new Map(GROUPS.map((g, i) => [g.key, i]));
    const organisms = top(byOrganism, MAX_ORGANISMS).sort((a, b) => {
      const ga = order.get(groupOf(sample.get(a)!))!;
      const gb = order.get(groupOf(sample.get(b)!))!;
      return ga - gb || a.localeCompare(b);
    });
    const groups = GROUPS.map((g) => ({
      ...g,
      span: organisms.filter((o) => groupOf(sample.get(o)!) === g.key).length,
    })).filter((g) => g.span > 0);

    const tissues = top(byTissue, MAX_TISSUES);
    const at = new Map(cells.map((c) => [key(c.tissue, c.organism), c]));
    const screened = new Map(
      (data?.tissues ?? []).map((t) => [t.tissue, t.screened]),
    );
    const max = new Map<GroupKey, number>();
    for (const t of tissues)
      for (const o of organisms) {
        const c = at.get(key(t, o));
        if (!c) continue;
        const g = groupOf(c);
        max.set(g, Math.max(max.get(g) ?? 0, c.rate_pct));
      }
    const byOrg = new Map(
      organisms.map((o) => {
        const g = groupOf(sample.get(o)!);
        return [o, { group: g, tint: GROUPS.find((x) => x.key === g)!.tint }];
      }),
    );

    return { organisms, groups, tissues, at, screened, max, sample, byOrg };
  }, [data, showContaminants]);

  if (isLoading) {
    return (
      <Flex direction="column" gap="3" py={{ initial: "4", md: "5" }}>
        <Skeleton height="24px" width="280px" />
        <Skeleton height="320px" />
      </Flex>
    );
  }
  if (!data) return null;

  return (
    <Flex
      direction="column"
      gap="4"
      width="100%"
      py={{ initial: "4", md: "5" }}
    >
      <Flex align="center" gap="2">
        <Heading as="h2" size="5" weight="bold" ml="1">
          Microbes by tissue
        </Heading>
        <SectionAnchor id="tissue-microbes" />
      </Flex>

      <Text size="2" color="gray">
        Share of samples of each tissue carrying reads from each organism,
        counted over the samples we quantified. A cell needs {data.min_studies}{" "}
        or more contributing studies, and a tissue needs {data.min_screened} or
        more screened samples.
      </Text>

      <Flex align="center" gap="2">
        <Checkbox
          checked={showContaminants}
          onCheckedChange={() => setShowContaminants((v) => !v)}
          aria-label="Show contamination columns"
        />
        <Text size="2">Show contamination columns</Text>
      </Flex>

      {!grid ? (
        <Text size="2" color="gray">
          With the contamination columns hidden, nothing passes the thresholds.
        </Text>
      ) : (
        <Box style={{ overflowX: "auto" }}>
          <table
            style={{
              borderCollapse: "collapse",
              fontSize: "var(--font-size-1)",
            }}
          >
            <thead>
              <tr>
                <td />
                {grid.groups.map((g) => (
                  <th
                    key={g.key}
                    colSpan={g.span}
                    title={g.blurb}
                    style={{
                      padding: "2px 4px 6px",
                      textAlign: "center",
                      fontWeight: 500,
                      color: `var(--${g.tint}-11)`,
                      borderBottom: `2px solid var(--${g.tint}-8)`,
                    }}
                  >
                    {g.label}
                  </th>
                ))}
              </tr>
              <tr>
                <td />
                {grid.organisms.map((o) => (
                  <th
                    key={o}
                    title={why(grid.sample.get(o)!)}
                    style={{
                      padding: "6px 6px 4px",
                      whiteSpace: "nowrap",
                      writingMode: "vertical-rl",
                      transform: "rotate(180deg)",
                      fontWeight: 500,
                      color: `var(--${grid.byOrg.get(o)!.tint}-11)`,
                    }}
                  >
                    {formatOrganismName(o)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.tissues.map((t) => (
                <tr key={t}>
                  <th
                    scope="row"
                    style={{
                      textAlign: "left",
                      padding: "2px 8px",
                      whiteSpace: "nowrap",
                      fontWeight: 400,
                    }}
                  >
                    {t}{" "}
                    <Text size="1" color="gray">
                      n={(grid.screened.get(t) ?? 0).toLocaleString()}
                    </Text>
                  </th>
                  {grid.organisms.map((o) => {
                    const c = grid.at.get(key(t, o));
                    const { group: g, tint } = grid.byOrg.get(o)!;
                    const a = c ? shade(c.rate_pct, grid.max.get(g) ?? 0) : 0;
                    return (
                      <td
                        key={o}
                        title={
                          c
                            ? tooltip(c)
                            : `${t} / ${formatOrganismName(o)}: nothing above the gates`
                        }
                        style={{
                          padding: 0,
                          width: 28,
                          height: 22,
                          border: "1px solid var(--gray-3)",
                          background: c
                            ? `color-mix(in srgb, var(--${tint}-9) ${Math.round(a * 100)}%, transparent)`
                            : "transparent",
                        }}
                      >
                        <VisuallyHidden>
                          {c
                            ? tooltip(c)
                            : `${t} / ${formatOrganismName(o)}: nothing above the gates`}
                        </VisuallyHidden>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      )}

      <Flex direction="column" gap="2">
        {(grid?.groups ?? GROUPS).map((g) => (
          <Text key={g.key} size="1" color="gray">
            <Text weight="medium" style={{ color: `var(--${g.tint}-11)` }}>
              {g.label}.
            </Text>{" "}
            {g.blurb}
          </Text>
        ))}
        <Text size="1" color="gray">
          Colour is the square root of the rate, scaled within each group, so a
          16% contaminant does not flatten a 1% virus to the background colour.
          Compare cells down a column, and only within one group. Every organism
          we detect is shown, because the reads are real in all three cases.
          What the group changes is whether the tissue label means anything.
        </Text>
      </Flex>
    </Flex>
  );
}
