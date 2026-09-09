import { describe, it, expect } from "vitest";
import {
  getExternalArchiveUrl,
  getInternalUrl,
  parseAccessions,
  isAccessionUrl,
  startsWithAccession,
} from "./accessionLinks";

describe("getInternalUrl", () => {
  it("routes each accession kind to its page (PRJ + unknown → null)", () => {
    expect(getInternalUrl("GSE196830")).toBe("/p/GSE196830");
    expect(getInternalUrl("SRP123456")).toBe("/p/SRP123456");
    expect(getInternalUrl("E-MTAB-1234")).toBe("/p/E-MTAB-1234");
    expect(getInternalUrl("E-GEAD-282")).toBe("/p/E-GEAD-282");
    expect(getInternalUrl("DRP000001")).toBe("/p/DRP000001");
    expect(getInternalUrl("SRX999")).toBe("/e/SRX999");
    expect(getInternalUrl("ERR42")).toBe("/r/ERR42");
    expect(getInternalUrl("GSM7")).toBe("/s/GSM7");
    expect(getInternalUrl("PRJNA123")).toBeNull(); // resolved via /prj, not here
    expect(getInternalUrl("cancer")).toBeNull();
  });

  it("routes BioSample IDs to /s (ENA/GSA sample primary accession)", () => {
    expect(getInternalUrl("SAMN05753172")).toBe("/s/SAMN05753172"); // NCBI
    expect(getInternalUrl("SAMEA104372072")).toBe("/s/SAMEA104372072"); // ENA
    expect(getInternalUrl("SAMD00012345")).toBe("/s/SAMD00012345"); // DDBJ
  });

  it("extracts BioSample IDs from a pasted query (was full-text before)", () => {
    expect(startsWithAccession("SAMEA104372072")).toBe(true);
    expect(parseAccessions("SAMEA104372072 some notes")[0]?.url).toBe(
      "/s/SAMEA104372072",
    );
    expect(startsWithAccession("SAMPLE gene expression")).toBe(false); // no digits
  });

  it("routes GSA accessions (runs → null: no internal download page)", () => {
    expect(getInternalUrl("CRA000004")).toBe("/p/CRA000004");
    expect(getInternalUrl("HRA007928")).toBe("/p/HRA007928");
    expect(getInternalUrl("CRX111967")).toBe("/e/CRX111967");
    expect(getInternalUrl("HRX111967")).toBe("/e/HRX111967");
    expect(getInternalUrl("HRS096807")).toBe("/s/HRS096807");
    expect(getInternalUrl("SAMC123")).toBe("/s/SAMC123");
    expect(getInternalUrl("CRR999")).toBeNull(); // GSA run → external only
    expect(getInternalUrl("HRR999")).toBeNull();
  });
});

describe("getExternalArchiveUrl (GSA → CNCB-NGDC)", () => {
  it("links CRA/HRA studies to their browse pages", () => {
    expect(getExternalArchiveUrl("CRA000004")).toEqual({
      url: "https://ngdc.cncb.ac.cn/gsa/browse/CRA000004",
      archive: "GSA",
      label: "View on GSA",
    });
    expect(getExternalArchiveUrl("HRA007928")?.url).toBe(
      "https://ngdc.cncb.ac.cn/gsa-human/browse/HRA007928",
    );
  });

  it("routes GSA sub-accessions (incl. SAMC/PRJCA) to NGDC, not NCBI", () => {
    for (const acc of ["CRR9", "CRX9", "HRR9", "HRS9", "SAMC9", "PRJCA9"]) {
      const r = getExternalArchiveUrl(acc);
      expect(r?.archive).toBe("GSA");
      expect(r?.url).toBe(`https://ngdc.cncb.ac.cn/search/all?q=${acc}`);
    }
  });
});

describe("getExternalArchiveUrl (DDBJ)", () => {
  it("links E-GEAD experiments to GEA, not ArrayExpress", () => {
    expect(getExternalArchiveUrl("E-GEAD-282")).toEqual({
      url: "https://ddbj.nig.ac.jp/search/entry/gea/E-GEAD-282",
      archive: "GEA",
      label: "View on GEA",
    });
    expect(getExternalArchiveUrl("E-MTAB-1234")?.archive).toBe("ArrayExpress");
  });

  it("links DRA accessions to their DDBJ resource pages", () => {
    expect(getExternalArchiveUrl("DRP000001")).toEqual({
      url: "https://ddbj.nig.ac.jp/resource/sra-study/DRP000001",
      archive: "DRA",
      label: "View on DRA",
    });
    expect(getExternalArchiveUrl("DRX000001")?.url).toBe(
      "https://ddbj.nig.ac.jp/resource/sra-experiment/DRX000001",
    );
    expect(getExternalArchiveUrl("DRR000001")?.url).toBe(
      "https://ddbj.nig.ac.jp/resource/sra-run/DRR000001",
    );
    expect(getExternalArchiveUrl("DRS000001")?.url).toBe(
      "https://ddbj.nig.ac.jp/resource/sra-sample/DRS000001",
    );
  });
});

