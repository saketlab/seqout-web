"use client";
import {
  ensureAgGridModules,
  infiniteScrollOnBodyScroll,
  TABLE_PAGE_SIZE,
  wrapColDef,
} from "@/lib/ag-grid";
import { useWrapText } from "@/components/wrap-text-toggle";
import { getJsonOrNull } from "@/utils/api";
import { formatOrganismName } from "@/utils/format";
import {
  ExclamationTriangleIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import { Badge, Flex, Spinner, Text, Tooltip } from "@radix-ui/themes";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useTheme } from "next-themes";
import { useMemo } from "react";

ensureAgGridModules();

export interface Detection {
  organism: string;
  class: string;
  kingdom: "viral" | "bacterial" | string;
  tier: "high_breadth" | "low_breadth";
  n_runs: number | null;
  breadth_frac: number | null;
  ref_bp: number | null;
  covered_bp: number | null;
  reads: number | null;
  kmer_mass: number | null;
  n_unitigs: number | null;
  is_background: boolean | null;
}

export interface ScStatsMatrix {
  file: string;
  n_cells: number | null;
  n_barcodes: number | null;
  is_raw_barcode_space: boolean | null;
  matrix_species: string | null;
  n_mito_genes: number | null;
  min_counts: number | null;
  n_cells_filtered: number | null;
  ncount_median: number | null;
  nfeature_median: number | null;
  ncount_f_median: number | null;
  nfeature_f_median: number | null;
  ncount_f_mean: number | null;
  nfeature_f_mean: number | null;
  pct_mito_f_median: number | null;
}

export interface ScStatsStudy {
  state: string | null;
  n_matrices: number | null;
  n_failures: number | null;
  matrix_species: string | null;
  any_raw_barcode_space: boolean | null;
  n_matrices_measured: number | null;
  median_ncount: number | null;
  median_nfeature: number | null;
  median_pct_mito: number | null;
}

export interface SingleCellSample {
  sample_accession: string;
  title: string | null;
  tissue: string | null;
  cells: number | null;
  genes: number | null;
  unfiltered: boolean;
  n_runs: number | null;
  species_called: string | null;
  species_confidence: string | null;
  species_hit_reads: number | null;
  species_hit_fraction: number | null;
  species_runner_up: string | null;
  species_margin: number | null;
  species_ambiguous: boolean | null;
  sex_verdict: string | null;
  sex_confidence: string | null;
  sex_reads_scanned: number | null;
  y_hits: number | null;
  xist_hits: number | null;
  y_xist_ratio: number | null;
  sex_panel_status: string | null;
  sex_mixed_suspected: boolean | null;
  species_mislabel: boolean | null;
  assay_is_single_cell: boolean | null;
  n_runs_measurable: number | null;
  deep_n_reads: number | null;
  assay: string | null;
  assay_display: string | null;
  calls_ambiguous: boolean | null;
  detections: Detection[];
  screened: boolean;
  hpv_top_type: string | null;
  hpv_ambiguous: boolean | null;
  has_viral_reads: boolean | null;
  has_viral_evidence: boolean | null;
  has_bacterial_reads: boolean | null;
  viral_kmer_mass: number | null;
  bacterial_kmer_mass: number | null;
  sc_stats: ScStatsMatrix[];
  sc_stats_scanned: boolean;
}

export interface LongReadRun {
  run_accession: string;
  chemistry: string | null;
  chemistry_confidence: string | null;
}

export interface SingleCellResponse {
  study_accession: string;
  study_cells: number | null;
  any_unfiltered: boolean | null;
  n_samples_detailed: number | null;
  unassigned_cells: number | null;
  sample_breakdown_complete: boolean | null;
  n_runs_linked: number | null;
  n_runs_preflightx: number | null;
  n_runs_measurable: number | null;
  sc_stats_study: ScStatsStudy | null;
  longread_chemistry: LongReadRun[];
  samples: SingleCellSample[];
}

const ENDOGENOUS_ORGANISMS = new Set([
  "Murine_leukemia_virus",
  "MMTV",
  "HIV1",
  "HTLV1",
]);

function NotMeasured({ reason }: { reason: string }) {
  return (
    <Tooltip content={reason}>
      <Text size="2" color="gray" style={{ cursor: "help" }}>
        —
      </Text>
    </Tooltip>
  );
}

