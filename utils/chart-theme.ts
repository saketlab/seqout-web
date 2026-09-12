export type ApexChartTheme = {
  background: string;
  foreColor: string;
  titleColor: string;
  subtitleColor: string;
  legendLabelColor: string;
  dataLabelColor: string;
  gridBorderColor: string;
};

export function getApexChartTheme(isDark: boolean): ApexChartTheme {
  return isDark
    ? {
        background: "#111113",
        foreColor: "#a1a1aa",
        titleColor: "#fafafa",
        subtitleColor: "#a1a1aa",
        legendLabelColor: "#d4d4d8",
        dataLabelColor: "#e4e4e7",
        gridBorderColor: "#3f3f46",
      }
    : {
        background: "#ffffff",
        foreColor: "#71717a",
        titleColor: "#000000",
        subtitleColor: "#555555",
        legendLabelColor: "#3f3f46",
        dataLabelColor: "#18181b",
        gridBorderColor: "#e4e4e7",
      };
}

/** Neutral "other"/"unenriched" series color for ApexCharts, matching foreColor's zinc tone so it stays legible in both themes. */
export function getMutedSeriesColor(isDark: boolean): string {
  return isDark ? "#a1a1aa" : "#71717a";
}

/** Muted fill/line pair for a neutral IQR-style band; line reuses getMutedSeriesColor. */
export function getMutedBandColors(isDark: boolean): { fill: string; line: string } {
  return {
    fill: isDark ? "#71717a" : "#94a3b8",
    line: getMutedSeriesColor(isDark),
  };
}

export const CHART_SERIES_PALETTE: readonly string[] = [
  "#e20000",
  "#c8b712",
  "#348557",
  "#22c9b4",
  "#aea0ff",
  "#8144ff",
  "#9d5581",
  "#ff698e",
] as const;

export type MapCanvasTheme = {
  background: string;
  title: string;
  attribution: string;
};

export function getMapCanvasTheme(isDark: boolean): MapCanvasTheme {
  return isDark
    ? {
        background: "#0d1117",
        title: "#e6edf3",
        attribution: MAP_ATTRIBUTION_COLOR,
      }
    : {
        background: "#ffffff",
        title: "#1c2024",
        attribution: MAP_ATTRIBUTION_COLOR,
      };
}

export const MAP_ATTRIBUTION_COLOR = "#999999" as const;

// alidade_smooth bakes in labels, so the map needs no overlay.
// Stadia allowlists by Referer; an unregistered domain gets 401 tiles.
const STADIA = "https://tiles.stadiamaps.com/tiles";

// pass retina only for renderers that substitute Leaflet's {r}
export function getBasemapTileUrl(isDark: boolean, retina = false): string {
  const style = isDark ? "alidade_smooth_dark" : "alidade_smooth";
  return `${STADIA}/${style}/{z}/{x}/{y}${retina ? "{r}" : ""}.png`;
}

// Stadia's raster tiles top out at zoom 20.
export const BASEMAP_MAX_ZOOM = 20;

// licence obligation; keep every form here so they stay in sync
export const MAP_ATTRIBUTION_SOURCES = [
  { label: "Stadia Maps", href: "https://stadiamaps.com/" },
  { label: "OpenMapTiles", href: "https://openmaptiles.org/" },
  { label: "OpenStreetMap", href: "https://www.openstreetmap.org/copyright" },
] as const;
export const MAP_ATTRIBUTION_TEXT = MAP_ATTRIBUTION_SOURCES.map(
  (s) => `\u00a9 ${s.label}`,
).join(" ");
export const MAP_ATTRIBUTION_HTML = MAP_ATTRIBUTION_SOURCES.map(
  (s) => `&copy; <a href="${s.href}">${s.label}</a>`,
).join(" ");

export function getMapPanelBackground(isDark: boolean): string {
  return isDark ? "#000000" : "#f0f0f0";
}

export function getMapMutedTextColor(isDark: boolean): string {
  return isDark ? "#6b7280" : "#9ca3af";
}

/** Scatterplot point color for the global contributions map, tinted toward the indigo accent. */
export function getMapPointColor(isDark: boolean): [number, number, number] {
  return isDark ? [99, 102, 241] : [79, 70, 229];
}

export type LeafletPopupTheme = {
  link: string;
  markerFill: string;
  markerBorder: string;
};

export function getLeafletPopupTheme(isDark: boolean): LeafletPopupTheme {
  return isDark
    ? {
        link: "#63b3ed",
        markerFill: "#e05252",
        markerBorder: "#ffffff",
      }
    : {
        link: "#2b6cb0",
        markerFill: "#d63031",
        markerBorder: "#2d3436",
      };
}

export const SIMILARITY_GRAPH_COLORS = {
  link: "#9ca3af",
  center: "#d97706",
  geo: "#2563eb",
  sra: "#8b4513",
  arrayexpress: "#eab308",
  gsa: "#e54d2e",
} as const;

export const TECHNOLOGY_COLOR: Record<string, string> = {
  "10x 3'": "#2563eb",
  "10x 3' v1": "#bfdbfe",
  "10x 3' v2": "#93c5fd",
  "10x 3' v3": "#3b82f6",
  "10x 3' v4": "#1d4ed8",
  "10x 5'": "#0ea5e9",
  "10x (unspecified)": "#7dd3fc",
  "10x Flex": "#6366f1",
  "Drop-seq": "#059669",
  inDrop: "#34d399",
  PIPseq: "#14b8a6",
  "Seq-Well": "#84cc16",
  "Microwell-seq": "#a3e635",
  "Smart-seq3": "#dc2626",
  "CEL-seq2": "#f97316",
  "MARS-seq": "#f59e0b",
  "Quartz-seq2": "#fbbf24",
  "SPLiT-seq/Parse": "#9333ea",
  "sci-RNA-seq": "#db2777",
  "BD Rhapsody": "#f472b6",
};
const TECHNOLOGY_FALLBACK_PALETTE = [
  "#94a3b8",
  "#64748b",
  "#a8a29e",
  "#78716c",
  "#cbd5e1",
] as const;

export function technologyColor(technology: string, index: number): string {
  return (
    TECHNOLOGY_COLOR[technology] ??
    TECHNOLOGY_FALLBACK_PALETTE[index % TECHNOLOGY_FALLBACK_PALETTE.length]
  );
}
