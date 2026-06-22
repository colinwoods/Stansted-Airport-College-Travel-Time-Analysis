// MapLibre paint/layout/filter builders for the route line + casing layers.
// One source, one main line layer, one casing layer underneath; the active mode
// swaps the colour, width, opacity and draw-order expressions. Highlight is
// driven by feature-state ("selected" / "hover"), never by mutating geometry.
import { DIFF_NORM_STOPS, DURATION_STOPS, interpStops } from "../lib/scales";
import type { Mode } from "../data/types";

export const SOURCE_ID = "routes";
export const LINE_LAYER_ID = "routes-line";
export const CASING_LAYER_ID = "routes-casing";

const ACCENT = "#00afde";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Expr = any;

const selected: Expr = ["boolean", ["feature-state", "selected"], false];
const hovered: Expr = ["boolean", ["feature-state", "hover"], false];

export function filterFor(mode: Mode): Expr {
  if (mode === "car") return ["==", ["get", "mode"], "car"];
  // transit view shows only realistic 09:00 services (drops absurd overnight routes)
  if (mode === "transit")
    return ["all", ["==", ["get", "mode"], "transit"], ["==", ["get", "transit_realistic"], true]];
  // diff view rides on the car geometry, only where a *realistic* transit
  // comparison exists (no-service and absurd overnight itineraries are omitted)
  return ["all", ["==", ["get", "mode"], "car"], ["==", ["get", "transit_realistic"], true]];
}

export function colorExpr(mode: Mode, domain: number): Expr {
  // car + transit share ONE duration ramp so the modes are directly comparable
  if (mode === "car" || mode === "transit")
    return ["interpolate", ["linear"], ["get", "duration_min"], ...interpStops(DURATION_STOPS)];
  return [
    "interpolate", ["linear"],
    ["/", ["to-number", ["get", "diff_min"]], domain],
    ...interpStops(DIFF_NORM_STOPS),
  ];
}

// Base width before selection/hover. Diff view makes near-parity (the modal-shift
// candidates) the thickest lines. Note: a zoom-based interpolate may NOT be nested
// inside the "case" below (MapLibre requires zoom expressions to be top-level), so
// car/transit use a constant base and the diff base is a *data*-driven interpolate.
function baseWidth(mode: Mode): Expr {
  if (mode === "diff")
    return ["interpolate", ["linear"], ["get", "abs_diff_min"], 0, 5.6, 45, 3.6, 110, 1.8];
  return 3.4;
}

function widthExpr(mode: Mode): Expr {
  const base = baseWidth(mode);
  return ["case", selected, 7.5, hovered, ["+", base, 1.8], base];
}

function opacityExpr(mode: Mode): Expr {
  if (mode === "diff")
    return [
      "case", selected, 1, hovered, 0.98,
      // candidates (small gap) opaque; large car advantage fades back
      ["interpolate", ["linear"], ["get", "abs_diff_min"], 0, 0.98, 110, 0.5],
    ];
  // saturated lines on the dark canvas read best at high opacity
  return ["case", selected, 1, hovered, 0.98, 0.86];
}

function sortKey(mode: Mode): Expr {
  // higher sort key draws on top
  if (mode === "diff") return ["*", -1, ["get", "abs_diff_min"]]; // candidates on top
  return ["get", "duration_min"]; // longer journeys overlay shorter ones
}

export function lineLayout(mode: Mode) {
  return {
    "line-cap": "round" as const,
    "line-join": "round" as const,
    "line-sort-key": sortKey(mode),
  };
}

export function linePaint(mode: Mode, domain: number) {
  return {
    "line-color": colorExpr(mode, domain),
    "line-width": widthExpr(mode),
    "line-opacity": opacityExpr(mode),
  };
}

export function casingLayout(mode: Mode) {
  return {
    "line-cap": "round" as const,
    "line-join": "round" as const,
    "line-sort-key": sortKey(mode),
  };
}

export function casingPaint(mode: Mode) {
  const base = baseWidth(mode);
  // On the dark canvas a near-black casing acts as a separator that makes the
  // bright lines "neon" and keeps overlapping routes readable. Selected flips to
  // the cyan signal.
  return {
    "line-color": ["case", selected, ACCENT, "rgba(8,11,15,0.62)"] as Expr,
    "line-width": [
      "case",
      selected, ["+", 7.5, 4],
      hovered, ["+", ["+", base, 1.8], 2.6],
      ["+", base, 2.4],
    ] as Expr,
    "line-opacity": ["case", selected, 0.95, hovered, 0.8, 0.6] as Expr,
  };
}
