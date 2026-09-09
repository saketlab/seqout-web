import React from "react";

export type FindResult<T> = { rows: T[]; capped: boolean };

/** Server-side accession lookup across a paginated grid’s full study.
 * Null rows preserve the paged view; disabled lookups use client-side filtering. */
export function useServerFind<T>(
  enabled: boolean,
  /** Resolves null when supplied columns cannot narrow the server lookup, preserving client-side filtering. An empty array means no matches. */
  fetchRows: (
    needle: string,
    signal: AbortSignal,
  ) => Promise<FindResult<T> | null>,
) {
  const [rows, setRows] = React.useState<T[] | null>(null);
  const [capped, setCapped] = React.useState(false);
  // Distinguish failed lookups from empty results so errors cannot imply a missing accession.
  const [error, setError] = React.useState(false);
  const seqRef = React.useRef(0);
  const lastNeedleRef = React.useRef<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const debounceRef = React.useRef<number | null>(null);
  // Kept in a ref so callers can pass an inline closure without re-arming.
  const fetchRef = React.useRef(fetchRows);
  React.useEffect(() => {
    fetchRef.current = fetchRows;
  }, [fetchRows]);

  const reset = React.useCallback(() => {
    seqRef.current += 1; // drop any in-flight response
    abortRef.current?.abort();
    setRows(null);
    setCapped(false);
    setError(false);
  }, []);

  const search = React.useCallback(
    (needle: string) => {
      if (!enabled) return; // loaded rows are the whole study
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      const value = needle.trim();
      if (!value) {
        lastNeedleRef.current = null;
        reset();
        return;
      }
      // An unrelated client-side filter (a number range, say) fires
      // onFilterChanged too; re-issuing an identical lookup would abort the
      // in-flight request and ask the same question again.
      if (value === lastNeedleRef.current) return;
      lastNeedleRef.current = value;
      debounceRef.current = window.setTimeout(() => {
        const seq = ++seqRef.current;
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        setError(false);
        fetchRef
          .current(value, ac.signal)
          .then((data) => {
            if (seq !== seqRef.current) return; // a newer filter superseded this
            if (data === null) {
              // Server had nothing to say about these columns.
              setRows(null);
              setCapped(false);
              setError(false);
              return;
            }
            setRows(data.rows);
            setCapped(data.capped);
            setError(false);
          })
          .catch((err) => {
            if (ac.signal.aborted || seq !== seqRef.current) return;
            console.error("Accession lookup failed:", err);
            setRows([]);
            setCapped(false);
            setError(true);
          });
      }, 300);
    },
    [enabled, reset],
  );

  React.useEffect(
    () => () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    },
    [],
  );

  return { rows, capped, error, search };
}
