import { SITE_URL } from "@/utils/constants";
import { dbForAccession } from "@/utils/db-colors";
import { normalizeAliases } from "@/utils/project";
import {
  parseSupplementaryData,
  supplementaryFileName,
} from "@/utils/supplementary";

const PYTHON_INSTALL = "pip install seqout";
const PYTHON_COUNTS_INSTALL = 'pip install "seqout[counts]"';
// not on CRAN; the second repo resolves dependencies
const R_INSTALL =
  'install.packages("seqout", repos = c("https://saketlab.r-universe.dev", "https://cloud.r-project.org"))';
export const PYTHON_DEV_INSTALL =
  'pip install "seqout @ git+https://github.com/saketlab/seqout.git#subdirectory=python"';
export const R_DEV_INSTALL = 'pak::pak("saketlab/seqout/R")';
export const SNIPPETS_INTRO =
  "Seqout's data can be accessed via its Python and R clients. The first line of each snippet below contains the command to install it.";
export const CLIENT_DOCS = {
  python: `${SITE_URL}/cli/python/`,
  r: `${SITE_URL}/cli/R/`,
} as const;

export type SnippetPayload = {
  alias?: string | string[] | null;
  series_type?: string | string[] | null;
  is_single_cell?: boolean | null;
  has_enriched?: boolean | null;
  supplementary_data?: unknown;
  library_strategies?: string[] | null;
  title?: string | null;
};

type SnippetFacts = {
  accession: string;
  study: string | null;
  hasEnriched: boolean;
  matrix: "single-cell" | "bulk" | null;
  atac: boolean;
};

export type SnippetBlock = {
  id: string;
  title: string;
  python: string;
  r: string;
};

const STUDY_RE = /^[SED]RP\d+$/i;
const ATAC_RE = /\bATAC|multiome|chromatin accessibility/i;

const code = (...lines: (string | false | null)[]) =>
  lines.filter((line) => typeof line === "string").join("\n");

function snippetFacts(
  accession: string,
  payload: SnippetPayload,
): SnippetFacts {
  const acc = accession.toUpperCase();
  const study = STUDY_RE.test(acc)
    ? acc
    : (normalizeAliases(payload.alias)
        .find((a) => STUDY_RE.test(a))
        ?.toUpperCase() ?? null);
  const seriesType = [payload.series_type ?? []].flat().join(" ").toLowerCase();
  const files = parseSupplementaryData(payload.supplementary_data).map(
    supplementaryFileName,
  );
  // counts reader takes only GSE accessions with files
  const readable =
    dbForAccession(acc) === "geo" && acc.startsWith("GSE") && files.length > 0;
  const matrix = matrixKind(readable, payload.is_single_cell, seriesType);
  const atac =
    matrix === "single-cell" &&
    (files.some((name) => name.toLowerCase().includes("fragments")) ||
      (payload.library_strategies ?? []).some((s) => /ATAC/i.test(s)) ||
      ATAC_RE.test(payload.title ?? ""));
  return {
    accession: acc,
    study,
    hasEnriched: payload.has_enriched === true,
    matrix,
    atac,
  };
}

function matrixKind(
  readable: boolean,
  isSingleCell: boolean | null | undefined,
  seriesType: string,
): SnippetFacts["matrix"] {
  if (!readable) return null;
  if (
    isSingleCell === true &&
    seriesType.includes("high throughput sequencing")
  )
    return "single-cell";
  if (seriesType.includes("expression profiling by high throughput sequencing"))
    return "bulk";
  return null;
}