const FLAG_KIND = {
  endogenous: {
    color: "gray",
    note: "also in the host genome or lentiviral vectors.",
  },
  contaminant: {
    color: "amber",
    note: "picked up in culture.",
  },
  prevalent: {
    color: "gray",
    note: "common across unrelated runs; weak on its own.",
  },
  panel: {
    color: "crimson",
    note: "unitigs cover ≥20% of the reference (50% if host-endogenous).",
  },
} as const;

function detectionKind(d: Detection): keyof typeof FLAG_KIND {
  if (d.class === "culture") return "contaminant";
  if (d.class === "vector" || ENDOGENOUS_ORGANISMS.has(d.organism))
    return "endogenous";
  if (d.is_background) return "prevalent";
  return "panel";
}

function DetectionBadge({ d }: { d: Detection }) {
  const kind = detectionKind(d);
  const pct = d.breadth_frac == null ? null : (100 * d.breadth_frac).toFixed(1);
  const high = d.tier === "high_breadth";
  return (
    <Tooltip
      content={`${formatOrganismName(d.organism)} — ${pct ?? "?"}% of the reference covered${
        d.covered_bp && d.ref_bp
          ? ` (${d.covered_bp.toLocaleString()} of ${d.ref_bp.toLocaleString()} bp)`
          : ""
      }, ${high ? "high" : "low"} breadth. ${FLAG_KIND[kind].note}`}
    >
      <Badge
        size="1"
        variant={high ? "soft" : "outline"}
        color={FLAG_KIND[kind].color}
        style={{ cursor: "help" }}
      >
        {formatOrganismName(d.organism)}
        {pct ? ` ${pct}%` : ""}
      </Badge>
    </Tooltip>
  );
}

function FlagsCellRenderer(params: ICellRendererParams<SingleCellSample>) {
  const row = params.data;
  if (!row) return null;
  if (!row.screened) {
    return (
      <NotMeasured
        reason={
          row.n_runs_measurable
            ? "No run deep enough to call absence"
            : row.n_runs
              ? "No run screened against the microbial panel"
              : "No runs quantified for this sample"
        }
      />
    );
  }
  if (row.detections.length === 0) {
    return (
      <Tooltip content="Nothing reached the reporting threshold.">
        <Text size="2" color="gray" style={{ cursor: "help" }}>
          none above threshold
        </Text>
      </Tooltip>
    );
  }
  return (
    <Flex align="center" gap="1" wrap="wrap">
      {row.detections.map((d) => (
        <DetectionBadge key={d.organism} d={d} />
      ))}
      {row.hpv_top_type && (
        <Tooltip
          content={
            row.hpv_ambiguous
              ? "Several types pass the gate; conserved regions make cross-mapping likely. Best-supported shown."
              : "Best-supported HPV type"
          }
        >
          <Badge
            size="1"
            variant="outline"
            color="crimson"
            style={{ cursor: "help" }}
          >
            {row.hpv_top_type}
            {row.hpv_ambiguous ? " (ambiguous)" : ""}
          </Badge>
        </Tooltip>
      )}
    </Flex>
  );
}

function CellsCellRenderer(params: ICellRendererParams<SingleCellSample>) {
  const row = params.data;
  if (!row) return null;
  if (row.cells == null) return <NotMeasured reason="No cell count reported" />;
  const text = row.cells.toLocaleString();
  if (!row.unfiltered) return <Text size="2">{text}</Text>;
  return (
    <Tooltip content="Unfiltered matrix: counts 10x barcodes.">
      <Flex align="center" gap="1" style={{ cursor: "help" }}>
        <Text size="2" style={{ textDecoration: "line-through" }} color="gray">
          {text}
        </Text>
        <ExclamationTriangleIcon color="orange" />
      </Flex>
    </Tooltip>
  );
}

