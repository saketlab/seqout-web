const ACCENT = "rgb(99, 102, 241)"; // indigo-500
const BG_DARK = "rgba(99, 102, 241, 0.10)";
const BG_LIGHT = "rgba(99, 102, 241, 0.07)";
const BANNER_BG_DARK = "rgba(99, 102, 241, 0.08)";
const BANNER_BG_LIGHT = "rgba(99, 102, 241, 0.05)";

/**
 * Create an AG Grid getRowStyle callback that marks rows matching
 * a given organism with a left border accent + faint background tint.
 */
export function makeOrganismRowStyle<T>(
  highlightOrganism: string | null,
  isDark: boolean,
  getOrganism: (data: T) => string | null | undefined,
): ((params: { data?: T }) => Record<string, string> | undefined) | undefined {
  if (!highlightOrganism) return undefined;
  const bg = isDark ? BG_DARK : BG_LIGHT;
  return (params: { data?: T }) =>
    params.data && getOrganism(params.data)?.toLowerCase() === highlightOrganism
      ? { borderLeft: `3px solid ${ACCENT}`, background: bg }
      : undefined;
}

/** AG Grid postSortRows comparator that puts matching organisms first. */
export function makeOrganismPostSort<T>(
  highlightOrganism: string | null,
  getOrganism: (data: T) => string | null | undefined,
): ((params: { nodes: { data?: T }[] }) => void) | undefined {
  if (!highlightOrganism) return undefined;
  return (params: { nodes: { data?: T }[] }) => {
    const matched: typeof params.nodes = [];
    const rest: typeof params.nodes = [];
    for (const node of params.nodes) {
      if (node.data && getOrganism(node.data)?.toLowerCase() === highlightOrganism) {
        matched.push(node);
      } else {
        rest.push(node);
      }
    }
    // Overwrite in-place (AG Grid expects mutation)
    let i = 0;
    for (const n of matched) params.nodes[i++] = n;
    for (const n of rest) params.nodes[i++] = n;
  };
}

/** Style for the organism highlight banner shown above grids. */
export function getOrganismBannerStyle(isDark: boolean): React.CSSProperties {
  return {
    borderLeft: `3px solid ${ACCENT}`,
    background: isDark ? BANNER_BG_DARK : BANNER_BG_LIGHT,
    borderRadius: "var(--radius-2)",
    fontSize: "var(--font-size-2)",
  };
}