export function buildClientSnippets(
  accession: string,
  payload: SnippetPayload,
): SnippetBlock[] {
  const f = snippetFacts(accession, payload);
  const acc = f.accession;
  const blocks: SnippetBlock[] = [
    {
      id: "metadata",
      title: "Project metadata",
      python: code(
        `# ${PYTHON_INSTALL}`,
        "from seqout import connect",
        "",
        "sq = connect()",
        `ds = sq.get("${acc}")`,
        "ds.samples.to_df()    # one row per sample",
        f.study && "ds.runs.to_df()       # sequencing runs with FASTQ links",
        f.hasEnriched &&
          "ds.enriched.to_df()   # harmonised tissue, cell type and disease",
      ),
      r: code(
        `# ${R_INSTALL}`,
        "library(seqout)",
        "",
        `ds <- SeqoutGet("${acc}")`,
        "ds$samples    # one row per sample",
        f.study && "ds$runs       # sequencing runs with FASTQ links",
        f.hasEnriched &&
          "ds$enriched   # harmonised tissue, cell type and disease",
      ),
    },
  ];

  if (f.study) {
    blocks.push({
      id: "reads",
      title: "Download reads",
      python: code(
        `# ${PYTHON_INSTALL}`,
        "from pathlib import Path",
        "from seqout import connect",
        "",
        "sq = connect()",
        `runs = sq.fetch_study_runs("${f.study}", full=True)`,
        "runs.formats()    # runs available per format: fastq, sra, sra_lite",
        `sq.download_study_runs_data(runs, Path("${f.study}"))`,
      ),
      r: code(
        `# ${R_INSTALL}`,
        "library(seqout)",
        "",
        `RunFiles("${f.study}")    # one row per file, with size and md5`,
        `DownloadRuns("${f.study}", dest_dir = "${f.study}")`,
      ),
    });
  }

  if (f.matrix) {
    const sc = f.matrix === "single-cell";
    blocks.push({
      id: "counts",
      title: sc ? "Single-cell counts" : "Counts matrix",
      python: code(
        `# ${PYTHON_COUNTS_INSTALL}`,
        "from seqout import SeqoutListCounts",
        "",
        `counts = SeqoutListCounts("${acc}")`,
        `counts.manifest()          # readable ${sc ? "matrices" : "tables"}, nothing downloaded yet`,
        sc
          ? "adata = counts.anndata()   # every sample; sample= picks one"
          : "adata = counts.anndata()   # samples x genes; sample= picks one",
        "counts.design              # one row per sample",
      ),
      r: code(
        `# ${R_INSTALL}`,
        sc
          ? "# Seurat needs SeuratObject; SCE needs Bioconductor's SingleCellExperiment"
          : "# Seqout2SCE needs Bioconductor's SingleCellExperiment",
        "library(seqout)",
        "",
        `counts <- SeqoutListCounts("${acc}")`,
        `counts   # one row per readable ${sc ? "matrix" : "table"}, nothing downloaded yet`,
        ...(sc
          ? [
              "# every sample, capped at 2000 cells each; sample = c(...) picks some",
              "# paired modalities (ADT, ATAC) become extra assays",
              "obj <- Seqout2Seurat(counts, max_cells = 2000, sample_metadata = TRUE)",
              "sce <- Seqout2SCE(counts, max_cells = 2000, sample_metadata = TRUE)",
            ]
          : [
              "# genes x samples, with each sample's characteristics as colData",
              "se <- Seqout2SCE(counts, sample_metadata = TRUE)",
            ]),
        f.atac &&
          "SeqoutFragments(counts)   # ATAC fragments files; download = TRUE fetches them",
      ),
    });
  }

  return blocks;
}

/** served for Accept: text/markdown */
export function snippetsMarkdown(blocks: SnippetBlock[]): string {
  return code(
    "## Use in Python or R",
    "",
    SNIPPETS_INTRO,
    "",
    "```bash",
    PYTHON_INSTALL,
    "```",
    "",
    "```r",
    R_INSTALL,
    "```",
    "",
    `Development version: \`${PYTHON_DEV_INSTALL}\` or \`${R_DEV_INSTALL}\`.`,
    ...blocks.flatMap((block) => [
      "",
      `### ${block.title}`,
      "",
      "```python",
      block.python,
      "```",
      "",
      "```r",
      block.r,
      "```",
    ]),
    "",
    `Docs: ${CLIENT_DOCS.python} and ${CLIENT_DOCS.r}. Agent reference: ${SITE_URL}/cli/llms.txt`,
  );
}