function QcCellRenderer(params: ICellRendererParams<SingleCellSample>) {
  const row = params.data;
  if (!row) return null;
  const matrices = row.sc_stats ?? [];
  if (!row.sc_stats_scanned)
    return <NotMeasured reason="Matrix not scanned for QC statistics" />;

  return (
    <Flex direction="column" gap="1" py="1">
      {matrices.map((m) => {
        const counts = m.ncount_f_median;
        const genes = m.nfeature_f_median;
        const minCounts = m.min_counts ?? 500;
        if (counts == null && genes == null)
          return (
            <Text key={m.file} size="1" color="gray">
              no cell passed {minCounts} counts
            </Text>
          );
        return (
          <Flex key={m.file} align="center" gap="1">
            <Tooltip
              content={
                `${m.file} — median over ${num(m.n_cells_filtered)} cells ` +
                `with ≥${minCounts} counts` +
                (m.pct_mito_f_median != null
                  ? `, mito ${m.pct_mito_f_median.toFixed(1)}%`
                  : "; mito needs a features file")
              }
            >
              <Text size="2" style={{ cursor: "help" }}>
                {qc(counts)}{" "}
                <Text size="1" color="gray">
                  counts
                </Text>{" "}
                / {qc(genes)}{" "}
                <Text size="1" color="gray">
                  genes
                </Text>
              </Text>
            </Tooltip>
            {m.is_raw_barcode_space && (
              <Tooltip content="Raw droplet space: unfiltered quantiles are ambient RNA. Figure shown is filtered.">
                <ExclamationTriangleIcon color="orange" />
              </Tooltip>
            )}
          </Flex>
        );
      })}
    </Flex>
  );
}

const DERIVATION = {
  sex: "Derived from Y-unique and XIST read counts",
  assay: "Inferred from read structure",
};

const num = (n: number | null) => (n == null ? "?" : n.toLocaleString());
const qc = (n: number | null) => num(n == null ? null : Math.round(n));

const SEX_EVIDENCE = (row: SingleCellSample) => {
  const lines: string[] = [];
  if (row.y_hits != null || row.xist_hits != null) {
    lines.push(
      `Y-unique reads: ${num(row.y_hits)}, XIST reads: ${num(row.xist_hits)}`,
      `of ${num(row.sex_reads_scanned)} reads scanned`,
    );
    if (row.y_xist_ratio != null) {
      lines.push(`Y:XIST ratio ${row.y_xist_ratio.toFixed(2)}`);
    }
  }
  if (row.deep_n_reads) lines.push(`deep pass: ${num(row.deep_n_reads)} reads`);
  if (row.sex_confidence) lines.push(`confidence: ${row.sex_confidence}`);
  if (row.sex_panel_status === "unsupported") {
    lines.push(
      "Sex panel is unsupported for this species, so treat the call as indicative only",
    );
  }
  if (row.sex_mixed_suspected) {
    lines.push(
      "Mixed or pooled donors suspected, so a single sex call may not apply",
    );
  }
  return lines.length ? lines.join("\n") : null;
};

const ASSAY_EVIDENCE = (row: SingleCellSample) =>
  row.assay_display && row.assay_display !== row.assay
    ? `Chemistry: ${row.assay_display}`
    : null;

const CONTRADICTION: Partial<
  Record<keyof SingleCellSample, (row: SingleCellSample) => string | null>
> = {
  assay: (row) =>
    row.assay_is_single_cell === false
      ? "This study is published as single-cell, but the read structure suggests otherwise."
      : null,
};

function CallCellRenderer(
  field: keyof SingleCellSample,
  unknownReason: string,
  evidence?: (row: SingleCellSample) => string | null,
) {
  const contradiction = CONTRADICTION[field];
  return function Renderer(params: ICellRendererParams<SingleCellSample>) {
    const row = params.data;
    if (!row) return null;
    const value = row[field];
    if (value == null || value === "") {
      return <NotMeasured reason={unknownReason} />;
    }
    const conflict = contradiction?.(row) ?? null;
    const detail = evidence?.(row) ?? null;
    const label = (
      <Text truncate size="2" style={detail ? { cursor: "help" } : undefined}>
        {formatOrganismName(String(value))}
      </Text>
    );
    return (
      <Flex align="center" gap="1" style={{ overflow: "hidden" }}>
        {detail ? (
          <Tooltip
            content={<span style={{ whiteSpace: "pre-line" }}>{detail}</span>}
          >
            {label}
          </Tooltip>
        ) : (
          label
        )}
        {conflict && (
          <Tooltip content={conflict}>
            <Badge
              color="crimson"
              size="1"
              variant="soft"
              style={{ cursor: "help" }}
            >
              conflict
            </Badge>
          </Tooltip>
        )}
        {row.calls_ambiguous && (
          <Tooltip content="Runs disagreed; best-supported value shown.">
            <Badge
              color="amber"
              size="1"
              variant="soft"
              style={{ cursor: "help" }}
            >
              <ExclamationTriangleIcon />
            </Badge>
          </Tooltip>
        )}
      </Flex>
    );
  };
}

const SexCell = CallCellRenderer(
  "sex_verdict",
  "No read-derived sex call for this sample",
  SEX_EVIDENCE,
);
const AssayCell = CallCellRenderer(
  "assay",
  "No read-derived assay call for this sample",
  ASSAY_EVIDENCE,
);

