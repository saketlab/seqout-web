import { describe, expect, it } from "vitest";
import { applyTimeFilter, rollingCutoff } from "./search-filters";

const rows = [
  { updated_at: "2019-01-15" },
  { updated_at: "2019-06-30" },
  { updated_at: "2021-03-01" },
  { updated_at: null },
];

describe("applyTimeFilter custom range", () => {
  const custom = (from: string, to: string) =>
    applyTimeFilter(rows, "custom", { from, to }).map((r) => r.updated_at);

  it("is date-precise, not year-precise", () => {
    expect(custom("2019-02-01", "2019-12-31")).toEqual(["2019-06-30"]);
  });

  it("includes the whole of the end day", () => {
    expect(custom("2019-06-30", "2019-06-30")).toEqual(["2019-06-30"]);
  });

  it("accepts open-ended bounds", () => {
    expect(custom("2020-01-01", "")).toEqual(["2021-03-01"]);
    expect(custom("", "2019-02-01")).toEqual(["2019-01-15"]);
  });

  it("drops rows with no date and passes everything through when unset", () => {
    expect(custom("", "")).toHaveLength(4);
    expect(custom("2000-01-01", "2030-01-01")).toHaveLength(3);
  });
});

describe("last-N-years presets", () => {
  it("roll from today, not from Jan 1", () => {
    // The URL builder and client filter share rollingCutoff so boundary-day results agree.
    const cutoff = rollingCutoff(1);
    const rows = [
      { updated_at: cutoff },
      { updated_at: "1999-01-01" },
      { updated_at: null },
    ];
    expect(applyTimeFilter(rows, "1", { from: "", to: "" })).toEqual([
      { updated_at: cutoff },
    ]);
  });

  it("treats an unparseable preset as no filter", () => {
    const rows = [{ updated_at: "1999-01-01" }];
    expect(applyTimeFilter(rows, "nonsense", { from: "", to: "" })).toEqual(
      rows,
    );
  });
});