describe("startsWithAccession", () => {
  it("is true only when the query begins with an accession", () => {
    expect(startsWithAccession("GSE12345")).toBe(true);
    expect(startsWithAccession("E-MTAB-10381 - ATAC-seq of iPSC")).toBe(true);
    expect(startsWithAccession("role of GSE12345 in cancer")).toBe(false);
    expect(startsWithAccession("brain scrna")).toBe(false);
    expect(startsWithAccession("GSE12345abc")).toBe(false); // no boundary
    expect(startsWithAccession("CRA000004")).toBe(true);
    expect(startsWithAccession("HRA007928 nasopharyngeal carcinoma")).toBe(
      true,
    );
    // An underscore suffix (GEO supp-file prefix) is a valid boundary.
    expect(startsWithAccession("GSE244832_Kim")).toBe(true);
  });

  it("accepts ArrayExpress accessions written without hyphens", () => {
    expect(startsWithAccession("E MTAB 11850")).toBe(true);
    expect(startsWithAccession("E_MTAB_11850")).toBe(true);
    expect(startsWithAccession("EMTAB11850")).toBe(true);
    expect(startsWithAccession("e geod 12345 kidney")).toBe(true);
    // Unknown four-letter prefixes stay prose: "E coli 12345" is a search.
    expect(startsWithAccession("E coli 12345")).toBe(false);
  });
});

describe("parseAccessions", () => {
  it("canonicalizes hyphen-less ArrayExpress accessions", () => {
    expect(parseAccessions("E MTAB 11850")[0]?.raw).toBe("E-MTAB-11850");
    expect(parseAccessions("EMTAB11850")[0]?.url).toBe("/p/E-MTAB-11850");
    expect(parseAccessions("E coli 12345")).toHaveLength(0);
  });

  it("extracts a single accession followed by pasted title text", () => {
    const accs = parseAccessions("E-MTAB-10381 - ATAC-seq of iPSC");
    expect(accs).toHaveLength(1);
    expect(accs[0]).toEqual({
      raw: "E-MTAB-10381",
      url: "/p/E-MTAB-10381",
      isPrj: false,
      isSubmission: false,
    });
  });

  it("flags a submission accession for async resolution", () => {
    for (const raw of ["SRA788656", "ERA217948", "DRA000900"]) {
      const accs = parseAccessions(raw);
      expect(accs).toEqual([
        { raw, url: `/submission/${raw}`, isPrj: false, isSubmission: true },
      ]);
    }
  });

  it("does not mistake a study/experiment accession for a submission", () => {
    // SRA is submission; SRP/SRX/SRR/SRS are not.
    expect(parseAccessions("SRP042645")[0].isSubmission).toBe(false);
    expect(parseAccessions("SRX4795903")[0].isSubmission).toBe(false);
    expect(startsWithAccession("SRA788656")).toBe(true);
  });

  it("extracts and dedupes multiple accessions, preserving order", () => {
    const accs = parseAccessions("GSE111 SRX222 GSE111 PRJNA333");
    expect(accs.map((a) => a.raw)).toEqual(["GSE111", "SRX222", "PRJNA333"]);
    expect(accs.map((a) => a.url)).toEqual([
      "/p/GSE111",
      "/e/SRX222",
      "/p/PRJNA333",
    ]);
    expect(accs.find((a) => a.raw === "PRJNA333")?.isPrj).toBe(true);
  });

  it("extracts an accession carrying an underscore suffix", () => {
    // GEO supplementary-file prefixes glue the accession to a name with "_".
    const accs = parseAccessions("GSE244832_Kim");
    expect(accs.map((a) => a.raw)).toEqual(["GSE244832"]);
    expect(accs[0].url).toBe("/p/GSE244832");
  });

  it("returns nothing for a plain text query", () => {
    expect(parseAccessions("brain single cell rna")).toEqual([]);
  });
});

describe("isAccessionUrl", () => {
  it("recognizes pasted archive URLs and finds the accession inside", () => {
    const cases: [string, string][] = [
      [
        "http://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE317357",
        "/p/GSE317357",
      ],
      ["https://www.ncbi.nlm.nih.gov/sra/?term=SRX1234567", "/e/SRX1234567"],
      ["https://www.ebi.ac.uk/ena/browser/view/SRP123456", "/p/SRP123456"],
      [
        "https://www.ebi.ac.uk/biostudies/arrayexpress/studies/E-MTAB-1234",
        "/p/E-MTAB-1234",
      ],
      ["https://ddbj.nig.ac.jp/search/entry/gea/E-GEAD-282", "/p/E-GEAD-282"],
      ["https://ngdc.cncb.ac.cn/gsa/browse/CRA000004", "/p/CRA000004"],
      ["www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSM7", "/s/GSM7"],
    ];
    for (const [url, expected] of cases) {
      expect(isAccessionUrl(url)).toBe(true);
      expect(parseAccessions(url)[0]?.url).toBe(expected);
    }
  });

  it("keeps PRJ/submission URLs on their async-resolve path", () => {
    const prj = parseAccessions(
      "https://www.ebi.ac.uk/ena/browser/view/PRJEB12345",
    )[0];
    expect(isAccessionUrl("https://www.ebi.ac.uk/ena/browser/view/PRJEB12345"))
      .toBe(true);
    expect(prj.isPrj).toBe(true);
  });

  it("ignores non-URLs and URLs with no accession", () => {
    expect(isAccessionUrl("https://seqout.org/about")).toBe(false);
    expect(isAccessionUrl("https://github.com/some/repo")).toBe(false);
    // Leading accessions are handled by startsWithAccession.
    expect(isAccessionUrl("GSE317357")).toBe(false);
    expect(isAccessionUrl("cancer single cell")).toBe(false);
  });
});
