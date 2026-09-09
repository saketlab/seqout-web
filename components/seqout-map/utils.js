// Map color and filter encodings.
import { state } from "./state.js";
import { DEFAULT_BG_OPACITY, DEFAULT_BG_SIZE, DEFAULT_BG_COLOR } from "./constants.js";

// Cluster columns arrive dictionary-encoded. deepscatter's categorical color
// texture holds only 4,096 entries, but the finer Leiden levels contain far more
// clusters. The engine creates a numeric transform for each layer, allowing the
// GPU's continuous color texture to cover every advertised clustering level.
export function clusterColorEncoding() {
  return {
    field: state.colorValueField,
    domain: [0, Math.max(1, state.maxClusterId + 1)],
    range: "Turbo",
  };
}

// Color the source dictionary column with an ordinal scale mapping archive strings to fixed hex colors.
export function sourceColorEncoding() {
  return {
    field: "source",
    domain: state.sourceDomain ?? [],
    range: state.sourceRange ?? ["#4CAF50"],
  };
}

export function pointInPolygon(px, py, verts) {
  let inside = false;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const xi = verts[i].x, yi = verts[i].y;
    const xj = verts[j].x, yj = verts[j].y;
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export async function applyTransformation(sp, name, fn, prerequisites = []) {
  const dt = sp.deeptable;
  // Sidecar columns (cluster layers included) load lazily; declaring the source
  // fields lets a filter work before the field is used for color encoding.
  dt.register_transformation(name, fn, prerequisites);
  await Promise.all(
    dt.map((t) => t.apply_transformation(name).catch(() => { }))
  );
}

// Search and lasso own foreground highlighting; country filtering and cluster coloring remain independent.
export function restoreForeground(sp) {
  let encoding = { foreground: null };

  if (state.currentSearchName) {
    encoding = { foreground: { field: state.currentSearchName, op: "eq", a: 1 } };
  } else if (state.currentLassoName) {
    encoding = { foreground: { field: state.currentLassoName, op: "eq", a: 1 } };
  }

  sp.plotAPI({
    duration: 0,
    encoding,
    background_options: {
      color: DEFAULT_BG_COLOR,
      opacity: DEFAULT_BG_OPACITY,
      size: DEFAULT_BG_SIZE,
    },
  });
}

export function applyColorEncoding(sp) {
  const encoding = {};

  if (state.currentSearchName) {
    encoding.foreground = { field: state.currentSearchName, op: "eq", a: 1 };
  } else if (state.currentLassoName) {
    encoding.foreground = { field: state.currentLassoName, op: "eq", a: 1 };
  } else {
    encoding.foreground = null;
  }

  if (state.colorBySource && state.sourceRange) {
    encoding.color = sourceColorEncoding();
  } else if (state.colorByClusters && state.colorField) {
    encoding.color = clusterColorEncoding();
  } else {
    encoding.color = { constant: "#4CAF50" };
  }

  sp.plotAPI({ encoding });
}
