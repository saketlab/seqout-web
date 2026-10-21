import { describe, expect, it } from "vitest";
import { buildClientSnippets, snippetsMarkdown } from "./client-snippets";

const SUPP = [{ "#text": "ftp://x/GSE1_RAW.tar", "@type": "TAR" }];
const MULTIOME = {
  series_type: ["Genome binding/occupancy profiling by high throughput sequencing"],
  is_single_cell: true,
  has_enriched: true,
  alias: "SRP1",
  supplementary_data: SUPP,
  title: "Joint profiling of chromatin accessibility and protein levels",
};
const BULK = {
  series_type: ["Expression profiling by high throughput sequencing"],
  alias: '["SRP217231", "PRJNA558102"]',
  supplementary_data: SUPP,
};

const ids = (accession: string, payload: object) =>
  buildClientSnippets(accession, payload).map((b) => b.id);
const counts = (accession: string, payload: object) =>
  buildClientSnippets(accession, payload).find((b) => b.id === "counts");

describe("buildClientSnippets", () => {
  it("chooses blocks per archive", () => {
    expect(ids("SRP267291", {})).toEqual(["metadata", "reads"]);
    expect(ids("E-MTAB-5061", { alias: "ERP017126" })).toEqual(["metadata", "reads"]);
    expect(ids("CRA001160", {})).toEqual(["metadata"]);
  });

  it("reads a multiome series as single-cell with ATAC fragments", () => {
    const block = counts("GSE156478", MULTIOME);
    expect(block?.title).toBe("Single-cell counts");
    expect(block?.r).toContain("SeqoutFragments(");
  });

  it("reads an expression series as bulk and links its study", () => {
    expect(counts("GSE135251", BULK)?.title).toBe("Counts matrix");
    expect(ids("GSE135251", BULK)).toContain("reads");
  });

  it("never offers Seurat for bulk counts", () => {
    expect(counts("GSE135251", BULK)?.r).toContain("Seqout2SCE(");
    expect(counts("GSE135251", BULK)?.r).not.toContain("Seurat");
  });

  it("offers no counts for a microarray series even when flagged single-cell", () => {
    const payload = {
      series_type: ["Expression profiling by array"],
      is_single_cell: true,
      supplementary_data: SUPP,
    };
    expect(counts("GSE60931", payload)).toBeUndefined();
  });

  it("offers no counts without supplementary files or outside GEO", () => {
    const seq = { series_type: "Expression profiling by high throughput sequencing" };
    expect(counts("GSE1", seq)).toBeUndefined();
    expect(counts("E-MTAB-5061", { ...seq, supplementary_data: SUPP })).toBeUndefined();
  });

  it("uses only names the seqout clients export", () => {
    const text = snippetsMarkdown(buildClientSnippets("GSE156478", MULTIOME));
    for (const name of ["Seqout2Seurat(", "Seqout2SCE(", "SeqoutFragments(", "sq.get("]) {
      expect(text).toContain(name);
    }
    for (const wrong of ["Seqout2SingleCellExperiment", "seqout_get", "seqout_search"]) {
      expect(text).not.toContain(wrong);
    }
  });

  it("installs released packages in every block", () => {
    for (const block of buildClientSnippets("GSE156478", MULTIOME)) {
      expect(block.python).toMatch(/^# pip install "?seqout/);
      expect(block.r).toMatch(/^# install\.packages\("seqout"/);
      expect(block.python + block.r).not.toContain("github.com");
    }
  });
});