const getRowId = (params: { data: SingleCellSample }) =>
  params.data.sample_accession;

async function fetchPage(
  accession: string,
  offset: number,
): Promise<SingleCellResponse | null> {
  return getJsonOrNull<SingleCellResponse>(
    `/project/${accession}/single-cell?limit=${TABLE_PAGE_SIZE}&offset=${offset}`,
  );
}

type SingleCellCol = ColDef<SingleCellSample> & { hasData?: () => boolean };

export default function SingleCellCard({ accession }: { accession: string }) {
  const { resolvedTheme } = useTheme();
  const wrapText = useWrapText();

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["single-cell", accession],
    queryFn: ({ pageParam = 0 }) => fetchPage(accession, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (last, pages) =>
      !last || last.samples.length < TABLE_PAGE_SIZE
        ? undefined
        : pages.length * TABLE_PAGE_SIZE,
    retry: false,
  });

  const rows = useMemo(
    () => data?.pages.flatMap((page) => page?.samples ?? []) ?? [],
    [data],
  );
  const { nonEmptyFields, hasScreened } = useMemo(() => {
    const nonEmptyFields = new Set<string>();
    let hasScreened = false;
    for (const r of rows) {
      if (r.screened) hasScreened = true;
      for (const [k, v] of Object.entries(r)) {
        const filled = Array.isArray(v) ? v.length > 0 : v != null && v !== "";
        if (filled) nonEmptyFields.add(k);
      }
    }
    return { nonEmptyFields, hasScreened };
  }, [rows]);
  const defaultColDef = useMemo(
    () => ({
      filter: true,
      sortable: true,
      resizable: true,
      ...wrapColDef<SingleCellSample>(wrapText),
    }),
    [wrapText],
  );
  const onBodyScroll = useMemo(
    () =>
      infiniteScrollOnBodyScroll({
        loadedCount: rows.length,
        hasNextPage: !!hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
      }),
    [rows.length, hasNextPage, isFetchingNextPage, fetchNextPage],
  );
  const columnDefs = useMemo<SingleCellCol[]>(() => {
    const allColumns: SingleCellCol[] = [
      {
        field: "sample_accession",
        headerName: "Sample",
        hasData: () => true,
        pinned: "left",
        minWidth: 150,
        flex: 1,
      },
      {
        field: "title",
        headerName: "Title",
        pinned: "left",
        minWidth: 200,
        flex: 1,
      },
      {
        field: "tissue",
        headerName: "Tissue",
        minWidth: 150,
        flex: 1,
      },
      {
        field: "cells",
        headerName: "Cells",
        minWidth: 120,
        flex: 1,
        cellRenderer: CellsCellRenderer,
      },
      {
        field: "genes",
        headerName: "Genes",
        minWidth: 110,
        flex: 1,
        valueFormatter: (p) => (p.value == null ? "—" : p.value.toLocaleString()),
      },
      {
        field: "sex_verdict",
        headerName: "Sex (reads)",
        headerTooltip: DERIVATION.sex,
        minWidth: 140,
        flex: 1,
        cellRenderer: SexCell,
      },
      {
        field: "assay",
        headerName: "Assay (reads)",
        headerTooltip: DERIVATION.assay,
        minWidth: 190,
        flex: 1,
        cellRenderer: AssayCell,
      },
      {
        field: "sc_stats",
        headerName: "QC per cell (median)",
        flex: 1,
        minWidth: 210,
        cellRenderer: QcCellRenderer,
        autoHeight: true,
        sortable: false,
        filter: false,
      },
      {
        field: "detections",
        headerName: "Microbial evidence",
        // a screened sample with no detections still gets the column
        hasData: () => hasScreened,
        flex: 1,
        minWidth: 240,
        cellRenderer: FlagsCellRenderer,
        sortable: false,
        // detections holds objects; the text filter would match "[object Object]"
        filter: false,
      },
    ];
    return allColumns.filter((c) =>
      c.hasData ? c.hasData() : nonEmptyFields.has(c.field!),
    );
  }, [hasScreened, nonEmptyFields]);

  if (isError || (!isLoading && !data?.pages[0])) return null;
  if (isLoading) return <Spinner />;

  const head = data!.pages[0]!;
  const exactChemistryCount = head.longread_chemistry.filter(
    (r) => r.chemistry_confidence === "exact",
  ).length;

  const gridHeight = Math.min(400, 42 + rows.length * 42);

  return (
    <Flex direction="column" gap="2">
      <Text size="2" color="gray">
        Sex, assay and microbial content derived from the reads.
      </Text>
      <Flex align="center" gap="2" wrap="wrap">
        <Text size="2" color="gray">
          {(head.n_samples_detailed ?? 0).toLocaleString()} samples
          {head.study_cells != null && (
            <>
              {" · "}
              {head.study_cells.toLocaleString()} matrix columns
            </>
          )}
          {head.n_runs_linked != null && (
            <>
              {" · "}
              {head.n_runs_linked.toLocaleString()} runs,{" "}
              {(head.n_runs_preflightx ?? 0).toLocaleString()} called,{" "}
              {(head.n_runs_measurable ?? 0).toLocaleString()} screened
            </>
          )}
        </Text>
        {head.sc_stats_study?.median_ncount != null && (
          <Tooltip content="Median of per-matrix medians, over cells passing the count threshold.">
            <Badge
              color="gray"
              size="1"
              variant="soft"
              style={{ cursor: "help" }}
            >
              QC median {qc(head.sc_stats_study.median_ncount)} counts
              {head.sc_stats_study.median_nfeature != null && (
                <>
                  {" / "}
                  {qc(head.sc_stats_study.median_nfeature)} genes
                </>
              )}
            </Badge>
          </Tooltip>
        )}
        {head.sc_stats_study?.any_raw_barcode_space && (
          <Tooltip content="A matrix here is raw droplet space; QC figures shown are filtered.">
            <Badge
              color="orange"
              size="1"
              variant="soft"
              style={{ cursor: "help" }}
            >
              <ExclamationTriangleIcon /> droplet space
            </Badge>
          </Tooltip>
        )}
        {head.any_unfiltered && (
          <Tooltip content="Study has an unfiltered matrix, so the total counts 10x barcodes.">
            <Badge
              color="orange"
              size="1"
              variant="soft"
              style={{ cursor: "help" }}
            >
              <ExclamationTriangleIcon /> unfiltered matrix
            </Badge>
          </Tooltip>
        )}
        {head.unassigned_cells ? (
          <Tooltip content="No per-sample breakdown deposited; rows fall short of the study total.">
            <Badge
              color="gray"
              size="1"
              variant="soft"
              style={{ cursor: "help" }}
            >
              <InfoCircledIcon /> {head.unassigned_cells.toLocaleString()} cells
              unassigned
            </Badge>
          </Tooltip>
        ) : null}
        {head.n_runs_measurable === 0 && (
          <Tooltip content="No run in this study was sequenced deeply enough to screen for microbial sequence, so an empty flags column here means the check never ran.">
            <Badge
              color="gray"
              size="1"
              variant="soft"
              style={{ cursor: "help" }}
            >
              <InfoCircledIcon /> not screened
            </Badge>
          </Tooltip>
        )}
        {head.longread_chemistry.length > 0 && (
          <Tooltip
            content={
              <span style={{ whiteSpace: "pre-line" }}>
                {head.longread_chemistry
                  .map(
                    (r) =>
                      `${r.run_accession}: ${r.chemistry ?? "unresolved"} (${r.chemistry_confidence ?? "unknown"})`,
                  )
                  .join("\n")}
              </span>
            }
          >
            <Badge color="purple" size="1" variant="soft" style={{ cursor: "help" }}>
              {head.longread_chemistry.length} long-read run
              {head.longread_chemistry.length === 1 ? "" : "s"}
              {exactChemistryCount > 0 && ` (${exactChemistryCount} exact)`}
            </Badge>
          </Tooltip>
        )}
      </Flex>

      <div
        className={
          resolvedTheme === "dark" ? "ag-theme-quartz-dark" : "ag-theme-quartz"
        }
        role="region"
        aria-label="Pentimento per-sample metadata"
        style={{ height: `${gridHeight}px`, width: "100%" }}
      >
        <AgGridReact<SingleCellSample>
          rowData={rows}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          enableCellTextSelection
          ensureDomOrder
          getRowId={getRowId}
          theme="legacy"
          onBodyScroll={onBodyScroll}
        />
      </div>
      {isFetchingNextPage && (
        <Flex align="center" gap="2">
          <Spinner size="1" />
          <Text size="1" color="gray">
            Loading more samples...
          </Text>
        </Flex>
      )}
    </Flex>
  );
}
