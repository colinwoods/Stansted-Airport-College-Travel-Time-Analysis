// Single source of truth for the colour scales, shared by the MapLibre paint
// expressions (map/layerStyles.ts), the Legend, and the Scatter plot so the
// map and the charts can never drift apart.

export type Stop = [number, string];

// Car journey time — a warm sequential ramp (pale straw -> deep oxblood).
// Light = fast, dark = slow. Domain tuned to the observed car range (~5-45 min).
export const CAR_STOPS: Stop[] = [
  [5, "#f4e7bf"],
  [15, "#eec65f"],
  [25, "#e0913a"],
  [35, "#c15424"],
  [45, "#7e1f13"],
];

// Transit journey time — a cool sequential ramp (pale ice -> deep navy).
// Domain spans the realistic transit range (~15-135 min).
export const TRANSIT_STOPS: Stop[] = [
  [15, "#d8e7ed"],
  [45, "#8abfd6"],
  [75, "#3f8cbd"],
  [105, "#24588f"],
  [135, "#112a52"],
];

// Difference (car_min - transit_min), expressed as a *normalised* position in
// [-1, 1] where t = diff / domain. Diverging: deep teal (car much faster) ->
// warm cream (parity) -> vermilion (transit faster).
export const DIFF_NORM_STOPS: Stop[] = [
  [-1.0, "#0e4f59"],
  [-0.5, "#5ba0a6"],
  [-0.18, "#cbdcd3"],
  [0.0, "#efe1c2"],
  [0.5, "#df8a4d"],
  [1.0, "#b23018"],
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "").slice(0, 6);
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

/** JS-side interpolation over a stop list (used by Legend + Scatter). */
export function sampleStops(stops: Stop[], value: number): string {
  if (value <= stops[0][0]) return stops[0][1];
  if (value >= stops[stops.length - 1][0]) return stops[stops.length - 1][1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [v0, c0] = stops[i];
    const [v1, c1] = stops[i + 1];
    if (value >= v0 && value <= v1) {
      return mix(c0, c1, (value - v0) / (v1 - v0));
    }
  }
  return stops[stops.length - 1][1];
}

export const colorForCar = (min: number) => sampleStops(CAR_STOPS, min);
export const colorForTransit = (min: number) => sampleStops(TRANSIT_STOPS, min);
export const colorForDiff = (diff: number, domain: number) =>
  sampleStops(DIFF_NORM_STOPS, Math.max(-1, Math.min(1, diff / domain)));

/** Flatten stops into the [value, color, value, color, ...] tail of a MapLibre
 *  `interpolate` expression. */
export function interpStops(stops: Stop[]): (number | string)[] {
  return stops.flatMap(([v, c]) => [v, c]);
}
