export type ServerFilter = { c: string; o: "equals" | "contains"; v: string };

/** The slice of AG Grid's filter model this translates: single-condition text. */
type TextFilterModel = {
  filterType?: string;
  type?: string;
  filter?: unknown;
};

/** Translate single-condition text filters for server lookup.
 * The grid reapplies the full model, including number ranges and unknown columns, to the returned superset.
 * Returns "" when no filter is translatable. */
export const toServerFilters = (
  model: Record<string, unknown> | null | undefined,
): string => {
  const filters: ServerFilter[] = [];
  for (const [colId, entry] of Object.entries(model ?? {})) {
    const f = entry as TextFilterModel;
    if (f?.filterType !== "text") continue;
    if (f.type !== "equals" && f.type !== "contains") continue;
    const value = typeof f.filter === "string" ? f.filter.trim() : "";
    if (!value) continue;
    filters.push({ c: colId, o: f.type, v: value });
  }
  return filters.length > 0 ? JSON.stringify(filters) : "";
};
